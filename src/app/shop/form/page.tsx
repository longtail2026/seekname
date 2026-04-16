/**
 * 店铺起名入口表单页
 * /shop/form
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Store, Loader2 } from "lucide-react";

const shopCategories = [
  "餐饮/小吃", "咖啡/茶饮", "烘焙/甜品", "零售/便利店",
  "服装/鞋帽", "美容/美发", "母婴/儿童", "图书/文具",
  "宠物/用品", "运动/健身", "家居/建材", "其他"
];

const shopStyles = [
  "温馨亲切", "简约干净", "文艺复古", "时尚潮流",
  "传统正宗", "活力年轻", "高端品质", "社区友好"
];

export default function ShopFormPage() {
  const [category, setCategory] = useState("");
  const [expectations, setExpectations] = useState("");
  const [style, setStyle] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) return;
    setIsLoading(true);

    const params = new URLSearchParams({ category, shopCategory: category });
    if (expectations.trim()) params.set("expectations", expectations.trim());
    if (style) params.set("style", style);

    window.location.href = `/shop?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDF8F3] to-[#F5EDE0]">
      <header className="sticky top-0 z-50 bg-[#FDF8F3]/95 backdrop-blur border-b border-[#E5DDD3]">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-[#5C4A42] hover:text-[#C84A2A] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Store className="w-5 h-5 text-[#E86A17]" />
          <span className="font-bold text-[#2C1810]" style={{ fontFamily: "'Noto Serif SC', serif" }}>店铺起名</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#2C1810] mb-3" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            店铺起名
          </h1>
          <p className="text-[#5C4A42] text-sm">为好店铺起一个好名字，让顾客一眼记住</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#5C4A42] mb-2">
              店铺类型 <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-[#2C1810] text-sm"
              style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid #DDD0C0', outline: 'none' }}
            >
              <option value="">请选择店铺类型</option>
              {shopCategories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#5C4A42] mb-2">
              期望调性 <span className="text-[#AAA] text-xs">(可选)</span>
            </label>
            <input
              type="text"
              value={expectations}
              onChange={(e) => setExpectations(e.target.value)}
              placeholder="例如：温馨亲切、年轻活力、正宗传统"
              className="w-full px-4 py-3 rounded-xl text-[#2C1810] text-sm"
              style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid #DDD0C0', outline: 'none' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#5C4A42] mb-3">风格偏好</label>
            <div className="grid grid-cols-2 gap-2">
              {shopStyles.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(style === s ? "" : s)}
                  className="px-4 py-2.5 rounded-xl text-sm transition-all"
                  style={{
                    background: style === s ? 'rgba(232,106,23,0.1)' : 'rgba(255,255,255,0.6)',
                    border: style === s ? '1px solid rgba(232,106,23,0.5)' : '1px solid #DDD0C0',
                    color: style === s ? '#E86A17' : '#5C4A42',
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
            className="w-full py-4 rounded-xl font-medium text-white transition-all flex items-center justify-center gap-2"
            style={{
              background: category ? '#E86A17' : '#CCC',
              cursor: category && !isLoading ? 'pointer' : 'not-allowed',
            }}
          >
            {isLoading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> 分析中...</>
            ) : "开始起名"}
          </button>
        </form>
      </main>
    </div>
  );
}
