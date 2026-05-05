"use client";

import { useState, useEffect } from "react";

interface Config {
  id: number;
  isEnabled: boolean;
  frequency: string;
  crawlKeywords: string[];
  requireReview: boolean;
  defaultCategory: string;
  writingStyle: string;
}

interface LogItem {
  id: number;
  sourceUrl: string;
  sourceTitle: string | null;
  status: string;
  duration: number | null;
  createdAt: string;
  errorMessage: string | null;
}

export default function AutoBlogPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [triggerKeyword, setTriggerKeyword] = useState("");
  const [form, setForm] = useState({
    isEnabled: false,
    frequency: "daily",
    crawlKeywords: "起名,英文名,公司命名",
    requireReview: true,
    defaultCategory: "起名知识",
    writingStyle: "formal",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auto-blog");
      const data = await res.json();
      setConfig(data.config);
      setLogs(data.logs || []);
      if (data.config) {
        setForm({
          isEnabled: data.config.isEnabled,
          frequency: data.config.frequency,
          crawlKeywords: (data.config.crawlKeywords || []).join(","),
          requireReview: data.config.requireReview,
          defaultCategory: data.config.defaultCategory,
          writingStyle: data.config.writingStyle,
        });
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/auto-blog", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          crawlKeywords: form.crawlKeywords.split(",").map((k) => k.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        alert("配置已保存");
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      const res = await fetch("/api/admin/auto-blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: triggerKeyword || undefined }),
      });
      const data = await res.json();
      alert(data.message || "已触发");
      setTriggerKeyword("");
      fetchData();
    } catch (e) {
      console.error(e);
    }
    setTriggering(false);
  };

  const statusStyle = (s: string) => {
    const map: Record<string, { bg: string; color: string; text: string }> = {
      pending: { bg: "#fff7e6", color: "#d48806", text: "执行中" },
      success: { bg: "#f6ffed", color: "#389e0d", text: "成功" },
      failed: { bg: "#fff1f0", color: "#cf1322", text: "失败" },
    };
    return map[s] || { bg: "#f5f5f5", color: "#999", text: s };
  };

  const categories = ["起名知识", "英文知识", "公司起名", "跨境电商", "宝宝起名", "艺名笔名"];

  if (loading) {
    return <div style={{ textAlign: "center", padding: 60, color: "#999" }}>加载中...</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: "bold", margin: 0 }}>AI 自动博客发布引擎</h2>
      </div>

      {/* 状态卡片 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ background: form.isEnabled ? "#f6ffed" : "#fff7e6", borderRadius: 8, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
            引擎状态：<span style={{ color: form.isEnabled ? "#52c41a" : "#d48806", fontWeight: "bold" }}>{form.isEnabled ? "🟢 已开启" : "🟡 已关闭"}</span>
          </div>
          <div style={{ fontSize: 12, color: "#666" }}>
            发布频率：{form.frequency === "daily" ? "每天 1 次" : form.frequency}
          </div>
        </div>
        <div style={{ background: "#f0f5ff", borderRadius: 8, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
            爬取关键词：{form.crawlKeywords}
          </div>
          <div style={{ fontSize: 12, color: "#666" }}>
            默认分类：{form.defaultCategory} · 文风：{form.writingStyle === "formal" ? "正式" : form.writingStyle === "casual" ? "通俗" : "专业"}
          </div>
        </div>
      </div>

      {/* 配置区 */}
      <div style={{ background: "#fff", borderRadius: 8, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 500, margin: "0 0 16px" }}>⚙️ 基本配置</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ fontSize: 14, flex: "0 0 120px" }}>引擎开关</label>
            <label style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 4 }}>
              <input type="checkbox" checked={form.isEnabled} onChange={(e) => setForm({ ...form, isEnabled: e.target.checked })} />
              {form.isEnabled ? "已开启" : "已关闭"}
            </label>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ fontSize: 14, flex: "0 0 120px" }}>发布频率</label>
            <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}
              style={{ padding: "8px 12px", border: "1px solid #d9d9d9", borderRadius: 4, fontSize: 14 }}>
              <option value="daily">每天 1 次</option>
              <option value="every_other_day">每 2 天 1 次</option>
              <option value="weekly">每周 1 次</option>
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ fontSize: 14, flex: "0 0 120px" }}>爬取关键词</label>
            <input value={form.crawlKeywords} onChange={(e) => setForm({ ...form, crawlKeywords: e.target.value })}
              placeholder="多个关键词用逗号分隔"
              style={{ flex: 1, padding: "8px 12px", border: "1px solid #d9d9d9", borderRadius: 4, fontSize: 14 }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ fontSize: 14, flex: "0 0 120px" }}>人工审核</label>
            <label style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 4 }}>
              <input type="checkbox" checked={form.requireReview} onChange={(e) => setForm({ ...form, requireReview: e.target.checked })} />
              发布前需要人工审核（推荐）
            </label>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ fontSize: 14, flex: "0 0 120px" }}>默认分类</label>
            <select value={form.defaultCategory} onChange={(e) => setForm({ ...form, defaultCategory: e.target.value })}
              style={{ padding: "8px 12px", border: "1px solid #d9d9d9", borderRadius: 4, fontSize: 14 }}>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ fontSize: 14, flex: "0 0 120px" }}>AI 文风</label>
            <select value={form.writingStyle} onChange={(e) => setForm({ ...form, writingStyle: e.target.value })}
              style={{ padding: "8px 12px", border: "1px solid #d9d9d9", borderRadius: 4, fontSize: 14 }}>
              <option value="formal">正式</option>
              <option value="casual">通俗</option>
              <option value="professional">专业</option>
            </select>
          </div>
          <div style={{ marginTop: 8 }}>
            <button onClick={handleSave} disabled={saving}
              style={{ padding: "10px 24px", background: "#1890ff", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>
              {saving ? "保存中..." : "保存配置"}
            </button>
          </div>
        </div>
      </div>

      {/* 手动触发 */}
      <div style={{ background: "#fff", borderRadius: 8, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 500, margin: "0 0 16px" }}>▶️ 手动触发一次</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input placeholder="输入爬取关键词（可选）" value={triggerKeyword} onChange={(e) => setTriggerKeyword(e.target.value)}
            style={{ padding: "8px 12px", border: "1px solid #d9d9d9", borderRadius: 4, fontSize: 14, flex: 1, maxWidth: 300 }} />
          <button onClick={handleTrigger} disabled={triggering}
            style={{ padding: "8px 20px", background: "#52c41a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>
            {triggering ? "执行中..." : "立即爬取 + AI 改写"}
          </button>
        </div>
        <div style={{ fontSize: 12, color: "#999", marginTop: 8 }}>
          注意：当前手动触发仅为占位，需接入实际的爬虫和 DeepSeek API 调用逻辑。
        </div>
      </div>

      {/* 执行日志 */}
      <div style={{ background: "#fff", borderRadius: 8, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <h3 style={{ fontSize: 16, fontWeight: 500, margin: "0 0 16px" }}>📋 执行日志（最近 50 条）</h3>
        {logs.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#999", fontSize: 13 }}>暂无执行记录</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa", borderBottom: "1px solid #f0f0f0" }}>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>来源</th>
                <th style={thStyle}>状态</th>
                <th style={thStyle}>耗时</th>
                <th style={thStyle}>时间</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, idx) => {
                const st = statusStyle(log.status);
                return (
                  <tr key={log.id} style={{ borderBottom: "1px solid #f0f0f0", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={tdStyle}>{log.id}</td>
                    <td style={tdStyle}>
                      <div style={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {log.sourceTitle || log.sourceUrl}
                      </div>
                    </td>
                    <td style={tdStyle}><span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 12, background: st.bg, color: st.color }}>{st.text}</span></td>
                    <td style={tdStyle}><span style={{ fontSize: 12, color: "#999" }}>{log.duration ? `${log.duration}秒` : "-"}</span></td>
                    <td style={tdStyle}><span style={{ fontSize: 12, color: "#999" }}>{new Date(log.createdAt).toLocaleString("zh-CN")}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "12px 16px", textAlign: "left", fontSize: 13, fontWeight: 500, color: "#666" };
const tdStyle: React.CSSProperties = { padding: "12px 16px", fontSize: 13 };