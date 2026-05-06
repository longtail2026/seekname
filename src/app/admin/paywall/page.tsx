"use client";

import { useState, useEffect } from "react";

interface PaywallConfig {
  paywallEnabled: boolean;
  paywallPrice: number;
}

export default function AdminPaywallPage() {
  const [config, setConfig] = useState<PaywallConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/site-config");
      if (res.ok) {
        const data = await res.json();
        setConfig({
          paywallEnabled: data.paywallEnabled ?? false,
          paywallPrice: data.paywallPrice ?? 9.9,
        });
      } else {
        setMessage({ type: "error", text: "加载配置失败" });
      }
    } catch {
      setMessage({ type: "error", text: "网络错误" });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/site-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "配置已保存" });
      } else {
        setMessage({ type: "error", text: "保存失败" });
      }
    } catch {
      setMessage({ type: "error", text: "网络错误" });
    }
    setSaving(false);
  };

  if (loading) {
    return <div style={{ padding: 24 }}>加载中...</div>;
  }

  if (!config) {
    return <div style={{ padding: 24 }}>无法加载配置</div>;
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 24, background: "#fff", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: "#1a1a1a" }}>
        收费设置
      </h1>
      <p style={{ fontSize: 13, color: "#888", marginBottom: 24, lineHeight: "1.6" }}>
        开启后，起名结果中前3个名字默认隐藏（需付费解锁），第4个及以后免费展示。
        默认关闭即为免费模式，所有名字全部展示。
      </p>

      <div style={{ borderBottom: "1px solid #f0f0f0", padding: "20px 0" }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12, color: "#333" }}>收费开关</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            onClick={() => setConfig(c => c ? { ...c, paywallEnabled: !c.paywallEnabled } : c)}
            style={{
              position: "relative",
              display: "inline-block",
              width: 44,
              height: 24,
              cursor: "pointer",
              background: config.paywallEnabled ? "#1890ff" : "#d9d9d9",
              borderRadius: 12,
              transition: "background 0.3s",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 2,
                left: config.paywallEnabled ? 22 : 2,
                width: 20,
                height: 20,
                background: "#fff",
                borderRadius: "50%",
                transition: "left 0.3s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }}
            />
          </div>
          <span style={{ fontSize: 14, color: config.paywallEnabled ? "#1890ff" : "#999" }}>
            {config.paywallEnabled ? "已开启" : "已关闭"}
          </span>
        </div>
      </div>

      <div style={{ borderBottom: "1px solid #f0f0f0", padding: "20px 0" }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12, color: "#333" }}>价格设置</h2>
        <div>
          <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "#333", marginBottom: 8 }}>
            单次解锁价格（元）
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={config.paywallPrice}
            onChange={(e) => setConfig(c => c ? { ...c, paywallPrice: parseFloat(e.target.value) || 0 } : c)}
            style={{
              width: "100%",
              maxWidth: 200,
              padding: "8px 12px",
              border: "1px solid #d9d9d9",
              borderRadius: 4,
              fontSize: 14,
            }}
          />
          <p style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
            用户点击隐藏名字时，弹出三个付费二维码（微信、支付宝、PayPal）显示此价格
          </p>
        </div>
      </div>

      <div style={{ marginTop: 24, display: "flex", gap: 12, alignItems: "center" }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "10px 32px",
            background: saving ? "#d9d9d9" : "#1890ff",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            fontSize: 15,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "保存中..." : "保存配置"}
        </button>
        {message && (
          <span style={{ fontSize: 13, color: message.type === "success" ? "#52c41a" : "#ff4d4f" }}>
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
}