"use client";

import { useState, useEffect } from "react";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
}

export default function AdminRbacPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users?pageSize=200");
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const changeRole = async (userId: string, newRole: string) => {
    if (!confirm(`确定将用户角色改为 "${newRole === "admin" ? "超级管理员" : "运营管理员"}"？`)) return;
    try {
      await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, role: newRole }),
      });
      fetchUsers();
    } catch (e) {
      console.error(e);
    }
  };

  type PermItem = { name: string; allow: boolean; note?: string };
  const permissions: Record<string, { label: string; desc: string; perms: PermItem[] }> = {
    admin: {
      label: "超级管理员",
      desc: "所有权限 - 用户管理、博客管理、评论管理、网站设置、自动发文",
      perms: [
        { name: "用户管理", allow: true },
        { name: "博客管理", allow: true },
        { name: "评论管理", allow: true },
        { name: "网站设置", allow: true },
        { name: "自动发文", allow: true },
        { name: "数据查看", allow: true },
      ],
    },
    operator: {
      label: "运营管理员",
      desc: "有限权限 - 可发文、删评论，不可删除用户",
      perms: [
        { name: "用户管理", allow: false, note: "仅查看" },
        { name: "博客管理", allow: true },
        { name: "评论管理", allow: true },
        { name: "网站设置", allow: false, note: "不可修改" },
        { name: "自动发文", allow: true },
        { name: "数据查看", allow: true },
      ],
    },
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: "bold", margin: 0 }}>权限管理（RBAC）</h2>
        <p style={{ fontSize: 13, color: "#666", margin: "8px 0 0" }}>
          管理用户角色和权限。当前系统设计两个角色：超级管理员（全部权限）和运营管理员（有限权限）。
        </p>
      </div>

      {/* 角色说明卡片 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {(["admin", "operator"] as const).map((roleKey) => {
          const role = permissions[roleKey];
          return (
            <div key={roleKey} style={{ background: "#fff", borderRadius: 8, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>
                {roleKey === "admin" ? "🛡️" : "🔧"} {role.label}
              </h3>
              <p style={{ fontSize: 12, color: "#666", margin: "0 0 12px" }}>{role.desc}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {role.perms.map((p) => (
                  <span key={p.name}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 4,
                      fontSize: 12,
                      background: p.allow ? "#f6ffed" : "#fff7e6",
                      color: p.allow ? "#389e0d" : "#d48806",
                    }}>
                    {p.allow ? "✅ " : "⛔ "} {p.name}
                    {p.note && <span style={{ fontSize: 11, opacity: 0.7 }}> ({p.note})</span>}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 用户角色列表 */}
      <div style={{ background: "#fff", borderRadius: 8, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <h3 style={{ fontSize: 15, fontWeight: 500, margin: 0, padding: "16px 20px", borderBottom: "1px solid #f0f0f0" }}>
          用户角色分配
        </h3>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#999" }}>加载中...</div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#999" }}>暂无用户</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa", borderBottom: "1px solid #f0f0f0" }}>
                <th style={thStyle}>用户</th>
                <th style={thStyle}>邮箱</th>
                <th style={thStyle}>当前角色</th>
                <th style={thStyle}>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, idx) => (
                <tr key={user.id} style={{ borderBottom: "1px solid #f0f0f0", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={tdStyle}>{user.name || "未设置"}</td>
                  <td style={tdStyle}><span style={{ fontSize: 12, color: "#999" }}>{user.email}</span></td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 12,
                      background: user.role === "admin" ? "#f0f5ff" : "#fff7e6",
                      color: user.role === "admin" ? "#1d39c4" : "#d48806",
                      fontWeight: 500,
                    }}>
                      {user.role === "admin" ? "超级管理员" : "运营管理员"}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <select
                      value={user.role}
                      onChange={(e) => changeRole(user.id, e.target.value)}
                      style={{ padding: "4px 8px", border: "1px solid #d9d9d9", borderRadius: 4, fontSize: 12, cursor: "pointer" }}>
                      <option value="admin">超级管理员</option>
                      <option value="operator">运营管理员</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "12px 16px", textAlign: "left", fontSize: 13, fontWeight: 500, color: "#666" };
const tdStyle: React.CSSProperties = { padding: "12px 16px", fontSize: 13 };