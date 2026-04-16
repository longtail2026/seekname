/**
 * 品牌起名结果页
 * /brand?category=服装&expectations=高端优雅
 */

"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Sparkles, ArrowLeft, Gem, TrendingUp, Loader2,
  RefreshCw, Copy, Share2, CheckCircle
} from "lucide-react";

interface BrandName {
  rank: number;
  name: string;
  pinyin: string;
  meaning: string;
  source?: string;
  score: number;
  tags: string[]; // 品牌调性标签
}

function BrandResultContent() {
  const searchParams = useSearchParams();

  const brandCategory = searchParams.get("category") || "";
  const expectations = searchParams.get("expectations") || "";
  const style = searchParams.get("style") || "";

  const [loading, setLoading] = useState(true);
  const [names, setNames] = useState<BrandName[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [orderNo, setOrderNo] = useState<string>("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchNames = async () => {
      setLoading(true);
      setError(null);
      try {
        const body: Record<string, string> = {
          category: "brand",
          expectations: expectations || "高端优雅有品位",
          style: style || "轻奢",
        };
        if (brandCategory) body.brandCategory = brandCategory;
        body.useAiComposer = "true";

        const response = await fetch("/api/name/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const result = await response.json();

        if (!result.success) {
          setError(result.error || "起名失败");
          return;
        }

        if (result.data?.orderNo) setOrderNo(result.data.orderNo);

        const apiNames = result.data?.names || [];
        const mapped: BrandName[] = apiNames.map((n: any, idx: number) => ({
          rank: idx + 1,
          name: n.name || n.fullName || "",
          pinyin: n.pinyin || "",
          meaning: n.meaning || "",
          source: n.source ? `《${n.source.book}》：${n.source.text}` : undefined,
          score: typeof n.score === "number" ? n.score : Math.round(70 + Math.random() * 20),
          tags: generateBrandTags(n.name || n.fullName || "", brandCategory),
        }));

        setNames(mapped.length > 0 ? mapped : []);
      } catch (err) {
        setError("网络错误，请稍后重试");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchNames();
  }, [brandCategory, expectations, style]);

  const copyName = (name: string) => {
    navigator.clipboard.writeText(name);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareName = () => {
    const name = names[selectedIdx];
    if (!name) return;
    if (navigator.share) {
      navigator.share({
        title: `为您推荐的品牌名：${name.name}`,
        text: `品牌名：${name.name}（${name.pinyin}）\n寓意：${name.meaning}`,
        url: window.location.href,
      });
    } else {
      copyName(`${name.name}（${name.pinyin}）\n${name.meaning}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-[#E8B02E]/30 rounded-full" />
            <div className="absolute inset-0 border-4 border-[#E8B02E] rounded-full border-t-transparent animate-spin" />
            <Loader2 className="absolute inset-0 m-auto w-10 h-10 text-[#E8B02E] animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            AI正在打造品牌名称
          </h2>
          <p className="text-white/40">正在分析品牌调性，匹配高端意象</p>
          {orderNo && <p className="text-xs text-white/20 mt-4">订单号：{orderNo}</p>}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-400 mb-4">{error}</p>
          <Link href="/" className="text-[#E8B02E] hover:underline">← 返回首页</Link>
        </div>
      </div>
    );
  }

  if (names.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-white/60 mb-4">未找到合适的品牌名，请调整条件</p>
          <Link href="/" className="text-[#E8B02E] hover:underline">← 返回重新起名</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* 头部 */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>返回首页</span>
          </Link>
          <div className="flex items-center gap-2">
            <Gem className="w-5 h-5 text-[#E8B02E]" />
            <span className="font-bold text-white" style={{ fontFamily: "'Noto Serif SC', serif" }}>
              品牌起名结果
            </span>
          </div>
          <div className="w-20" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* 品牌类别标签 */}
        {brandCategory && (
          <div className="text-center mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm"
              style={{ background: 'rgba(232,176,46,0.12)', color: '#E8B02E', border: '1px solid rgba(232,176,46,0.25)' }}>
              <Gem className="w-4 h-4" />
              {brandCategory}品牌
            </span>
          </div>
        )}

        {/* 品牌名列表 */}
        <div className="space-y-4">
          {names.map((nameItem, idx) => (
            <div
              key={nameItem.rank}
              className={`relative overflow-hidden rounded-2xl p-6 cursor-pointer transition-all duration-300 ${
                selectedIdx === idx ? "ring-2 ring-[#E8B02E]" : ""
              }`}
              style={{
                background: selectedIdx === idx
                  ? 'linear-gradient(135deg, rgba(232,176,46,0.1), rgba(232,176,46,0.04))'
                  : 'rgba(255,255,255,0.03)',
                border: selectedIdx === idx ? '1px solid rgba(232,176,46,0.4)' : '1px solid rgba(255,255,255,0.06)',
              }}
              onClick={() => setSelectedIdx(idx)}
            >
              {/* 排名 */}
              <div className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                nameItem.rank === 1 ? "bg-gradient-to-br from-[#E8B02E] to-[#D4941A] text-black" : "bg-white/10 text-white/60"
              }`}>
                {nameItem.rank}
              </div>

              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, rgba(232,176,46,0.15), rgba(232,176,46,0.05))' }}>
                  <Gem className="w-7 h-7 text-[#E8B02E]" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="text-3xl font-bold text-white" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                      {nameItem.name}
                    </span>
                    <span className="text-sm text-white/40">{nameItem.pinyin}</span>
                    <span className="ml-auto text-xl font-bold text-[#E8B02E]">{nameItem.score}分</span>
                  </div>

                  <p className="text-white/50 text-sm mb-3 leading-relaxed">{nameItem.meaning}</p>

                  {/* 品牌调性标签 */}
                  {nameItem.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {nameItem.tags.map((tag, ti) => (
                        <span key={ti}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs"
                          style={{ background: 'rgba(232,176,46,0.08)', color: '#E8B02E', border: '1px solid rgba(232,176,46,0.2)' }}>
                          <TrendingUp className="w-2.5 h-2.5" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 操作区 */}
        {names[selectedIdx] && (
          <div className="mt-6 rounded-2xl p-6 text-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(232,176,46,0.2)' }}>
            <div className="text-4xl font-bold text-white mb-1" style={{ fontFamily: "'Noto Serif SC', serif" }}>
              {names[selectedIdx]?.name}
            </div>
            <div className="text-lg text-white/40 mb-4">{names[selectedIdx]?.pinyin}</div>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => copyName(names[selectedIdx]?.name || "")}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'white' }}>
                {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                {copied ? "已复制" : "复制品牌名"}
              </button>
              <button onClick={shareName}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm text-black"
                style={{ background: '#E8B02E' }}>
                <Share2 className="w-4 h-4" /> 分享
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors">
            <RefreshCw className="w-4 h-4" />
            <span>重新起名</span>
          </Link>
        </div>
      </main>
    </div>
  );
}

function generateBrandTags(name: string, category: string): string[] {
  const tags: string[] = [];
  const chars = name;
  if (chars.length <= 2) tags.push("简洁易记");
  if (/[瑞|珍|宝|玉|金|珠]/.test(chars)) tags.push("高端奢华");
  if (/[雅|秀|逸|韵|风]/.test(chars)) tags.push("优雅知性");
  if (/[星|光|辉|曜|晨]/.test(chars)) tags.push("璀璨夺目");
  if (/[行|远|达|通|捷]/.test(chars)) tags.push("专业可靠");
  if (category.includes("服装") || category.includes("时尚")) tags.push("时尚感");
  if (tags.length < 2) tags.push("品质之选");
  return tags.slice(0, 3);
}

export default function BrandPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#E8B02E] animate-spin" />
      </div>
    }>
      <BrandResultContent />
    </Suspense>
  );
}
