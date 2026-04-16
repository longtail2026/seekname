"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import Header from "@/components/layout/Header";

interface Post {
  id: number;
  title: string;
  content: string;
  summary?: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  favorite_count: number;
  created_at: string;
  author_name: string;
  author_avatar?: string;
  author_id: string;
  tags: string[];
}

interface RelatedPost {
  id: number;
  title: string;
  summary?: string;
  view_count: number;
  created_at: string;
  author_name: string;
  tags: string[];
}

interface Comment {
  id: number;
  content: string;
  author_name: string;
  author_avatar?: string;
  author_id: string;
  like_count: number;
  created_at: string;
  replies: Comment[];
}

// 增强版 Markdown 渲染
function renderMarkdown(text: string) {
  let html = text
    // 代码块
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre class="code-block"><code>${code.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`;
    })
    // 行内代码
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    // H2
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    // H3
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    // H1
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // 引用块
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // 无序列表
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    // 加粗
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // 斜体
    .replace(/\*(.+?)\*/g, '<em>$1</em>');

  // 将连续的 <li> 包裹成 <ul>
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);
  // 段落：不含 HTML 标签的行
  html = html
    .split(/\n\n+/)
    .map((block) => {
      block = block.trim();
      if (!block) return "";
      if (/^<(h[1-6]|ul|pre|blockquote|div)/.test(block)) return block;
      return `<p>${block.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("\n");

  return html;
}

export default function BlogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: number; name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPost = useCallback(async () => {
    try {
      const res = await fetch(`/api/blog/posts/${id}`);
      if (!res.ok) { router.push("/blog"); return; }
      const data = await res.json();
      setPost(data);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  const fetchRelated = useCallback(async () => {
    if (!post?.tags?.length) return;
    try {
      // 随机取 2 篇相关文章（同标签）
      const tag = post.tags[0];
      const res = await fetch(`/api/blog/posts?tag=${encodeURIComponent(tag)}&pageSize=4`);
      if (res.ok) {
        const data = await res.json();
        setRelatedPosts(
          (data.posts || [])
            .filter((p: RelatedPost) => p.id !== parseInt(id))
            .slice(0, 3)
        );
      }
    } catch {}
  }, [post, id]);

  const fetchComments = useCallback(async () => {
    const res = await fetch(`/api/blog/comments?postId=${id}`);
    const data = await res.json();
    setComments(data.comments || []);
  }, [id]);

  const fetchUserStatus = useCallback(async () => {
    const res = await fetch(`/api/blog/like?postId=${id}`);
    const data = await res.json();
    setLiked(data.liked);
    setFavorited(data.favorited);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetchPost();
    fetchComments();
  }, [id, fetchPost, fetchComments]);

  useEffect(() => {
    if (user) fetchUserStatus();
  }, [user, fetchUserStatus]);

  useEffect(() => {
    if (post) fetchRelated();
  }, [post, fetchRelated]);

  const handleLike = async () => {
    if (!user) { router.push("/login"); return; }
    const res = await fetch("/api/blog/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_type: "post", target_id: parseInt(id) }),
    });
    const data = await res.json();
    setLiked(data.liked);
    setPost((p) => p ? { ...p, like_count: p.like_count + (data.liked ? 1 : -1) } : p);
  };

  const handleFavorite = async () => {
    if (!user) { router.push("/login"); return; }
    const res = await fetch("/api/blog/favorite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id: parseInt(id) }),
    });
    const data = await res.json();
    setFavorited(data.favorited);
    setPost((p) => p ? { ...p, favorite_count: p.favorite_count + (data.favorited ? 1 : -1) } : p);
  };

  const handleComment = async () => {
    if (!user) { router.push("/login"); return; }
    if (!commentText.trim()) return;
    await fetch("/api/blog/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        post_id: parseInt(id),
        content: commentText,
        parent_id: replyTo?.id || null,
      }),
    });
    setCommentText("");
    setReplyTo(null);
    fetchComments();
    setPost((p) => p ? { ...p, comment_count: p.comment_count + 1 } : p);
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      alert(t("blog.linkCopied"));
    }
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#FFFCF7" }}>
      <Header />
      <div style={{ paddingTop: 100, textAlign: "center", color: "#AAA" }}>{t("common.loading")}</div>
    </div>
  );

  if (!post) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#FFFCF7" }}>
      <Header />
      <div style={{ paddingTop: 80, maxWidth: 860, margin: "0 auto", padding: "80px 24px 60px" }}>

        {/* 返回 */}
        <Link href="/blog" style={{
          fontSize: 13, color: "#E86A17", textDecoration: "none",
          display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 24
        }}>
          ← {t("blog.back")}
        </Link>

        {/* 文章头 */}
        <article style={{
          background: "#FFF", borderRadius: 16, border: "1px solid #EEE8DD",
          padding: "36px 40px", marginBottom: 24
        }}>
          {/* 标签 */}
          {post.tags?.length > 0 && (
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              {post.tags.map((tag) => (
                <span key={tag} style={{
                  fontSize: 11, padding: "2px 10px", borderRadius: 10,
                  background: "rgba(232,106,23,0.08)", color: "#E86A17",
                  fontFamily: "'Noto Sans SC', sans-serif",
                }}>{tag}</span>
              ))}
            </div>
          )}

          <h1 style={{
            fontSize: 26, fontWeight: 700, color: "#2D1B0E", margin: "0 0 16px",
            lineHeight: 1.4, fontFamily: "'Noto Serif SC', serif"
          }}>
            {post.title}
          </h1>

          {/* 作者信息 */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10, marginBottom: 24,
            paddingBottom: 20, borderBottom: "1px solid #F5EDE0"
          }}>
            {post.author_avatar ? (
              <img src={post.author_avatar} alt="" style={{
                width: 36, height: 36, borderRadius: "50%", objectFit: "cover",
                border: "2px solid #D4941A"
              }} />
            ) : (
              <span style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "linear-gradient(135deg, #E86A17 0%, #D4941A 100%)",
                color: "#FFF", fontSize: 14, fontWeight: 700,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>{(post.author_name || "匿").charAt(0)}</span>
            )}
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#4A3428" }}>{post.author_name}</div>
              <div style={{ fontSize: 12, color: "#AAA" }}>
                {t("blog.author")} · {new Date(post.created_at).toLocaleDateString()}
                &nbsp;·&nbsp;👁 {post.view_count} {t("blog.views")}
              </div>
            </div>
          </div>

          {/* 正文（增强渲染） */}
          <div
            style={{
              fontSize: 15, color: "#2D1B0E", lineHeight: 1.9,
              fontFamily: "'Noto Sans SC', sans-serif"
            }}
            className="blog-content"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
          />

          {/* 操作栏 */}
          <div style={{ display: "flex", gap: 12, marginTop: 32, paddingTop: 24, borderTop: "1px solid #F5EDE0" }}>
            <ActionBtn active={liked} activeColor="#E74C3C" onClick={handleLike} icon="❤️" count={post.like_count} label={t("blog.likes")} />
            <ActionBtn active={favorited} activeColor="#D4941A" onClick={handleFavorite} icon="⭐" count={post.favorite_count} label={t("blog.favorites")} />
            <ActionBtn active={false} activeColor="#3498DB" onClick={handleShare} icon="🔗" count={0} label={t("common.share")} />
          </div>
        </article>

        {/* 评论区 */}
        <div style={{
          background: "#FFF", borderRadius: 16, border: "1px solid #EEE8DD",
          padding: "28px 40px", marginBottom: 32
        }}>
          <h3 style={{
            fontSize: 18, fontWeight: 700, color: "#2D1B0E", margin: "0 0 20px",
            fontFamily: "'Noto Serif SC', serif"
          }}>
            💬 {t("blog.comments")} ({post.comment_count})
          </h3>

          {/* 发评论 */}
          <div style={{ marginBottom: 28 }}>
            {replyTo && (
              <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>
                {t("blog.reply")} @{replyTo.name}&nbsp;
                <span style={{ color: "#E86A17", cursor: "pointer" }} onClick={() => setReplyTo(null)}>
                  {t("blog.cancelReply")}
                </span>
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={user
                  ? (replyTo ? `${t("blog.reply")} @${replyTo.name}...` : t("blog.commentPlaceholder"))
                  : t("blog.loginToComment")
                }
                disabled={!user}
                rows={3}
                style={{
                  flex: 1, padding: "10px 14px",
                  borderRadius: 8, border: "1px solid #DDD0C0",
                  fontSize: 13, resize: "none", outline: "none",
                  fontFamily: "'Noto Sans SC', sans-serif",
                  background: user ? "#FFF" : "#F9F9F9",
                  boxSizing: "border-box",
                }}
              />
              <button
                onClick={handleComment}
                disabled={!user || !commentText.trim()}
                style={{
                  padding: "0 20px",
                  background: user && commentText.trim()
                    ? "linear-gradient(135deg, #E86A17 0%, #D55A0B 100%)"
                    : "#EEE",
                  color: user && commentText.trim() ? "#FFF" : "#AAA",
                  border: "none", borderRadius: 8,
                  cursor: user && commentText.trim() ? "pointer" : "not-allowed",
                  fontSize: 13, fontWeight: 500,
                  alignSelf: "flex-end", height: 36,
                }}
              >{t("blog.submitComment")}</button>
            </div>
          </div>

          {/* 评论列表 */}
          {comments.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#CCC", fontSize: 14 }}>
              {t("blog.noComments")}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {comments.map((c) => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  currentUserId={user?.id}
                  onReply={(cid, name) => setReplyTo({ id: cid, name })}
                  onRefresh={fetchComments}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>

        {/* 相关文章 */}
        {relatedPosts.length > 0 && (
          <div style={{
            background: "#FFF", borderRadius: 16, border: "1px solid #EEE8DD",
            padding: "28px 40px"
          }}>
            <h3 style={{
              fontSize: 18, fontWeight: 700, color: "#2D1B0E", margin: "0 0 20px",
              fontFamily: "'Noto Serif SC', serif"
            }}>
              📖 {t("blog.relatedArticles")}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {relatedPosts.map((rp) => (
                <Link
                  key={rp.id}
                  href={`/blog/${rp.id}`}
                  style={{
                    display: "block", padding: "14px 16px",
                    border: "1px solid #F0E8DA", borderRadius: 10,
                    textDecoration: "none",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#D4941A")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#F0E8DA")}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#2D1B0E", marginBottom: 4 }}>
                    {rp.title}
                  </div>
                  <div style={{ fontSize: 12, color: "#AAA" }}>
                    {rp.author_name} · {new Date(rp.created_at).toLocaleDateString()} · 👁 {rp.view_count} {t("blog.views")}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 博客内容样式 */}
      <style dangerouslySetInnerHTML={{ __html: `
        .blog-content h1 { font-size: 22px; font-weight: 700; color: #2D1B0E; margin: 28px 0 14px; font-family: 'Noto Serif SC', serif; border-bottom: 2px solid #F0E8DA; padding-bottom: 8px; }
        .blog-content h2 { font-size: 18px; font-weight: 700; color: #2D1B0E; margin: 24px 0 12px; font-family: 'Noto Serif SC', serif; }
        .blog-content h3 { font-size: 15px; font-weight: 600; color: #4A3428; margin: 20px 0 10px; }
        .blog-content p { margin: 0 0 16px; }
        .blog-content ul { margin: 0 0 16px; padding-left: 24px; }
        .blog-content li { margin-bottom: 6px; }
        .blog-content blockquote { border-left: 3px solid #D4941A; margin: 16px 0; padding: 10px 16px; background: #FDF8EF; border-radius: 6px; color: #6B5A4E; font-style: italic; }
        .blog-content .code-block { background: #2D1B0E; color: #F5E6C8; padding: 16px 20px; border-radius: 8px; overflow-x: auto; margin: 20px 0; font-size: 13px; line-height: 1.6; }
        .blog-content .inline-code { background: #F5EDE0; color: #8B4513; padding: 1px 6px; border-radius: 4px; font-size: 13px; font-family: 'Courier New', monospace; }
        .blog-content strong { color: #2D1B0E; font-weight: 700; }
      `}} />
    </div>
  );
}

/* ─── 操作按钮 ─── */
function ActionBtn({ active, activeColor, onClick, icon, count, label }: any) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "8px 18px", borderRadius: 20,
        border: `1px solid ${active ? activeColor : "#DDD0C0"}`,
        background: active ? `${activeColor}14` : "#FFF",
        color: active ? activeColor : "#666",
        cursor: "pointer", fontSize: 13,
        transition: "all 0.2s",
      }}
    >
      <span>{icon}</span>
      <span>{count > 0 ? count : label}</span>
    </button>
  );
}

/* ─── 评论项 ─── */
function CommentItem({ comment, currentUserId, onReply, onRefresh, t }: {
  comment: Comment;
  currentUserId?: string;
  onReply: (id: number, name: string) => void;
  onRefresh: () => void;
  t: (key: string) => string;
}) {
  const handleDelete = async () => {
    if (!confirm(t("blog.confirmDelete"))) return;
    await fetch(`/api/blog/comments?id=${comment.id}`, { method: "DELETE" });
    onRefresh();
  };

  return (
    <div style={{ padding: "16px 0", borderBottom: "1px solid #F5EDE0" }}>
      <div style={{ display: "flex", gap: 10 }}>
        {comment.author_avatar ? (
          <img src={comment.author_avatar} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
        ) : (
          <span style={{
            width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(135deg, #E86A17 0%, #D4941A 100%)",
            color: "#FFF", fontSize: 12, fontWeight: 700,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>{(comment.author_name || "匿").charAt(0)}</span>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#4A3428" }}>{comment.author_name}</span>
            <span style={{ fontSize: 11, color: "#CCC" }}>
              {new Date(comment.created_at).toLocaleString(undefined, { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <p style={{ fontSize: 14, color: "#444", margin: "0 0 8px", lineHeight: 1.6 }}>{comment.content}</p>
          <div style={{ display: "flex", gap: 14, fontSize: 12, color: "#AAA" }}>
            <span style={{ cursor: "pointer" }} onClick={() => onReply(comment.id, comment.author_name)}>{t("blog.reply")}</span>
            {currentUserId === comment.author_id && (
              <span style={{ cursor: "pointer", color: "#E74C3C" }} onClick={handleDelete}>{t("blog.delete")}</span>
            )}
            {comment.like_count > 0 && <span>❤️ {comment.like_count}</span>}
          </div>

          {/* 子评论 */}
          {comment.replies?.length > 0 && (
            <div style={{ marginTop: 12, paddingLeft: 16, borderLeft: "2px solid #F5EDE0" }}>
              {comment.replies.map((r) => (
                <CommentItem key={r.id} comment={r} currentUserId={currentUserId} onReply={onReply} onRefresh={onRefresh} t={t} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
