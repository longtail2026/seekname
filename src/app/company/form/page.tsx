/**
 * 公司起名入口表单页
 * 填写公司/行业信息 → 调用 API → 跳转结果页
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Loader2 } from "lucide-react";

const industries = [
  "互联网/科技", "金融/投资", "教育培训", "医疗健康",
  "零售/电商", "餐饮/食品", "制造/工业", "房地产/建筑",
  "文化/传媒", "咨询/顾问", "其他"
];

const styles = [
  "现代商务", "稳重大气", "创新活力", "简约国际",
  "古典文化", "温暖亲和", "高端奢华", "自然环保"
];

export default function CompanyFormPage() {
  const [industry, setIndustry] = useState("");
  const [expectations, setExpectations] = useState("");
  const [style, setStyle] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!industry) return;
    setIsLoading(true);

    const params = new URLSearchParams({ industry, category: "company" });
    if (expectations.trim()) params.set("expectations", expectations.trim());
    if (style) params.set("style", style);

    window.location.href = `/company?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a18] to-[#2d2d1f]">
      <header className="sticky top-0 z-50 bg-[#1a1a18]/95 backdrop-blur border-b border-[#D4941A]/20">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-white/50 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Building2 className="w-5 h-5 text-[#D4941A]" />
          <span className="font-bold text-white" style={{ fontFamily: "'Noto Serif SC', serif" }}>公司起名</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            公司起名
          </h1>
          <p className="text-white/50 text-sm">结合行业属性与易经数理，为您打造大气好记的公司名称</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 行业选择 */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              行业类型 <span className="text-red-400">*</span>
            </label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-white text-sm"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                outline: 'none',
              }}
            >
              <option value="" className="bg-[#1a1a18]">请选择行业类型</option>
              {industries.map(i => (
                <option key={i} value={i} className="bg-[#1a1a18]">{i}</option>
              ))}
            </select>
          </div>

          {/* 期望寓意 */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              期望寓意 <span className="text-white/30 text-xs">(可选)</span>
            </label>
            <input
              type="text"
              value={expectations}
              onChange={(e) => setExpectations(e.target.value)}
              placeholder="例如：创新大气、有国际范、稳重可信"
              className="w-full px-4 py-3 rounded-xl text-white text-sm"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                outline: 'none',
              }}
            />
          </div>

          {/* 风格偏好 */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-3">风格偏好</label>
            <div className="grid grid-cols-2 gap-2">
              {styles.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(style === s ? "" : s)}
                  className="px-4 py-2.5 rounded-xl text-sm text-sm transition-all"
                  style={{
                    background: style === s ? 'rgba(212,148,26,0.2)' : 'rgba(255,255,255,0.05)',
                    border: style === s ? '1px solid rgba(212,148,26,0.5)' : '1px solid rgba(255,255,255,0.08)',
                    color: style === s ? '#D4941A' : 'rgba(255,255,255,0.6)',
                    cursor: 'pointer',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* 提交 */}
          <button
            type="submit"
            disabled={!industry || isLoading}
            className="w-full py-4 rounded-xl font-medium text-white transition-all flex items-center justify-center gap-2"
            style={{
              background: industry ? '#D4941A' : 'rgba(255,255,255,0.1)',
              cursor: industry && !isLoading ? 'pointer' : 'not-allowed',
            }}
          >
            {isLoading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> 分析中...</>
            ) : (
              "开始起名"
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
