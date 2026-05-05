/**
 * 作品起名页
 * /work-name
 *
 * 为文学作品、手工艺品、艺术品、影视剧、短视频、栏目等提供AI命名
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Loader2,
  ArrowLeft,
  Check,
  Copy,
  RefreshCw,
  BookOpen,
  Palette,
  Theater,
  Clapperboard,
  Scissors,
  Sparkle,
} from "lucide-react";

// ─── 颜色主题 ───
const COLORS = {
  primary: "#E86A17",
  primaryLight: "rgba(232,106,23,0.08)",
  bg: "linear-gradient(180deg, #F5F0EC 0%, #ECE3D5 100%)",
  cardBg: "rgba(255,255,255,0.9)",
  text: "#2D1B0E",
  textSecondary: "#7A6B5E",
  border: "#E0D8CC",
  accent: "#D4941A",
};

// ─── 作品类型 ───
const WORK_TYPES = [
  { value: "文学作品", label: "文学作品", icon: "📖", desc: "小说·散文·诗歌" },
  { value: "手工艺品/非遗", label: "手工艺品/非遗", icon: "✂️", desc: "文创手作·非遗" },
  { value: "艺术品", label: "艺术品", icon: "🎨", desc: "画作·雕塑·摄影" },
  { value: "影视剧/短剧", label: "影视剧/短剧", icon: "🎬", desc: "影视·短剧·纪录片" },
  { value: "短视频/栏目", label: "短视频/栏目", icon: "📺", desc: "栏目·专辑·系列" },
  { value: "其他文创", label: "其他文创", icon: "✨", desc: "IP·文创产品" },
];

// ─── 作品风格（多选，最多3个） ───
const STYLE_OPTIONS = [
  "文艺诗意", "东方国风", "禅意静谧", "高级简约",
  "温暖治愈", "大气磅礴", "清冷疏离", "浪漫唯美",
  "复古怀旧", "现代先锋", "故事感强", "意象优美",
];

// 风格互斥关系
const STYLE_CONFLICTS: Record<string, string[]> = {
  "文艺诗意": ["大气磅礴", "现代先锋"],
  "东方国风": ["现代先锋", "清冷疏离"],
  "禅意静谧": ["大气磅礴", "浪漫唯美"],
  "高级简约": ["复古怀旧", "大气磅礴"],
  "温暖治愈": ["清冷疏离", "大气磅礴"],
  "大气磅礴": ["文艺诗意", "禅意静谧", "温暖治愈", "高级简约"],
  "清冷疏离": ["温暖治愈", "大气磅礴", "浪漫唯美"],
  "浪漫唯美": ["清冷疏离", "大气磅礴", "禅意静谧"],
  "复古怀旧": ["高级简约", "现代先锋"],
  "现代先锋": ["东方国风", "复古怀旧", "文艺诗意"],
  "故事感强": [],
  "意象优美": [],
};

// ─── 字数选项 ───
const LENGTH_OPTIONS = [
  { value: "2", label: "2 字", desc: "精炼高级" },
  { value: "3", label: "3 字", desc: "经典悦耳" },
  { value: "4", label: "4 字", desc: "国风首选 ✨" },
  { value: "短句", label: "短句/短语", desc: "适合栏目剧集" },
];

// ─── 主题预填建议 ───
const THEME_SUGGESTIONS = [
  "关于爱与孤独的都市小说",
  "以茶文化为主题的文创手作",
  "水墨山水风格的系列画作",
  "短剧：重生回到90年代的创业故事",
  "古风仙侠题材的微电影",
  "一档关于美食与生活的治愈栏目",
  "以节气为主题的非遗手工艺系列",
  "描绘江南水乡的摄影集",
];

export default function WorkNamePage() {
  const [workType, setWorkType] = useState("");
  const [theme, setTheme] = useState("");
  const [styles, setStyles] = useState<string[]>([]);
  const [keywords, setKeywords] = useState("");
  const [lengthPref, setLengthPref] = useState("4");
  const [avoid, setAvoid] = useState("");

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<
    Array<{ name: string; explanation: string }> | null
  >(null);
  const [error, setError] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // ─── 风格多选逻辑（带互斥顶替） ───
  const toggleStyle = (s: string) => {
    setStyles((prev) => {
      if (prev.includes(s)) {
        return prev.filter((v) => v !== s);
      }
      if (prev.length >= 3) {
        return prev;
      }
      const conflicts = STYLE_CONFLICTS[s] || [];
      const conflicted = prev.find((v) => conflicts.includes(v));
      if (conflicted) {
        return prev.map((v) => (v === conflicted ? s : v));
      }
      return [...prev, s];
    });
  };

  // ─── 填充主题示例 ───
  const fillThemeSuggestion = () => {
    const remaining = THEME_SUGGESTIONS.filter(
      (s) => s !== theme && s !== ""
    );
    if (remaining.length > 0) {
      const randomIndex = Math.floor(Math.random() * remaining.length);
      setTheme(remaining[randomIndex]);
    }
  };

  // ─── 生成 ───
  const handleGenerate = async () => {
    if (!workType || !theme.trim() || styles.length === 0) return;

    setLoading(true);
    setError("");
    setResults(null);

    try {
      const res = await fetch("/api/work-name/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workType,
          theme: theme.trim(),
          styles,
          keywords: keywords.trim(),
          lengthPref,
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

  // ─── 复制 ───
  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch {
      // ignore
    }
  };

  // ─── 重新生成 ───
  const handleRegenerate = () => {
    handleGenerate();
  };

  const buttonEnabled =
    workType && theme.trim().length >= 2 && styles.length > 0 && !loading;

  // ─── 渲染 ───
  return (
    <div className="min-h-screen" style={{ background: COLORS.bg }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: "rgba(252,249,242,0.85)",
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
          <BookOpen className="w-5 h-5" style={{ color: COLORS.primary }} />
          <span
            className="font-bold"
            style={{ color: COLORS.text, fontFamily: "'Noto Serif SC', serif" }}
          >
            作品起名
          </span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-lg">
        {/* 副标题 */}
        <div className="text-center mb-6">
          <h1
            className="text-2xl font-bold mb-2"
            style={{ color: COLORS.text, fontFamily: "'Noto Serif SC', serif" }}
          >
            🎨 AI 作品命名
          </h1>
          <p className="text-sm" style={{ color: COLORS.textSecondary }}>
            为你的文学作品、艺术品、影视栏目、文创 IP 取一个有格调的名字
          </p>
        </div>

        {/* ─── 主表单卡片 ─── */}
        <div
          className="rounded-2xl p-6 shadow-lg space-y-5"
          style={{
            background: COLORS.cardBg,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          {/* 1. 作品类型 */}
          <div>
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: COLORS.text }}
            >
              作品类型 <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {WORK_TYPES.map((wt) => {
                const selected = workType === wt.value;
                return (
                  <button
                    key={wt.value}
                    type="button"
                    onClick={() => setWorkType(wt.value)}
                    className="p-3 rounded-xl text-left transition-all"
                    style={{
                      background: selected
                        ? COLORS.primary
                        : "rgba(245,237,224,0.5)",
                      color: selected ? "#FFF" : COLORS.textSecondary,
                      border: `1px solid ${
                        selected ? COLORS.primary : COLORS.border
                      }`,
                      cursor: "pointer",
                    }}
                  >
                    <div
                      className={`text-base font-medium mb-0.5 ${
                        selected ? "text-white" : ""
                      }`}
                      style={{ color: selected ? "#FFF" : COLORS.text }}
                    >
                      {wt.icon} {wt.label.split("/")[0]}
                    </div>
                    <div
                      className="text-[11px] mt-0.5"
                      style={{ color: selected ? "rgba(255,255,255,0.75)" : "#AAA" }}
                    >
                      {wt.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. 作品主题 / 核心内容 */}
          <div>
            <label
              className="block text-sm font-semibold mb-1"
              style={{ color: COLORS.text }}
            >
              作品主题 / 核心内容 <span className="text-red-400">*</span>
              <span className="text-xs ml-1" style={{ color: COLORS.textSecondary }}>
                （描述你作品的核心，至少2个字）
              </span>
            </label>
            <div className="relative">
              <textarea
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="例如：一部以江南古镇为背景的文艺小说，讲述三代人的悲欢离合…"
                rows={2}
                className="w-full px-4 py-3 rounded-xl text-sm resize-none"
                style={{
                  background: "rgba(255,255,255,0.8)",
                  border: `1px solid ${COLORS.border}`,
                  outline: "none",
                  color: COLORS.text,
                }}
              />
              {/* 灵感按钮 */}
              <button
                type="button"
                onClick={fillThemeSuggestion}
                className="absolute right-2 bottom-2 px-2 py-1 rounded-lg text-[11px] transition-all"
                style={{
                  background: COLORS.primaryLight,
                  color: COLORS.primary,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                💡 没灵感？点一下
              </button>
            </div>
          </div>

          {/* 3. 作品风格（多选） */}
          <div>
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: COLORS.text }}
            >
              作品风格 <span className="text-red-400">*</span>
              <span className="text-xs ml-1" style={{ color: COLORS.textSecondary }}>
                （最多选 3 个）
              </span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {STYLE_OPTIONS.map((s) => {
                const selected = styles.includes(s);
                const atLimit = styles.length >= 3 && !selected;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleStyle(s)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                    style={{
                      background: selected
                        ? COLORS.primary
                        : "rgba(245,237,224,0.5)",
                      color: selected ? "#FFF" : COLORS.textSecondary,
                      border: `1px solid ${
                        selected ? COLORS.primary : COLORS.border
                      }`,
                      opacity: atLimit ? 0.4 : 1,
                      cursor: atLimit ? "not-allowed" : "pointer",
                    }}
                  >
                    {s}
                    {selected && " ✓"}
                  </button>
                );
              })}
            </div>
            {styles.length === 3 && (
              <p
                className="text-xs mt-1"
                style={{ color: COLORS.primary }}
              >
                ✅ 已选 3 个，如需更换先取消再选
              </p>
            )}
          </div>

          {/* 4. 关键词元素 */}
          <div>
            <label
              className="block text-sm font-semibold mb-1"
              style={{ color: COLORS.text }}
            >
              希望融入的元素
              <span className="text-xs ml-1" style={{ color: COLORS.textSecondary }}>
                （选填，如特定意象、词语）
              </span>
            </label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="例如：月亮、星河、茶、雨、故人"
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{
                background: "rgba(255,255,255,0.8)",
                border: `1px solid ${COLORS.border}`,
                outline: "none",
                color: COLORS.text,
              }}
            />
          </div>

          {/* 5. 字数要求 */}
          <div>
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: COLORS.text }}
            >
              名字长度
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
                        ? COLORS.primary
                        : "rgba(245,237,224,0.5)",
                    color:
                      lengthPref === opt.value
                        ? "#FFF"
                        : COLORS.textSecondary,
                    border: `1px solid ${
                      lengthPref === opt.value
                        ? COLORS.primary
                        : COLORS.border
                    }`,
                    cursor: "pointer",
                  }}
                >
                  <div className="text-xs">{opt.label}</div>
                  <div
                    className="text-[10px] mt-0.5"
                    style={{
                      color:
                        lengthPref === opt.value
                          ? "rgba(255,255,255,0.75)"
                          : "#AAA",
                    }}
                  >
                    {opt.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 6. 禁忌 */}
          <div>
            <label
              className="block text-sm font-semibold mb-1"
              style={{ color: COLORS.text }}
            >
              不想要什么？
              <span className="text-xs ml-1" style={{ color: COLORS.textSecondary }}>
                （选填）
              </span>
            </label>
            <input
              type="text"
              value={avoid}
              onChange={(e) => setAvoid(e.target.value)}
              placeholder="例如：不要太直白、不要俗套、不要过于古风"
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{
                background: "rgba(255,255,255,0.8)",
                border: `1px solid ${COLORS.border}`,
                outline: "none",
                color: COLORS.text,
              }}
            />
          </div>

          {/* 提交按钮 */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!buttonEnabled}
            className="w-full py-4 rounded-xl font-bold text-white text-base transition-all flex items-center justify-center gap-2"
            style={{
              background: buttonEnabled
                ? `linear-gradient(135deg, ${COLORS.primary} 0%, #D55A0B 100%)`
                : "#CCC",
              cursor: buttonEnabled ? "pointer" : "not-allowed",
              boxShadow: buttonEnabled
                ? `0 4px 16px rgba(232,106,23,0.3)`
                : "none",
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                AI 正在构思名字...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                立即生成作品名
              </>
            )}
          </button>
        </div>

        {/* 错误信息 */}
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

        {/* 加载动画 */}
        {loading && !results && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2
              className="w-10 h-10 animate-spin mb-3"
              style={{ color: COLORS.primary }}
            />
            <p className="text-sm" style={{ color: COLORS.textSecondary }}>
              AI 正在为你的作品构思名字...
            </p>
          </div>
        )}

        {/* 结果列表 */}
        {results && results.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2
                className="text-lg font-bold"
                style={{ color: COLORS.text, fontFamily: "'Noto Serif SC', serif" }}
              >
                ✨ 为你推荐 {results.length} 个名字
              </h2>
              <button
                type="button"
                onClick={handleRegenerate}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: COLORS.primaryLight,
                  color: COLORS.primary,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <RefreshCw className="w-3 h-3" />
                换一批
              </button>
            </div>

            {results.map((item, i) => (
              <div
                key={i}
                className="rounded-xl p-4 transition-all hover:shadow-md"
                style={{
                  background: "rgba(255,255,255,0.9)",
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-lg font-bold"
                      style={{ color: COLORS.text }}
                    >
                      {item.name}
                    </p>
                    {item.explanation && (
                      <p
                        className="text-xs mt-1 leading-relaxed"
                        style={{ color: COLORS.textSecondary }}
                      >
                        {item.explanation}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(item.name, i)}
                    className="shrink-0 ml-3 p-2 rounded-lg transition-all"
                    style={{
                      background:
                        copiedIndex === i
                          ? "rgba(34,197,94,0.1)"
                          : "rgba(232,106,23,0.06)",
                      border: "none",
                      cursor: "pointer",
                    }}
                    title="复制"
                  >
                    {copiedIndex === i ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" style={{ color: COLORS.primary }} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 初始提示 */}
        {!results && !loading && !error && (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">📝</div>
            <p className="text-sm" style={{ color: COLORS.textSecondary }}>
              选择作品类型、描述主题、挑选风格，AI 为你生成作品名
            </p>
            <p className="text-xs mt-1" style={{ color: "#AAA" }}>
              适合文学、艺术、影视、文创等各类作品
            </p>
          </div>
        )}

        {/* 返回首页 */}
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