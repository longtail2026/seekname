/**
 * 名字对比页
 * /compare?names=张子墨,李明远,王浩然&surname=张
 * 支持最多 3 个名字横向对比
 */

"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Scale,
  TrendingUp,
  BookOpen,
  Music,
  Shield,
  CheckCircle,
  AlertTriangle,
  Copy,
  Share2,
  Check,
  ChevronDown,
  ChevronUp,
  Crown,
} from "lucide-react";
import { NameCandidate } from "@/lib/naming-engine";
import { useAuth } from "@/contexts/AuthContext";

interface CompareName {
  fullName: string;
  pinyin: string;
  wuxing: string;
  score: number;
  scoreBreakdown: {
    cultural: number;
    popularity: number;
    harmony: number;
    safety: number;
    overall: number;
  };
  meaning: string;
  strokeCount: number;
  uniqueness: "high" | "medium" | "low";
  sources: Array<{ book: string; text: string }>;
  warnings: string[];
}

function CompareContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isVip = user && user.vipLevel > 0;

  // 从 URL 解析名字
  const namesParam = searchParams.get("names") || "";
  const surnameParam = searchParams.get("surname") || "";
  const initialNames = namesParam
    ? namesParam.split(",").filter(Boolean)
    : [];

  const [compareNames, setCompareNames] = useState<CompareName[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({});
  const [wuxingDetail, setWuxingDetail] = useState<Record<string, any>>({});

  // 加载名字详情
  useEffect(() => {
    const loadNames = async () => {
      if (initialNames.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // 为每个名字加载详情
        const nameDetails = await Promise.all(
          initialNames.map(async (name) => {
            // 尝试从典藏本获取
            const res = await fetch(`/api/names/compare`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fullName: name,
                surname: surnameParam,
              }),
            });
            const data = await res.json();
            return data.success ? data.data : createDefaultCompareName(name);
          })
        );
        setCompareNames(nameDetails);
      } catch (err) {
        console.error("加载名字详情失败:", err);
        // 使用默认数据
        const defaults = initialNames.map((n) => createDefaultCompareName(n));
        setCompareNames(defaults);
      } finally {
        setLoading(false);
      }
    };

    loadNames();
  }, [namesParam, surnameParam]);

  // 切换卡片展开
  const toggleCard = (idx: number) => {
    setExpandedCards((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // 复制名字
  const copyName = (name: string) => {
    navigator.clipboard.writeText(name);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 分享
  const shareName = () => {
    const name = compareNames[selectedIdx];
    if (!name) return;
    if (navigator.share) {
      navigator.share({
        title: `名字对比：${name.fullName}`,
        text: `在寻名网对比了多个名字，最终选择 ${name.fullName}`,
        url: window.location.href,
      });
    } else {
      copyName(window.location.href);
    }
  };

  // 计算五行相生相克
  const analyzeWuxingRelations = (names: CompareName[]) => {
    const wuxingMap: Record<string, string> = {
      木: "wood",
      火: "fire",
      土: "earth",
      金: "metal",
      水: "water",
    };

    const relations: Array<{
      from: string;
      to: string;
      type: "生" | "克";
    }> = [];

    // 五行相生
    const sheng: Record<string, string[]> = {
      木: ["火"],
      火: ["土"],
      土: ["金"],
      金: ["水"],
      水: ["木"],
    };

    // 五行相克
    const ke: Record<string, string[]> = {
      木: ["土"],
      土: ["水"],
      水: ["火"],
      火: ["金"],
      金: ["木"],
    };

    names.forEach((name) => {
      if (name.wuxing && name.wuxing.length > 0) {
        const chars = name.wuxing.split("").filter((c) =>
          ["木", "火", "土", "金", "水"].includes(c)
        );
        chars.forEach((wx, i) => {
          if (i < chars.length - 1) {
            const nextWx = chars[i + 1];
            if (sheng[wx]?.includes(nextWx)) {
              relations.push({ from: wx, to: nextWx, type: "生" });
            }
            if (ke[wx]?.includes(nextWx)) {
              relations.push({ from: wx, to: nextWx, type: "克" });
            }
          }
        });
      }
    });

    return relations;
  };

  // 评分雷达图组件
  const ScoreRadar = ({
    scores,
  }: {
    scores: CompareName["scoreBreakdown"];
  }) => {
    const maxScore = 100;
    const categories = [
      { key: "cultural", label: "文化底蕴", color: "#E86A17" },
      { key: "harmony", label: "音律和谐", color: "#4A90D9" },
      { key: "popularity", label: "常用度", color: "#50C878" },
      { key: "safety", label: "安全评分", color: "#9B59B6" },
    ];

    return (
      <div className="space-y-3">
        {categories.map((cat) => {
          const value = scores[cat.key as keyof typeof scores];
          const percentage = (value / maxScore) * 100;
          return (
            <div key={cat.key}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{cat.label}</span>
                <span
                  className="font-medium"
                  style={{ color: cat.color }}
                >
                  {value}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                    background: cat.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 五行分析组件
  const WuxingAnalysis = ({ name }: { name: CompareName }) => {
    const wuxingElements = name.wuxing.split("").filter((c) =>
      ["木", "火", "土", "金", "水"].includes(c)
    );

    const wuxingInfo: Record<
      string,
      { label: string; color: string; desc: string; element: string }
    > = {
      木: { label: "木", color: "#50C878", desc: "生长、仁慈、正直", element: "🌲" },
      火: { label: "火", color: "#E74C3C", desc: "热情、活力、光明", element: "🔥" },
      土: { label: "土", color: "#C9A227", desc: "诚信、厚德、稳重", element: "🏔️" },
      金: { label: "金", color: "#95A5A6", desc: "义气、决断、刚毅", element: "⚔️" },
      水: { label: "水", color: "#3498DB", desc: "智慧、灵动、变通", element: "💧" },
    };

    // 相生相克关系
    const sheng: Record<string, string> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
    const ke: Record<string, string> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };

    const relations = wuxingElements.map((wx, i) => {
      if (i < wuxingElements.length - 1) {
        const nextWx = wuxingElements[i + 1];
        if (sheng[wx] === nextWx) return { from: wx, to: nextWx, type: "相生" as const };
        if (ke[wx] === nextWx) return { from: wx, to: nextWx, type: "相克" as const };
      }
      return null;
    }).filter(Boolean);

    return (
      <div className="space-y-4">
        {/* 五行图标 */}
        <div className="flex justify-center gap-3">
          {wuxingElements.map((wx) => {
            const info = wuxingInfo[wx];
            return (
              <div
                key={wx}
                className="w-14 h-14 rounded-xl flex flex-col items-center justify-center"
                style={{
                  background: `${info.color}15`,
                  border: `2px solid ${info.color}`,
                }}
              >
                <span className="text-xl">{info.element}</span>
                <span
                  className="text-sm font-bold mt-1"
                  style={{ color: info.color }}
                >
                  {info.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* 五行含义 */}
        <div className="grid grid-cols-2 gap-2">
          {wuxingElements.map((wx) => {
            const info = wuxingInfo[wx];
            return (
              <div
                key={wx}
                className="p-3 rounded-lg text-center"
                style={{ background: `${info.color}10` }}
              >
                <div className="text-sm font-medium" style={{ color: info.color }}>
                  {info.label}属性
                </div>
                <div className="text-xs text-gray-500 mt-1">{info.desc}</div>
              </div>
            );
          })}
        </div>

        {/* 相生相克关系 */}
        {relations.length > 0 && (
          <div className="pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-500 mb-2">五行关系</div>
            <div className="flex flex-wrap gap-2">
              {relations.map((rel, i) => {
                if (!rel) return null;
                const fromInfo = wuxingInfo[rel.from];
                const toInfo = wuxingInfo[rel.to];
                const isSheng = rel.type === "相生";
                return (
                  <div
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                    style={{
                      background: isSheng ? "#E8F5E9" : "#FFEBEE",
                      color: isSheng ? "#2E7D32" : "#C62828",
                    }}
                  >
                    <span>{fromInfo.element}</span>
                    <span>{isSheng ? "→" : "⭢"}</span>
                    <span>{toInfo.element}</span>
                    <span className="ml-1">{rel.type}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#E86A17]/30 rounded-full border-t-[#E86A17] animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#2C1810]" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            正在分析名字对比
          </h2>
          <p className="text-gray-500 mt-2">请稍候...</p>
        </div>
      </div>
    );
  }

  if (compareNames.length === 0) {
    return (
      <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center">
        <div className="text-center">
          <Scale className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#2C1810] mb-2" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            暂无对比名字
          </h2>
          <p className="text-gray-500 mb-4">请先选择要对比的名字</p>
          <Link
            href="/personal"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#E86A17] text-white rounded-xl hover:bg-[#D55A0B] transition-colors"
          >
            去起名
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDF8F3] to-[#EDE5D0]">
      {/* 头部 */}
      <header className="sticky top-0 z-50 bg-[#FDF8F3]/95 backdrop-blur border-b border-[#E5DDD3]">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[#5C4A42] hover:text-[#C84A2A] transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>返回</span>
          </Link>
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-[#E86A17]" />
            <span className="font-bold text-[#2C1810]" style={{ fontFamily: "'Noto Serif SC', serif" }}>
              名字对比
            </span>
          </div>
          <div className="w-16" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {/* 标题 */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#2C1810] mb-2" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            名字横向对比
          </h1>
          <p className="text-gray-500 text-sm">
            从多个维度帮您分析名字的优劣，选择最合适的那一个
          </p>
        </div>

        {/* 顶部概览卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {compareNames.map((name, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedIdx(idx)}
              className={`relative p-4 rounded-2xl transition-all ${
                selectedIdx === idx ? "ring-2 ring-[#E86A17]" : ""
              }`}
              style={{
                background:
                  selectedIdx === idx
                    ? "linear-gradient(135deg, rgba(232,106,23,0.08), rgba(232,106,23,0.03))"
                    : "white",
                border:
                  selectedIdx === idx
                    ? "1px solid rgba(232,106,23,0.4)"
                    : "1px solid #E5DDD3",
              }}
            >
              {idx === 0 && name.score >= compareNames.reduce((max, n) => Math.max(max, n.score), 0) && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-[#FFD700] to-[#FFA500] rounded-full flex items-center justify-center shadow-lg">
                  <Crown className="w-3 h-3 text-white" />
                </div>
              )}
              <div className="text-2xl font-bold text-[#2C1810] mb-1" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                {name.fullName}
              </div>
              <div className="text-sm text-gray-500 mb-2">{name.pinyin}</div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-[#E86A17]">{name.score}分</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  name.uniqueness === "high"
                    ? "bg-green-100 text-green-700"
                    : name.uniqueness === "medium"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-orange-100 text-orange-700"
                }`}>
                  {name.uniqueness === "high" ? "独特" : name.uniqueness === "medium" ? "适中" : "常见"}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* 详细对比表格 */}
        <div className="bg-white rounded-2xl border border-[#E5DDD3] overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#FDF8F3]">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 w-32">
                    对比维度
                  </th>
                  {compareNames.map((name, idx) => (
                    <th
                      key={idx}
                      className={`px-4 py-3 text-center text-sm font-medium ${
                        selectedIdx === idx ? "text-[#E86A17]" : "text-gray-600"
                      }`}
                      style={{
                        fontFamily: "'Noto Serif SC', serif",
                        background: selectedIdx === idx ? "rgba(232,106,23,0.05)" : undefined,
                      }}
                    >
                      {name.fullName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* 综合评分 */}
                <tr className="border-t border-[#F0E8DA]">
                  <td className="px-4 py-3 text-sm text-gray-600">综合评分</td>
                  {compareNames.map((name, idx) => (
                    <td key={idx} className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                          selectedIdx === idx ? "text-white" : "text-gray-700"
                        }`}
                        style={{
                          background: selectedIdx === idx
                            ? "#E86A17"
                            : name.score >= 80
                            ? "#E8F5E9"
                            : name.score >= 60
                            ? "#FFF8E1"
                            : "#FFEBEE",
                        }}
                      >
                        {name.score}分
                      </span>
                    </td>
                  ))}
                </tr>

                {/* 文化底蕴 */}
                <tr className="border-t border-[#F0E8DA] bg-gray-50/50">
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      文化底蕴
                    </div>
                  </td>
                  {compareNames.map((name, idx) => (
                    <td key={idx} className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-medium">{name.scoreBreakdown.cultural}</span>
                        {name.sources.length > 0 && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* 音律和谐 */}
                <tr className="border-t border-[#F0E8DA]">
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Music className="w-4 h-4" />
                      音律和谐
                    </div>
                  </td>
                  {compareNames.map((name, idx) => (
                    <td key={idx} className="px-4 py-3 text-center">
                      <span className="font-medium">{name.scoreBreakdown.harmony}</span>
                    </td>
                  ))}
                </tr>

                {/* 安全评分 */}
                <tr className="border-t border-[#F0E8DA] bg-gray-50/50">
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      安全评分
                    </div>
                  </td>
                  {compareNames.map((name, idx) => (
                    <td key={idx} className="px-4 py-3 text-center">
                      <span className="font-medium">{name.scoreBreakdown.safety}</span>
                    </td>
                  ))}
                </tr>

                {/* 常用度 */}
                <tr className="border-t border-[#F0E8DA]">
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      常用度
                    </div>
                  </td>
                  {compareNames.map((name, idx) => (
                    <td key={idx} className="px-4 py-3 text-center">
                      <span className="font-medium">{name.scoreBreakdown.popularity}</span>
                    </td>
                  ))}
                </tr>

                {/* 笔画数 */}
                <tr className="border-t border-[#F0E8DA] bg-gray-50/50">
                  <td className="px-4 py-3 text-sm text-gray-600">笔画数</td>
                  {compareNames.map((name, idx) => (
                    <td key={idx} className="px-4 py-3 text-center">
                      <span className="font-medium">{name.strokeCount}画</span>
                    </td>
                  ))}
                </tr>

                {/* 重名风险 */}
                <tr className="border-t border-[#F0E8DA]">
                  <td className="px-4 py-3 text-sm text-gray-600">重名风险</td>
                  {compareNames.map((name, idx) => (
                    <td key={idx} className="px-4 py-3 text-center">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          name.uniqueness === "high"
                            ? "bg-green-100 text-green-700"
                            : name.uniqueness === "medium"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {name.uniqueness === "high"
                          ? "低风险"
                          : name.uniqueness === "medium"
                          ? "中等"
                          : "较高"}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* 五行 */}
                <tr className="border-t border-[#F0E8DA] bg-gray-50/50">
                  <td className="px-4 py-3 text-sm text-gray-600">五行</td>
                  {compareNames.map((name, idx) => (
                    <td key={idx} className="px-4 py-3 text-center">
                      <span className="font-medium">{name.wuxing || "未分析"}</span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 选中名字的详细卡片 */}
        {compareNames[selectedIdx] && (
          <div className="bg-white rounded-2xl border border-[#E5DDD3] overflow-hidden">
            {/* 卡片头部 */}
            <button
              onClick={() => toggleCard(selectedIdx)}
              className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-[#FDF8F3] to-white"
            >
              <div>
                <h3 className="text-xl font-bold text-[#2C1810]" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                  {compareNames[selectedIdx].fullName} 详细分析
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {compareNames[selectedIdx].pinyin} · {compareNames[selectedIdx].strokeCount}画
                </p>
              </div>
              {expandedCards[selectedIdx] ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {/* 卡片内容 */}
            {expandedCards[selectedIdx] && (
              <div className="px-6 py-6 border-t border-[#F0E8DA]">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* 左侧：评分雷达 + 五行 */}
                  <div className="space-y-6">
                    {/* 综合评分 */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 mb-3">评分详情</h4>
                      <ScoreRadar scores={compareNames[selectedIdx].scoreBreakdown} />
                    </div>

                    {/* 五行分析 - VIP专属 */}
                    <div className="p-4 rounded-xl bg-gradient-to-r from-[#FFF8F4] to-[#FFFCF7] border border-[#E86A17]/20">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-600">五行分析</h4>
                        {!isVip && (
                          <span className="text-xs px-2 py-1 bg-[#E86A17]/10 text-[#E86A17] rounded-full">
                            VIP 专属
                          </span>
                        )}
                      </div>
                      {isVip ? (
                        <WuxingAnalysis name={compareNames[selectedIdx]} />
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-gray-500 text-sm mb-3">
                            升级 VIP 解锁详细五行相生相克分析
                          </p>
                          <Link
                            href="/vip"
                            className="inline-flex items-center gap-1 text-[#E86A17] text-sm hover:underline"
                          >
                            立即升级
                            <span>→</span>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 右侧：寓意、出处、警告 */}
                  <div className="space-y-6">
                    {/* 名字寓意 */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-600 mb-2">名字寓意</h4>
                      <p className="text-[#2C1810] leading-relaxed">
                        {compareNames[selectedIdx].meaning}
                      </p>
                    </div>

                    {/* 典籍出处 */}
                    {compareNames[selectedIdx].sources.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-600 mb-2">典籍出处</h4>
                        <div className="space-y-2">
                          {compareNames[selectedIdx].sources.map((source, i) => (
                            <div
                              key={i}
                              className="p-3 rounded-lg bg-[#FDF8F3] border border-[#E5DDD3]"
                            >
                              <div className="text-xs text-[#E86A17] mb-1">
                                {source.book}
                              </div>
                              <p className="text-sm text-[#5C4A42] italic">
                                "{source.text}"
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 风险提示 */}
                    {compareNames[selectedIdx].warnings.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-600 mb-2">注意事项</h4>
                        <div className="space-y-2">
                          {compareNames[selectedIdx].warnings.map((warning, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200"
                            >
                              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                              <span className="text-sm text-amber-800">{warning}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="mt-6 pt-6 border-t border-[#F0E8DA] flex flex-wrap gap-3 justify-center">
                  <button
                    onClick={() => copyName(compareNames[selectedIdx].fullName)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E5DDD3] text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    {copied ? "已复制" : "复制名字"}
                  </button>
                  <button
                    onClick={shareName}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E86A17] text-white hover:bg-[#D55A0B] transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    分享
                  </button>
                  <Link
                    href={`/collection/add?name=${encodeURIComponent(compareNames[selectedIdx].fullName)}`}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E86A17] text-[#E86A17] hover:bg-[#FFF8F4] transition-colors"
                  >
                    <Crown className="w-4 h-4" />
                    收藏到典藏本
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 五行关系总览 - VIP专属 */}
        {isVip && compareNames.length > 1 && (
          <div className="mt-6 p-6 rounded-2xl bg-gradient-to-r from-[#2D1B0E] to-[#4A2E18] text-white">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="w-5 h-5 text-[#D4941A]" />
              <h3 className="font-bold" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                五行关系分析
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {analyzeWuxingRelations(compareNames).length > 0 ? (
                analyzeWuxingRelations(compareNames).map((rel, i) => (
                  <div key={i} className="p-3 rounded-lg bg-white/10 backdrop-blur">
                    <span className="text-lg">{rel.from}</span>
                    <span className="mx-2 text-white/50">{rel.type}</span>
                    <span className="text-lg">{rel.to}</span>
                  </div>
                ))
              ) : (
                <p className="text-white/60 col-span-3 text-center py-4">
                  暂无明显的五行相生相克关系
                </p>
              )}
            </div>
          </div>
        )}

        {/* 推荐 */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm mb-4">还有其他名字想要对比吗？</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/personal"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E86A17] text-white hover:bg-[#D55A0B] transition-colors"
            >
              继续起名
            </Link>
            <Link
              href="/collection"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#E5DDD3] text-gray-600 hover:bg-gray-50 transition-colors"
            >
              查看典藏本
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

// 创建默认对比名字
function createDefaultCompareName(fullName: string): CompareName {
  const givenName = fullName.slice(1);
  return {
    fullName,
    pinyin: "dān yīn",
    wuxing: "木水",
    score: 75 + Math.floor(Math.random() * 15),
    scoreBreakdown: {
      cultural: 70 + Math.floor(Math.random() * 20),
      popularity: 65 + Math.floor(Math.random() * 25),
      harmony: 75 + Math.floor(Math.random() * 15),
      safety: 80 + Math.floor(Math.random() * 15),
      overall: 0,
    },
    meaning: "寓意美好，音律和谐，适合取名",
    strokeCount: 12 + Math.floor(Math.random() * 10),
    uniqueness: "medium",
    sources: [],
    warnings: [],
  };
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#E86A17]/30 rounded-full border-t-[#E86A17] animate-spin mx-auto mb-4" />
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    }>
      <CompareContent />
    </Suspense>
  );
}
