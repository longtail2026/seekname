"use client";

import { useState, useEffect } from "react";

interface DashboardData {
  todayUsers: number;
  todayNameRecords: number;
  todayBlogViews: number;
  pendingComments: number;
  totalUsers: number;
  totalPosts: number;
  autoBlogLastRun: string | null;
  autoBlogEnabled: boolean;
  recentComments: any[];
  recentLogs: any[];
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ textAlign: "center", padding: 60, color: "#999" }}>加载中...</div>;
  }

  if (!data) {
    return <div style={{ textAlign: "center", padding: 60, color: "#999" }}>暂无数据</div>;
  }

  const cards = [
    { label: "今日注册用户", value: data.todayUsers, color: "#1890ff", icon: "👤" },
    { label: "今日起名次数", value: data.todayNameRecords, color: "#52c41a", icon: "📝" },
    { label: "今日博客访问", value: data.todayBlogViews, color: "#722ed1", icon: "👁️" },
    { label: "待审核评论", value: data.pendingComments, color: "#fa8c16", icon: "💬" },
    { label: "总用户数", value: data.totalUsers, color: "#13c2c2", icon: "👥" },
    { label: "已发布文章", value: data.totalPosts, color: "#eb2f96", icon: "📰" },
  ];

  const statusStyle = (status: string) => {
    const map: Record<string, { bg: string; color: string; text: string }> = {
      pending: { bg: "#fff7e6", color: "#d48806", text: "待审核" },
      approved: { bg: "#f6ffed", color: "#389e0d", text: "已通过" },
      spam: { bg: "#fff1f0", color: "#cf1322", text: "已屏蔽" },
      success: { bg: "#f6ffed", color: "#389e0d", text: "成功" },
      failed: { bg: "#fff1f0", color: "#cf1322", text: "失败" },
    };
    return map[status] || { bg: "#f5f5f5", color: "#999", text: status };
  };

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: "bold", marginBottom: 24 }}>控制台</h2>

      {/* 统计卡片 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        {cards.map((card) => (
          <div
            key={card.label}
            style={{
              background: "#fff",
              borderRadius: 8,
              padding: "20px 24px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              borderLeft: `4px solid ${card.color}`,
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>{card.icon}</div>
            <div style={{ fontSize: 28, fontWeight: "bold", color: card.color }}>
              {card.value}
            </div>
            <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* 自动发文状态 */}
      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          padding: 16,
          marginBottom: 24,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 24 }}>🤖</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>
            自动发文引擎：
            <span style={{ color: data.autoBlogEnabled ? "#52c41a" : "#999" }}>
              {data.autoBlogEnabled ? "已开启" : "已关闭"}
            </span>
          </div>
          {data.autoBlogLastRun && (
            <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
              最近一次执行：{new Date(data.autoBlogLastRun).toLocaleString("zh-CN")}
            </div>
          )}
        </div>
      </div>

      {/* 最近评论和日志 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* 最近评论 */}
        <div style={{ background: "#fff", borderRadius: 8, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <h3 style={{ fontSize: 16, fontWeight: 500, margin: "0 0 12px" }}>最新评论</h3>
          {data.recentComments.length === 0 ? (
            <div style={{ color: "#999", fontSize: 13, padding: 20, textAlign: "center" }}>暂无评论</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.recentComments.map((c: any) => {
                const st = statusStyle(c.status);
                return (
                  <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f5f5f5" }}>
                    <div>
                      <div style={{ fontSize: 13 }}>
                        <strong>{c.user?.name || c.user?.email || "匿名"}</strong> 评论了 <em>{c.post?.title || "未知文章"}</em>
                      </div>
                      <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>
                        {c.content?.substring(0, 60)}{c.content?.length > 60 ? "..." : ""}
                      </div>
                    </div>
                    <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 12, background: st.bg, color: st.color, whiteSpace: "nowrap" }}>
                      {st.text}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 最近发文日志 */}
        <div style={{ background: "#fff", borderRadius: 8, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <h3 style={{ fontSize: 16, fontWeight: 500, margin: "0 0 12px" }}>自动发文日志</h3>
          {data.recentLogs.length === 0 ? (
            <div style={{ color: "#999", fontSize: 13, padding: 20, textAlign: "center" }}>暂无记录</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.recentLogs.map((log: any) => {
                const st = statusStyle(log.status);
                return (
                  <div key={log.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f5f5f5" }}>
                    <div style={{ fontSize: 13 }}>
                      <div>{log.sourceTitle || log.sourceUrl?.substring(0, 40) || "未知来源"}</div>
                      <div style={{ fontSize: 12, color: "#999" }}>
                        {new Date(log.createdAt).toLocaleString("zh-CN")}
                        {log.duration && ` · ${log.duration}秒`}
                      </div>
                    </div>
                    <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 12, background: st.bg, color: st.color, whiteSpace: "nowrap" }}>
                      {st.text}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}