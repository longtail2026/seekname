/**
 * 店铺起名结果页
 * /shop?category=餐饮&location=社区&expectations=温馨亲切
 */

"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Sparkles, ArrowLeft, Store, Heart, Loader2,
  RefreshCw, Copy, Share2, CheckCircle
} from "lucide-react";

interface ShopName {
  rank: number;
  name: string;
  pinyin: string;
  meaning: string;
  source?: string;
  score: number;
  tags: string[];
}

function ShopResultContent() {
  const searchParams = useSearchParams();

  const shopCategory = searchParams.get("category") || "";
  const location = searchParams.get("location") || "";
  const expectations = searchParams.get("expectations") || "";
  const style = searchParams.get("style") || "";

  const [loading, setLoading] = useState(true);
  const [names, setNames] = useState<ShopName[]>([]);
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
          category: "shop",
          expectations: expectations || "温馨亲切好记",
          style: style || "亲切温暖",
        };
        if (shopCategory) body.shopCategory = shopCategory;
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
        const mapped: ShopName[] = apiNames.map((n: any, idx: number) => ({
          rank: idx + 1,
          name: n.name || n.fullName || "",
          pinyin: n.pinyin || "",
          meaning: n.meaning || "",
          source: n.source ? `《${n.source.book}》：${n.source.text}` : undefined,
          score: typeof n.score === "number" ? n.score : Math.round(70 + Math.random() * 20),
          tags: generateShopTags(n.name || n.fullName || "", shopCategory),
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
  }, [shopCategory, location, expectations, style]);

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
        title: `为您推荐的店铺名：${name.name}`,
        text: `店铺名：${name.name}（${name.pinyin}）\n寓意：${name.meaning}`,
        url: window.location.href,
      });
    } else {
      copyName(`${name.name}（${name.pinyin}）\n${name.meaning}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FDF8F3] to-[#F5EDE0] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-[#E86A17]/30 rounded-full" />
            <div className="absolute inset-0 border-4 border-[#E86A17] rounded-full border-t-transparent animate-spin" />
            <Loader2 className="absolute inset-0 m-auto w-10 h-10 text-[#E86A17] animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-[#2C1810] mb-2" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            AI正在为店铺起名
          </h2>
          <p className="text-[#5C4A42]">正在分析行业特点，打造亲和店铺名</p>
          {orderNo && <p className="text-xs text-[#AAA] mt-4">订单号：{orderNo}</p>}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-500 mb-4">{error}</p>
          <Link href="/" className="text-[#E86A17] hover:underline">← 返回首页</Link>
        </div>
      </div>
    );
  }

  if (names.length === 0) {
    return (
      <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-[#5C4A42] mb-4">未找到合适的店铺名，请调整条件</p>
          <Link href="/" className="text-[#E86A17] hover:underline">← 返回重新起名</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDF8F3] to-[#F5EDE0]">
      {/* 头部 */}
      <header className="sticky top-0 z-50 bg-[#FDF8F3]/95 backdrop-blur border-b border-[#E5DDD3]">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[#5C4A42] hover:text-[#C84A2A] transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>返回首页</span>
          </Link>
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-[#E86A17]" />
            <span className="font-bold text-[#2C1810]" style={{ fontFamily: "'Noto Serif SC', serif" }}>
              店铺起名结果
            </span>
          </div>
          <div className="w-20" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 店铺类型 */}
        {shopCategory && (
          <div className="text-center mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm"
              style={{ background: 'rgba(232,106,23,0.08)', color: '#E86A17', border: '1px solid rgba(232,106,23,0.2)' }}>
              <Store className="w-4 h-4" />
              {shopCategory}类店铺
            </span>
          </div>
        )}

        {/* 店铺名列表 */}
        <div className="space-y-4">
          {names.map((nameItem, idx) => (
            <div
              key={nameItem.rank}
              className={`rounded-2xl p-6 cursor-pointer transition-all duration-300 ${
                selectedIdx === idx ? "ring-2 ring-[#E86A17]" : ""
              }`}
              style={{
                background: selectedIdx === idx
                  ? 'linear-gradient(135deg, rgba(232,106,23,0.08), rgba(232,106,23,0.03))'
                  : 'rgba(255,255,255,0.7)',
                border: selectedIdx === idx ? '1px solid rgba(232,106,23,0.4)' : '1px solid #E5DDD3',
                boxShadow: selectedIdx === idx
                  ? '0 4px 20px rgba(232,106,23,0.12)'
                  : '0 2px 8px rgba(44,24,16,0.05)',
              }}
              onClick={() => setSelectedIdx(idx)}
            >
              <div className="flex items-start gap-4">
                {/* 排名 */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${
                  nameItem.rank === 1
                    ? "bg-gradient-to-br from-[#E86A17] to-[#FF8A33] text-white"
                    : "bg-[#E5DDD3] text-[#5C4A42]"
                }`} style={{ fontFamily: "'Noto Serif SC', serif" }}>
                  {nameItem.rank}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="text-3xl font-bold text-[#2C1810]" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                      {nameItem.name}
                    </span>
                    <span className="text-sm text-[#5C4A42]">{nameItem.pinyin}</span>
                    <span className="ml-auto text-xl font-bold text-[#E86A17]">{nameItem.score}分</span>
                  </div>

                  <p className="text-[#5C4A42] text-sm mb-3 leading-relaxed">{nameItem.meaning}</p>

                  {/* 店铺标签 */}
                  {nameItem.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {nameItem.tags.map((tag, ti) => (
                        <span key={ti}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs"
                          style={{ background: 'rgba(232,106,23,0.08)', color: '#E86A17', border: '1px solid rgba(232,106,23,0.15)' }}>
                          <Heart className="w-2.5 h-2.5" />
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
            style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(232,106,23,0.2)', boxShadow: '0 2px 12px rgba(232,106,23,0.1)' }}>
            <div className="text-4xl font-bold text-[#2C1810] mb-1" style={{ fontFamily: "'Noto Serif SC', serif" }}>
              {names[selectedIdx]?.name}
            </div>
            <div className="text-lg text-[#5C4A42] mb-4">{names[selectedIdx]?.pinyin}</div>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => copyName(names[selectedIdx]?.name || "")}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm"
                style={{ background: '#F5EDE0', color: '#4A3428' }}>
                {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {copied ? "已复制" : "复制店铺名"}
              </button>
              <button onClick={shareName}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm text-white"
                style={{ background: '#E86A17' }}>
                <Share2 className="w-4 h-4" /> 分享
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-[#5C4A42] hover:text-[#C84A2A] transition-colors">
            <RefreshCw className="w-4 h-4" />
            <span>重新起名</span>
          </Link>
        </div>
      </main>
    </div>
  );
}

function generateShopTags(name: string, category: string): string[] {
  const tags: string[] = [];
  const chars = name;
  if (chars.length <= 3) tags.push("简短好记");
  if (/[香|味|食|厨|坊]/.test(chars) || category.includes("餐饮")) tags.push("餐饮适用");
  if (/[小|家|亲|暖]/.test(chars)) tags.push("温馨亲切");
  if (/[雅轩阁居]/.test(chars)) tags.push("雅致有格调");
  if (/[童|趣|玩|乐]/.test(chars) || category.includes("儿童")) tags.push("儿童友好");
  if (tags.length < 2) tags.push("通用百搭");
  return tags.slice(0, 3);
}

export default function ShopPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#E86A17] animate-spin" />
      </div>
    }>
      <ShopResultContent />
    </Suspense>
  );
}
