"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
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

// 简单 Markdown 渲染（加粗、代码块、标题、换行）
function renderMarkdown(text: string) {
  return text
    .replace(/^## (.+)$/gm, '<h2 style="font-size:18px;font-weight:700;color:#2D1B0E;margin:20px 0 10px;font-family:\'Noto Serif SC\',serif">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size:22px;font-weight:700;color:#2D1B0E;margin:24px 0 12px;font-family:\'Noto Serif SC\',serif">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');
}

export default function BlogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: number; name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchPost();
    fetchComments();
    if (user) fetchUserStatus();
  }, [id, user]);

  const fetchPost = async () => {
    try {
      const res = await fetch(`/api/blog/posts/${id}`);
      if (!res.ok) { router.push("/blog"); return; }
      const data = await res.json();
      setPost(data);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    const res = await fetch(`/api/blog/comments?postId=${id}`);
    const data = await res.json();
    setComments(data.comments || []);
  };

  const fetchUserStatus = async () => {
    const res = await fetch(`/api/blog/like?postId=${id}`);
    const data = await res.json();
    setLiked(data.liked);
    setFavorited(data.favorited);
  };

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
      alert("链接已复制到剪贴板");
    }
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#FFFCF7" }}>
      <Header />
      <div style={{ paddingTop: 100, textAlign: "center", color: "#AAA" }}>加载中...</div>
    </div>
  );

  if (!post) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#FFFCF7" }}>
      <Header />
      <div style={{ paddingTop: 80, maxWidth: 860, margin: "0 auto", padding: "80px 24px 60px" }}>

        {/* 返回 */}
        <Link href="/blog" style={{ fontSize: 13, color: "#E86A17", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 24 }}>
          ← 返回杂谈
        </Link>

        {/* 文章头 */}
        <article style={{ background: "#FFF", borderRadius: 16, border: "1px solid #EEE8DD", padding: "36px 40px", marginBottom: 24 }}>
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

          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#2D1B0E", margin: "0 0 16px", lineHeight: 1.4, fontFamily: "'Noto Serif SC', serif" }}>
            {post.title}
          </h1>

          {/* 作者信息 */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, paddingBottom: 20, borderBottom: "1px solid #F5EDE0" }}>
            {post.author_avatar ? (
              <img src={post.author_avatar} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "2px solid #D4941A" }} />
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
                {new Date(post.created_at).toLocaleDateString("zh-CN")}
                &nbsp;·&nbsp;👁 {post.view_count} 阅读
              </div>
            </div>
          </div>

          {/* 正文 */}
          <div
            style={{ fontSize: 15, color: "#2D1B0E", lineHeight: 1.85, fontFamily: "'Noto Sans SC', sans-serif" }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
          />

          {/* 操作栏 */}
          <div style={{ display: "flex", gap: 12, marginTop: 32, paddingTop: 24, borderTop: "1px solid #F5EDE0" }}>
            <ActionBtn active={liked} activeColor="#E74C3C" onClick={handleLike} icon="❤️" count={post.like_count} label="点赞" />
            <ActionBtn active={favorited} activeColor="#D4941A" onClick={handleFavorite} icon="⭐" count={post.favorite_count} label="收藏" />
            <ActionBtn active={false} activeColor="#3498DB" onClick={handleShare} icon="🔗" count={0} label="分享" />
          </div>
        </article>

        {/* 评论区 */}
        <div style={{ background: "#FFF", borderRadius: 16, border: "1px solid #EEE8DD", padding: "28px 40px" }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#2D1B0E", margin: "0 0 20px", fontFamily: "'Noto Serif SC', serif" }}>
            💬 评论 ({post.comment_count})
          </h3>

          {/* 发评论 */}
          <div style={{ marginBottom: 28 }}>
            {replyTo && (
              <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>
                回复 @{replyTo.name}&nbsp;
                <span style={{ color: "#E86A17", cursor: "pointer" }} onClick={() => setReplyTo(null)}>取消</span>
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={user ? (replyTo ? `回复 @${replyTo.name}...` : "写下你的评论...") : "登录后可发表评论"}
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
              >发送</button>
            </div>
          </div>

          {/* 评论列表 */}
          {comments.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#CCC", fontSize: 14 }}>还没有评论，来说第一句话吧~</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {comments.map((c) => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  currentUserId={user?.id}
                  onReply={(id, name) => { setReplyTo({ id, name }); }}
                  onRefresh={fetchComments}
                />
              ))}
            </div>
          )}
        </div>
      </div>
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
function CommentItem({ comment, currentUserId, onReply, onRefresh }: {
  comment: Comment;
  currentUserId?: string;
  onReply: (id: number, name: string) => void;
  onRefresh: () => void;
}) {
  const handleDelete = async () => {
    if (!confirm("确定删除此评论？")) return;
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
            <span style={{ fontSize: 11, color: "#CCC" }}>{new Date(comment.created_at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <p style={{ fontSize: 14, color: "#444", margin: "0 0 8px", lineHeight: 1.6 }}>{comment.content}</p>
          <div style={{ display: "flex", gap: 14, fontSize: 12, color: "#AAA" }}>
            <span style={{ cursor: "pointer" }} onClick={() => onReply(comment.id, comment.author_name)}>回复</span>
            {currentUserId === comment.author_id && (
              <span style={{ cursor: "pointer", color: "#E74C3C" }} onClick={handleDelete}>删除</span>
            )}
            {comment.like_count > 0 && <span>❤️ {comment.like_count}</span>}
          </div>

          {/* 子评论 */}
          {comment.replies?.length > 0 && (
            <div style={{ marginTop: 12, paddingLeft: 16, borderLeft: "2px solid #F5EDE0" }}>
              {comment.replies.map((r) => (
                <CommentItem key={r.id} comment={r} currentUserId={currentUserId} onReply={onReply} onRefresh={onRefresh} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
