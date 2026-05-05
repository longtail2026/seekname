/**
 * AI 跨境电商英文名生成页面
 * /business-name/cross-border-en-name
 *
 * 易读、易记、无歧义、适合独立站 & 跨境平台
 */
"use client";

import { useState, useCallback } from "react";
import {
  Sparkles, Loader2, Copy, Check, Shield, Info, AlertTriangle,
  ChevronDown, ChevronUp, Globe, ShoppingBag,
} from "lucide-react";

/* ─── 常量 ─── */
const CATEGORIES = [
  "服装 / 服饰 / 鞋包",
  "美妆 / 个护",
  "家居 / 家具",
  "3C / 数码 / 小家电",
  "户外 / 运动",
  "宠物用品",
  "母婴 / 儿童",
  "饰品 / 珠宝",
  "食品 / 饮品",
  "百货 / 杂货",
  "其他（自定义）",
];

const MARKETS = [
  "北美（美国 / 加拿大）",
  "欧洲",
  "东南亚",
  "全球通用",
];

const STYLES = [
  "简约现代",
  "高级轻奢",
  "自然清新",
  "科技感",
  "潮流年轻",
  "温暖治愈",
  "大气国际",
];

const LENGTHS = [
  { value: "short", label: "短域名优先（4–6 字母）", note: "易注册" },
  { value: "standard", label: "标准品牌名（6–8 字母）", note: "推荐" },
  { value: "long", label: "可稍长（8–12 字母）", note: "描述性强" },
];

const DEFAULT_BAN = ["无负面含义", "无不雅谐音", "无宗教敏感", "无歧义"];

const LENGTH_DESC: Record<string, string> = {
  short: "4-6个字母（短域名优先）",
  standard: "6-8个字母（标准品牌名）",
  long: "8-12个字母（可稍长）",
};

interface NameResult {
  name: string;
  pronunciation: string;
  meaning: string;
  ecommerceFit: string;
  safety: string;
  recommendScore: string;
}

/* ─── 主组件 ─── */
export default function CrossBorderEnNamePage() {
  // 输入项
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [market, setMarket] = useState("");
  const [style, setStyle] = useState<string[]>([]);
  const [lengthPref, setLengthPref] = useState("standard");
  const [rootWords, setRootWords] = useState("");
  const [banList, setBanList] = useState<string[]>([...DEFAULT_BAN]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<NameResult[]>([]);
  const [copied, setCopied] = useState("");
  const [showTips, setShowTips] = useState(true);

  const toggleStyle = (s: string) => {
    setStyle((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : prev.length < 3 ? [...prev, s] : prev
    );
  };

  const toggleBan = (b: string) => {
    setBanList((prev) =>
      prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]
    );
  };

  const handleSubmit = useCallback(async () => {
    const finalCategory = customCategory || category;
    if (!finalCategory) { setError("请选择或填写主营品类"); return; }
    if (!market) { setError("请选择目标市场"); return; }
    if (style.length === 0) { setError("请选择至少一个风格倾向"); return; }

    setError("");
    setLoading(true);
    setResults([]);

    try {
      const body = {
        type: "cross-border-en",
        category: finalCategory,
        market,
        style,
        length: lengthPref,
        rootWords: rootWords.trim() || undefined,
        banList: banList.length > 0 ? banList : undefined,
      };

      const res = await fetch("/api/business-name/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success && data.data?.length > 0) {
        setResults(data.data);
      } else {
        setError(data.message || "AI 生成失败，请重试");
      }
    } catch {
      setError("网络请求失败，请重试");
    } finally {
      setLoading(false);
    }
  }, [category, customCategory, market, style, lengthPref, rootWords, banList]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(""), 2000);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF9" }}>
      {/* 顶部横幅 */}
      <div
        style={{
          background: "linear-gradient(135deg, #1E3A5F 0%, #3A6B8C 50%, #5B9BD5 100%)",
          padding: "32px 20px 20px",
          textAlign: "center",
        }}
      >
        <Globe size={28} color="#A8D8EA" style={{ display: "inline-block" }} />
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#fff", margin: "6px 0 2px", letterSpacing: 1 }}>
          AI 跨境电商英文名
        </h1>
        <p style={{ fontSize: 13, color: "#A8D8EA", margin: 0 }}>
          易读、易记、无歧义、适合独立站 & 跨境平台
        </p>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>
        {/* 提示信息 */}
        {showTips && (
          <div
            style={{
              background: "#EBF5FB",
              border: "1px solid #AED6F1",
              borderRadius: 12,
              padding: "14px 16px",
              marginBottom: 20,
              fontSize: 13,
              color: "#1A5276",
              lineHeight: 1.6,
              position: "relative",
            }}
          >
            <button
              onClick={() => setShowTips(false)}
              style={{ position: "absolute", top: 8, right: 10, background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#1A5276" }}
            >
              ✕
            </button>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <Info size={16} style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <strong>跨境电商英文名 = 品牌域名友好 + 易读易记 + 无负面含义 + 国际感 + 电商属性</strong><br />
                ≠ 随便凑单词 · ≠ 中文拼音直译 · ≠ 有低俗/歧义/宗教/敏感谐音<br />
                系统自动做三层检测：负面含义检测 ✓ 易读性检测 ✓ 电商属性匹配 ✓
              </div>
            </div>
          </div>
        )}

        {/* 表单卡片 */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            border: "1px solid #E7E5E4",
            padding: 24,
          }}
        >
          {/* 1. 主营品类 */}
          <SectionTitle num="1" title="主营品类" required />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => { setCategory(c); setCustomCategory(""); }}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: `1px solid ${(category === c && !customCategory) ? "#3A6B8C" : "#D6D3D1"}`,
                  background: (category === c && !customCategory) ? "#3A6B8C" : "#fff",
                  color: (category === c && !customCategory) ? "#fff" : "#44403C",
                  fontSize: 13,
                  fontWeight: (category === c && !customCategory) ? 600 : 400,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {c}
              </button>
            ))}
          </div>
          <input
            placeholder="或自定义品类（如：智能家居、健身器材）"
            value={customCategory}
            onChange={(e) => { setCustomCategory(e.target.value); setCategory(""); }}
            style={{ ...inputStyle, marginBottom: 20 }}
          />

          {/* 2. 目标市场 */}
          <SectionTitle num="2" title="目标市场" required extra="规避当地文化禁忌、负面谐音" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {MARKETS.map((m) => (
              <button
                key={m}
                onClick={() => setMarket(m)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: `1px solid ${market === m ? "#3A6B8C" : "#D6D3D1"}`,
                  background: market === m ? "#3A6B8C" : "#fff",
                  color: market === m ? "#fff" : "#44403C",
                  fontSize: 14,
                  fontWeight: market === m ? 600 : 400,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {m}
              </button>
            ))}
          </div>

          {/* 3. 风格倾向 */}
          <SectionTitle num="3" title="风格倾向" required extra="（最多选 3 个）" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {STYLES.map((s) => (
              <button
                key={s}
                onClick={() => toggleStyle(s)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: `1px solid ${style.includes(s) ? "#3A6B8C" : "#D6D3D1"}`,
                  background: style.includes(s) ? "#3A6B8C" : "#fff",
                  color: style.includes(s) ? "#fff" : "#44403C",
                  fontSize: 14,
                  fontWeight: style.includes(s) ? 600 : 400,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* 4. 名字长度 */}
          <SectionTitle num="4" title="名字长度" required />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {LENGTHS.map((l) => (
              <button
                key={l.value}
                onClick={() => setLengthPref(l.value)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: `1px solid ${lengthPref === l.value ? "#3A6B8C" : "#D6D3D1"}`,
                  background: lengthPref === l.value ? "#3A6B8C" : "#fff",
                  color: lengthPref === l.value ? "#fff" : "#44403C",
                  fontSize: 14,
                  fontWeight: lengthPref === l.value ? 600 : 400,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {l.label}
                {l.note && (
                  <span style={{ opacity: 0.7, marginLeft: 4, fontSize: 12 }}>· {l.note}</span>
                )}
              </button>
            ))}
          </div>

          {/* 5. 包含词根 */}
          <SectionTitle num="5" title="希望包含的词根 / 字母" extra="选填" />
          <input
            placeholder="例如：eco, smart, pro, neo, viva, go, up, buy, mart"
            value={rootWords}
            onChange={(e) => setRootWords(e.target.value)}
            style={{ ...inputStyle, marginBottom: 20 }}
          />

          {/* 6. 禁止含义 */}
          <SectionTitle num="6" title="禁止含义" extra="系统自动勾选，可手动调整" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
            {DEFAULT_BAN.map((b) => (
              <button
                key={b}
                onClick={() => toggleBan(b)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: `1px solid ${banList.includes(b) ? "#3A6B8C" : "#D6D3D1"}`,
                  background: banList.includes(b) ? "#3A6B8C" : "#fff",
                  color: banList.includes(b) ? "#fff" : "#A8A29E",
                  fontSize: 14,
                  fontWeight: banList.includes(b) ? 600 : 400,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  textDecoration: banList.includes(b) ? "none" : "line-through",
                }}
              >
                {b}
              </button>
            ))}
          </div>

          {/* 错误提示 */}
          {error && (
            <div style={{ color: "#DC2626", fontSize: 14, marginBottom: 16, padding: "8px 12px", background: "#FEF2F2", borderRadius: 8 }}>
              ⚠️ {error}
            </div>
          )}

          {/* 提交按钮 */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px 0",
              borderRadius: 12,
              border: "none",
              background: loading ? "#A8A29E" : "linear-gradient(135deg, #1E3A5F, #3A6B8C)",
              color: "#fff",
              fontSize: 16,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "opacity 0.2s",
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                正在生成...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                立即生成英文品牌名
              </>
            )}
          </button>
        </div>

        {/* 结果区域 */}
        {results.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#292524", margin: "0 0 4px" }}>
              推荐英文品牌名
            </h2>
            <p style={{ fontSize: 13, color: "#A8A29E", margin: "0 0 16px" }}>
              已通过负面含义检测 ✓ 易读性检测 ✓ 电商属性匹配 ✓
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {results.map((item, i) => (
                <div
                  key={i}
                  style={{
                    background: "#fff",
                    borderRadius: 12,
                    border: "1px solid #E7E5E4",
                    padding: "16px 18px",
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <span style={{ fontSize: 18, fontWeight: 700, color: "#292524", fontFamily: "'Inter', sans-serif" }}>{item.name}</span>
                      {item.safety === "✅安全无歧义" && (
                        <span
                          style={{
                            marginLeft: 10,
                            fontSize: 12,
                            padding: "2px 8px",
                            borderRadius: 4,
                            background: "#ECFDF5",
                            color: "#059669",
                            fontWeight: 600,
                          }}
                        >
                          ✅ 安全无歧义
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleCopy(item.name)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#A8A29E", padding: 4 }}
                      title="复制"
                    >
                      {copied === item.name ? <Check size={16} color="#059669" /> : <Copy size={16} />}
                    </button>
                  </div>

                  {/* 读音 */}
                  {item.pronunciation && (
                    <div style={{ fontSize: 13, color: "#3A6B8C", marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }}>读音：</span>{item.pronunciation}
                    </div>
                  )}

                  {/* 含义 */}
                  <p style={{ fontSize: 14, color: "#57534E", margin: "0 0 6px", lineHeight: 1.5 }}>
                    {item.meaning}
                  </p>

                  {/* 底部元数据 */}
                  <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#A8A29E", flexWrap: "wrap" }}>
                    <span>
                      电商适配度：
                      <span style={{ color: fitColor(item.ecommerceFit), fontWeight: 600 }}>{item.ecommerceFit}</span>
                    </span>
                    <span>
                      推荐指数：
                      <span style={{ color: "#D97706", fontWeight: 600 }}>{item.recommendScore || "★★★★★"}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* 免责声明 */}
            <div
              style={{
                marginTop: 16,
                padding: "12px 16px",
                background: "#F5F5F4",
                borderRadius: 10,
                fontSize: 12,
                color: "#A8A29E",
                display: "flex",
                alignItems: "flex-start",
                gap: 6,
                lineHeight: 1.5,
              }}
            >
              <AlertTriangle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
              <span>
                本工具生成的英文品牌名由 AI 推荐，已自动进行负面含义检测、读音检测、电商属性匹配。建议最终使用前自行查询域名可用性及商标注册情况。
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Spin 动画 */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}} />
    </div>
  );
}

/* ─── 辅助函数 ─── */
const fitColor = (m: string) => {
  switch (m) {
    case "高": return "#059669";
    case "中": return "#D97706";
    case "低": return "#78716C";
    default: return "#78716C";
  }
};

/* ─── 子组件 ─── */
function SectionTitle({ num, title, required, extra }: { num: string; title: string; required?: boolean; extra?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 10 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#3A6B8C", background: "#D6EAF8", padding: "2px 6px", borderRadius: 4 }}>
        {num}
      </span>
      <span style={{ fontSize: 14, fontWeight: 600, color: "#292524" }}>
        {title}
        {required && <span style={{ color: "#DC2626", marginLeft: 2 }}>*</span>}
      </span>
      {extra && <span style={{ fontSize: 12, color: "#A8A29E" }}>{extra}</span>}
    </div>
  );
}

/* ─── 公共样式 ─── */
const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #D6D3D1",
  fontSize: 14,
  color: "#292524",
  background: "#fff",
  outline: "none",
  fontFamily: "'Noto Sans SC', sans-serif",
  width: "100%",
  boxSizing: "border-box",
};