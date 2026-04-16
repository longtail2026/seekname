/**
 * 名字测评结果页
 * /evaluate?name=张浩然
 */
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart3, Loader2, BookOpen, Shield, Zap } from "lucide-react";

interface ScoreDetail {
  label: string;
  score: number;
  icon: string;
  color: string;
  desc: string;
}

interface EvaluateResult {
  name: string;
  total: number;
  cultural: number;
  harmony: number;
  uniqueness: number;
  meaning: string;
  suggestion: string;
}

function EvaluateContent() {
  const searchParams = useSearchParams();
  const name = searchParams.get("name") || "";

  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<ScoreDetail[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [meaning, setMeaning] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!name) return;

    const evaluateName = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch("/api/name/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        const data: EvaluateResult = await res.json();
        if (!res.ok) throw new Error(data.meaning || "评测失败");

        setTotalScore(data.total);
        setMeaning(data.meaning);
        setSuggestion(data.suggestion);

        setScores([
          {
            label: "文化底蕴",
            score: data.cultural,
            icon: "📖",
            color: "#C84A2A",
            desc: data.cultural >= 60
              ? "此名出自典籍，文化内涵深厚"
              : "有一定文化渊源，寓意美好",
          },
          {
            label: "音律和谐",
            score: data.harmony,
            icon: "🎵",
            color: "#3B82F6",
            desc: data.harmony >= 75
              ? "声调搭配优美，朗朗上口"
              : data.harmony >= 60
              ? "音律较和谐，整体顺口"
              : "建议调整字词以改善音律",
          },
          {
            label: "独特性",
            score: data.uniqueness,
            icon: "✨",
            color: "#10B981",
            desc: data.uniqueness >= 85
              ? "非常独特，重名概率低"
              : data.uniqueness >= 70
              ? "较为常见"
              : "重名概率较高",
          },
        ]);
      } catch {
        setError(true);
        // 降级：纯客户端评分（无 DB）
        const chars = name.split("").filter(Boolean);
        const h = chars.length === 2 ? 82 : 70;
        const u = 72;
        const c = 65;
        const t = Math.round((c + h + u) / 3);
        setTotalScore(t);
        setMeaning("名字寓意美好，值得珍藏");
        setSuggestion("建议使用此名");
        setScores([
          { label: "文化底蕴", score: c, icon: "📖", color: "#C84A2A", desc: "此名有一定文化内涵" },
          { label: "音律和谐", score: h, icon: "🎵", color: "#3B82F6", desc: "音律搭配较好" },
          { label: "独特性", score: u, icon: "✨", color: "#10B981", desc: "较为常见" },
        ]);
      } finally {
        setLoading(false);
      }
    };

    evaluateName();
  }, [name]);

  if (!name) {
    return (
      <div className="min-h-screen bg-[#FDFAF4] flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-[#5C4A42] mb-4">请先输入要测评的名字</p>
          <Link href="/evaluate/form" className="text-[#E86A17] hover:underline">← 返回测评</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDFAF4] to-[#EDE5D8]">
      <header className="sticky top-0 z-50 bg-[#FDFAF4]/95 backdrop-blur border-b border-[#E5DDD3]">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/evaluate/form" className="text-[#5C4A42] hover:text-[#C84A2A] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <BarChart3 className="w-5 h-5 text-[#C84A2A]" />
          <span className="font-bold text-[#2C1810]" style={{ fontFamily: "'Noto Serif SC', serif" }}>名字测评结果</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="w-12 h-12 text-[#C84A2A] animate-spin mx-auto mb-4" />
            <p className="text-[#5C4A42]">正在分析名字...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 服务端错误提示（已降级） */}
            {error && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700 text-center">
                当前使用离线评分（数据库未连接），评分结果仅供参考
              </div>
            )}

            {/* 名字总评分 */}
            <div className="ancient-card p-8 text-center bg-white">
              <div className="text-sm text-[#5C4A42] mb-2">名字测评</div>
              <div className="text-6xl font-bold text-[#C84A2A] mb-2" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                {name}
              </div>
              <div className="text-5xl font-bold text-[#2C1810] mb-1" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                {totalScore}
              </div>
              <div className="text-sm text-[#AAA]">综合评分</div>
            </div>

            {/* 分项评分 */}
            <div className="space-y-3">
              {scores.map((s, i) => (
                <div key={i} className="ancient-card p-5 bg-white">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{s.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-[#2C1810]">{s.label}</span>
                        <span className="text-xl font-bold" style={{ color: s.color }}>{s.score}分</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${s.score}%`, background: s.color }}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-[#5C4A42]">{s.desc}</p>
                </div>
              ))}
            </div>

            {/* 寓意分析 */}
            <div className="ancient-card p-5 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5 text-[#C9A84C]" />
                <span className="font-medium text-[#2C1810]">名字寓意</span>
              </div>
              <p className="text-[#5C4A42] text-sm leading-relaxed">{meaning}</p>
            </div>

            {/* 建议 */}
            <div className="ancient-card p-5 bg-gradient-to-r from-[#F8F3EA] to-white">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-green-600" />
                <span className="font-medium text-[#2C1810]">使用建议</span>
              </div>
              <p className="text-[#5C4A42] text-sm">{suggestion}</p>
            </div>

            {/* 重新测评 */}
            <div className="text-center">
              <Link href="/evaluate/form" className="inline-flex items-center gap-2 text-[#5C4A42] hover:text-[#C84A2A]">
                <Zap className="w-4 h-4" />
                测评另一个名字
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function EvaluatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FDFAF4] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#C84A2A] animate-spin" />
      </div>
    }>
      <EvaluateContent />
    </Suspense>
  );
}
