"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/layout/Header";

interface Post {
  id: number;
  title: string;
  slug: string;
  summary: string;
  cover_image?: string;
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

const HOT_TAGS = ["起名心得", "五行取名", "诗词起名", "典故解析", "宝宝起名", "改名故事", "名字测评"];

export default function BlogPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [showWriteModal, setShowWriteModal] = useState(false);
  const pageSize = 9;

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        keyword,
        tag: activeTag,
      });
      const res = await fetch(`/api/blog/posts?${params}`);
      const data = await res.json();
      setPosts(data.posts || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [page, keyword, activeTag]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div style={{ minHeight: "100vh", background: "#FFFCF7" }}>
      <Header />
      <div style={{ paddingTop: 60 }}>
        {/* 页头横幅 */}
        <div
          style={{
            background: "linear-gradient(135deg, #2D1B0E 0%, #4A2E18 100%)",
            padding: "48px 0 36px",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* 装饰纹理 */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "radial-gradient(circle at 20% 50%, rgba(232,106,23,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(212,148,26,0.06) 0%, transparent 50%)",
          }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 13, color: "#D4941A", letterSpacing: "0.2em", marginBottom: 10, fontFamily: "'Noto Serif SC', serif" }}>
              ─── 起名杂谈 ───
            </div>
            <h1 style={{ fontSize: 36, fontWeight: 700, color: "#FFFCF7", margin: "0 0 12px", fontFamily: "'Noto Serif SC', serif" }}>
              千年起名文化交流
            </h1>
            <p style={{ fontSize: 15, color: "rgba(255,252,247,0.65)", margin: "0 0 24px" }}>
              分享起名心得，传承文字智慧
            </p>
            {user && (
              <button
                onClick={() => setShowWriteModal(true)}
                style={{
                  padding: "10px 28px",
                  background: "linear-gradient(135deg, #E86A17 0%, #D55A0B 100%)",
                  color: "#FFF",
                  border: "none",
                  borderRadius: 24,
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: "'Noto Sans SC', sans-serif",
                  fontWeight: 500,
                  boxShadow: "0 4px 16px rgba(232,106,23,0.35)",
                }}
              >
                ✍️ 写文章
              </button>
            )}
          </div>
        </div>

        {/* 主体内容 */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
          {/* 搜索 + 标签筛选 */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 32, alignItems: "center" }}>
            <div style={{ position: "relative", flex: "0 0 280px" }}>
              <input
                type="text"
                placeholder="搜索文章..."
                value={keyword}
                onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
                style={{
                  width: "100%", height: 38, padding: "0 40px 0 14px",
                  borderRadius: 20, border: "1px solid #DDD0C0",
                  fontSize: 13, color: "#4A3428", outline: "none",
                  fontFamily: "'Noto Sans SC', sans-serif",
                  background: "#FFF",
                }}
              />
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#AAA", fontSize: 15 }}>🔍</span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: 1 }}>
              <button
                onClick={() => { setActiveTag(""); setPage(1); }}
                style={{
                  padding: "5px 14px", borderRadius: 16, border: "1px solid",
                  borderColor: activeTag === "" ? "#E86A17" : "#DDD0C0",
                  background: activeTag === "" ? "rgba(232,106,23,0.08)" : "transparent",
                  color: activeTag === "" ? "#E86A17" : "#666",
                  fontSize: 12, cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif",
                }}
              >全部</button>
              {HOT_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => { setActiveTag(tag === activeTag ? "" : tag); setPage(1); }}
                  style={{
                    padding: "5px 14px", borderRadius: 16, border: "1px solid",
                    borderColor: activeTag === tag ? "#E86A17" : "#DDD0C0",
                    background: activeTag === tag ? "rgba(232,106,23,0.08)" : "transparent",
                    color: activeTag === tag ? "#E86A17" : "#666",
                    fontSize: 12, cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif",
                  }}
                >{tag}</button>
              ))}
            </div>
          </div>

          {/* 统计 */}
          <div style={{ marginBottom: 20, fontSize: 13, color: "#999", fontFamily: "'Noto Sans SC', sans-serif" }}>
            共 {total} 篇文章{activeTag && `  ·  标签：${activeTag}`}
          </div>

          {/* 文章卡片列表 */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#AAA" }}>加载中...</div>
          ) : posts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#AAA" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
              <div>暂无文章，{user ? <span style={{ color: "#E86A17", cursor: "pointer" }} onClick={() => setShowWriteModal(true)}>来发第一篇吧</span> : "登录后可发布文章"}</div>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: 20,
              marginBottom: 40,
            }}>
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}

          {/* 分页 */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    width: 36, height: 36, borderRadius: 8,
                    border: "1px solid",
                    borderColor: p === page ? "#E86A17" : "#DDD0C0",
                    background: p === page ? "#E86A17" : "#FFF",
                    color: p === page ? "#FFF" : "#666",
                    cursor: "pointer", fontSize: 13,
                  }}
                >{p}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 写文章弹窗 */}
      {showWriteModal && <WriteModal onClose={() => { setShowWriteModal(false); fetchPosts(); }} />}
    </div>
  );
}

/* ─── 文章卡片 ─── */
function PostCard({ post }: { post: Post }) {
  return (
    <Link href={`/blog/${post.id}`} style={{ textDecoration: "none" }}>
      <div
        style={{
          background: "#FFF",
          borderRadius: 12,
          border: "1px solid #EEE8DD",
          overflow: "hidden",
          transition: "all 0.25s",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.boxShadow = "0 6px 24px rgba(44,24,16,0.1)";
          el.style.transform = "translateY(-3px)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.boxShadow = "none";
          el.style.transform = "translateY(0)";
        }}
      >
        {/* 封面图 */}
        {post.cover_image && (
          <img src={post.cover_image} alt="" style={{ width: "100%", height: 160, objectFit: "cover" }} />
        )}

        <div style={{ padding: "16px 18px" }}>
          {/* 标签 */}
          {post.tags?.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {post.tags.slice(0, 3).map((tag: string) => (
                <span key={tag} style={{
                  fontSize: 11, padding: "2px 8px", borderRadius: 10,
                  background: "rgba(232,106,23,0.08)", color: "#E86A17",
                  fontFamily: "'Noto Sans SC', sans-serif",
                }}>{tag}</span>
              ))}
            </div>
          )}

          {/* 标题 */}
          <h3 style={{
            fontSize: 15, fontWeight: 600, color: "#2D1B0E",
            margin: "0 0 8px", lineHeight: 1.5,
            fontFamily: "'Noto Serif SC', serif",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}>{post.title}</h3>

          {/* 摘要 */}
          {post.summary && (
            <p style={{
              fontSize: 13, color: "#888", margin: "0 0 12px", lineHeight: 1.6,
              fontFamily: "'Noto Sans SC', sans-serif",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}>{post.summary}</p>
          )}

          {/* 底部：作者 + 统计 */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {post.author_avatar ? (
                <img src={post.author_avatar} alt="" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <span style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: "linear-gradient(135deg, #E86A17 0%, #D4941A 100%)",
                  color: "#FFF", fontSize: 10, fontWeight: 700,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}>{(post.author_name || "匿名").charAt(0)}</span>
              )}
              <span style={{ fontSize: 12, color: "#999", fontFamily: "'Noto Sans SC', sans-serif" }}>{post.author_name}</span>
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#BBB" }}>
              <span>👁 {post.view_count}</span>
              <span>❤️ {post.like_count}</span>
              <span>💬 {post.comment_count}</span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#CCC", marginTop: 8, fontFamily: "'Noto Sans SC', sans-serif" }}>
            {new Date(post.created_at).toLocaleDateString("zh-CN")}
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ─── 写文章弹窗 ─── */
function WriteModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [summary, setSummary] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t) && tags.length < 5) {
      setTags([...tags, t]);
      setTagInput("");
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      setError("标题和内容不能为空");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/blog/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, summary, tags }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "发布失败");
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 3000,
      background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }} onClick={onClose}>
      <div
        style={{
          background: "#FFF", borderRadius: 16, padding: 32,
          width: "100%", maxWidth: 700, maxHeight: "90vh", overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: "0 0 24px", fontSize: 20, color: "#2D1B0E", fontFamily: "'Noto Serif SC', serif" }}>
          ✍️ 写文章
        </h2>

        <div style={{ marginBottom: 16 }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="文章标题..."
            style={{
              width: "100%", height: 44, padding: "0 14px",
              borderRadius: 8, border: "1px solid #DDD0C0",
              fontSize: 15, color: "#2D1B0E", outline: "none",
              fontFamily: "'Noto Serif SC', serif", boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="文章摘要（可选）..."
            style={{
              width: "100%", height: 38, padding: "0 14px",
              borderRadius: 8, border: "1px solid #DDD0C0",
              fontSize: 13, color: "#666", outline: "none",
              fontFamily: "'Noto Sans SC', sans-serif", boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="在这里写下你的起名心得、文化见解...（支持 Markdown 格式）"
            rows={12}
            style={{
              width: "100%", padding: "12px 14px",
              borderRadius: 8, border: "1px solid #DDD0C0",
              fontSize: 14, color: "#2D1B0E", outline: "none",
              fontFamily: "'Noto Sans SC', sans-serif",
              resize: "vertical", lineHeight: 1.7,
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* 标签 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              placeholder="添加标签（回车确认，最多5个）"
              style={{
                flex: 1, height: 34, padding: "0 12px",
                borderRadius: 8, border: "1px solid #DDD0C0",
                fontSize: 13, outline: "none", boxSizing: "border-box",
              }}
            />
            <button
              onClick={addTag}
              style={{
                padding: "0 16px", borderRadius: 8,
                border: "1px solid #E86A17", background: "transparent",
                color: "#E86A17", fontSize: 13, cursor: "pointer",
              }}
            >+ 添加</button>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {tags.map((tag) => (
              <span key={tag} style={{
                padding: "3px 10px", borderRadius: 12,
                background: "rgba(232,106,23,0.08)", color: "#E86A17",
                fontSize: 12, display: "flex", alignItems: "center", gap: 4,
              }}>
                {tag}
                <span style={{ cursor: "pointer", fontSize: 14 }} onClick={() => setTags(tags.filter((t) => t !== tag))}>×</span>
              </span>
            ))}
          </div>
        </div>

        {error && <div style={{ color: "#E74C3C", fontSize: 13, marginBottom: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 24px", borderRadius: 8,
              border: "1px solid #DDD0C0", background: "#FFF",
              color: "#666", fontSize: 14, cursor: "pointer",
            }}
          >取消</button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              padding: "10px 28px", borderRadius: 8,
              background: submitting ? "#CCC" : "linear-gradient(135deg, #E86A17 0%, #D55A0B 100%)",
              color: "#FFF", border: "none", fontSize: 14,
              cursor: submitting ? "not-allowed" : "pointer",
              fontWeight: 500,
            }}
          >{submitting ? "发布中..." : "发布文章"}</button>
        </div>
      </div>
    </div>
  );
}
