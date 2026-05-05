/**
 * 艺名/笔名/主播名生成页
 * /stage-name
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Loader2, ArrowLeft, Check, Copy, RefreshCw, Star } from "lucide-react";

// ─── 数据定义 ───

// 1. 身份类型（必选·单选）
const IDENTITY_OPTIONS = [
  { value: "主播", label: "🎙 主播 / 博主", desc: "抖音·快手·视频号" },
  { value: "自媒体", label: "📹 自媒体 / UP 主", desc: "B站·小红书·公众号" },
  { value: "作家", label: "📖 作家 / 作者 / 诗人", desc: "出版·文章·诗集" },
  { value: "演员", label: "🎭 演员 / 模特 / 艺人", desc: "娱乐圈·时尚圈" },
  { value: "职场", label: "💼 职场 / 演讲 / 知识博主", desc: "职场·演讲·知识IP" },
  { value: "其他", label: "🌟 其他公众形象", desc: "各类公众形象需求" },
];

// 2. 性别/气质倾向（必选·单选）
const GENDER_OPTIONS = [
  { value: "男", label: "👨 男", color: "#4A90D9" },
  { value: "女", label: "👩 女", color: "#E870A0" },
  { value: "中性", label: "💫 中性（高级/盐系）", color: "#8B7EC8" },
];

// 3. 风格方向（最多选3个）
const STYLE_OPTIONS = [
  "高级简约",
  "温柔治愈",
  "清冷文艺",
  "大气稳重",
  "酷飒个性",
  "可爱甜系",
  "幽默吸睛",
  "国学国风",
  "知识专业",
  "记忆点强",
];

// 风格互斥关系
const STYLE_CONFLICTS: Record<string, string[]> = {
  "可爱甜系": ["酷飒个性", "清冷文艺", "大气稳重"],
  "酷飒个性": ["可爱甜系", "温柔治愈"],
  "温柔治愈": ["酷飒个性", "知识专业"],
  "清冷文艺": ["可爱甜系", "幽默吸睛"],
  "大气稳重": ["可爱甜系", "幽默吸睛"],
  "幽默吸睛": ["大气稳重", "清冷文艺", "国学国风"],
  "国学国风": ["幽默吸睛", "可爱甜系"],
};

// 4. 字数偏好（必选·单选）
const LENGTH_OPTIONS = [
  { value: "2", label: "2 字", desc: "最易传播" },
  { value: "3", label: "3 字", desc: "最适合主播/博主" },
  { value: "4", label: "4 字", desc: "IP感强·高级" },
  { value: "不限", label: "不限 📏", desc: "AI推荐最优" },
];

// ─── 颜色主题 ───
const COLORS = {
  primary: "linear-gradient(135deg, #E86A17 0%, #D55A0B 100%)",
  primarySolid: "#E86A17",
  primaryLight: "rgba(232,106,23,0.08)",
  primaryDark: "#D55A0B",
  bg: "linear-gradient(180deg, #FDF8F3 0%, #F5EDE0 100%)",
  cardBg: "rgba(255,255,255,0.92)",
  text: "#2D1B0E",
  textSecondary: "#7A6B5E",
  textLight: "#999",
  border: "#E5DDD3",
  gold: "#D4941A",
};

// ─── 组件 ───

export default function StageNamePage() {
  const [identity, setIdentity] = useState("");
  const [gender, setGender] = useState("");
  const [styles, setStyles] = useState<string[]>([]);
  const [contains, setContains] = useState("");
  const [lengthPref, setLengthPref] = useState("");
  const [avoid, setAvoid] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Array<{ name: string; explanation: string }> | null>(null);
  const [error, setError] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [taglineHover, setTaglineHover] = useState(false);

  // 处理风格选择（最多3个 + 互斥顶替）
  const toggleStyle = (style: string) => {
    setStyles((prev) => {
      if (prev.includes(style)) {
        return prev.filter((s) => s !== style);
      }
      if (prev.length >= 3) {
        return prev;
      }
      const conflicts = STYLE_CONFLICTS[style] || [];
      const conflicted = prev.find((s) => conflicts.includes(s));
      if (conflicted) {
        return prev.map((s) => (s === conflicted ? style : s));
      }
      return [...prev, style];
    });
  };

  const handleGenerate = async () => {
    if (!identity || !gender || styles.length === 0) return;

    setLoading(true);
    setError("");
    setResults(null);

    try {
      const res = await fetch("/api/stage-name/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity,
          gender,
          style: styles,
          contains: contains.trim(),
          length: lengthPref || "不限",
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

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch {
      // ignore
    }
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  const buttonEnabled = identity && gender && styles.length > 0 && !loading;

  // 获取已选择的身份详情
  const selectedIdentity = IDENTITY_OPTIONS.find((o) => o.value === identity);

  return (
    <div className="min-h-screen" style={{ background: COLORS.bg }}>
      {/* ═══ Header ═══ */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: "rgba(255,252,247,0.85)",
          backdropFilter: "blur(6px)",
          borderColor: COLORS.border,
        }}
      >
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/"
            className="text-[#5C4A42] hover:text-[#C84A2A] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Sparkles className="w-5 h-5" style={{ color: COLORS.primarySolid }} />
          <span
            className="font-bold"
            style={{ color: COLORS.text, fontFamily: "'Noto Serif SC', serif" }}
          >
            艺名·笔名·主播名
          </span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-lg">
        {/* ═══ 主标题区 ═══ */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-3"
            style={{
              background: "rgba(212,148,26,0.12)",
              color: COLORS.gold,
              border: "1px solid rgba(212,148,26,0.2)",
            }}
          >
            <Star className="w-3 h-3" />
            专属艺名 · 打造个人IP
          </div>
          <h1
            className="text-2xl font-bold mb-2"
            style={{ color: COLORS.text, fontFamily: "'Noto Serif SC', serif" }}
          >
            AI 艺名 / 笔名 / 主播名生成
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: COLORS.textSecondary }}>
            好记 · 好听 · 有辨识度 · 利于涨粉 · 无负面歧义
          </p>
          <p className="text-xs mt-1.5" style={{ color: COLORS.textLight }}>
            主播 · 博主 · 作家 · 演员 · 自媒体 · 职场演讲
          </p>
        </div>

        {/* ═══ 表单卡片 ═══ */}
        <div
          className="rounded-2xl p-6 shadow-lg space-y-5"
          style={{
            background: COLORS.cardBg,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          {/* 1. 身份类型 */}
          <div>
            <label
              className="block text-sm font-semibold mb-2.5"
              style={{ color: COLORS.text }}
            >
              你的身份类型 <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {IDENTITY_OPTIONS.map((opt) => {
                const isSelected = identity === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setIdentity(opt.value)}
                    className="py-3 px-3 rounded-xl text-sm font-medium transition-all text-left"
                    style={{
                      background: isSelected
                        ? COLORS.primary
                        : "rgba(245,237,224,0.5)",
                      color: isSelected ? "#FFF" : COLORS.text,
                      border: `1px solid ${
                        isSelected ? COLORS.primarySolid : COLORS.border
                      }`,
                      boxShadow: isSelected
                        ? "0 4px 12px rgba(232,106,23,0.25)"
                        : "none",
                      cursor: "pointer",
                    }}
                  >
                    <div className="text-base">{opt.label}</div>
                    <div
                      className="text-xs mt-0.5 opacity-70"
                      style={{ color: isSelected ? "#FFF" : COLORS.textSecondary }}
                    >
                      {opt.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. 性别气质 */}
          <div>
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: COLORS.text }}
            >
              性别 / 气质倾向 <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {GENDER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setGender(opt.value)}
                  className="py-2.5 px-1 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background:
                      gender === opt.value
                        ? opt.color
                        : "rgba(245,237,224,0.5)",
                    color: gender === opt.value ? "#FFF" : COLORS.textSecondary,
                    border: `1px solid ${
                      gender === opt.value ? opt.color : COLORS.border
                    }`,
                    cursor: "pointer",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. 风格方向 */}
          <div>
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: COLORS.text }}
            >
              风格方向 <span className="text-red-400">*</span>
              <span className="text-xs ml-1" style={{ color: COLORS.textSecondary }}>
                （最多选 3 个）
              </span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {STYLE_OPTIONS.map((style) => {
                const selected = styles.includes(style);
                const atLimit = styles.length >= 3 && !selected;
                return (
                  <button
                    key={style}
                    type="button"
                    onClick={() => toggleStyle(style)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                    style={{
                      background: selected
                        ? COLORS.primary
                        : "rgba(245,237,224,0.5)",
                      color: selected ? "#FFF" : COLORS.textSecondary,
                      border: `1px solid ${
                        selected ? COLORS.primarySolid : COLORS.border
                      }`,
                      opacity: atLimit ? 0.4 : 1,
                      cursor: atLimit ? "not-allowed" : "pointer",
                    }}
                  >
                    {style}
                    {selected && " ✓"}
                  </button>
                );
              })}
            </div>
            {styles.length === 3 && (
              <p
                className="text-xs mt-1"
                style={{ color: COLORS.primarySolid }}
              >
                ✅ 已选 3 个风格，点击已选项可取消重选
              </p>
            )}
          </div>

          {/* 4. 希望包含的字 */}
          <div>
            <label
              className="block text-sm font-semibold mb-1"
              style={{ color: COLORS.text }}
            >
              希望包含的字
              <span className="text-xs ml-1" style={{ color: COLORS.textSecondary }}>
                （选填，1-2个汉字）
              </span>
            </label>
            <input
              type="text"
              value={contains}
              onChange={(e) =>
                setContains(
                  e.target.value.replace(/[^\u4e00-\u9fa5]/g, "").slice(0, 2)
                )
              }
              placeholder="例：星、禾、晚、安、白、秋、言、泽"
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{
                background: "rgba(255,255,255,0.8)",
                border: `1px solid ${COLORS.border}`,
                outline: "none",
                color: COLORS.text,
                fontFamily: "'Noto Sans SC', sans-serif",
              }}
              onFocus={(e) => {
                (e.target as HTMLInputElement).style.borderColor = COLORS.primarySolid;
                (e.target as HTMLInputElement).style.boxShadow = `0 0 0 3px rgba(232,106,23,0.1)`;
              }}
              onBlur={(e) => {
                (e.target as HTMLInputElement).style.borderColor = COLORS.border;
                (e.target as HTMLInputElement).style.boxShadow = "none";
              }}
            />
          </div>

          {/* 5. 字数偏好 */}
          <div>
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: COLORS.text }}
            >
              字数偏好 <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {LENGTH_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLengthPref(opt.value)}
                  className="py-2.5 px-1 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background:
                      lengthPref === opt.value
                        ? COLORS.primarySolid
                        : "rgba(245,237,224,0.5)",
                    color:
                      lengthPref === opt.value ? "#FFF" : COLORS.textSecondary,
                    border: `1px solid ${
                      lengthPref === opt.value
                        ? COLORS.primarySolid
                        : COLORS.border
                    }`,
                    cursor: "pointer",
                  }}
                >
                  <div>{opt.label}</div>
                  <div
                    className="text-[10px] mt-0.5 opacity-70"
                    style={{
                      color:
                        lengthPref === opt.value ? "#FFF" : COLORS.textLight,
                    }}
                  >
                    {opt.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 6. 禁忌/不想要 */}
          <div>
            <label
              className="block text-sm font-semibold mb-1"
              style={{ color: COLORS.text }}
            >
              禁忌 / 不想要
              <span className="text-xs ml-1" style={{ color: COLORS.textSecondary }}>
                （选填）
              </span>
            </label>
            <input
              type="text"
              value={avoid}
              onChange={(e) => setAvoid(e.target.value)}
              placeholder="不要太俗 · 不要绕口 · 不要可爱 · 不要生僻字"
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{
                background: "rgba(255,255,255,0.8)",
                border: `1px solid ${COLORS.border}`,
                outline: "none",
                color: COLORS.text,
                fontFamily: "'Noto Sans SC', sans-serif",
              }}
              onFocus={(e) => {
                (e.target as HTMLInputElement).style.borderColor = COLORS.primarySolid;
                (e.target as HTMLInputElement).style.boxShadow = `0 0 0 3px rgba(232,106,23,0.1)`;
              }}
              onBlur={(e) => {
                (e.target as HTMLInputElement).style.borderColor = COLORS.border;
                (e.target as HTMLInputElement).style.boxShadow = "none";
              }}
            />
          </div>

          {/* ═══ 提交按钮 ═══ */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!buttonEnabled}
            className="w-full py-4 rounded-xl font-bold text-white text-base transition-all flex items-center justify-center gap-2"
            style={{
              background: buttonEnabled ? COLORS.primary : "#CCC",
              cursor: buttonEnabled ? "pointer" : "not-allowed",
              boxShadow: buttonEnabled
                ? "0 4px 20px rgba(232,106,23,0.35)"
                : "none",
              transform: buttonEnabled && taglineHover ? "translateY(-1px)" : "none",
            }}
            onMouseEnter={() => setTaglineHover(true)}
            onMouseLeave={() => setTaglineHover(false)}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                AI 正在构思专属艺名...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                立即生成专属{selectedIdentity ? selectedIdentity.label.split(" ").slice(1).join(" ") || "艺名" : "艺名/笔名"}
              </>
            )}
          </button>
        </div>

        {/* ═══ 错误信息 ═══ */}
        {error && (
          <div
            className="mt-4 p-4 rounded-xl text-sm"
            style={{
              background: "#FFF0F0",
              border: "1px solid #FFD0D0",
              color: "#C0392B",
            }}
          >
            {error}
          </div>
        )}

        {/* ═══ 加载动画 ═══ */}
        {loading && !results && (
          <div className="flex flex-col items-center justify-center py-12">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-4 animate-pulse"
              style={{ background: COLORS.primaryLight }}
            >
              <Sparkles
                className="w-6 h-6 animate-spin"
                style={{ color: COLORS.primarySolid }}
              />
            </div>
            <p className="text-sm font-medium" style={{ color: COLORS.text }}>
              AI 正在为你构思专属艺名/笔名...
            </p>
            <p className="text-xs mt-1" style={{ color: COLORS.textLight }}>
              基于你的身份、风格和需求，精心生成 10 个名字
            </p>
          </div>
        )}

        {/* ═══ 结果列表 ═══ */}
        {results && results.length > 0 && (
          <div className="mt-6 space-y-3">
            {/* 操作栏 */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2
                  className="text-lg font-bold flex items-center gap-2"
                  style={{
                    color: COLORS.text,
                    fontFamily: "'Noto Serif SC', serif",
                  }}
                >
                  ✨ 为你推荐 {results.length} 个
                  <span
                    className="text-xs font-normal px-2 py-0.5 rounded-full"
                    style={{
                      background: COLORS.primaryLight,
                      color: COLORS.primarySolid,
                    }}
                  >
                    {selectedIdentity?.label?.split(" ").slice(1).join(" ") || "艺名"}
                  </span>
                </h2>
              </div>
              <button
                type="button"
                onClick={handleRegenerate}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: COLORS.primaryLight,
                  color: COLORS.primarySolid,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <RefreshCw className="w-3 h-3" />
                换一批
              </button>
            </div>

            {/* 名字卡片列表 */}
            {results.map((item, i) => (
              <div
                key={i}
                className="rounded-xl p-4 transition-all hover:shadow-md"
                style={{
                  background: "rgba(255,255,255,0.92)",
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* 排名 + 名字 */}
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          background:
                            i < 3
                              ? "linear-gradient(135deg, #D4941A, #E8A825)"
                              : "rgba(245,237,224,0.5)",
                          color: i < 3 ? "#FFF" : COLORS.textLight,
                        }}
                      >
                        {i + 1}
                      </span>
                      <p
                        className="text-xl font-bold tracking-wide"
                        style={{ color: COLORS.text }}
                      >
                        {item.name}
                      </p>
                    </div>
                    {/* 说明 */}
                    {item.explanation && (
                      <p
                        className="text-xs mt-1.5 leading-relaxed ml-7"
                        style={{ color: COLORS.textSecondary }}
                      >
                        {item.explanation}
                      </p>
                    )}
                  </div>
                  {/* 复制按钮 */}
                  <button
                    type="button"
                    onClick={() => handleCopy(item.name, i)}
                    className="shrink-0 ml-3 p-2 rounded-lg transition-all"
                    style={{
                      background:
                        copiedIndex === i
                          ? "rgba(34,197,94,0.1)"
                          : "rgba(232,106,23,0.05)",
                      border: "none",
                      cursor: "pointer",
                    }}
                    title="复制"
                  >
                    {copiedIndex === i ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy
                        className="w-4 h-4"
                        style={{ color: COLORS.primarySolid }}
                      />
                    )}
                  </button>
                </div>
              </div>
            ))}

            {/* 底部行动号召 */}
            <div
              className="mt-6 p-5 rounded-2xl text-center"
              style={{
                background:
                  "linear-gradient(135deg, rgba(232,106,23,0.06) 0%, rgba(212,148,26,0.06) 100%)",
                border: "1px solid rgba(212,148,26,0.15)",
              }}
            >
              <p
                className="text-sm font-medium"
                style={{ color: COLORS.text }}
              >
                🎯 选一个最喜欢的名字，开启你的个人品牌之路
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: COLORS.textSecondary }}
              >
                不满意？点击「换一批」重新生成
              </p>
            </div>
          </div>
        )}

        {/* ═══ 初始引导状态 ═══ */}
        {!results && !loading && !error && (
          <div className="text-center py-10">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{
                background:
                  "linear-gradient(135deg, rgba(232,106,23,0.08) 0%, rgba(212,148,26,0.08) 100%)",
              }}
            >
              <Star className="w-8 h-8" style={{ color: COLORS.gold }} />
            </div>
            <p
              className="text-base font-medium"
              style={{ color: COLORS.text }}
            >
              打造你的专属公众形象
            </p>
            <p
              className="text-sm mt-2 max-w-xs mx-auto leading-relaxed"
              style={{ color: COLORS.textSecondary }}
            >
              选好身份和风格，AI 为你精心设计 10 个好记、好听、有辨识度的艺名/笔名
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-5">
              {[
                "🎙 主播直播",
                "📖 作家笔名",
                "🎭 演员艺名",
                "📹 自媒体IP",
                "💼 职场形象",
              ].map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-xs"
                  style={{
                    background: "rgba(245,237,224,0.6)",
                    color: COLORS.textSecondary,
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ═══ 底部导航 ═══ */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-xs transition-colors"
            style={{ color: COLORS.textSecondary }}
          >
            ← 返回首页
          </Link>
        </div>
      </main>
    </div>
  );
}