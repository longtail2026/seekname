/**
 * 宠物起名入口表单页
 * /pet/form
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, PawPrint, Loader2 } from "lucide-react";

const petTypes = ["猫", "狗", "兔子", "仓鼠", "鸟类", "鱼类", "龟类", "其他"];
const petGenders = ["公的", "母的", "不确定"];
const petStyles = ["可爱呆萌", "帅气威武", "优雅高贵", "搞怪有趣", "文艺清新", "简约大气"];

export default function PetFormPage() {
  const [petType, setPetType] = useState("");
  const [gender, setGender] = useState("");
  const [expectations, setExpectations] = useState("");
  const [style, setStyle] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!petType) return;
    setIsLoading(true);

    const params = new URLSearchParams({ petType, category: "pet" });
    if (gender) params.set("gender", gender);
    if (expectations.trim()) params.set("expectations", expectations.trim());
    if (style) params.set("style", style);

    window.location.href = `/pet?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDF8F3] to-[#F0E8D8]">
      <header className="sticky top-0 z-50 bg-[#FDF8F3]/95 backdrop-blur border-b border-[#E5DDD3]">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-[#5C4A42] hover:text-[#C84A2A] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <PawPrint className="w-5 h-5 text-[#F09A3A]" />
          <span className="font-bold text-[#2C1810]" style={{ fontFamily: "'Noto Serif SC', serif" }}>宠物起名</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-xl">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🐾</div>
          <h1 className="text-3xl font-bold text-[#2C1810] mb-3" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            宠物起名
          </h1>
          <p className="text-[#5C4A42] text-sm">为毛孩子起个可爱又有寓意的好名字</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#5C4A42] mb-2">
              宠物类型 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {petTypes.map(t => (
                <button key={t} type="button" onClick={() => setPetType(petType === t ? "" : t)}
                  className="py-2.5 rounded-xl text-sm transition-all"
                  style={{
                    background: petType === t ? 'rgba(240,154,58,0.15)' : 'rgba(255,255,255,0.7)',
                    border: petType === t ? '1px solid rgba(240,154,58,0.5)' : '1px solid #DDD0C0',
                    color: petType === t ? '#F09A3A' : '#5C4A42',
                    cursor: 'pointer',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#5C4A42] mb-2">性别</label>
            <div className="flex gap-3">
              {petGenders.map(g => (
                <button key={g} type="button" onClick={() => setGender(gender === g ? "" : g)}
                  className="flex-1 py-2.5 rounded-xl text-sm transition-all"
                  style={{
                    background: gender === g ? 'rgba(240,154,58,0.15)' : 'rgba(255,255,255,0.7)',
                    border: gender === g ? '1px solid rgba(240,154,58,0.5)' : '1px solid #DDD0C0',
                    color: gender === g ? '#F09A3A' : '#5C4A42',
                    cursor: 'pointer',
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#5C4A42] mb-2">
              期望风格 <span className="text-[#AAA] text-xs">(可选)</span>
            </label>
            <input
              type="text"
              value={expectations}
              onChange={(e) => setExpectations(e.target.value)}
              placeholder="例如：可爱呆萌、帅气威武、优雅高贵"
              className="w-full px-4 py-3 rounded-xl text-[#2C1810]"
              style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid #DDD0C0', outline: 'none' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#5C4A42] mb-3">名字风格</label>
            <div className="grid grid-cols-3 gap-2">
              {petStyles.map(s => (
                <button key={s} type="button" onClick={() => setStyle(style === s ? "" : s)}
                  className="px-3 py-2 rounded-xl text-xs transition-all"
                  style={{
                    background: style === s ? 'rgba(240,154,58,0.12)' : 'rgba(255,255,255,0.6)',
                    border: style === s ? '1px solid rgba(240,154,58,0.4)' : '1px solid #DDD0C0',
                    color: style === s ? '#F09A3A' : '#5C4A42',
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
            disabled={!petType || isLoading}
            className="w-full py-4 rounded-xl font-bold text-white text-lg transition-all flex items-center justify-center gap-2"
            style={{
              background: petType ? '#F09A3A' : '#CCC',
              cursor: petType && !isLoading ? 'pointer' : 'not-allowed',
            }}
          >
            {isLoading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> 取名中...</>
            ) : "开始起名 🐾"}
          </button>
        </form>
      </main>
    </div>
  );
}
