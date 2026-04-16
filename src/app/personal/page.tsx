/**
 * 个人起名入口表单页
 * /personal
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, User, Loader2 } from "lucide-react";

export default function PersonalFormPage() {
  const [surname, setSurname] = useState("");
  const [gender, setGender] = useState<"男"|"女">("男");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [expectations, setExpectations] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!surname.trim() || !birthDate) return;
    setIsLoading(true);

    const params = new URLSearchParams({
      surname: surname.trim(),
      gender: gender === "男" ? "M" : "F",
      birthDate,
      category: "personal",
    });
    if (birthTime) params.set("birthTime", birthTime);
    if (expectations.trim()) params.set("expectations", expectations.trim());

    window.location.href = `/naming?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDFAF4] to-[#EDE5D0]">
      <header className="sticky top-0 z-50 bg-[#FDFAF4]/95 backdrop-blur border-b border-[#E5DDD3]">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-[#5C4A42] hover:text-[#C84A2A] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <User className="w-5 h-5 text-[#C84A2A]" />
          <span className="font-bold text-[#2C1810]" style={{ fontFamily: "'Noto Serif SC', serif" }}>个人起名</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#2C1810] mb-3" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            个人起名
          </h1>
          <p className="text-[#5C4A42] text-sm">融合八字五行与典籍文化，为您推荐吉祥好名</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 姓氏 */}
          <div>
            <label className="block text-sm font-medium text-[#5C4A42] mb-1">
              姓氏 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={surname}
              onChange={(e) => setSurname(e.target.value.slice(0, 2))}
              placeholder="请输入姓氏（支持拼音输入）"
              required
              maxLength={2}
              className="w-full px-4 py-3 rounded-xl text-[#2C1810] text-base"
              style={{ fontFamily: "'Noto Serif SC', serif", background: 'rgba(255,255,255,0.8)', border: '1px solid #DDD0C0', outline: 'none' }}
            />
          </div>

          {/* 性别 */}
          <div>
            <label className="block text-sm font-medium text-[#5C4A42] mb-2">性别 <span className="text-red-500">*</span></label>
            <div className="flex gap-3">
              {(["男", "女"] as const).map(g => (
                <button key={g} type="button" onClick={() => setGender(g)}
                  className="flex-1 py-3 rounded-xl font-medium text-base transition-all"
                  style={{
                    background: gender === g ? (g === "男" ? "#4A90D9" : "#E870A0") : 'rgba(255,255,255,0.8)',
                    color: gender === g ? "#fff" : "#5C4A42",
                    border: '1px solid #DDD0C0',
                    cursor: 'pointer',
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* 出生日期 */}
          <div>
            <label className="block text-sm font-medium text-[#5C4A42] mb-1">
              出生日期 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-[#2C1810]"
              style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid #DDD0C0', outline: 'none' }}
            />
          </div>

          {/* 出生时辰 */}
          <div>
            <label className="block text-sm font-medium text-[#5C4A42] mb-1">
              出生时辰 <span className="text-[#AAA] text-xs">(可选)</span>
            </label>
            <input
              type="time"
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-[#2C1810]"
              style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid #DDD0C0', outline: 'none' }}
            />
          </div>

          {/* 期望寓意 */}
          <div>
            <label className="block text-sm font-medium text-[#5C4A42] mb-1">
              期望寓意 <span className="text-[#AAA] text-xs">(可选)</span>
            </label>
            <input
              type="text"
              value={expectations}
              onChange={(e) => setExpectations(e.target.value)}
              placeholder="例如：聪明勇敢、温柔诗意、事业有成"
              className="w-full px-4 py-3 rounded-xl text-[#2C1810]"
              style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid #DDD0C0', outline: 'none' }}
            />
          </div>

          {/* 提交 */}
          <button
            type="submit"
            disabled={!surname.trim() || !birthDate || isLoading}
            className="w-full py-4 rounded-xl font-bold text-white text-lg transition-all flex items-center justify-center gap-2"
            style={{
              background: surname.trim() && birthDate ? '#C84A2A' : '#CCC',
              cursor: surname.trim() && birthDate && !isLoading ? 'pointer' : 'not-allowed',
            }}
          >
            {isLoading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> 分析八字中...</>
            ) : "开始起名"}
          </button>

          <p className="text-center text-xs text-[#AAA]">
            已有 <span className="text-[#E86A17]">128,000+</span> 位用户找到心仪好名
          </p>
        </form>
      </main>
    </div>
  );
}
