/**
 * 好名测试 · 智能名字体检 - 测评输入页
 * /evaluate/form
 *
 * 支持：人名/英文名/中文名/网名/公司名/品牌名/跨境名/宠物名/艺名/作品名
 */
"use client";

import { useState } from "react";
import { ArrowLeft, Search, Star, Loader2 } from "lucide-react";
import Link from "next/link";

/* ─── 类型选择数据 ─── */
const NAME_TYPES = [
  { id: "person",      icon: "👤", label: "人名（宝宝/成人）",    placeholder: "如：张浩然",        infoPlaceholder: "男/女（可选）" },
  { id: "english",     icon: "🇬🇧", label: "英文名",               placeholder: "如：Alexander",    infoPlaceholder: "男/女（可选）" },
  { id: "chinese",     icon: "🌏", label: "外国人中文名",         placeholder: "如：李小龙",        infoPlaceholder: "原名+国籍（可选）" },
  { id: "social",      icon: "💬", label: "社交网名",             placeholder: "如：星空漫步者",    infoPlaceholder: "风格/平台（可选）" },
  { id: "company",     icon: "🏢", label: "公司名/品牌名",        placeholder: "如：星辰科技",      infoPlaceholder: "行业/领域（可选）" },
  { id: "crossborder", icon: "🌐", label: "跨境电商英文名",      placeholder: "如：SunnyLife",     infoPlaceholder: "品类/目标市场（可选）" },
  { id: "pet",         icon: "🐾", label: "宠物名",               placeholder: "如：小布丁",        infoPlaceholder: "宠物种类/性别（可选）" },
  { id: "stage",       icon: "🎭", label: "艺名/笔名/游戏ID",    placeholder: "如：墨染青衣",      infoPlaceholder: "领域/风格（可选）" },
  { id: "work",        icon: "📖", label: "作品名（文章/影视）", placeholder: "如：时光之河",      infoPlaceholder: "体裁/主题（可选）" },
];

export default function EvaluateFormPage() {
  const [selectedType, setSelectedType] = useState("person");
  const [name, setName] = useState("");
  const [info, setInfo] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const currentType = NAME_TYPES.find((t) => t.id === selectedType)!;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsLoading(true);

    const params = new URLSearchParams();
    params.set("name", name.trim());
    params.set("type", selectedType);
    if (info.trim()) params.set("info", info.trim());

    window.location.href = `/evaluate?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDFAF4] to-[#EDE5D8]">
      <header className="sticky top-0 z-50 bg-[#FDFAF4]/95 backdrop-blur border-b border-[#E5DDD3]">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-[#5C4A42] hover:text-[#E86A17] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Star className="w-5 h-5 text-[#E86A17]" />
          <span className="font-bold text-[#2C1810]" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            好名测试·智能名字体检
          </span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Slogan */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5 text-xs text-amber-700 mb-3">
            <Star className="w-3.5 h-3.5" />
            测一测你的名字好不好、吉不吉、适不适合你...
          </div>
          <h1 className="text-3xl font-bold text-[#2C1810] mb-2" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            好名测试
          </h1>
          <p className="text-[#5C4A42] text-sm">选类型 → 输入名字 → 一键测评（6大维度 · AI智能打分）</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 类型选择 */}
          <div>
            <label className="block text-sm font-medium text-[#5C4A42] mb-3">选择类型</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {NAME_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setSelectedType(t.id); setName(""); setInfo(""); }}
                  className={`p-2.5 rounded-xl text-center transition-all ${
                    selectedType === t.id
                      ? "bg-[#E86A17] text-white shadow-md scale-105"
                      : "bg-white text-[#5C4A42] border border-[#DDD0C0] hover:border-[#E86A17] hover:shadow-sm"
                  }`}
                >
                  <div className="text-xl mb-0.5">{t.icon}</div>
                  <div className="text-[10px] leading-tight">{t.label.length > 7 ? t.label.slice(0, 7) + "…" : t.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 名字输入 */}
          <div>
            <label className="block text-sm font-medium text-[#5C4A42] mb-2">
              {currentType.label} · 名字 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={currentType.placeholder}
              required
              className="w-full px-5 py-4 rounded-xl text-[#2C1810] text-lg text-center"
              style={{
                fontFamily: "'Noto Serif SC', serif",
                background: 'rgba(255,255,255,0.9)',
                border: '1px solid #DDD0C0',
                outline: 'none',
              }}
              onFocus={(e) => { e.target.style.borderColor = "#E86A17"; e.target.style.boxShadow = "0 0 0 3px rgba(232,106,23,0.1)"; }}
              onBlur={(e) => { e.target.style.borderColor = "#DDD0C0"; e.target.style.boxShadow = "none"; }}
            />
          </div>

          {/* 额外信息（可选） */}
          <div>
            <label className="block text-sm font-medium text-[#5C4A42] mb-2">
              {currentType.infoPlaceholder}
            </label>
            <input
              type="text"
              value={info}
              onChange={(e) => setInfo(e.target.value)}
              placeholder={currentType.infoPlaceholder}
              className="w-full px-4 py-3 rounded-xl text-[#2C1810] text-sm"
              style={{
                background: 'rgba(255,255,255,0.9)',
                border: '1px solid #DDD0C0',
                outline: 'none',
              }}
            />
            <p className="text-[#AAA] text-xs mt-1.5">提供辅助信息可以让评测更精准，不填则使用默认评测</p>
          </div>

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={!name.trim() || isLoading}
            className="w-full py-4 rounded-xl font-bold text-white text-lg transition-all flex items-center justify-center gap-2"
            style={{
              background: name.trim() ? 'linear-gradient(135deg, #E86A17 0%, #D55A0B 100%)' : '#CCC',
              cursor: name.trim() && !isLoading ? 'pointer' : 'not-allowed',
            }}
            onMouseEnter={(e) => { if (name.trim()) e.currentTarget.style.boxShadow = "0 4px 16px rgba(232,106,23,0.35)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
          >
            {isLoading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> 分析中...</>
            ) : (
              <><Search className="w-5 h-5" /> 开始测评</>
            )}
          </button>
        </form>

        {/* 6大维度说明 */}
        <div className="mt-10 pt-8 border-t border-[#DDD0C0]">
          <h2 className="text-center text-sm font-semibold text-[#2C1810] mb-4">6大评测维度 · 满分60分</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { icon: "🎵", label: "好听度", desc: "音律·平仄·顺口" },
              { icon: "📖", label: "寓意度", desc: "内涵·吉利·文化" },
              { icon: "👁️", label: "辨识度", desc: "好记·好写·好读" },
              { icon: "✨", label: "独特性", desc: "不撞名·稀缺性" },
              { icon: "🛡️", label: "安全无歧义", desc: "无不雅·无负面" },
              { icon: "🎯", label: "场景适配度", desc: "气质·行业匹配" },
            ].map((dim) => (
              <div key={dim.label} className="bg-white rounded-xl p-3 text-center border border-[#F0E8DD]">
                <div className="text-2xl mb-1">{dim.icon}</div>
                <div className="text-sm font-semibold text-[#2C1810]">{dim.label}</div>
                <div className="text-[10px] text-[#AAA] mt-0.5">{dim.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}