"use client";

import { useState, useEffect } from "react";

interface NameRecord {
  id: string;
  surname: string;
  gender: string;
  birthDate: string;
  style: string | null;
  expectations: string | null;
  results: any;
  status: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null } | null;
}

export default function AdminNamingRecordsPage() {
  const [records, setRecords] = useState<NameRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const pageSize = 20;

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/naming-records?${params}`);
      const data = await res.json();
      setRecords(data.records);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecords(); }, [page]);

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除该记录？")) return;
    try {
      await fetch(`/api/admin/naming-records?id=${id}`, { method: "DELETE" });
      fetchRecords();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearch = () => { setPage(1); fetchRecords(); };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: "bold", marginBottom: 24 }}>起名记录管理</h2>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="搜索姓氏/期望寓意"
          style={{ padding: "8px 12px", border: "1px solid #d9d9d9", borderRadius: 6, fontSize: 13, flex: 1 }}
        />
        <button onClick={handleSearch} style={{ padding: "8px 20px", background: "#1677ff", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>搜索</button>
        <span style={{ fontSize: 13, color: "#666" }}>共 {total} 条</span>
      </div>

      <div style={{ background: "#fff", borderRadius: 8, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#fafafa", borderBottom: "1px solid #f0f0f0" }}>
              <th style={{ padding: "12px 16px", textAlign: "left" }}>用户</th>
              <th style={{ padding: "12px 16px", textAlign: "left" }}>姓氏</th>
              <th style={{ padding: "12px 16px", textAlign: "left" }}>性别</th>
              <th style={{ padding: "12px 16px", textAlign: "left" }}>风格</th>
              <th style={{ padding: "12px 16px", textAlign: "left" }}>期望寓意</th>
              <th style={{ padding: "12px 16px", textAlign: "left" }}>状态</th>
              <th style={{ padding: "12px 16px", textAlign: "left" }}>时间</th>
              <th style={{ padding: "12px 16px", textAlign: "left" }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: "12px 16px" }}>{r.user?.name || r.user?.email || "匿名"}</td>
                <td style={{ padding: "12px 16px", fontWeight: 500 }}>{r.surname}</td>
                <td style={{ padding: "12px 16px" }}>{r.gender === "M" || r.gender === "男" ? "男" : "女"}</td>
                <td style={{ padding: "12px 16px", color: "#666" }}>{r.style || "-"}</td>
                <td style={{ padding: "12px 16px", color: "#666", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.expectations?.substring(0, 30) || "-"}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 12, background: r.status === "completed" ? "#f6ffed" : r.status === "generating" ? "#fff7e6" : "#fff1f0", color: r.status === "completed" ? "#389e0d" : r.status === "generating" ? "#d48806" : "#cf1322" }}>
                    {r.status === "completed" ? "已完成" : r.status === "generating" ? "生成中" : r.status}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", color: "#666", fontSize: 12 }}>{new Date(r.createdAt).toLocaleString("zh-CN")}</td>
                <td style={{ padding: "12px 16px" }}>
                  <button onClick={() => handleDelete(r.id)} style={{ padding: "4px 12px", border: "1px solid #ff4d4f", borderRadius: 4, background: "#fff", color: "#ff4d4f", cursor: "pointer", fontSize: 12 }}>删除</button>
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "#999" }}>暂无记录</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} style={{ padding: "6px 14px", border: "1px solid #d9d9d9", borderRadius: 4, background: "#fff", cursor: "pointer" }}>上一页</button>
          <span style={{ padding: "6px 0", fontSize: 13, color: "#666" }}>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} style={{ padding: "6px 14px", border: "1px solid #d9d9d9", borderRadius: 4, background: "#fff", cursor: "pointer" }}>下一页</button>
        </div>
      )}
    </div>
  );
}