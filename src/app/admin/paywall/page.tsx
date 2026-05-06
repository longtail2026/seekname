"use client";

import { useState, useEffect } from "react";

// 所有可定价项目的常量定义（与 site-config.ts 保持一致）
// 使用 pricingKey 作为唯一标识，label 显示给用户看
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

interface CategoryEnabled {
  [key: string]: boolean;
}

interface PaywallConfig {
  paywallEnabled: boolean;
  paywallPrice: number;
  categoryPrices: CategoryPrices;
  categoryEnabled: CategoryEnabled;
}

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        position: "relative",
        display: "inline-block",
        width: 36,
        height: 20,
        cursor: "pointer",
        background: checked ? "#1890ff" : "#d9d9d9",
        borderRadius: 10,
        transition: "background 0.3s",
        flexShrink: 0,
      }}
      title={label}
    >
      <div
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 16 : 2,
          width: 16,
          height: 16,
          background: "#fff",
          borderRadius: "50%",
          transition: "left 0.3s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </div>
  );
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
          categoryEnabled: data.categoryEnabled ?? {},
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
          categoryPrices: config.categoryPrices,
          categoryEnabled: config.categoryEnabled,
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

  const handleEnabledChange = (key: string, enabled: boolean) => {
    if (!config) return;
    setConfig({
      ...config,
      categoryEnabled: {
        ...config.categoryEnabled,
        [key]: enabled,
      },
    });
  };

  const getPrice = (key: string, defaultPrice: number): string => {
    if (!config) return String(defaultPrice);
    const saved = config.categoryPrices[key];
    if (saved !== undefined && saved > 0) return String(saved);
    return String(defaultPrice);
  };

  const getEnabled = (key: string): boolean => {
    if (!config) return false;
    const saved = config.categoryEnabled[key];
    if (saved !== undefined) return saved;
    return false;
  };

  if (loading) {
    return <div style={{ padding: 24 }}>加载中...</div>;
  }

  if (!config) {
    return <div style={{ padding: 24 }}>无法加载配置</div>;
  }

  // 已开启的项目数量
  const enabledCount = CATEGORY_PRICING_ITEMS.filter((item) => getEnabled(item.key)).length;

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
          每个项目可独立设置是否开启收费及价格。开启后，该项目起名结果中前3个名字默认隐藏（需付费解锁）。
          关闭即为免费模式，所有名字全部展示。
        </p>

        {/* 收费项目列表 — 每个项目独立开关 + 价格 */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <h2
              style={{
                fontSize: 16,
                fontWeight: 500,
                color: "#333",
              }}
            >
              各项目收费设置
            </h2>
            <span
              style={{
                fontSize: 12,
                color: "#999",
              }}
            >
              已开启 {enabledCount}/{CATEGORY_PRICING_ITEMS.length} 项
            </span>
          </div>
          <p
            style={{
              fontSize: 12,
              color: "#999",
              marginBottom: 16,
              lineHeight: "1.5",
            }}
          >
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
                    width: 60,
                  }}
                >
                  收费
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
              {CATEGORY_PRICING_ITEMS.map((item) => {
                const isEnabled = getEnabled(item.key);
                return (
                  <tr
                    key={item.key}
                    style={{
                      borderBottom: "1px solid #f0f0f0",
                      transition: "background 0.2s",
                      opacity: isEnabled ? 1 : 0.5,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "#fafafa";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <td style={{ padding: "12px" }}>
                      <ToggleSwitch
                        checked={isEnabled}
                        onChange={(v) => handleEnabledChange(item.key, v)}
                        label={item.label}
                      />
                    </td>
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
                          background: isEnabled ? "#fff" : "#f5f5f5",
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
                );
              })}
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