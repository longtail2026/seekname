"use client";

import { useState, useEffect } from "react";

interface Post {
  id: number;
  title: string;
  category: string;
  status: string;
  isPinned: boolean;
  createdAt: string;
  publishedAt: string | null;
  coverImage: string | null;
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [form, setForm] = useState({ title: "", category: "起名知识", content: "", status: "draft", isPinned: false, coverImage: "" });

  const pageSize = 20;

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/posts?page=${page}&pageSize=${pageSize}&search=${search}`);
      const data = await res.json();
      setPosts(data.posts || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPosts(); }, [page, search]);

  const handleSave = async () => {
    const method = editingPost ? "PUT" : "POST";
    const body = editingPost ? { ...form, id: editingPost.id } : form;
    try {
      const res = await fetch("/api/admin/posts", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowEditor(false);
        setEditingPost(null);
        setForm({ title: "", category: "起名知识", content: "", status: "draft", isPinned: false, coverImage: "" });
        fetchPosts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除该文章？")) return;
    try {
      await fetch(`/api/admin/posts?id=${id}`, { method: "DELETE" });
      fetchPosts();
    } catch (e) {
      console.error(e);
    }
  };

  const handlePin = async (id: number, isPinned: boolean) => {
    try {
      await fetch("/api/admin/posts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isPinned: !isPinned }),
      });
      fetchPosts();
    } catch (e) {
      console.error(e);
    }
  };

  const categories = ["起名知识", "英文知识", "公司起名", "跨境电商", "宝宝起名", "艺名笔名"];

  const statusStyle = (s: string) => {
    if (s === "draft") return { bg: "#fff7e6", color: "#d48806", text: "草稿" };
    if (s === "published") return { bg: "#f6ffed", color: "#389e0d", text: "已发布" };
    return { bg: "#f5f5f5", color: "#999", text: s };
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: "bold", margin: 0 }}>博客管理</h2>
        <button onClick={() => { setEditingPost(null); setForm({ title: "", category: "起名知识", content: "", status: "draft", isPinned: false, coverImage: "" }); setShowEditor(true); }}
          style={{ padding: "8px 20px", background: "#1890ff", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
          + 新增文章
        </button>
      </div>

      {/* 搜索 */}
      <div style={{ marginBottom: 16 }}>
        <input placeholder="搜索文章标题..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ width: 300, padding: "8px 12px", border: "1px solid #d9d9d9", borderRadius: 4, fontSize: 14 }} />
      </div>

      {/* 编辑器弹窗 */}
      {showEditor && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 8, width: 800, maxHeight: "90vh", overflow: "auto", padding: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 18 }}>{editingPost ? "编辑文章" : "新增文章"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input placeholder="标题" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                style={{ padding: "8px 12px", border: "1px solid #d9d9d9", borderRadius: 4, fontSize: 14 }} />
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                style={{ padding: "8px 12px", border: "1px solid #d9d9d9", borderRadius: 4, fontSize: 14 }}>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <textarea placeholder="内容（支持 HTML）" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
                style={{ padding: "8px 12px", border: "1px solid #d9d9d9", borderRadius: 4, fontSize: 14, minHeight: 200, fontFamily: "monospace" }} />
              <input placeholder="封面图URL（可选）" value={form.coverImage} onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
                style={{ padding: "8px 12px", border: "1px solid #d9d9d9", borderRadius: 4, fontSize: 14 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  style={{ padding: "8px 12px", border: "1px solid #d9d9d9", borderRadius: 4, fontSize: 14 }}>
                  <option value="draft">草稿</option>
                  <option value="published">直接发布</option>
                </select>
                <label style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 4 }}>
                  <input type="checkbox" checked={form.isPinned} onChange={(e) => setForm({ ...form, isPinned: e.target.checked })} />
                  置顶
                </label>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                <button onClick={() => { setShowEditor(false); setEditingPost(null); }}
                  style={{ padding: "8px 20px", background: "#fff", border: "1px solid #d9d9d9", borderRadius: 4, cursor: "pointer" }}>取消</button>
                <button onClick={handleSave}
                  style={{ padding: "8px 20px", background: "#1890ff", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>
                  {editingPost ? "保存修改" : "创建"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 列表 */}
      <div style={{ background: "#fff", borderRadius: 8, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fafafa", borderBottom: "1px solid #f0f0f0" }}>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>标题</th>
              <th style={thStyle}>分类</th>
              <th style={thStyle}>状态</th>
              <th style={thStyle}>置顶</th>
              <th style={thStyle}>发布时间</th>
              <th style={thStyle}>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "#999" }}>加载中...</td></tr>
            ) : posts.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "#999" }}>暂无文章</td></tr>
            ) : posts.map((post, idx) => {
              const st = statusStyle(post.status);
              return (
                <tr key={post.id} style={{ borderBottom: "1px solid #f0f0f0", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={tdStyle}>{post.id}</td>
                  <td style={tdStyle}><div style={{ maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.title}</div></td>
                  <td style={tdStyle}><span style={{ padding: "2px 8px", background: "#f0f5ff", borderRadius: 4, fontSize: 12 }}>{post.category}</span></td>
                  <td style={tdStyle}><span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 12, background: st.bg, color: st.color }}>{st.text}</span></td>
                  <td style={tdStyle}>{post.isPinned ? "📌" : "-"}</td>
                  <td style={tdStyle}><span style={{ fontSize: 12, color: "#999" }}>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("zh-CN") : "-"}</span></td>
                    <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={async () => {
                        setEditingPost(post);
                        // 获取完整文章内容
                        try {
                          const res = await fetch(`/api/admin/posts?id=${post.id}`);
                          if (res.ok) {
                            const data = await res.json();
                            const p = data.post || data;
                            setForm({
                              title: p.title,
                              category: p.category,
                              content: p.content || "",
                              status: p.status,
                              isPinned: p.isPinned,
                              coverImage: p.coverImage || "",
                            });
                          } else {
                            setForm({ title: post.title, category: post.category, content: "", status: post.status, isPinned: post.isPinned, coverImage: post.coverImage || "" });
                          }
                        } catch {
                          setForm({ title: post.title, category: post.category, content: "", status: post.status, isPinned: post.isPinned, coverImage: post.coverImage || "" });
                        }
                        setShowEditor(true);
                      }} style={btnStyle}>编辑</button>
                      {post.status === "draft" && (
                        <button onClick={async () => {
                          try {
                            await fetch("/api/admin/posts", {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: post.id, status: "published" }),
                            });
                            fetchPosts();
                          } catch (e) {
                            console.error(e);
                          }
                        }} style={{ ...btnStyle, background: "#52c41a", color: "#fff", border: "1px solid #52c41a" }}>发布</button>
                      )}
                      <button onClick={() => handlePin(post.id, post.isPinned)} style={btnStyle}>{post.isPinned ? "取消置顶" : "置顶"}</button>
                      <button onClick={() => handleDelete(post.id)} style={{ ...btnStyle, color: "#ff4d4f" }}>删除</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {total > pageSize && (
        <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 4 }}>
          {Array.from({ length: Math.ceil(total / pageSize) }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)}
              style={{ padding: "6px 12px", background: p === page ? "#1890ff" : "#fff", color: p === page ? "#fff" : "#333", border: "1px solid #d9d9d9", borderRadius: 4, cursor: "pointer" }}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "12px 16px", textAlign: "left", fontSize: 13, fontWeight: 500, color: "#666" };
const tdStyle: React.CSSProperties = { padding: "12px 16px", fontSize: 13 };
const btnStyle: React.CSSProperties = { padding: "4px 10px", background: "#fff", border: "1px solid #d9d9d9", borderRadius: 4, cursor: "pointer", fontSize: 12 };