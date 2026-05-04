"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Heart, Volume2, ChevronDown, ChevronUp, Sparkles,
  X, Copy, Check, Info, Loader2, Star, BookOpen,
  Globe, SlidersHorizontal, Filter, RefreshCw, Share2
} from "lucide-react";

// ===== 类型定义 =====

interface EnameScoredResult {
  name: string;
  gender: string;
  phonetic: string;
  chinese: string;
  origin: string;
  popularity: string;
  meaning: string;
  firstLetter: string;
  score: number;
  phoneticScore: number;
  meaningScore: number;
  styleScore: number;
  popularityScore: number;
  lengthScore: number;
  tags: string[];
  adaptationNote: string;
  recommendedFullName?: string;
  surnameEnglish?: string;
  surnameChina?: string;
  surnameOverseas?: string;
  /** 来源：'db' 英文名数据库 / 'ai' DeepSeek AI 生成 */
  source?: "db" | "ai";
  /** AI 深入分析（发音接近度、文化适配等） */
  analysis?: string;
  /** 针对该用户的个性化推荐理由 */
  recommendationReason?: string;
}

// ===== 常量 =====

const NEEDS_OPTIONS = [
  { value: "谐音贴近中文名", label: "谐音贴近中文名", desc: "发音与中文名相近" },
  { value: "含义美好", label: "含义美好", desc: "寓意平安、健康、聪明等" },
  { value: "商务正式", label: "商务正式", desc: "职场、外企用" },
  { value: "简约好记", label: "简约好记", desc: "3-5个字母，简洁易写" },
  { value: "文艺小众", label: "文艺小众", desc: "不撞名的文艺范" },
  { value: "可爱灵动", label: "可爱灵动", desc: "给孩子/女生用" },
];

const AVOID_OPTIONS = [
  { value: "不要太常见的爆款名", label: "不要太常见的爆款名" },
  { value: "不要生僻难读的", label: "不要生僻难读的" },
  { value: "不要有负面谐音/含义", label: "不要有负面谐音/含义", default: true },
  { value: "不要和姓氏冲突的", label: "不要和姓氏冲突的" },
  { value: "不要多音字", label: "不要多音字" },
];

const LENGTH_OPTIONS = [
  { value: "", label: "不限长度" },
  { value: "short", label: "短名（3-4字母）" },
  { value: "medium", label: "中名（5-6字母）" },
  { value: "long", label: "长名（7+字母）" },
];

const SORT_OPTIONS = [
  { value: "score", label: "综合评分" },
  { value: "phonetic", label: "谐音匹配度" },
  { value: "popularity", label: "流行度" },
  { value: "length", label: "字母长度" },
  { value: "source", label: "来源（库/AI）" },
];

// ===== 工具函数 =====

/** 性别颜色 */
function genderStyle(g: string) {
  switch (g) {
    case "男性": return { bg: "#E3F0FF", text: "#2B6CB0", icon: "♂" };
    case "女性": return { bg: "#FFE8F0", text: "#D53F8C", icon: "♀" };
    default: return { bg: "#F0F0F0", text: "#888", icon: "⚤" };
  }
}

/** 流行度文本 */
function popularityLabel(pop: string): string {
  switch (pop) {
    case "★★★": return "🔥 热门流行";
    case "★★": return "✨ 较流行";
    case "★": return "📌 常见";
    default: return "💎 小众";
  }
}

/** 评分颜色 */
function scoreColor(s: number): string {
  if (s >= 85) return "#22C55E";
  if (s >= 70) return "#EAB308";
  if (s >= 55) return "#F97316";
  return "#EF4444";
}

/** 评分描述 */
function scoreLabel(s: number): string {
  if (s >= 85) return "极佳";
  if (s >= 70) return "优秀";
  if (s >= 55) return "良好";
  return "一般";
}

/** 本地收藏 */
function getFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("ename_favorites");
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}
function saveFavorites(favs: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("ename_favorites", JSON.stringify(favs));
}

// ===== 主页面 =====

export default function EnglishNamePage() {
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [surname, setSurname] = useState("");
  const [fullName, setFullName] = useState("");
  const [needs, setNeeds] = useState<string[]>([]);
  const [customNeed, setCustomNeed] = useState("");
  const [avoidFlags, setAvoidFlags] = useState<string[]>(["不要有负面谐音/含义"]);
  const [lengthPreference, setLengthPreference] = useState("");

  // 无额外 IME 状态管理 - React 受控组件原生支持 IME 输入
  const [results, setResults] = useState<EnameScoredResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState("");

  const [favorites, setFavorites] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sortBy, setSortBy] = useState("score");
  const [filterGender, setFilterGender] = useState<string>("all");
  const [filterLetter, setFilterLetter] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [copiedName, setCopiedName] = useState("");
  const [detailName, setDetailName] = useState<EnameScoredResult | null>(null);
  const [speakingName, setSpeakingName] = useState("");

  const resultRef = useRef<HTMLDivElement>(null);
  const surnameInputRef = useRef<HTMLInputElement>(null);

  // 加载收藏
  useEffect(() => {
    setFavorites(getFavorites());
  }, []);

  // 点击生成按钮后自动聚焦结果区
  const scrollToResults = () => {
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);
  };

  // 生成英文名
  const handleGenerate = useCallback(async () => {
    if (!gender) { setError("请选择性别"); return; }
    if (!surname.trim()) { setError("请输入中文姓氏"); return; }

    setLoading(true);
    setError("");
    setGenerated(false);

    // 组装需求数组
    const needsArr = [
      ...needs,
      ...(customNeed.trim() ? [customNeed.trim()] : []),
    ];

    try {
      const res = await fetch("/api/en/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gender,
          surname,
          fullName,
          needs: needsArr,
          avoidFlags,
          lengthPreference,
          count: 27,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResults(data.data || []);
        setGenerated(true);
        scrollToResults();
      } else {
        setError(data.message || "生成失败，请重试");
      }
    } catch (e) {
      setError("网络错误，请检查网络后重试");
    } finally {
      setLoading(false);
    }
  }, [gender, surname, fullName, needs, customNeed, avoidFlags, lengthPreference]);

  // 排序 & 筛选
  const filteredResults = results
    .filter((r) => {
      if (filterGender === "male" && r.gender !== "男性" && r.gender !== "中性") return false;
      if (filterGender === "female" && r.gender !== "女性" && r.gender !== "中性") return false;
      if (filterLetter && r.firstLetter !== filterLetter) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "phonetic": return b.phoneticScore - a.phoneticScore;
        case "popularity": return (b.popularity?.length || 0) - (a.popularity?.length || 0);
        case "length": return a.name.length - b.name.length;
        case "source": return (a.source === "db" ? 0 : 1) - (b.source === "db" ? 0 : 1);
        default: return b.score - a.score;
      }
    });

  // 收藏切换
  const toggleFavorite = (name: string) => {
    const newFavs = favorites.includes(name)
      ? favorites.filter((n) => n !== name)
      : [...favorites, name];
    setFavorites(newFavs);
    saveFavorites(newFavs);
  };

  // 复制
  const handleCopy = (name: string) => {
    navigator.clipboard.writeText(name);
    setCopiedName(name);
    setTimeout(() => setCopiedName(""), 2000);
  };

  // 发音
  const handleSpeak = (name: string) => {
    if (speakingName === name) return;
    setSpeakingName(name);
    const utterance = new SpeechSynthesisUtterance(name);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    utterance.onend = () => setSpeakingName("");
    utterance.onerror = () => setSpeakingName("");
    window.speechSynthesis.speak(utterance);
  };

  // 分享
  const handleShare = async (name: string) => {
    const text = `推荐英文名: ${name}\n音标: /${results.find(r => r.name === name)?.phonetic || ""}/\n中文译名: ${results.find(r => r.name === name)?.chinese || ""}\n—— 来自 SeekName AI 起名`;
    if (navigator.share) {
      try { await navigator.share({ title: "英文名推荐", text }); } catch {}
    } else {
      handleCopy(name);
    }
  };

  // 获取该姓氏的首字母候选
  const surnameLetters = (() => {
    if (!surname.trim()) return [];
    const map: Record<string, string[]> = {
      "李": ["L","E","I"], "王": ["W","V","U"], "张": ["Z","J"],
      "刘": ["L","E","I"], "陈": ["C","S"], "杨": ["Y"], "赵": ["Z"],
      "黄": ["H","W"], "周": ["Z","J"], "吴": ["W"], "徐": ["X","S"],
      "孙": ["S"], "马": ["M"], "胡": ["H","F"], "朱": ["Z"],
      "郭": ["G","K"], "何": ["H"], "罗": ["L","R"], "高": ["G","K"],
      "林": ["L"], "梁": ["L"], "郑": ["Z"], "谢": ["X","S"],
      "宋": ["S"], "唐": ["T"], "许": ["X"], "韩": ["H"],
      "冯": ["F","P"], "邓": ["D","T"], "曹": ["C"], "彭": ["P"],
      "曾": ["Z","C"], "萧": ["X"], "田": ["T"], "董": ["D"],
      "潘": ["P"], "袁": ["Y"], "蔡": ["C"], "蒋": ["J"],
      "余": ["Y"], "叶": ["Y"], "程": ["C"], "苏": ["S"],
      "吕": ["L"], "魏": ["W"], "丁": ["D"], "沈": ["S"],
      "任": ["R"], "姚": ["Y"], "卢": ["L"], "傅": ["F"],
      "钟": ["Z"], "崔": ["C"], "汪": ["W"], "范": ["F"],
      "陆": ["L"], "廖": ["L"], "杜": ["D"], "方": ["F"],
      "石": ["S"], "熊": ["X"], "金": ["J"], "邱": ["Q"],
      "侯": ["H"], "白": ["B"], "江": ["J"], "史": ["S"],
      "龙": ["L"], "万": ["W"], "段": ["D"], "雷": ["L"],
      "钱": ["Q"], "汤": ["T"], "尹": ["Y"], "易": ["Y"],
      "常": ["C"], "武": ["W"], "乔": ["Q"], "贺": ["H"],
      "赖": ["L"], "龚": ["G"], "文": ["W"],
    };
    return map[surname.trim()] || [];
  })();

  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  return (
    <div className="min-h-screen pt-20 md:pt-24" style={{ background: "linear-gradient(180deg, #FDF8F3 0%, #F5EDE0 100%)" }}>
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* ===== 顶部标题 ===== */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#2D1B0E] mb-2" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            AI 智能起英文名
          </h1>
          <p className="text-[#7A6B5E] text-sm">
            贴合中文名，好读不踩坑。输入姓氏和性别，10秒生成专属英文名
          </p>
        </div>

        {/* ===== 首屏输入区 ===== */}
        <div
          className="rounded-2xl p-6 md:p-8 mb-8"
          style={{
            background: "rgba(255,255,255,0.85)",
            border: "1px solid rgba(229,221,211,0.8)",
            boxShadow: "0 4px 24px rgba(45,27,14,0.06)",
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            {/* 性别 */}
            <div>
              <label className="block text-sm font-medium text-[#4A3428] mb-2">
                性别 <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-3">
                {(["male", "female"] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                      gender === g
                        ? g === "male"
                          ? "bg-[#2B6CB0] text-white shadow-sm"
                          : "bg-[#D53F8C] text-white shadow-sm"
                        : "bg-white text-[#7A6B5E] border border-[#E5DDD3] hover:border-[#D4941A]"
                    }`}
                  >
                    {g === "male" ? "♂ 男" : "♀ 女"}
                  </button>
                ))}
              </div>
            </div>

            {/* 中文姓氏 */}
            <div>
              <label className="block text-sm font-medium text-[#4A3428] mb-2">
                中文姓氏 <span className="text-red-400">*</span>
              </label>
              <input
                ref={surnameInputRef}
                type="text"
                value={surname}
                onChange={(e) => {
                  setSurname(e.target.value);
                }}
                maxLength={2}
                placeholder="例如：李、王、张..."
                className="w-full py-3 px-4 rounded-xl text-sm border border-[#E5DDD3] bg-white text-[#2D1B0E] outline-none transition-all focus:border-[#E86A17] focus:ring-2 focus:ring-[#E86A17]/10"
              />
              {surname.trim() && surnameLetters.length > 0 && (
                <div className="mt-1.5 text-xs text-[#7A6B5E] flex items-center gap-1">
                  <span>💡 建议首字母：</span>
                  {surnameLetters.map((l) => (
                    <span key={l} className="font-mono font-bold text-[#E86A17]">{l}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ===== 更多需求折叠面板 ===== */}
          <div className="mt-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-sm text-[#7A6B5E] hover:text-[#E86A17] transition-colors mx-auto"
            >
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showAdvanced ? "收起高级选项" : "更多需求（可选填）"}
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-5 animate-fadeIn">
                {/* 中文全名 */}
                <div>
                  <label className="block text-sm font-medium text-[#4A3428] mb-2">
                    中文全名 <span className="text-gray-400 font-normal">（用于谐音匹配）</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                    }}
                    maxLength={4}
                    placeholder="例如：李瑶、王鹤棣..."
                    className="w-full py-2.5 px-4 rounded-xl text-sm border border-[#E5DDD3] bg-white text-[#2D1B0E] outline-none focus:border-[#E86A17] focus:ring-2 focus:ring-[#E86A17]/10"
                  />
                </div>

                {/* 核心起名需求 */}
                <div>
                  <label className="block text-sm font-medium text-[#4A3428] mb-2">
                    核心起名需求
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {NEEDS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setNeeds((prev) =>
                            prev.includes(opt.value)
                              ? prev.filter((v) => v !== opt.value)
                              : [...prev, opt.value]
                          );
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          needs.includes(opt.value)
                            ? "bg-[#E86A17] text-white"
                            : "bg-white text-[#7A6B5E] border border-[#E5DDD3] hover:border-[#D4941A]"
                        }`}
                        title={opt.desc}
                      >
                        {needs.includes(opt.value) ? "✓ " : ""}{opt.label}
                      </button>
                    ))}
                    {/* 自定义输入 */}
                    <div className="relative">
                      <input
                        type="text"
                        value={customNeed}
                        onChange={(e) => {
                          setCustomNeed(e.target.value);
                        }}
                        maxLength={30}
                        placeholder="自定义需求..."
                        className="w-28 px-3 py-1.5 rounded-full text-xs border border-[#E5DDD3] bg-white text-[#2D1B0E] outline-none focus:border-[#E86A17]"
                      />
                    </div>
                  </div>
                </div>

                {/* 避坑要求 */}
                <div>
                  <label className="block text-sm font-medium text-[#4A3428] mb-2">
                    避坑要求
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {AVOID_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setAvoidFlags((prev) =>
                            prev.includes(opt.value)
                              ? prev.filter((v) => v !== opt.value)
                              : [...prev, opt.value]
                          );
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          avoidFlags.includes(opt.value)
                            ? "bg-red-50 text-red-600 border border-red-200"
                            : "bg-white text-[#7A6B5E] border border-[#E5DDD3] hover:border-[#D4941A]"
                        }`}
                      >
                        {avoidFlags.includes(opt.value) ? "✓ " : ""}❌ {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 名字长度偏好 */}
                <div>
                  <label className="block text-sm font-medium text-[#4A3428] mb-2">
                    名字长度偏好
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {LENGTH_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setLengthPreference(opt.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          lengthPreference === opt.value
                            ? "bg-[#E86A17] text-white"
                            : "bg-white text-[#7A6B5E] border border-[#E5DDD3] hover:border-[#D4941A]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ===== 一键生成按钮（高级选项底部） ===== */}
                <div className="pt-2">
                  <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl text-base font-bold text-white transition-all disabled:opacity-60"
                    style={{
                      background: "linear-gradient(135deg, #E86A17 0%, #D55A0B 100%)",
                      boxShadow: "0 4px 16px rgba(232,106,23,0.3)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 6px 24px rgba(232,106,23,0.4)")}
                    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(232,106,23,0.3)")}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        正在 AI 智能匹配...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        一键生成英文名
                      </span>
                    )}
                  </button>

                  {/* 错误提示 */}
                  {error && (
                    <div className="mt-3 text-sm text-red-500 flex items-center gap-1.5 bg-red-50 px-4 py-2 rounded-lg">
                      <X className="w-4 h-4" />
                      {error}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ===== 结果展示区 ===== */}
        <div ref={resultRef}>
          {/* 结果区头部 */}
          {generated && (
            <div className="mb-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#E86A17]" />
                  <h2 className="text-xl font-bold text-[#2D1B0E]">
                    推荐结果
                  </h2>
                  <span className="text-sm text-[#7A6B5E]">
                    （{filteredResults.length}个）
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* 筛选按钮 */}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      showFilters
                        ? "bg-[#E86A17] text-white"
                        : "bg-white text-[#7A6B5E] border border-[#E5DDD3] hover:border-[#D4941A]"
                    }`}
                  >
                    <Filter className="w-3.5 h-3.5" />
                    筛选
                  </button>
                  {/* 刷新 */}
                  <button
                    onClick={handleGenerate}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-[#7A6B5E] border border-[#E5DDD3] hover:border-[#D4941A] transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    重新生成
                  </button>
                </div>
              </div>

              {/* 筛选栏 */}
              {showFilters && (
                <div
                  className="mt-3 p-4 rounded-xl"
                  style={{
                    background: "rgba(255,255,255,0.8)",
                    border: "1px solid #E5DDD3",
                  }}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    {/* 排序 */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-[#7A6B5E]">排序：</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="text-xs px-2 py-1.5 rounded-lg border border-[#E5DDD3] bg-white text-[#2D1B0E] outline-none"
                      >
                        {SORT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* 性别筛选 */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-[#7A6B5E]">性别：</span>
                      <select
                        value={filterGender}
                        onChange={(e) => setFilterGender(e.target.value)}
                        className="text-xs px-2 py-1.5 rounded-lg border border-[#E5DDD3] bg-white text-[#2D1B0E] outline-none"
                      >
                        <option value="all">全部</option>
                        <option value="male">男性</option>
                        <option value="female">女性</option>
                      </select>
                    </div>

                    {/* 首字母筛选 */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-[#7A6B5E]">首字母：</span>
                      <select
                        value={filterLetter}
                        onChange={(e) => setFilterLetter(e.target.value)}
                        className="text-xs px-2 py-1.5 rounded-lg border border-[#E5DDD3] bg-white text-[#2D1B0E] outline-none"
                      >
                        <option value="">全部</option>
                        {LETTERS.map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 加载中 */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 text-[#E86A17] animate-spin mb-3" />
              <p className="text-sm text-[#7A6B5E]">AI 正在从 1964 个英文名中智能匹配...</p>
            </div>
          )}

          {/* 结果卡片列表 — 展示6个候选名 */}
          {generated && !loading && (
            <>
              {filteredResults.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[#7A6B5E]">没有匹配的结果，请调整筛选条件</p>
                  <button
                    onClick={handleGenerate}
                    className="mt-3 text-sm text-[#E86A17] hover:underline"
                  >
                    重新生成
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredResults.slice(0, 6).map((record, i) => (
                    <ResultCard
                      key={`${record.name}-${i}`}
                      record={record}
                      rank={i + 1}
                      isFavorite={favorites.includes(record.name)}
                      onToggleFavorite={toggleFavorite}
                      onCopy={handleCopy}
                      copiedName={copiedName}
                      onSpeak={handleSpeak}
                      speakingName={speakingName}
                      onDetail={setDetailName}
                      onShare={handleShare}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* 未生成时的占位提示 */}
          {!generated && !loading && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🌟</div>
              <p className="text-[#7A6B5E] text-sm">填好性别和姓氏，点击上方按钮开始</p>
              <p className="text-[#AAA] text-xs mt-1">AI 将为你从 1964+ 个英文名中智能匹配</p>
            </div>
          )}
        </div>
      </div>

      {/* ===== 名字详情弹窗 ===== */}
      {detailName && (
        <DetailModal
          record={detailName}
          onClose={() => setDetailName(null)}
          isFavorite={favorites.includes(detailName.name)}
          onToggleFavorite={toggleFavorite}
          onCopy={handleCopy}
          copiedName={copiedName}
          onSpeak={handleSpeak}
          speakingName={speakingName}
        />
      )}

      {/* ===== 内联样式（动画等） ===== */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

// ===== 结果卡片组件 =====

function ResultCard({
  record, rank, isFavorite, onToggleFavorite, onCopy, copiedName,
  onSpeak, speakingName, onDetail, onShare,
}: {
  record: EnameScoredResult;
  rank: number;
  isFavorite: boolean;
  onToggleFavorite: (n: string) => void;
  onCopy: (n: string) => void;
  copiedName: string;
  onSpeak: (n: string) => void;
  speakingName: string;
  onDetail: (r: EnameScoredResult) => void;
  onShare: (n: string) => void;
}) {
  const gc = genderStyle(record.gender);
  const sc = scoreColor(record.score);
  const sl = scoreLabel(record.score);

  return (
    <div
      className="group relative rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      style={{
        background: "rgba(255,255,255,0.88)",
        border: "1px solid #E5DDD3",
      }}
    >
      {/* 排名徽章 */}
      {rank <= 3 && (
        <div
          className="absolute -top-2 -left-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm z-10"
          style={{
            background: rank === 1 ? "linear-gradient(135deg, #FFD700, #FFA500)"
                     : rank === 2 ? "linear-gradient(135deg, #C0C0C0, #A0A0A0)"
                     : "linear-gradient(135deg, #CD7F32, #A0522D)",
          }}
        >
          {rank}
        </div>
      )}

      {/* 操作栏 */}
      <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onSpeak(record.name)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="发音">
          {speakingName === record.name ? (
            <Loader2 className="w-3.5 h-3.5 text-[#E86A17] animate-spin" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 text-gray-400" />
          )}
        </button>
        <button onClick={() => onCopy(record.name)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="复制">
          {copiedName === record.name ? (
            <Check className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-gray-400" />
          )}
        </button>
        <button onClick={() => onShare(record.name)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="分享">
          <Share2 className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>

      <div className="p-4">
          {/* 第一行：名字 + 姓氏英文 + 评分 */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shrink-0"
              style={{ background: gc.bg, color: gc.text }}
            >
              {record.name[0]}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-[#2D1B0E] text-base">{record.name}</span>
                {record.surnameEnglish && (
                  <span className="text-xs text-[#7A6B5E] font-normal">{record.surnameEnglish}</span>
                )}
                <span className="text-[10px] px-1 py-0.5 rounded font-medium" style={{ background: gc.bg, color: gc.text }}>
                  {gc.icon}
                </span>
              </div>
              {record.phonetic && (
                <div className="text-[10px] text-gray-400 font-mono">/{record.phonetic}/</div>
              )}
            </div>
          </div>
          {/* 评分圆环 */}
          <div className="flex-shrink-0 text-center">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
              style={{
                background: `conic-gradient(${sc} ${record.score}%, #F0E8E0 ${record.score}%)`,
                color: sc,
              }}
            >
              {record.score}
            </div>
            <div className="text-[9px] text-gray-400 mt-0.5">{sl}</div>
          </div>
        </div>

        {/* 中文译名 */}
        {record.chinese && (
          <div className="text-[11px] text-[#5A4334] mb-1.5 flex items-center gap-1">
            <BookOpen className="w-3 h-3 text-gray-300" />
            <span>{record.chinese}</span>
          </div>
        )}

        {/* 标签 */}
        {record.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {record.tags.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className="text-[9px] px-1.5 py-0.5 rounded-full"
                style={{
                  background: tag.startsWith("⚠️") ? "#FFF0F0" : "#F5EDE0",
                  color: tag.startsWith("⚠️") ? "#EF4444" : "#7A6B5E",
                }}
              >
                {tag}
              </span>
            ))}
            {record.tags.length > 3 && (
              <span className="text-[9px] text-gray-300">+{record.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* 推荐理由 */}
        {record.recommendationReason && (
          <div className="text-[10px] text-[#8B6914] leading-relaxed mb-1.5 bg-amber-50/80 px-2 py-1 rounded-lg line-clamp-2">
            <span className="mr-1">⭐</span>
            {record.recommendationReason}
          </div>
        )}

        {/* 含义 */}
        {record.meaning && (
          <div className="text-[10px] text-[#7A6B5E] leading-relaxed mb-2 line-clamp-2">
            <span className="text-gray-300 mr-1">💡</span>
            {record.meaning}
          </div>
        )}

        {/* 底部信息 */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#F0E8E0]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400">
              {record.origin || "通用"}
            </span>
            <span className="text-[10px] text-gray-300">|</span>
            <span className="text-[10px] text-gray-400">
              {popularityLabel(record.popularity)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/* 详情按钮 */}
            <button
              onClick={(e) => { e.stopPropagation(); onDetail(record); }}
              className="text-[10px] text-[#E86A17] hover:underline flex items-center gap-0.5"
            >
              <Info className="w-3 h-3" />
              详情
            </button>
            {/* 收藏 */}
            <button
              onClick={() => onToggleFavorite(record.name)}
              className="ml-1 p-1"
              title={isFavorite ? "取消收藏" : "收藏"}
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorite ? "fill-red-400 text-red-400" : "text-gray-300"}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== 详情弹窗 =====

function DetailModal({
  record, onClose, isFavorite, onToggleFavorite, onCopy, copiedName, onSpeak, speakingName,
}: {
  record: EnameScoredResult;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (n: string) => void;
  onCopy: (n: string) => void;
  copiedName: string;
  onSpeak: (n: string) => void;
  speakingName: string;
}) {
  const gc = genderStyle(record.gender);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(45,27,14,0.4)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.98)",
          border: "1px solid #E5DDD3",
          boxShadow: "0 24px 64px rgba(45,27,14,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="relative p-6 pb-4" style={{ background: "linear-gradient(135deg, #FDF8F3 0%, #F5EDE0 100%)" }}>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-white/50 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>

          <div className="flex items-start gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-bold shrink-0"
              style={{ background: gc.bg, color: gc.text }}
            >
              {record.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold text-[#2D1B0E]">{record.name}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: gc.bg, color: gc.text }}>
                  {gc.icon} {record.gender}
                </span>
              </div>
              {record.phonetic && (
                <div className="text-sm text-gray-400 font-mono mt-0.5">/{record.phonetic}/</div>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-[#5A4334]">{record.chinese}</span>
                <span className="text-xs text-gray-300">|</span>
                <span className="text-xs text-gray-400">{record.origin || "通用"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-5">
          {/* 综合评分（v5.0 AI Only 简化版） */}
          <div>
            <h4 className="text-sm font-semibold text-[#2D1B0E] mb-3">综合评分</h4>
            <div className="flex items-center gap-4">
              {/* 大评分 */}
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
                style={{
                  background: `conic-gradient(${scoreColor(record.score)} ${record.score}%, #F0E8E0 ${record.score}%)`,
                  color: scoreColor(record.score),
                }}
              >
                {record.score}
              </div>
              {/* 分项评分——AI Only 模式仅显示 AI 推荐优先级 */}
              {record.source === "ai" && record.phoneticScore === 0 && record.meaningScore === 0 ? (
                <div className="flex-1 text-xs text-gray-400">
                  <p>AI 智能推荐评分（基于推荐优先级）</p>
                  <p className="mt-1 text-[10px] text-gray-300">v5.0 AI Only — 由 DeepSeek AI 深度匹配生成</p>
                </div>
              ) : (
                <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">谐音匹配</span>
                    <span className="font-medium" style={{ color: scoreColor(record.phoneticScore) }}>{record.phoneticScore}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">含义匹配</span>
                    <span className="font-medium" style={{ color: scoreColor(record.meaningScore) }}>{record.meaningScore}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">风格匹配</span>
                    <span className="font-medium" style={{ color: scoreColor(record.styleScore) }}>{record.styleScore}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">流行度</span>
                    <span className="font-medium" style={{ color: scoreColor(record.popularityScore) }}>{record.popularityScore}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 推荐理由 */}
          {record.recommendationReason && (
            <div>
              <h4 className="text-sm font-semibold text-[#2D1B0E] mb-2">推荐理由</h4>
              <p className="text-sm text-[#8B6914] leading-relaxed bg-amber-50 px-3 py-2 rounded-lg">
                ⭐ {record.recommendationReason}
              </p>
            </div>
          )}

          {/* AI 深度分析 */}
          {record.analysis && (
            <div>
              <h4 className="text-sm font-semibold text-[#2D1B0E] mb-2">AI 深度分析</h4>
              <p className="text-sm text-[#4A3428] leading-relaxed bg-[#F0F7FF] px-3 py-2 rounded-lg">
                🔍 {record.analysis}
              </p>
            </div>
          )}

          {/* 名字来源与含义 */}
          <div>
            <h4 className="text-sm font-semibold text-[#2D1B0E] mb-2">名字来源与含义</h4>
            <p className="text-sm text-[#4A3428] leading-relaxed">
              {record.meaning || "暂无详细含义信息"}
            </p>
            {record.origin && (
              <p className="text-xs text-gray-400 mt-1">
                <Globe className="w-3 h-3 inline mr-1" />
                来源：{record.origin}
              </p>
            )}
          </div>

          {/* 发音匹配度 & 推荐全名 */}
          <div className="space-y-2">
            {typeof record.phoneticScore === 'number' && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#2D1B0E] font-medium">发音匹配度</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-[#F0E8E0] rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${record.phoneticScore}%`,
                        background: record.phoneticScore >= 80 
                          ? 'linear-gradient(90deg, #10B981, #34D399)' 
                          : record.phoneticScore >= 50 
                          ? 'linear-gradient(90deg, #F59E0B, #FBBF24)'
                          : 'linear-gradient(90deg, #9CA3AF, #D1D5DB)'
                      }}
                    />
                  </div>
                  <span className={`text-xs font-bold min-w-[3rem] text-right ${
                    record.phoneticScore >= 80 ? 'text-emerald-600' 
                    : record.phoneticScore >= 50 ? 'text-amber-600'
                    : 'text-gray-400'
                  }`}>
                    {record.phoneticScore}分
                  </span>
                </div>
              </div>
            )}
            {record.recommendedFullName && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#2D1B0E] font-medium">推荐全名</span>
                <span className="text-sm font-bold text-[#8B7355]">{record.recommendedFullName}</span>
              </div>
            )}
          </div>

          {/* 适配说明 */}
          <div>
            <h4 className="text-sm font-semibold text-[#2D1B0E] mb-2">适配说明</h4>
            <p className="text-sm text-[#4A3428] leading-relaxed bg-[#FDF8F3] px-3 py-2 rounded-lg">
              {record.adaptationNote}
            </p>
          </div>

          {/* 标签 */}
          {record.tags.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-[#2D1B0E] mb-2">风格标签</h4>
              <div className="flex flex-wrap gap-1.5">
                {record.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: tag.startsWith("⚠️") ? "#FFF0F0" : "#F5EDE0",
                      color: tag.startsWith("⚠️") ? "#EF4444" : "#7A6B5E",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 基本信息 */}
          <div className="pt-3 border-t border-[#F0E8E0]">
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div>
                <p className="text-gray-400 mb-0.5">字母长度</p>
                <p className="font-medium text-[#2D1B0E]">{record.name.length} 字母</p>
              </div>
              <div>
                <p className="text-gray-400 mb-0.5">首字母</p>
                <p className="font-medium text-[#2D1B0E]">{record.firstLetter}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-0.5">流行度</p>
                <p className="font-medium text-[#2D1B0E]">{popularityLabel(record.popularity)}</p>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => onSpeak(record.name)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium bg-[#F5EDE0] text-[#4A3428] hover:bg-[#EDE0D0] transition-colors"
            >
              {speakingName === record.name ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
              听发音
            </button>
            <button
              onClick={() => onCopy(record.name)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium bg-[#F5EDE0] text-[#4A3428] hover:bg-[#EDE0D0] transition-colors"
            >
              {copiedName === record.name ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copiedName === record.name ? "已复制" : "复制"}
            </button>
            <button
              onClick={() => onToggleFavorite(record.name)}
              className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-sm font-medium bg-[#F5EDE0] text-[#4A3428] hover:bg-[#EDE0D0] transition-colors"
            >
              <Heart className={`w-4 h-4 ${isFavorite ? "fill-red-400 text-red-400" : ""}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}