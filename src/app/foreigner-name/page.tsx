"use client";

import { useState } from "react";

// ===== 类型定义 =====

interface NameResult {
  chineseName: string;
  pinyin: string;
  meaning: string;
  scenario: string;
  category: "通用版" | "文雅版" | "个性版";
}

interface GenerateResponse {
  success: boolean;
  data: {
    general: NameResult[];
    elegant: NameResult[];
    personality: NameResult[];
  };
  message?: string;
}

// ===== 常量 =====

const GENDER_OPTIONS = [
  { value: "male", label: "男", labelEn: "Male", icon: "♂" },
  { value: "female", label: "女", labelEn: "Female", icon: "♀" },
  { value: "neutral", label: "中性", labelEn: "Neutral", icon: "⚤" },
];

const STYLE_OPTIONS = [
  { value: "classic", label: "经典稳重", desc: "职场商务", labelEn: "Classic", descEn: "Professional" },
  { value: "elegant", label: "文雅气质", desc: "书香温柔", labelEn: "Elegant", descEn: "Gentle & literary" },
  { value: "sunshine", label: "阳光个性", desc: "潮流张扬", labelEn: "Sunshine", descEn: "Trendy & bold" },
  { value: "simple", label: "简约好记", desc: "2字推荐", labelEn: "Simple", descEn: "Easy to remember" },
  { value: "chinese-style", label: "中国风", desc: "古风雅致", labelEn: "Chinese Style", descEn: "Classic & refined" },
];

const CATEGORY_CONFIG = [
  { key: "general" as const, label: "通用版", labelEn: "Classic", color: "#E86A17", bg: "rgba(232,106,23,0.08)", border: "rgba(232,106,23,0.2)", icon: "🌍" },
  { key: "elegant" as const, label: "文雅版", labelEn: "Elegant", color: "#7C5CBF", bg: "rgba(124,92,191,0.08)", border: "rgba(124,92,191,0.2)", icon: "📚" },
  { key: "personality" as const, label: "个性版", labelEn: "Personality", color: "#D53F8C", bg: "rgba(213,63,140,0.08)", border: "rgba(213,63,140,0.2)", icon: "✨" },
];

// ===== 页面组件 =====

export default function ForeignerNamePage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "neutral">("male");
  const [style, setStyle] = useState<string>("classic");
  const [contains, setContains] = useState("");
  const [avoid, setAvoid] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResponse["data"] | null>(null);
  const [error, setError] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!firstName.trim()) {
      setError("请输入外文名 First Name");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/foreigner-name/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          gender,
          style,
          contains: contains.trim() || undefined,
          avoid: avoid.trim() || undefined,
        }),
      });

      const data: GenerateResponse = await res.json();
      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.message || "生成失败，请重试");
      }
    } catch (err) {
      setError("网络错误，请检查连接后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(id);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedIndex(id);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      handleGenerate();
    }
  };

  // 渲染单个名字卡片
  const renderNameCard = (item: NameResult, idx: number, catKey: string) => {
    const cardId = `${catKey}-${idx}`;
    const fullCopyText = `${item.chineseName} (${item.pinyin}) — ${item.meaning}`;

    return (
      <div
        key={cardId}
        style={{
          background: "#FFF",
          borderRadius: 12,
          border: "1px solid rgba(212,148,26,0.15)",
          padding: "20px 18px",
          transition: "all 0.2s",
          position: "relative",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(74,52,40,0.08)";
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,148,26,0.3)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = "none";
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,148,26,0.15)";
        }}
      >
        {/* 名字 + 拼音 */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: "#4A3428", fontFamily: "'Noto Serif SC', serif", letterSpacing: "0.08em" }}>
            {item.chineseName}
          </span>
          <span style={{ fontSize: 15, color: "#B8A898", fontFamily: "'Noto Sans SC', sans-serif", fontWeight: 500 }}>
            {item.pinyin}
          </span>
        </div>

        {/* 寓意 */}
        <p style={{ fontSize: 13, color: "#6B5A4E", margin: "6px 0 4px", lineHeight: 1.6, fontFamily: "'Noto Sans SC', sans-serif" }}>
          {item.meaning}
        </p>

        {/* 场景标签 */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
          <span style={{
            fontSize: 11, color: "#E86A17", background: "rgba(232,106,23,0.08)", borderRadius: 4,
            padding: "2px 8px", fontFamily: "'Noto Sans SC', sans-serif"
          }}>
            {item.scenario}
          </span>
        </div>

        {/* 复制按钮 */}
        <button
          onClick={() => handleCopy(fullCopyText, cardId)}
          style={{
            position: "absolute", top: 12, right: 12,
            background: copiedIndex === cardId ? "#22C55E" : "rgba(232,106,23,0.08)",
            border: "none", borderRadius: 6,
            padding: "5px 10px", cursor: "pointer",
            fontSize: 12, color: copiedIndex === cardId ? "#FFF" : "#E86A17",
            fontFamily: "'Noto Sans SC', sans-serif",
            transition: "all 0.2s",
          }}
        >
          {copiedIndex === cardId ? "✓ 已复制" : "📋 复制"}
        </button>
      </div>
    );
  };

  // 渲染分类区域
  const renderCategory = (cat: typeof CATEGORY_CONFIG[0]) => {
    const items = result?.[cat.key];
    if (!items || items.length === 0) return null;

    return (
      <div key={cat.key} style={{ marginBottom: 32 }}>
        {/* 分类标题 */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 14,
          paddingBottom: 10, borderBottom: `2px solid ${cat.border}`,
        }}>
          <span style={{ fontSize: 20 }}>{cat.icon}</span>
          <div>
            <span style={{ fontSize: 17, fontWeight: 600, color: cat.color, fontFamily: "'Noto Sans SC', sans-serif" }}>
              {cat.label}
            </span>
            <span style={{ fontSize: 12, color: "#B8A898", marginLeft: 8, fontFamily: "'Noto Sans SC', sans-serif" }}>
              {cat.labelEn}
            </span>
          </div>
        </div>

        {/* 名字卡片网格 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {items.map((item, idx) => renderNameCard(item, idx, cat.key))}
        </div>
      </div>
    );
  };

  return (
    <main style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #FFFBF5 0%, #FFF8F0 100%)",
      paddingTop: 80,
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 24px 60px" }}>

        {/* 页面标题 */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h1 style={{
            fontSize: 30, fontWeight: 700, color: "#4A3428",
            fontFamily: "'Noto Serif SC', serif", margin: "0 0 6px",
          }}>
            🌏 外国友人起中文名
          </h1>
          <p style={{
            fontSize: 15, color: "#B8A898",
            fontFamily: "'Noto Sans SC', sans-serif", margin: 0,
          }}>
            按你的外文原名，起好听、无歧义、适合中国生活的中文名
          </p>
          <p style={{
            fontSize: 13, color: "#D4C9B0",
            fontFamily: "'Noto Sans SC', sans-serif", margin: "4px 0 0",
          }}>
            Give yourself a Chinese name — sounds like your original, clean & meaningful
          </p>
        </div>

        {/* 输入表单 */}
        <div style={{
          background: "#FFF", borderRadius: 16,
          border: "1px solid rgba(212,148,26,0.15)",
          boxShadow: "0 4px 20px rgba(74,52,40,0.06)",
          padding: "28px 30px",
          marginBottom: 28,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            {/* First Name */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#4A3428", marginBottom: 6, display: "block", fontFamily: "'Noto Sans SC', sans-serif" }}>
                First Name <span style={{ color: "#E86A17" }}>*</span>
              </label>
              <input
                type="text" value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="例如: Emma / Michael / John"
                style={{
                  width: "100%", height: 42, padding: "0 14px",
                  fontSize: 14, borderRadius: 10, border: "1px solid #DDD0C0",
                  outline: "none", color: "#4A3428", boxSizing: "border-box",
                  fontFamily: "'Noto Sans SC', sans-serif",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "#E86A17"; }}
                onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "#DDD0C0"; }}
              />
            </div>

            {/* Last Name */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#4A3428", marginBottom: 6, display: "block", fontFamily: "'Noto Sans SC', sans-serif" }}>
                Last Name <span style={{ color: "#B8A898", fontSize: 11 }}>(选填)</span>
              </label>
              <input
                type="text" value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="例如: Watson / Smith"
                style={{
                  width: "100%", height: 42, padding: "0 14px",
                  fontSize: 14, borderRadius: 10, border: "1px solid #DDD0C0",
                  outline: "none", color: "#4A3428", boxSizing: "border-box",
                  fontFamily: "'Noto Sans SC', sans-serif",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "#E86A17"; }}
                onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "#DDD0C0"; }}
              />
            </div>
          </div>

          {/* 性别选择 */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#4A3428", marginBottom: 8, display: "block", fontFamily: "'Noto Sans SC', sans-serif" }}>
              性别 Gender <span style={{ color: "#E86A17" }}>*</span>
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              {GENDER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setGender(opt.value as typeof gender)}
                  style={{
                    flex: 1, height: 42, borderRadius: 10,
                    border: `1.5px solid ${gender === opt.value ? "#E86A17" : "#DDD0C0"}`,
                    background: gender === opt.value ? "rgba(232,106,23,0.06)" : "#FFF",
                    cursor: "pointer", fontSize: 14, color: gender === opt.value ? "#E86A17" : "#6B5A4E",
                    fontFamily: "'Noto Sans SC', sans-serif",
                    fontWeight: gender === opt.value ? 600 : 400,
                    transition: "all 0.2s",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                  }}
                >
                  <span>{opt.icon}</span> {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 风格选择 */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#4A3428", marginBottom: 8, display: "block", fontFamily: "'Noto Sans SC', sans-serif" }}>
              名字风格 Style <span style={{ color: "#E86A17" }}>*</span>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
              {STYLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStyle(opt.value)}
                  style={{
                    padding: "10px 12px", borderRadius: 10,
                    border: `1.5px solid ${style === opt.value ? "#E86A17" : "#DDD0C0"}`,
                    background: style === opt.value ? "rgba(232,106,23,0.06)" : "#FFF",
                    cursor: "pointer", textAlign: "center",
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: style === opt.value ? 600 : 400, color: style === opt.value ? "#E86A17" : "#4A3428", fontFamily: "'Noto Sans SC', sans-serif" }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 11, color: "#B8A898", marginTop: 2, fontFamily: "'Noto Sans SC', sans-serif" }}>
                    {opt.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 可选项：包含字 + 不想要的字 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: "#6B5A4E", marginBottom: 6, display: "block", fontFamily: "'Noto Sans SC', sans-serif" }}>
                希望包含的字 <span style={{ color: "#B8A898", fontSize: 11 }}>(选填)</span>
              </label>
              <input
                type="text" value={contains}
                onChange={(e) => setContains(e.target.value)}
                placeholder="如：龙、菲、安、凯、琳、杰"
                style={{
                  width: "100%", height: 40, padding: "0 14px",
                  fontSize: 13, borderRadius: 10, border: "1px solid #DDD0C0",
                  outline: "none", color: "#4A3428", boxSizing: "border-box",
                  fontFamily: "'Noto Sans SC', sans-serif",
                }}
                onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "#E86A17"; }}
                onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "#DDD0C0"; }}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: "#6B5A4E", marginBottom: 6, display: "block", fontFamily: "'Noto Sans SC', sans-serif" }}>
                不想要的字/风格 <span style={{ color: "#B8A898", fontSize: 11 }}>(选填)</span>
              </label>
              <input
                type="text" value={avoid}
                onChange={(e) => setAvoid(e.target.value)}
                placeholder="如：不要太土、不要复杂字"
                style={{
                  width: "100%", height: 40, padding: "0 14px",
                  fontSize: 13, borderRadius: 10, border: "1px solid #DDD0C0",
                  outline: "none", color: "#4A3428", boxSizing: "border-box",
                  fontFamily: "'Noto Sans SC', sans-serif",
                }}
                onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "#E86A17"; }}
                onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "#DDD0C0"; }}
              />
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div style={{
              padding: "10px 14px", background: "rgba(192,57,43,0.06)",
              borderRadius: 10, marginBottom: 14,
              fontSize: 13, color: "#C0392B",
              fontFamily: "'Noto Sans SC', sans-serif",
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* 生成按钮 */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            style={{
              width: "100%", height: 48,
              background: loading ? "#DDD" : "linear-gradient(135deg, #E86A17 0%, #D55A0B 100%)",
              color: loading ? "#999" : "#FFF",
              border: "none", borderRadius: 12,
              fontSize: 16, fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "'Noto Sans SC', sans-serif",
              transition: "all 0.2s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: loading ? "none" : "0 4px 12px rgba(232,106,23,0.3)",
            }}
            onMouseEnter={(e) => { if (!loading) { (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 20px rgba(232,106,23,0.4)"; } }}
            onMouseLeave={(e) => { if (!loading) { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(232,106,23,0.3)"; } }}
          >
            {loading ? (
              <>
                <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
                AI 正在生成...
              </>
            ) : (
              "🎯 生成中文名"
            )}
          </button>
        </div>

        {/* 结果区域 */}
        {result && (
          <div style={{
            background: "#FFF", borderRadius: 16,
            border: "1px solid rgba(212,148,26,0.15)",
            boxShadow: "0 4px 20px rgba(74,52,40,0.06)",
            padding: "28px 30px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{
                fontSize: 18, fontWeight: 600, color: "#4A3428",
                fontFamily: "'Noto Sans SC', sans-serif", margin: 0,
              }}>
                ✨ 推荐的中文名
              </h2>
              <button
                onClick={() => setResult(null)}
                style={{
                  background: "none", border: "1px solid #DDD0C0", borderRadius: 8,
                  padding: "6px 14px", cursor: "pointer", fontSize: 13, color: "#6B5A4E",
                  fontFamily: "'Noto Sans SC', sans-serif",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#E86A17"; (e.currentTarget as HTMLElement).style.color = "#E86A17"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#DDD0C0"; (e.currentTarget as HTMLElement).style.color = "#6B5A4E"; }}
              >
                ✕ 清空结果
              </button>
            </div>

            {CATEGORY_CONFIG.map(renderCategory)}
          </div>
        )}

        {/* 功能说明 */}
        {!result && !loading && (
          <div style={{
            background: "#FFF", borderRadius: 16,
            border: "1px solid rgba(212,148,26,0.12)",
            padding: "24px 28px",
            marginTop: 16,
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#4A3428", margin: "0 0 12px", fontFamily: "'Noto Sans SC', sans-serif" }}>
              💡 核心优势
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {[
                { icon: "🔊", title: "发音贴近", desc: "按外文原名发音匹配中文，像你的原名" },
                { icon: "🛡️", title: "100% 无歧义", desc: "自动过滤负面、低俗、不雅字词" },
                { icon: "🎨", title: "3类风格", desc: "通用/文雅/个性，总有一款适合你" },
                { icon: "🇨🇳", title: "符合中国文化", desc: "适合职场、生活、社交场景" },
                { icon: "📖", title: "拼音+寓意", desc: "每个名字附带拼音和美好寓意" },
                { icon: "🎯", title: "个性偏好", desc: "支持指定包含字和排除字" },
              ].map((item) => (
                <div key={item.title} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#4A3428", fontFamily: "'Noto Sans SC', sans-serif" }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: "#B8A898", fontFamily: "'Noto Sans SC', sans-serif" }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </main>
  );
}