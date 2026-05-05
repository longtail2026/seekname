"use client";

import { useState, useEffect } from "react";

interface CommentItem {
  id: number;
  content: string;
  status: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null };
  post: { id: number; title: string };
}

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const pageSize = 20;

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/comments?page=${page}&pageSize=${pageSize}&status=${filterStatus}`);
      const data = await res.json();
      setComments(data.comments || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchComments(); }, [page, filterStatus]);

  const handleStatus = async (id: number, status: string) => {
    try {
      await fetch("/api/admin/comments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      fetchComments();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除该评论？")) return;
    try {
      await fetch(`/api/admin/comments?id=${id}`, { method: "DELETE" });
      fetchComments();
    } catch (e) {
      console.error(e);
    }
  };

  const handleBatchApprove = async () => {
    for (const id of selectedIds) {
      await fetch("/api/admin/comments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "approved" }),
      });
    }
    setSelectedIds([]);
    fetchComments();
  };

  const handleBatchSpam = async () => {
    for (const id of selectedIds) {
      await fetch("/api/admin/comments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "spam" }),
      });
    }
    setSelectedIds([]);
    fetchComments();
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === comments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(comments.map((c) => c.id));
    }
  };

  const statusStyle = (s: string) => {
    if (s === "pending") return { bg: "#fff7e6", color: "#d48806", text: "待审核" };
    if (s === "approved") return { bg: "#f6ffed", color: "#389e0d", text: "已通过" };
    if (s === "spam") return { bg: "#fff1f0", color: "#cf1322", text: "已屏蔽" };
    return { bg: "#f5f5f5", color: "#999", text: s };
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: "bold", margin: 0 }}>评论管理</h2>
      </div>

      {/* 筛选 + 批量操作 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          style={{ padding: "8px 12px", border: "1px solid #d9d9d9", borderRadius: 4, fontSize: 14 }}>
          <option value="">全部状态</option>
          <option value="pending">待审核</option>
          <option value="approved">已通过</option>
          <option value="spam">已屏蔽</option>
        </select>
        {selectedIds.length > 0 && (
          <>
            <span style={{ fontSize: 13, color: "#666" }}>已选 {selectedIds.length} 条</span>
            <button onClick={handleBatchApprove} style={{ padding: "6px 14px", background: "#52c41a", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 13 }}>批量通过</button>
            <button onClick={handleBatchSpam} style={{ padding: "6px 14px", background: "#fa8c16", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 13 }}>批量屏蔽</button>
          </>
        )}
      </div>

      {/* 列表 */}
      <div style={{ background: "#fff", borderRadius: 8, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fafafa", borderBottom: "1px solid #f0f0f0" }}>
              <th style={thStyle}><input type="checkbox" checked={selectedIds.length === comments.length && comments.length > 0} onChange={toggleSelectAll} /></th>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>评论人</th>
              <th style={thStyle}>文章</th>
              <th style={thStyle}>内容</th>
              <th style={thStyle}>状态</th>
              <th style={thStyle}>时间</th>
              <th style={thStyle}>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: 40, color: "#999" }}>加载中...</td></tr>
            ) : comments.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: 40, color: "#999" }}>暂无评论</td></tr>
            ) : comments.map((c, idx) => {
              const st = statusStyle(c.status);
              return (
                <tr key={c.id} style={{ borderBottom: "1px solid #f0f0f0", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={tdStyle}><input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelect(c.id)} /></td>
                  <td style={tdStyle}>{c.id}</td>
                  <td style={tdStyle}>{c.user?.name || c.user?.email || "匿名"}</td>
                  <td style={tdStyle}><div style={{ maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.post?.title || "未知"}</div></td>
                  <td style={tdStyle}><div style={{ maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.content}</div></td>
                  <td style={tdStyle}><span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 12, background: st.bg, color: st.color }}>{st.text}</span></td>
                  <td style={tdStyle}><span style={{ fontSize: 12, color: "#999" }}>{new Date(c.createdAt).toLocaleString("zh-CN")}</span></td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: 4 }}>
                      {c.status !== "approved" && <button onClick={() => handleStatus(c.id, "approved")} style={btnStyle}>通过</button>}
                      {c.status !== "spam" && <button onClick={() => handleStatus(c.id, "spam")} style={{ ...btnStyle, color: "#fa8c16" }}>屏蔽</button>}
                      <button onClick={() => handleDelete(c.id)} style={{ ...btnStyle, color: "#ff4d4f" }}>删除</button>
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

const thStyle: React.CSSProperties = { padding: "12px 16px", textAlign: "left", fontSize: 13, fontWeight: 500, color: "#666", whiteSpace: "nowrap" };
const tdStyle: React.CSSProperties = { padding: "12px 16px", fontSize: 13 };
const btnStyle: React.CSSProperties = { padding: "4px 10px", background: "#fff", border: "1px solid #d9d9d9", borderRadius: 4, cursor: "pointer", fontSize: 12 };