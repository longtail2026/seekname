/**
 * 名字测评入口表单页
 * /evaluate/form
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, Loader2 } from "lucide-react";

export default function EvaluateFormPage() {
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || fullName.trim().length < 2) return;
    setIsLoading(true);
    window.location.href = `/evaluate?name=${encodeURIComponent(fullName.trim())}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDFAF4] to-[#EDE5D8]">
      <header className="sticky top-0 z-50 bg-[#FDFAF4]/95 backdrop-blur border-b border-[#E5DDD3]">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-[#5C4A42] hover:text-[#C84A2A] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <BarChart3 className="w-5 h-5 text-[#C84A2A]" />
          <span className="font-bold text-[#2C1810]" style={{ fontFamily: "'Noto Serif SC', serif" }}>名字测评</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#2C1810] mb-3" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            名字测评
          </h1>
          <p className="text-[#5C4A42] text-sm">深度解析已有名字的音律、字形、五行、典故等多维信息</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#5C4A42] mb-2">
              您的名字 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value.replace(/[^\u4e00-\u9fa5]/g, '').slice(0, 4))}
              placeholder="请输入要测评的名字（如：张浩然）"
              required
              minLength={2}
              className="w-full px-4 py-4 rounded-xl text-[#2C1810] text-xl text-center"
              style={{ fontFamily: "'Noto Serif SC', serif", background: 'rgba(255,255,255,0.9)', border: '1px solid #DDD0C0', outline: 'none' }}
            />
          </div>

          <button
            type="submit"
            disabled={fullName.trim().length < 2 || isLoading}
            className="w-full py-4 rounded-xl font-bold text-white text-lg transition-all flex items-center justify-center gap-2"
            style={{
              background: fullName.trim().length >= 2 ? '#C84A2A' : '#CCC',
              cursor: fullName.trim().length >= 2 && !isLoading ? 'pointer' : 'not-allowed',
            }}
          >
            {isLoading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> 分析中...</>
            ) : "开始测评"}
          </button>
        </form>
      </main>
    </div>
  );
}
