/**
 * 社交网名生成页
 * /social-name
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Loader2, ArrowLeft, Check, Copy, RefreshCw } from "lucide-react";

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

  return (
    <div className="min-h-screen" style={{ background: COLORS.bg }}>
      {/* Header */}
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
          <Sparkles className="w-5 h-5" style={{ color: COLORS.primary }} />
          <span
            className="font-bold"
            style={{ color: COLORS.text, fontFamily: "'Noto Serif SC', serif" }}
          >
            起一个社交网名
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
            🎭 社交网名生成器
          </h1>
          <p className="text-sm" style={{ color: COLORS.textSecondary }}>
            先选使用场景，再挑风格，AI 为你定制专属网名
          </p>
        </div>

        {/* 0. 使用场景选择（新增） */}
        <div
          className="rounded-2xl p-5 mb-4 shadow-sm space-y-3"
          style={{
            background: COLORS.cardBg,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <label
            className="block text-sm font-semibold mb-2"
            style={{ color: COLORS.text }}
          >
            🎯 使用场景 <span className="text-red-400">*</span>
          </label>
          {/* 一级分类 */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {SCENE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSceneCategory(cat.id);
                  setSceneSub(cat.defaultSub);
                }}
                className="py-3 px-2 rounded-xl text-sm font-medium transition-all text-center"
                style={{
                  background:
                    sceneCategory === cat.id
                      ? COLORS.primary
                      : "rgba(245,237,224,0.5)",
                  color: sceneCategory === cat.id ? "#FFF" : COLORS.textSecondary,
                  border: `1px solid ${
                    sceneCategory === cat.id ? COLORS.primary : COLORS.border
                  }`,
                  cursor: "pointer",
                }}
              >
                <div className="text-lg mb-1">{cat.label.split(" ")[0]}</div>
                <div>{cat.label.split(" ").slice(1).join(" ")}</div>
              </button>
            ))}
          </div>
          {/* 二级细分 */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: COLORS.textSecondary }}
            >
              具体场景（选填）
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SCENE_CATEGORIES.find((c) => c.id === sceneCategory)?.subOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSceneSub(opt)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={{
                    background:
                      sceneSub === opt
                        ? COLORS.primary
                        : "rgba(245,237,224,0.5)",
                    color: sceneSub === opt ? "#FFF" : COLORS.textSecondary,
                    border: `1px solid ${
                      sceneSub === opt ? COLORS.primary : COLORS.border
                    }`,
                    cursor: "pointer",
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
          {/* 场景描述 */}
          <p className="text-xs mt-1" style={{ color: "#AAA" }}>
            {SCENE_CATEGORIES.find((c) => c.id === sceneCategory)?.desc}
          </p>
        </div>

        {/* 表单卡片 */}
        <div
          className="rounded-2xl p-6 shadow-lg space-y-5"
          style={{
            background: COLORS.cardBg,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          {/* 1. 性别 */}
          <div>
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: COLORS.text }}
            >
              你的性别 <span className="text-red-400">*</span>
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

          {/* 2. 风格倾向 */}
          <div>
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: COLORS.text }}
            >
              你的风格倾向 <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {STYLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStyle(opt.value)}
                  className="py-2.5 px-1 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background:
                      style === opt.value
                        ? opt.color
                        : "rgba(245,237,224,0.5)",
                    color: style === opt.value ? "#FFF" : COLORS.textSecondary,
                    border: `1px solid ${
                      style === opt.value ? opt.color : COLORS.border
                    }`,
                    cursor: "pointer",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. 风格关键词 */}
          <div>
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: COLORS.text }}
            >
              风格关键词 <span className="text-red-400">*</span>
              <span className="text-xs ml-1" style={{ color: COLORS.textSecondary }}>
                （最多选 3 个）
              </span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {KEYWORDS.map((kw) => {
                const selected = keywords.includes(kw);
                const atLimit = keywords.length >= 3 && !selected;
                return (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => toggleKeyword(kw)}
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
                    {kw}
                    {selected && " ✓"}
                  </button>
                );
              })}
            </div>
            {keywords.length === 3 && (
              <p
                className="text-xs mt-1"
                style={{ color: COLORS.primary }}
              >
                ✅ 已选 3 个，如需更换先取消再选
              </p>
            )}
          </div>

          {/* 4. 想包含的字 */}
          <div>
            <label
              className="block text-sm font-semibold mb-1"
              style={{ color: COLORS.text }}
            >
              想包含的字
              <span className="text-xs ml-1" style={{ color: COLORS.textSecondary }}>
                （选填，最多 3 个字）
              </span>
            </label>
            <input
              type="text"
              value={contains}
              onChange={(e) =>
                setContains(e.target.value.replace(/[^\u4e00-\u9fa5a-zA-Z]/g, "").slice(0, 3))
              }
              placeholder="例如：星、晚、雾、尧"
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
              想要几个字？
            </label>
            <div className="flex gap-2">
              {LENGTH_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLengthPref(opt.value)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background:
                      lengthPref === opt.value ? COLORS.primary : "rgba(245,237,224,0.5)",
                    color: lengthPref === opt.value ? "#FFF" : COLORS.textSecondary,
                    border: `1px solid ${
                      lengthPref === opt.value ? COLORS.primary : COLORS.border
                    }`,
                    cursor: "pointer",
                  }}
                >
                  {opt.label}
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
              placeholder="例如：不要太可爱、不要古风、不要烂大街"
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
              AI 正在为你构思网名...
            </p>
          </div>
        )}

        {/* 结果列表 */}
        {results && results.length > 0 && (
          <div className="mt-6 space-y-3">
            {/* 操作栏 */}
            <div className="flex items-center justify-between mb-2">
              <h2
                className="text-lg font-bold"
                style={{ color: COLORS.text, fontFamily: "'Noto Serif SC', serif" }}
              >
                ✨ 为你推荐 {results.length} 个网名
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
                    {/* 网名 */}
                    <p
                      className="text-lg font-bold"
                      style={{ color: COLORS.text }}
                    >
                      {item.name}
                    </p>
                    {/* 说明 */}
                    {item.explanation && (
                      <p
                        className="text-xs mt-1 leading-relaxed"
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
            <div className="text-5xl mb-3">🎨</div>
            <p className="text-sm" style={{ color: COLORS.textSecondary }}>
              选好使用场景、风格和关键词，生成专属网名
            </p>
            <p className="text-xs mt-1" style={{ color: "#AAA" }}>
              10 秒完成，AI 为你定制
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