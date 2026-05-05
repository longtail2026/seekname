/**
 * 社交网名生成页
 * /social-name
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Loader2, Check, Copy, RefreshCw } from "lucide-react";

// ─── 数据定义 ───

// 1a. 性别（三选一）
const GENDER_OPTIONS = [
  { value: "男生", label: "🧑 男生", color: "#4A90D9" },
  { value: "女生", label: "👩 女生", color: "#E870A0" },
  { value: "中性", label: "💫 中性", color: "#8B7EC8" },
];

// 1b. 风格倾向（三选一）
const STYLE_OPTIONS = [
  { value: "可爱", label: "🌸 可爱", color: "#F59E9E" },
  { value: "高级感", label: "✨ 高级感", color: "#B8865C" },
  { value: "小众冷淡", label: "❄️ 小众冷淡", color: "#7A8B99" },
];

// 2. 风格关键词（最多3个）
const KEYWORDS = [
  "温柔", "酷飒", "可爱", "治愈", "盐系",
  "高级", "小众", "清冷", "甜酷", "文艺",
  "搞怪", "仙气", "简约", "复古", "日系",
  "韩系", "欧美", "古风",
];

// 关键词互斥关系（选冲突词时顶替前面的）
const KEYWORD_CONFLICTS: Record<string, string[]> = {
  "可爱": ["酷飒", "清冷", "欧美"],
  "酷飒": ["可爱", "温柔", "治愈"],
  "温柔": ["酷飒", "搞怪"],
  "治愈": ["酷飒", "搞怪"],
  "清冷": ["可爱"],
  "甜酷": ["温柔", "仙气"],
  "搞怪": ["温柔", "治愈", "仙气", "清冷"],
  "仙气": ["搞怪", "甜酷"],
  "日系": ["欧美", "古风", "韩系"],
  "韩系": ["欧美", "古风", "日系"],
  "欧美": ["日系", "韩系", "古风"],
  "古风": ["日系", "韩系", "欧美"],
  "简约": ["复古"],
  "复古": ["简约"],
};

// 3. 字数要求
const LENGTH_OPTIONS = [
  { value: "2", label: "2 字" },
  { value: "3", label: "3 字" },
  { value: "4", label: "4 字" },
  { value: "不限（推荐）", label: "不限 📏" },
];

// 4. 使用场景（新增）
const SCENE_CATEGORIES = [
  {
    id: "social",
    label: "📱 社交平台",
    subOptions: ["小红书", "抖音", "B站", "微信", "INS", "通用社交ID"],
    defaultSub: "通用社交ID",
    desc: "适合社交媒体的干净ID",
  },
  {
    id: "game",
    label: "🎮 游戏ID",
    subOptions: ["游戏ID通用", "Steam", "原神", "王者荣耀", "和平精英(吃鸡)"],
    defaultSub: "游戏ID通用",
    desc: "游戏角色昵称，有辨识度",
  },
  {
    id: "relationship",
    label: "💑 关系ID",
    subOptions: ["情侣ID", "闺蜜ID", "战队名"],
    defaultSub: "情侣ID",
    desc: "成对出现的匹配ID",
  },
];

// ─── 颜色主题 ───
const COLORS = {
  primary: "#E86A17",
  primaryLight: "rgba(232,106,23,0.08)",
  bg: "linear-gradient(180deg, #FDF8F3 0%, #F5EDE0 100%)",
  cardBg: "rgba(255,255,255,0.9)",
  text: "#2D1B0E",
  textSecondary: "#7A6B5E",
  border: "#E5DDD3",
  accent: "#D4941A",
};

// ─── 组件 ───

export default function SocialNamePage() {
  const [gender, setGender] = useState("");
  const [style, setStyle] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [contains, setContains] = useState("");
  const [lengthPref, setLengthPref] = useState("不限（推荐）");
  const [avoid, setAvoid] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Array<{ name: string; explanation: string }> | null>(null);
  const [error, setError] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [sceneCategory, setSceneCategory] = useState("social");
  const [sceneSub, setSceneSub] = useState("通用社交ID");

  // 处理关键词选择（最多3个 + 互斥顶替）
  const toggleKeyword = (kw: string) => {
    setKeywords((prev) => {
      if (prev.includes(kw)) {
        // 取消选择
        return prev.filter((k) => k !== kw);
      }
      if (prev.length >= 3) {
        // 最多3个，弹出提示或忽略
        return prev;
      }
      // 检查冲突：如果新选的词与已选的冲突，顶替掉冲突的那个
      const conflicts = KEYWORD_CONFLICTS[kw] || [];
      const conflicted = prev.find((k) => conflicts.includes(k));
      if (conflicted) {
        return prev.map((k) => (k === conflicted ? kw : k));
      }
      return [...prev, kw];
    });
  };

  // 生成结果
  const handleGenerate = async () => {
    if (!gender || !style) return;
    if (keywords.length === 0) return;

    const combinedStyle = `${gender} ${style}`;

    setLoading(true);
    setError("");
    setResults(null);

    try {
      const res = await fetch("/api/social-name/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genderStyle: combinedStyle,
          sceneCategory,
          sceneSub,
          keywords,
          contains: contains.trim(),
          length: lengthPref,
          avoid: avoid.trim(),
        }),
      });

      const data = await res.json();
      if (data.success && data.data && data.data.length > 0) {
        setResults(data.data);
      } else {
        setError(data.message || "生成失败，请稍后重试");
      }
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  // 复制
  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch {
      // ignore
    }
  };

  // 重新生成
  const handleRegenerate = () => {
    handleGenerate();
  };

  const buttonEnabled = gender && style && keywords.length > 0 && !loading;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      handleGenerate();
    }
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
            🎭 社交网名生成器
          </h1>
          <p style={{
            fontSize: 15, color: "#B8A898",
            fontFamily: "'Noto Sans SC', sans-serif", margin: 0,
          }}>
            🎭 生成个性化社交网名
          </p>
        </div>

        {/* 0. 使用场景选择 */}
        <div style={{
          background: "#FFF", borderRadius: 16,
          border: "1px solid rgba(212,148,26,0.15)",
          boxShadow: "0 4px 20px rgba(74,52,40,0.06)",
          padding: "28px 30px",
          marginBottom: 16,
        }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#4A3428", marginBottom: 12, display: "block", fontFamily: "'Noto Sans SC', sans-serif" }}>
            🎯 使用场景 <span style={{ color: "#E86A17" }}>*</span>
          </label>
          {/* 一级分类 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 12 }}>
            {SCENE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSceneCategory(cat.id);
                  setSceneSub(cat.defaultSub);
                }}
                style={{
                  padding: "12px 8px", borderRadius: 10,
                  border: `1.5px solid ${sceneCategory === cat.id ? "#E86A17" : "#DDD0C0"}`,
                  background: sceneCategory === cat.id ? "rgba(232,106,23,0.06)" : "#FFF",
                  cursor: "pointer", textAlign: "center",
                  transition: "all 0.2s",
                  fontFamily: "'Noto Sans SC', sans-serif",
                }}
              >
                <div style={{ fontSize: 16, marginBottom: 2 }}>{cat.label.split(" ")[0]}</div>
                <div style={{ fontSize: 13, fontWeight: sceneCategory === cat.id ? 600 : 400, color: sceneCategory === cat.id ? "#E86A17" : "#4A3428" }}>
                  {cat.label.split(" ").slice(1).join(" ")}
                </div>
              </button>
            ))}
          </div>
          {/* 二级细分 */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: "#6B5A4E", marginBottom: 6, display: "block", fontFamily: "'Noto Sans SC', sans-serif" }}>
              具体场景（选填）
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {SCENE_CATEGORIES.find((c) => c.id === sceneCategory)?.subOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSceneSub(opt)}
                  style={{
                    padding: "6px 14px", borderRadius: 20,
                    border: `1.5px solid ${sceneSub === opt ? "#E86A17" : "#DDD0C0"}`,
                    background: sceneSub === opt ? "rgba(232,106,23,0.06)" : "#FFF",
                    cursor: "pointer",
                    fontSize: 12, fontWeight: sceneSub === opt ? 600 : 400,
                    color: sceneSub === opt ? "#E86A17" : "#6B5A4E",
                    fontFamily: "'Noto Sans SC', sans-serif",
                    transition: "all 0.2s",
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <p style={{ fontSize: 11, color: "#B8A898", marginTop: 8, fontFamily: "'Noto Sans SC', sans-serif" }}>
            {SCENE_CATEGORIES.find((c) => c.id === sceneCategory)?.desc}
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
          {/* 1. 性别 + 2. 风格倾向 并排 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#4A3428", marginBottom: 8, display: "block", fontFamily: "'Noto Sans SC', sans-serif" }}>
                你的性别 <span style={{ color: "#E86A17" }}>*</span>
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {GENDER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setGender(opt.value)}
                    style={{
                      flex: 1, height: 42, borderRadius: 10,
                      border: `1.5px solid ${gender === opt.value ? opt.color : "#DDD0C0"}`,
                      background: gender === opt.value ? opt.color : "#FFF",
                      cursor: "pointer",
                      fontSize: 13, fontWeight: gender === opt.value ? 600 : 400,
                      color: gender === opt.value ? "#FFF" : "#6B5A4E",
                      fontFamily: "'Noto Sans SC', sans-serif",
                      transition: "all 0.2s",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#4A3428", marginBottom: 8, display: "block", fontFamily: "'Noto Sans SC', sans-serif" }}>
                你的风格倾向 <span style={{ color: "#E86A17" }}>*</span>
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {STYLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStyle(opt.value)}
                    style={{
                      flex: 1, height: 42, borderRadius: 10,
                      border: `1.5px solid ${style === opt.value ? opt.color : "#DDD0C0"}`,
                      background: style === opt.value ? opt.color : "#FFF",
                      cursor: "pointer",
                      fontSize: 13, fontWeight: style === opt.value ? 600 : 400,
                      color: style === opt.value ? "#FFF" : "#6B5A4E",
                      fontFamily: "'Noto Sans SC', sans-serif",
                      transition: "all 0.2s",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. 风格关键词 */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#4A3428", marginBottom: 8, display: "block", fontFamily: "'Noto Sans SC', sans-serif" }}>
              风格关键词 <span style={{ color: "#E86A17" }}>*</span>
              <span style={{ color: "#B8A898", fontSize: 11, fontWeight: 400, marginLeft: 4 }}>
                （最多选 3 个）
              </span>
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {KEYWORDS.map((kw) => {
                const selected = keywords.includes(kw);
                const atLimit = keywords.length >= 3 && !selected;
                return (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => toggleKeyword(kw)}
                    style={{
                      padding: "6px 14px", borderRadius: 20,
                      border: `1.5px solid ${selected ? "#E86A17" : "#DDD0C0"}`,
                      background: selected ? "rgba(232,106,23,0.06)" : "#FFF",
                      cursor: atLimit ? "not-allowed" : "pointer",
                      fontSize: 12, fontWeight: selected ? 600 : 400,
                      color: selected ? "#E86A17" : "#6B5A4E",
                      opacity: atLimit ? 0.4 : 1,
                      fontFamily: "'Noto Sans SC', sans-serif",
                      transition: "all 0.2s",
                    }}
                  >
                    {kw}{selected && " ✓"}
                  </button>
                );
              })}
            </div>
            {keywords.length === 3 && (
              <p style={{ fontSize: 11, color: "#E86A17", marginTop: 6, fontFamily: "'Noto Sans SC', sans-serif" }}>
                ✅ 已选 3 个，如需更换先取消再选
              </p>
            )}
          </div>

          {/* 4. 想包含的字 + 5. 字数要求 并排 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: "#6B5A4E", marginBottom: 6, display: "block", fontFamily: "'Noto Sans SC', sans-serif" }}>
                想包含的字
                <span style={{ color: "#B8A898", fontSize: 11, marginLeft: 4 }}>（选填）</span>
              </label>
              <input
                type="text"
                value={contains}
                onChange={(e) =>
                  setContains(e.target.value.replace(/[^\u4e00-\u9fa5a-zA-Z]/g, "").slice(0, 3))
                }
                onKeyDown={handleKeyDown}
                placeholder="例如：星、晚、雾、尧"
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
                想要几个字？
              </label>
              <div style={{ display: "flex", gap: 6 }}>
                {LENGTH_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLengthPref(opt.value)}
                    style={{
                      flex: 1, height: 40, borderRadius: 10,
                      border: `1.5px solid ${lengthPref === opt.value ? "#E86A17" : "#DDD0C0"}`,
                      background: lengthPref === opt.value ? "rgba(232,106,23,0.06)" : "#FFF",
                      cursor: "pointer",
                      fontSize: 12, fontWeight: lengthPref === opt.value ? 600 : 400,
                      color: lengthPref === opt.value ? "#E86A17" : "#6B5A4E",
                      fontFamily: "'Noto Sans SC', sans-serif",
                      transition: "all 0.2s",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 6. 不想要什么 */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#6B5A4E", marginBottom: 6, display: "block", fontFamily: "'Noto Sans SC', sans-serif" }}>
              不想要什么？
              <span style={{ color: "#B8A898", fontSize: 11, marginLeft: 4 }}>（选填）</span>
            </label>
            <input
              type="text"
              value={avoid}
              onChange={(e) => setAvoid(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="例如：不要太可爱、不要古风、不要烂大街"
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

          {/* 提交按钮 */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!buttonEnabled}
            style={{
              width: "100%", height: 48,
              background: buttonEnabled
                ? "linear-gradient(135deg, #E86A17 0%, #D55A0B 100%)"
                : "#DDD",
              color: buttonEnabled ? "#FFF" : "#999",
              border: "none", borderRadius: 12,
              fontSize: 16, fontWeight: 600,
              cursor: buttonEnabled ? "pointer" : "not-allowed",
              fontFamily: "'Noto Sans SC', sans-serif",
              transition: "all 0.2s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: buttonEnabled ? "0 4px 12px rgba(232,106,23,0.3)" : "none",
            }}
            onMouseEnter={(e) => { if (buttonEnabled) { (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 20px rgba(232,106,23,0.4)"; } }}
            onMouseLeave={(e) => { if (buttonEnabled) { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(232,106,23,0.3)"; } }}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                AI 正在生成...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                立即生成网名
              </>
            )}
          </button>
        </div>

        {/* 加载动画 */}
        {loading && !results && (
          <div style={{
            background: "#FFF", borderRadius: 16,
            border: "1px solid rgba(212,148,26,0.15)",
            padding: "60px 28px",
            marginBottom: 28,
            textAlign: "center",
          }}>
            <Loader2
              className="w-10 h-10 animate-spin mb-3"
              style={{ color: "#E86A17", margin: "0 auto 12px" }}
            />
            <p style={{ fontSize: 14, color: "#B8A898", fontFamily: "'Noto Sans SC', sans-serif", margin: 0 }}>
              AI 正在为你构思网名...
            </p>
          </div>
        )}

        {/* 结果列表 */}
        {results && results.length > 0 && (
          <div style={{
            background: "#FFF", borderRadius: 16,
            border: "1px solid rgba(212,148,26,0.15)",
            boxShadow: "0 4px 20px rgba(74,52,40,0.06)",
            padding: "28px 30px",
            marginBottom: 28,
          }}>
            {/* 操作栏 */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{
                fontSize: 18, fontWeight: 600, color: "#4A3428",
                fontFamily: "'Noto Sans SC', sans-serif", margin: 0,
              }}>
                ✨ 为你推荐 {results.length} 个网名
              </h2>
              <button
                type="button"
                onClick={handleRegenerate}
                style={{
                  background: "none", border: "1px solid #DDD0C0", borderRadius: 8,
                  padding: "6px 14px", cursor: "pointer", fontSize: 13, color: "#6B5A4E",
                  fontFamily: "'Noto Sans SC', sans-serif",
                  transition: "all 0.2s",
                  display: "flex", alignItems: "center", gap: 4,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#E86A17"; (e.currentTarget as HTMLElement).style.color = "#E86A17"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#DDD0C0"; (e.currentTarget as HTMLElement).style.color = "#6B5A4E"; }}
              >
                <RefreshCw className="w-3 h-3" />
                换一批
              </button>
            </div>

            {results.map((item, i) => (
              <div
                key={i}
                style={{
                  background: "#FFF",
                  borderRadius: 12,
                  border: "1px solid rgba(212,148,26,0.15)",
                  padding: "20px 18px",
                  transition: "all 0.2s",
                  position: "relative",
                  marginBottom: 12,
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
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 28, fontWeight: 700, color: "#4A3428", fontFamily: "'Noto Serif SC', serif", letterSpacing: "0.08em" }}>
                    {item.name}
                  </span>
                </div>
                {item.explanation && (
                  <p style={{ fontSize: 13, color: "#6B5A4E", margin: "6px 0 4px", lineHeight: 1.6, fontFamily: "'Noto Sans SC', sans-serif" }}>
                    {item.explanation}
                  </p>
                )}
                {/* 复制按钮 */}
                <button
                  type="button"
                  onClick={() => handleCopy(item.name, i)}
                  style={{
                    position: "absolute", top: 12, right: 12,
                    background: copiedIndex === i ? "#22C55E" : "rgba(232,106,23,0.08)",
                    border: "none", borderRadius: 6,
                    padding: "5px 10px", cursor: "pointer",
                    fontSize: 12, color: copiedIndex === i ? "#FFF" : "#E86A17",
                    fontFamily: "'Noto Sans SC', sans-serif",
                    transition: "all 0.2s",
                  }}
                >
                  {copiedIndex === i ? "✓ 已复制" : "📋 复制"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 初始提示 */}
        {!results && !loading && !error && (
          <div style={{
            background: "#FFF", borderRadius: 16,
            border: "1px solid rgba(212,148,26,0.12)",
            padding: "60px 28px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎨</div>
            <p style={{ fontSize: 14, color: "#B8A898", fontFamily: "'Noto Sans SC', sans-serif", margin: "0 0 4px" }}>
              选好使用场景、风格和关键词，生成专属网名
            </p>
            <p style={{ fontSize: 12, color: "#D4C9B0", fontFamily: "'Noto Sans SC', sans-serif", margin: 0 }}>
              10 秒完成，AI 为你定制
            </p>
          </div>
        )}

        {/* 返回首页 */}
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <Link
            href="/"
            style={{
              fontSize: 13, color: "#B8A898", textDecoration: "none",
              fontFamily: "'Noto Sans SC', sans-serif",
              transition: "color 0.2s",
            }}
          >
            ← 返回首页
          </Link>
        </div>

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