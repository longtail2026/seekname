/**
 * 品牌起名入口表单页
 * /brand/form
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Gem, Loader2 } from "lucide-react";

const brandCategories = [
  "服装/时尚", "美妆/护肤", "食品/餐饮", "科技/数码",
  "家居/生活", "母婴/儿童", "运动/户外", "珠宝/配饰", "其他"
];

const brandStyles = [
  "轻奢高端", "简约现代", "年轻活力", "复古经典",
  "东方美学", "国际潮流", "自然环保", "文艺清新"
];

export default function BrandFormPage() {
  const [category, setCategory] = useState("");
  const [expectations, setExpectations] = useState("");
  const [style, setStyle] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) return;
    setIsLoading(true);

    const params = new URLSearchParams({ category, brandCategory: category });
    if (expectations.trim()) params.set("expectations", expectations.trim());
    if (style) params.set("style", style);

    window.location.href = `/brand?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Gem className="w-5 h-5 text-[#E8B02E]" />
          <span className="font-bold text-white" style={{ fontFamily: "'Noto Serif SC', serif" }}>品牌起名</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            品牌起名
          </h1>
          <p className="text-white/40 text-sm">为您的品牌打造高端独特、易于传播的优质名称</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">
              品牌品类 <span className="text-red-400">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-white text-sm"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}
            >
              <option value="" className="bg-[#0a0a0a]">请选择品牌品类</option>
              {brandCategories.map(c => (
                <option key={c} value={c} className="bg-[#0a0a0a]">{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">
              期望调性 <span className="text-white/30 text-xs">(可选)</span>
            </label>
            <input
              type="text"
              value={expectations}
              onChange={(e) => setExpectations(e.target.value)}
              placeholder="例如：高端优雅、有东方韵味、国际感强"
              className="w-full px-4 py-3 rounded-xl text-white text-sm"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/60 mb-3">风格偏好</label>
            <div className="grid grid-cols-2 gap-2">
              {brandStyles.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(style === s ? "" : s)}
                  className="px-4 py-2.5 rounded-xl text-sm transition-all"
                  style={{
                    background: style === s ? 'rgba(232,176,46,0.15)' : 'rgba(255,255,255,0.04)',
                    border: style === s ? '1px solid rgba(232,176,46,0.5)' : '1px solid rgba(255,255,255,0.08)',
                    color: style === s ? '#E8B02E' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!category || isLoading}
            className="w-full py-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
            style={{
              background: category ? '#E8B02E' : 'rgba(255,255,255,0.08)',
              color: category ? '#000' : 'rgba(255,255,255,0.3)',
              cursor: category && !isLoading ? 'pointer' : 'not-allowed',
            }}
          >
            {isLoading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> 打造品牌名称...</>
            ) : "开始起名"}
          </button>
        </form>
      </main>
    </div>
  );
}
