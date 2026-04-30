"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Search, Sparkles, Shuffle, Heart, BookOpen, Globe, Star, Volume2, Loader2 } from "lucide-react";
import Link from "next/link";

interface EnameRecord {
  name: string;
  gender: string;
  phonetic: string;
  chinese: string;
  origin: string;
  popularity: string;
  firstLetter: string;
}

interface Stats {
  total: number;
  byGender: Record<string, number>;
  byLetter: Record<string, number>;
  origins: string[];
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function ChooseEnglishNamePage() {
  const [search, setSearch] = useState("");
  const [activeLetter, setActiveLetter] = useState("");
  const [gender, setGender] = useState<"all" | "男性" | "女性" | "中性">("all");
  const [names, setNames] = useState<EnameRecord[]>([]);
  const [recommended, setRecommended] = useState<EnameRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);

  // 加载统计信息
  useEffect(() => {
    fetch("/api/ename?action=stats")
      .then(r => r.json())
      .then(d => {
        if (d.success) setStats(d.data);
      })
      .catch(console.error);
    loadRecommended();
  }, []);

  // 加载推荐
  const loadRecommended = useCallback(() => {
    fetch("/api/ename?action=recommend&count=12")
      .then(r => r.json())
      .then(d => {
        if (d.success) setRecommended(d.data);
      })
      .catch(console.error);
  }, []);

  // 搜索
  useEffect(() => {
    if (!search.trim()) return;
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/ename?action=list&search=${encodeURIComponent(search)}&count=50`)
        .then(r => r.json())
        .then(d => {
          if (d.success) setNames(d.data);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // 按字母筛选
  useEffect(() => {
    if (!activeLetter) {
      setNames([]);
      return;
    }
    setLoading(true);
    fetch(`/api/ename?action=list&letter=${activeLetter}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setNames(d.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeLetter]);

  // 按性别筛选
  const handleGenderFilter = (g: typeof gender) => {
    setGender(g);
    if (g === "all") {
      if (activeLetter) fetchNamesByLetter(activeLetter);
      else setNames([]);
    } else {
      setLoading(true);
      fetch(`/api/ename?action=list&gender=${encodeURIComponent(g)}`)
        .then(r => r.json())
        .then(d => {
          if (d.success) setNames(d.data);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  };

  const fetchNamesByLetter = async (letter: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/ename?action=list&letter=${letter}`);
      const d = await r.json();
      if (d.success) setNames(d.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // 随机推荐
  const handleRandom = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/ename?action=random&count=12");
      const d = await r.json();
      if (d.success) setRecommended(d.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
    setActiveLetter("");
    setSearch("");
    setShowFavorites(false);
  };

  // 收藏切换
  const toggleFavorite = (name: string) => {
    setFavorites(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  // 性别徽章颜色
  const genderColor = (g: string) => {
    switch(g) {
      case "男性": return { bg: "#E3F0FF", text: "#2B6CB0", icon: "♂" };
      case "女性": return { bg: "#FFE8F0", text: "#D53F8C", icon: "♀" };
      default: return { bg: "#F0F0F0", text: "#666", icon: "⚤" };
    }
  };

  // 流行度渲染
  const renderPopularity = (pop: string) => {
    switch(pop) {
      case "★★★": return <span className="text-amber-500 text-xs">★★★ 流行</span>;
      case "★★": return <span className="text-amber-400 text-xs">★★ 较流行</span>;
      case "★": return <span className="text-amber-300 text-xs">★ 常见</span>;
      default: return <span className="text-gray-300 text-xs">普通</span>;
    }
  };

  const displayNames = showFavorites
    ? names.filter(n => favorites.includes(n.name))
    : names;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #FDF8F3 0%, #F5EDE0 100%)' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#FDF8F3]/95 backdrop-blur border-b border-[#E5DDD3]">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/en" className="flex items-center gap-2 text-[#5C4A42] hover:text-[#C84A2A] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-[#2D1B0E]" style={{ fontFamily: "'Noto Serif SC', serif" }}>
              English Name Finder
            </h1>
          </div>
          <button
            onClick={() => setShowFavorites(!showFavorites)}
            className="relative p-2 rounded-lg hover:bg-white/50 transition-colors"
            title="收藏列表"
          >
            <Heart className={`w-5 h-5 ${showFavorites ? 'fill-red-400 text-red-400' : 'text-gray-400'}`} />
            {favorites.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-400 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                {favorites.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* 统计信息 */}
        {stats && (
          <div className="flex flex-wrap gap-3 mb-6 items-center justify-center">
            <div className="px-4 py-1.5 rounded-full bg-white/70 text-xs" style={{ border: '1px solid #E5DDD3' }}>
              📚 <strong>{stats.total}</strong> English Names
            </div>
            {Object.entries(stats.byGender).map(([g, c]) => (
              <div key={g} className="px-4 py-1.5 rounded-full bg-white/70 text-xs" style={{ border: '1px solid #E5DDD3' }}>
                {g} <strong>{c}</strong>
              </div>
            ))}
          </div>
        )}

        {/* 搜索栏 */}
        <div className="relative mb-5 max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setActiveLetter("");
            }}
            placeholder="Search English name, Chinese meaning, or origin..."
            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
            style={{
              background: 'rgba(255,255,255,0.9)',
              border: '1px solid #E5DDD3',
              color: '#2D1B0E',
              outline: 'none',
            }}
          />
        </div>

        {/* 字母导航 + 性别筛选 */}
        <div className="mb-6 space-y-3">
          {/* 字母导航 */}
          <div className="flex flex-wrap gap-1 justify-center">
            <button
              onClick={() => { setActiveLetter(""); setSearch(""); }}
              className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                !activeLetter && !search ? 'bg-[#E86A17] text-white' : 'bg-white/70 text-gray-600 hover:bg-white'
              }`}
              style={{ border: '1px solid #E5DDD3' }}
            >
              All
            </button>
            {LETTERS.map(letter => (
              <button
                key={letter}
                onClick={() => {
                  setActiveLetter(letter);
                  setSearch("");
                  setShowFavorites(false);
                }}
                className={`w-8 h-8 text-xs font-medium rounded-md transition-all ${
                  activeLetter === letter
                    ? 'bg-[#E86A17] text-white shadow-sm'
                    : 'bg-white/70 text-gray-600 hover:bg-white hover:text-[#E86A17]'
                }`}
                style={{ border: activeLetter === letter ? 'none' : '1px solid #E5DDD3' }}
              >
                {letter}
                {stats?.byLetter[letter] && (
                  <span className="block text-[8px] opacity-60 leading-none">
                    {stats.byLetter[letter]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 性别筛选 */}
          <div className="flex gap-2 justify-center">
            {(["all", "男性", "女性", "中性"] as const).map(g => (
              <button
                key={g}
                onClick={() => handleGenderFilter(g)}
                className={`px-4 py-1.5 text-xs rounded-full transition-all ${
                  gender === g
                    ? 'bg-[#2D1B0E] text-white'
                    : 'bg-white/70 text-gray-500 hover:bg-white'
                }`}
                style={{ border: '1px solid #E5DDD3' }}
              >
                {g === "all" ? "All Genders" : g}
              </button>
            ))}
            <button
              onClick={handleRandom}
              className="px-4 py-1.5 text-xs rounded-full bg-white/70 text-gray-500 hover:bg-white transition-all flex items-center gap-1"
              style={{ border: '1px solid #E5DDD3' }}
            >
              <Shuffle className="w-3 h-3" /> Random
            </button>
          </div>
        </div>

        {/* 加载中 */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 text-[#E86A17] animate-spin" />
          </div>
        )}

        {/* 名字列表 */}
        {!loading && (
          <>
            {/* 推荐区域 - 当无搜索/字母筛选时显示 */}
            {!search && !activeLetter && !showFavorites && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-[#E86A17]" />
                  <h2 className="text-lg font-bold text-[#2D1B0E]">Recommended for You</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {recommended.map((name, i) => (
                    <NameCard
                      key={`${name.name}-${i}`}
                      record={name}
                      isFavorite={favorites.includes(name.name)}
                      onToggleFavorite={toggleFavorite}
                      genderColor={genderColor}
                      renderPopularity={renderPopularity}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 搜索结果/字母筛选结果 */}
            {(search || activeLetter || showFavorites) && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-[#2D1B0E]">
                    {showFavorites
                      ? `Favorites (${displayNames.length})`
                      : search
                      ? `Search results for "${search}"`
                      : `${activeLetter} - ${names.length} names`}
                  </h2>
                  {(search || activeLetter) && names.length > 0 && (
                    <button
                      onClick={loadRecommended}
                      className="text-xs text-[#E86A17] hover:underline"
                    >
                      Back to recommendations
                    </button>
                  )}
                </div>
                {displayNames.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    {showFavorites ? "No favorites yet" : "No results found. Try a different search or letter."}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {displayNames.map((name, i) => (
                      <NameCard
                        key={`${name.name}-${i}`}
                        record={name}
                        isFavorite={favorites.includes(name.name)}
                        onToggleFavorite={toggleFavorite}
                        genderColor={genderColor}
                        renderPopularity={renderPopularity}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────── 名字卡片 ───────────
function NameCard({
  record,
  isFavorite,
  onToggleFavorite,
  genderColor,
  renderPopularity,
}: {
  record: EnameRecord;
  isFavorite: boolean;
  onToggleFavorite: (name: string) => void;
  genderColor: (g: string) => { bg: string; text: string; icon: string };
  renderPopularity: (pop: string) => JSX.Element;
}) {
  const gc = genderColor(record.gender);

  return (
    <div
      className="group relative p-4 rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-default"
      style={{
        background: 'rgba(255,255,255,0.85)',
        border: '1px solid #E5DDD3',
      }}
    >
      {/* 收藏按钮 */}
      <button
        onClick={() => onToggleFavorite(record.name)}
        className="absolute top-2 right-2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50"
        title={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-red-400 text-red-400' : 'text-gray-300'}`} />
      </button>

      {/* 名字 */}
      <div className="flex items-start gap-2 mb-2">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shrink-0"
          style={{ background: gc.bg, color: gc.text }}
        >
          {record.name[0]}
        </div>
        <div className="min-w-0">
          <div className="font-bold text-[#2D1B0E] text-base leading-tight">{record.name}</div>
          {record.phonetic && (
            <div className="text-[11px] text-gray-400 font-mono mt-0.5">/{record.phonetic}/</div>
          )}
        </div>
      </div>

      {/* 中文译名 */}
      {record.chinese && (
        <div className="text-xs text-[#5A4334] mb-1.5 flex items-center gap-1">
          <BookOpen className="w-3 h-3 text-gray-300" />
          <span>{record.chinese}</span>
        </div>
      )}

      {/* 来源 */}
      {record.origin && (
        <div className="text-[11px] text-gray-400 flex items-center gap-1 mb-1.5">
          <Globe className="w-3 h-3" />
          <span>{record.origin}</span>
        </div>
      )}

      {/* 底部：性别 + 流行度 */}
      <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid #F0E8E0' }}>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded font-medium"
          style={{ background: gc.bg, color: gc.text }}
        >
          {gc.icon} {record.gender}
        </span>
        {renderPopularity(record.popularity)}
      </div>
    </div>
  );
}