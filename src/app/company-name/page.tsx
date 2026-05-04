/**
 * 公司起名页面
 * /company-name
 * 专业工商核名友好的 AI 公司起名工具
 */
"use client";

import { useState, useCallback } from "react";
import {
  Building2, Globe, Shield, Loader2, Copy, Check, Sparkles,
  ChevronDown, ChevronUp, AlertTriangle, Info
} from "lucide-react";

/* ─── 常量 ─── */
const COMPANY_TYPES = ["有限责任公司", "个体工商户", "科技类工作室", "商贸 / 电商", "品牌 / 工作室", "其他"];

const INDUSTRIES = [
  "科技 / 互联网 / 软件",
  "电商 / 贸易 / 零售",
  "文化传媒 / 广告",
  "美妆 / 护肤",
  "服装 / 服饰",
  "餐饮 / 食品",
  "教育 / 咨询",
  "设计 / 创意",
  "建筑 / 工程",
  "医疗 / 健康",
  "制造 / 生产",
  "服务行业",
];

const STYLES = ["大气稳重", "现代科技", "简约国际", "高端品质", "创意独特", "传统吉利", "年轻潮流", "文艺清新"];

const LENGTHS = [
  { value: "2", label: "2 字", note: "难注册" },
  { value: "3", label: "3 字", note: "中等" },
  { value: "4", label: "4 字", note: "最易通过 ✨", recommend: true },
  { value: "不限", label: "不限", note: "" },
];

interface CompanyNameResult {
  name: string;
  meaning: string;
  industryMatch: string;
  risk: string;
}

const riskColor = (r: string) => {
  switch (r) {
    case "低": return { bg: "#ECFDF5", text: "#059669", label: "注册风险低" };
    case "中": return { bg: "#FFFBEB", text: "#D97706", label: "注册风险中" };
    case "高": return { bg: "#FEF2F2", text: "#DC2626", label: "注册风险高" };
    default: return { bg: "#F5F5F4", text: "#78716C", label: r };
  }
};

const matchColor = (m: string) => {
  switch (m) {
    case "高": return "#059669";
    case "中": return "#D97706";
    case "低": return "#78716C";
    default: return "#78716C";
  }
};

/* ─── 主组件 ─── */
export default function CompanyNamePage() {
  const [companyType, setCompanyType] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [industry, setIndustry] = useState("");
  const [customIndustry, setCustomIndustry] = useState("");
  const [business, setBusiness] = useState("");
  const [style, setStyle] = useState<string[]>([]);
  const [keywords, setKeywords] = useState("");
  const [lengthPref, setLengthPref] = useState("4");
  const [avoid, setAvoid] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<CompanyNameResult[]>([]);
  const [copied, setCopied] = useState("");
  const [showTips, setShowTips] = useState(true);

  const region = [province, city].filter(Boolean).join("");

  const toggleStyle = (s: string) => {
    setStyle((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : prev.length < 3 ? [...prev, s] : prev
    );
  };

  const handleSubmit = useCallback(async () => {
    if (!companyType) { setError("请选择企业类型"); return; }
    if (!province || !city) { setError("请填写注册地区（省/市）"); return; }
    const finalIndustry = customIndustry || industry;
    if (!finalIndustry) { setError("请选择或填写所属行业"); return; }
    if (!business.trim()) { setError("请填写主营业务描述"); return; }
    if (style.length === 0) { setError("请选择至少一个名字风格"); return; }

    setError("");
    setLoading(true);
    setResults([]);

    try {
      const res = await fetch("/api/company-name/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyType,
          region,
          industry: finalIndustry,
          business: business.trim(),
          style,
          keywords: keywords.trim() || undefined,
          length: lengthPref,
          avoid: avoid.trim() || undefined,
        }),
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
  }, [companyType, province, city, industry, customIndustry, business, style, keywords, lengthPref, avoid, region]);

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
          background: "linear-gradient(135deg, #1B4332 0%, #2D6A4F 50%, #40916C 100%)",
          padding: "40px 20px 32px",
          textAlign: "center",
        }}
      >
        <Building2 size={28} color="#95D5B2" style={{ marginBottom: 8 }} />
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: "0 0 4px", letterSpacing: 1 }}>
          AI 公司起名
        </h1>
        <p style={{ fontSize: 14, color: "#95D5B2", margin: 0 }}>工商核名友好 · 易通过 · 贴合行业</p>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>
        {/* 注册提示 */}
        {showTips && (
          <div
            style={{
              background: "#FFF7ED",
              border: "1px solid #FED7AA",
              borderRadius: 12,
              padding: "14px 16px",
              marginBottom: 20,
              fontSize: 13,
              color: "#9A3412",
              lineHeight: 1.6,
              position: "relative",
            }}
          >
            <button
              onClick={() => setShowTips(false)}
              style={{ position: "absolute", top: 8, right: 10, background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#9A3412" }}
            >
              ✕
            </button>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <Info size={16} style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <strong>注册难度参考：</strong>2字≈难注册 · 3字≈中等 · 4字最易通过<br />
                同地区同行业不能重名 · 最终以当地工商局核名为准
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
          {/* 1. 企业类型 */}
          <SectionTitle num="1" title="企业类型" required />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {COMPANY_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setCompanyType(t)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: `1px solid ${companyType === t ? "#2D6A4F" : "#D6D3D1"}`,
                  background: companyType === t ? "#2D6A4F" : "#fff",
                  color: companyType === t ? "#fff" : "#44403C",
                  fontSize: 14,
                  fontWeight: companyType === t ? 600 : 400,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* 2. 注册地区 */}
          <SectionTitle num="2" title="注册地区" required />
          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            <input
              placeholder="省（如：广东省）"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="市（如：深圳市）"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* 3. 所属行业 */}
          <SectionTitle num="3" title="所属行业" required />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            {INDUSTRIES.map((ind) => (
              <button
                key={ind}
                onClick={() => { setIndustry(ind); setCustomIndustry(""); }}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: `1px solid ${(industry === ind && !customIndustry) ? "#2D6A4F" : "#D6D3D1"}`,
                  background: (industry === ind && !customIndustry) ? "#2D6A4F" : "#fff",
                  color: (industry === ind && !customIndustry) ? "#fff" : "#44403C",
                  fontSize: 13,
                  fontWeight: (industry === ind && !customIndustry) ? 600 : 400,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {ind}
              </button>
            ))}
          </div>
          <input
            placeholder="或自定义行业（如：宠物医疗、新能源电池）"
            value={customIndustry}
            onChange={(e) => { setCustomIndustry(e.target.value); setIndustry(""); }}
            style={{ ...inputStyle, marginBottom: 20 }}
          />

          {/* 4. 主营业务 */}
          <SectionTitle num="4" title="主营业务描述" required />
          <textarea
            placeholder="请简要填写主营业务（10–20字）&#10;例：软件开发、AI 产品、短视频运营、化妆品销售、服装设计"
            value={business}
            onChange={(e) => setBusiness(e.target.value)}
            rows={3}
            style={{ ...inputStyle, width: "100%", resize: "vertical", marginBottom: 20, lineHeight: 1.5 }}
          />

          {/* 5. 名字风格 */}
          <SectionTitle num="5" title="名字风格" required extra="（最多选 3 个）" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {STYLES.map((s) => (
              <button
                key={s}
                onClick={() => toggleStyle(s)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: `1px solid ${style.includes(s) ? "#2D6A4F" : "#D6D3D1"}`,
                  background: style.includes(s) ? "#2D6A4F" : "#fff",
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

          {/* 6. 企业愿景 */}
          <SectionTitle num="6" title="企业愿景 / 关键词" />
          <input
            placeholder="希望包含的字或寓意：诚信、创新、致远、恒、鑫、瑞、泽…（1–4个字）"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value.slice(0, 20))}
            style={{ ...inputStyle, marginBottom: 20 }}
          />

          {/* 7. 字数偏好 */}
          <SectionTitle num="7" title="字数偏好" required />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {LENGTHS.map((l) => (
              <button
                key={l.value}
                onClick={() => setLengthPref(l.value)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: `1px solid ${lengthPref === l.value ? "#2D6A4F" : "#D6D3D1"}`,
                  background: lengthPref === l.value ? "#2D6A4F" : "#fff",
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

          {/* 8. 禁用词 */}
          <SectionTitle num="8" title="禁用词 / 不想要风格" />
          <input
            placeholder="例：不要太土、不要太复杂、不要「鑫/隆/发」类"
            value={avoid}
            onChange={(e) => setAvoid(e.target.value)}
            style={{ ...inputStyle, marginBottom: 24 }}
          />

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
              background: loading ? "#A8A29E" : "linear-gradient(135deg, #1B4332, #2D6A4F)",
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
                立即生成公司名
              </>
            )}
          </button>
        </div>

        {/* 结果区域 */}
        {results.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#292524", margin: "0 0 4px" }}>
              推荐公司名
            </h2>
            <p style={{ fontSize: 13, color: "#A8A29E", margin: "0 0 16px" }}>
              以下名字由 AI 根据工商核名规则生成，最终以当地工商局核名为准
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {results.map((item, i) => {
                const riskInfo = riskColor(item.risk);
                return (
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
                        <span style={{ fontSize: 18, fontWeight: 700, color: "#292524" }}>{item.name}</span>
                        <span
                          style={{
                            marginLeft: 10,
                            fontSize: 12,
                            padding: "2px 8px",
                            borderRadius: 4,
                            background: riskInfo.bg,
                            color: riskInfo.text,
                            fontWeight: 600,
                          }}
                        >
                          {riskInfo.label}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopy(item.name)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#A8A29E", padding: 4 }}
                        title="复制"
                      >
                        {copied === item.name ? <Check size={16} color="#059669" /> : <Copy size={16} />}
                      </button>
                    </div>
                    <p style={{ fontSize: 14, color: "#57534E", margin: "0 0 8px", lineHeight: 1.5 }}>
                      {item.meaning}
                    </p>
                    <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#A8A29E" }}>
                      <span>
                        行业匹配：
                        <span style={{ color: matchColor(item.industryMatch), fontWeight: 600 }}>{item.industryMatch}</span>
                      </span>
                      <span>
                        <Shield size={12} style={{ display: "inline", marginRight: 2 }} />
                        以工商局核名为准
                      </span>
                    </div>
                  </div>
                );
              })}
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
                本工具生成的名字仅供参考，不构成注册建议。实际工商注册结果以当地市场监督管理局核名为准。
                建议使用前通过国家企业信用信息公示系统查询是否已被注册。
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── 子组件 ─── */
function SectionTitle({ num, title, required, extra }: { num: string; title: string; required?: boolean; extra?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 10 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#2D6A4F", background: "#D8F3DC", padding: "2px 6px", borderRadius: 4 }}>
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
};
