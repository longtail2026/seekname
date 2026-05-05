"use client";

import { useState, useEffect } from "react";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  status: string;
  adminRole: string | null;
  vipLevel: string | null;
  points: number;
  createdAt: string;
  _count: { nameRecords: number; comments: number; blogPosts: number };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState<{ user: User; name: string; status: string; role: string } | null>(null);
  const pageSize = 20;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setUsers(data.users);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [page, statusFilter]);

  const handleSearch = () => { setPage(1); fetchUsers(); };

  const handleEdit = async () => {
    if (!editModal) return;
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editModal.user.id,
          name: editModal.name,
          status: editModal.status,
          adminRole: editModal.role || null,
        }),
      });
      if (res.ok) {
        setEditModal(null);
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除该用户？此操作不可恢复！")) return;
    try {
      await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
      fetchUsers();
    } catch (e) {
      console.error(e);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: "bold", marginBottom: 24 }}>用户管理</h2>

      {/* 搜索栏 */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="搜索昵称/邮箱/手机号"
          style={{ padding: "8px 12px", border: "1px solid #d9d9d9", borderRadius: 6, fontSize: 13, flex: 1 }}
        />
        <button onClick={handleSearch} style={{ padding: "8px 20px", background: "#1677ff", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
          搜索
        </button>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ padding: "8px 12px", border: "1px solid #d9d9d9", borderRadius: 6, fontSize: 13 }}
        >
          <option value="">全部状态</option>
          <option value="active">正常</option>
          <option value="inactive">未激活</option>
          <option value="disabled">禁用</option>
        </select>
        <span style={{ fontSize: 13, color: "#666" }}>共 {total} 条</span>
      </div>

      {/* 表格 */}
      <div style={{ background: "#fff", borderRadius: 8, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#fafafa", borderBottom: "1px solid #f0f0f0" }}>
              <th style={{ padding: "12px 16px", textAlign: "left" }}>ID</th>
              <th style={{ padding: "12px 16px", textAlign: "left" }}>昵称</th>
              <th style={{ padding: "12px 16px", textAlign: "left" }}>邮箱</th>
              <th style={{ padding: "12px 16px", textAlign: "left" }}>注册时间</th>
              <th style={{ padding: "12px 16px", textAlign: "left" }}>角色</th>
              <th style={{ padding: "12px 16px", textAlign: "left" }}>状态</th>
              <th style={{ padding: "12px 16px", textAlign: "left" }}>数据</th>
              <th style={{ padding: "12px 16px", textAlign: "left" }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: "12px 16px", color: "#999" }}>{u.id.substring(0, 8)}...</td>
                <td style={{ padding: "12px 16px", fontWeight: 500 }}>{u.name || "-"}</td>
                <td style={{ padding: "12px 16px", color: "#666" }}>{u.email || "-"}</td>
                <td style={{ padding: "12px 16px", color: "#666" }}>{new Date(u.createdAt).toLocaleDateString("zh-CN")}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 12, background: u.adminRole === "admin" ? "#f6ffed" : "#e6f7ff", color: u.adminRole === "admin" ? "#389e0d" : "#1890ff" }}>
                    {u.adminRole === "admin" ? "超级管理员" : u.adminRole === "operator" ? "运营" : "普通用户"}
                  </span>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 12, background: u.status === "active" ? "#f6ffed" : u.status === "disabled" ? "#fff1f0" : "#fff7e6", color: u.status === "active" ? "#389e0d" : u.status === "disabled" ? "#cf1322" : "#d48806" }}>
                    {u.status === "active" ? "正常" : u.status === "disabled" ? "禁用" : "未激活"}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", color: "#666", fontSize: 12 }}>
                  起名 {u._count.nameRecords} / 评论 {u._count.comments}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <button
                    onClick={() => setEditModal({ user: u, name: u.name || "", status: u.status, role: u.adminRole || "" })}
                    style={{ padding: "4px 12px", border: "1px solid #d9d9d9", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: 12, marginRight: 6 }}
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(u.id)}
                    style={{ padding: "4px 12px", border: "1px solid #ff4d4f", borderRadius: 4, background: "#fff", color: "#ff4d4f", cursor: "pointer", fontSize: 12 }}
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: 40, textAlign: "center", color: "#999" }}>暂无用户</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} style={{ padding: "6px 14px", border: "1px solid #d9d9d9", borderRadius: 4, background: "#fff", cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.5 : 1 }}>上一页</button>
          <span style={{ padding: "6px 0", fontSize: 13, color: "#666" }}>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} style={{ padding: "6px 14px", border: "1px solid #d9d9d9", borderRadius: 4, background: "#fff", cursor: page >= totalPages ? "not-allowed" : "pointer", opacity: page >= totalPages ? 0.5 : 1 }}>下一页</button>
        </div>
      )}

      {/* 编辑弹窗 */}
      {editModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 440, maxWidth: "90vw" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>编辑用户</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 4, fontSize: 13, color: "#666" }}>昵称</label>
              <input value={editModal.name} onChange={(e) => setEditModal({ ...editModal, name: e.target.value })} style={{ width: "100%", padding: "8px 12px", border: "1px solid #d9d9d9", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 4, fontSize: 13, color: "#666" }}>状态</label>
              <select value={editModal.status} onChange={(e) => setEditModal({ ...editModal, status: e.target.value })} style={{ width: "100%", padding: "8px 12px", border: "1px solid #d9d9d9", borderRadius: 6, fontSize: 13 }}>
                <option value="active">正常</option>
                <option value="inactive">未激活</option>
                <option value="disabled">禁用</option>
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 4, fontSize: 13, color: "#666" }}>角色</label>
              <select value={editModal.role} onChange={(e) => setEditModal({ ...editModal, role: e.target.value })} style={{ width: "100%", padding: "8px 12px", border: "1px solid #d9d9d9", borderRadius: 6, fontSize: 13 }}>
                <option value="">普通用户</option>
                <option value="operator">运营管理员</option>
                <option value="admin">超级管理员</option>
              </select>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setEditModal(null)} style={{ padding: "8px 20px", border: "1px solid #d9d9d9", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 13 }}>取消</button>
              <button onClick={handleEdit} style={{ padding: "8px 20px", background: "#1677ff", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}