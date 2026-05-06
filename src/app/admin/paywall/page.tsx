"use client";

import { useState, useEffect } from "react";

// 所有可定价项目的常量定义（与 site-config.ts 保持一致）
const CATEGORY_PRICING_ITEMS: { key: string; label: string; defaultPrice: number; range?: string }[] = [
  { key: "personal",         label: "宝宝起名・成人改名",       defaultPrice: 39 },
  { key: "chinese_en_name",  label: "中国人起英文名",          defaultPrice: 19 },
  { key: "foreigner_name",   label: "外国人起中文名",          defaultPrice: 29 },
  { key: "social_name",      label: "社交网名・游戏ID",        defaultPrice: 9.9 },
  { key: "work_name",        label: "艺名・笔名・主播名",      defaultPrice: 39 },
  { key: "company_name",     label: "公司・品牌・店铺起名",    defaultPrice: 59,  range: "59–99" },
  { key: "cross_border_en",  label: "跨境电商品牌英文名",      defaultPrice: 69,  range: "69–99" },
  { key: "pet",              label: "宠物起名",                defaultPrice: 9.9 },
  { key: "literary_work",    label: "文艺作品起名",            defaultPrice: 39 },
  { key: "evaluate",         label: "好名测试（打分）",        defaultPrice: 9.9 },
];

interface CategoryPrices {
  [key: string]: number;
}

interface PaywallConfig {
  paywallEnabled: boolean;
  paywallPrice: number;
  categoryPrices: CategoryPrices;
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
          categoryPrices: data.categoryPrices ?? {},
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
        body: JSON.stringify({
          paywallEnabled: config.paywallEnabled,
          categoryPrices: config.categoryPrices,
        }),
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

  const handlePriceChange = (key: string, value: string) => {
    if (!config) return;
    const price = parseFloat(value);
    setConfig({
      ...config,
      categoryPrices: {
        ...config.categoryPrices,
        [key]: isNaN(price) ? 0 : price,
      },
    });
  };

  const getPrice = (key: string, defaultPrice: number): string => {
    if (!config) return String(defaultPrice);
    const saved = config.categoryPrices[key];
    if (saved !== undefined && saved > 0) return String(saved);
    return String(defaultPrice);
  };

  if (loading) {
    return <div style={{ padding: 24 }}>加载中...</div>;
  }

  if (!config) {
    return <div style={{ padding: 24 }}>无法加载配置</div>;
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          padding: 24,
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: "#1a1a1a" }}>
          收费设置
        </h1>
        <p style={{ fontSize: 13, color: "#888", marginBottom: 24, lineHeight: "1.6" }}>
          开启后，各项目的起名结果中前3个名字默认隐藏（需付费解锁）。可分别设置不同项目的价格。
          关闭即为免费模式，所有名字全部展示。
        </p>

        {/* 收费开关 */}
        <div
          style={{
            borderBottom: "1px solid #f0f0f0",
            padding: "20px 0",
            marginBottom: 20,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12, color: "#333" }}>
            收费开关
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              onClick={() =>
                setConfig((c) =>
                  c ? { ...c, paywallEnabled: !c.paywallEnabled } : c
                )
              }
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
            <span
              style={{
                fontSize: 14,
                color: config.paywallEnabled ? "#1890ff" : "#999",
              }}
            >
              {config.paywallEnabled ? "已开启" : "已关闭"}
            </span>
          </div>
        </div>

        {/* 分类定价表 */}
        <div style={{ marginBottom: 24 }}>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 500,
              marginBottom: 16,
              color: "#333",
            }}
          >
            各项目价格设置（元）
          </h2>
          <p
            style={{
              fontSize: 12,
              color: "#999",
              marginBottom: 16,
              lineHeight: "1.5",
            }}
          >
            设置各项目的单次解锁价格。设置后对应页面的付费弹窗将显示对应价格。
            <br />
            基础参考定价（最容易成交）：
          </p>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
            }}
          >
            <thead>
              <tr style={{ background: "#fafafa" }}>
                <th
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    borderBottom: "2px solid #e8e8e8",
                    fontWeight: 600,
                    color: "#333",
                  }}
                >
                  项目名称
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    borderBottom: "2px solid #e8e8e8",
                    fontWeight: 600,
                    color: "#333",
                  }}
                >
                  参考定价
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    borderBottom: "2px solid #e8e8e8",
                    fontWeight: 600,
                    color: "#333",
                    width: 160,
                  }}
                >
                  自定义价格（元）
                </th>
              </tr>
            </thead>
            <tbody>
              {CATEGORY_PRICING_ITEMS.map((item) => (
                <tr
                  key={item.key}
                  style={{
                    borderBottom: "1px solid #f0f0f0",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "#fafafa";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <td
                    style={{
                      padding: "12px",
                      color: "#333",
                      fontWeight: 500,
                    }}
                  >
                    {item.label}
                  </td>
                  <td style={{ padding: "12px", color: "#999" }}>
                    ¥{item.range || item.defaultPrice}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={getPrice(item.key, item.defaultPrice)}
                      onChange={(e) =>
                        handlePriceChange(item.key, e.target.value)
                      }
                      style={{
                        width: "100%",
                        maxWidth: 140,
                        padding: "6px 10px",
                        border: "1px solid #d9d9d9",
                        borderRadius: 4,
                        fontSize: 14,
                        outline: "none",
                      }}
                      onFocus={(e) => {
                        (e.target as HTMLElement).style.borderColor = "#1890ff";
                      }}
                      onBlur={(e) => {
                        (e.target as HTMLElement).style.borderColor = "#d9d9d9";
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 操作按钮 */}
        <div
          style={{
            borderTop: "1px solid #f0f0f0",
            paddingTop: 24,
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
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
            <span
              style={{
                fontSize: 13,
                color: message.type === "success" ? "#52c41a" : "#ff4d4f",
              }}
            >
              {message.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}