"use client";

import { useState } from "react";
import {
  Sparkles, BookOpen, Brain, Shield, Zap,
  ChevronRight, Scroll, Award, Quote, Star,
  User, Building2, PawPrint, BarChart3,
  Compass, Library, Microscope, Clock
} from "lucide-react";
import Link from "next/link";

// ─── 第1屏：价值展示卡片 ───
const valueCards = [
  { icon: Library, title: "120,000+", subtitle: "Classic References", desc: "Shijing, Chuci, Tang poetry & more", color: "#E86A17" },
  { icon: Brain, title: "AI-Powered", subtitle: "Smart Generation", desc: "Advanced LLM analysis", color: "#FF8A33" },
  { icon: Compass, title: "BaZi & Wuxing", subtitle: "Traditional Wisdom", desc: "Ancient Chinese numerology", color: "#D4941A" },
  { icon: Zap, title: "<30s", subtitle: "Lightning Fast", desc: "6 carefully selected names", color: "#C8540A" },
];

// ─── 第2屏：能力展示数据 ───
const capabilities = [
  {
    icon: BookOpen,
    number: "124,120",
    unit: "",
    label: "Classic Quotes",
    detail: "Covering Shijing, Chuci, Analects and other classics",
    color: "#E86A17",
  },
  {
    icon: Shield,
    number: "24,097",
    unit: "",
    label: "Kangxi Characters",
    detail: "Complete strokes, pinyin, and Wuxing attributes",
    color: "#FF8A33",
  },
  {
    icon: Microscope,
    number: "88,431",
    unit: "",
    label: "Name Samples",
    detail: "Real name big data by surname distribution",
    color: "#D4941A",
  },
  {
    icon: Clock,
    number: "<30s",
    unit: "",
    label: "Response Time",
    detail: "From input to results, lightning fast experience",
    color: "#C8540A",
  },
];

// ─── 第3屏：服务矩阵 ───
const services = [
  {
    icon: User,
    title: "Personal Naming",
    desc: "For newborns or name changes, combining BaZi Wuxing with classic culture for AI-powered recommendations",
    features: ["BaZi Analysis", "Classic Origin", "Wuxing Match"],
    href: "/en/personal",
    gradient: "linear-gradient(135deg, #E86A17 0%, #FF8A33 100%)",
    tag: "Popular",
  },
  {
    icon: Building2,
    title: "Business Naming",
    desc: "Combining industry attributes with Yijing numerology for a grand, memorable brand name",
    features: ["Industry Match", "Numerology Analysis", "Trademark Check"],
    href: "/en/company/form",
    gradient: "linear-gradient(135deg, #D4941A 0%, #E8B02E 100%)",
    tag: null,
  },
  {
    icon: PawPrint,
    title: "Pet Naming",
    desc: "Based on pet breed, personality, and owner preferences for a cute and meaningful name",
    features: ["Breed Recognition", "Personality Match", "Creative Ideas"],
    href: "/en/pet/form",
    gradient: "linear-gradient(135deg, #F09A3A 0%, #F0B860 100%)",
    tag: null,
  },
  {
    icon: BarChart3,
    title: "Name Evaluation",
    desc: "Already have a name? Deep analysis of phonetics, characters, Wuxing, and allusions",
    features: ["Phonetic Score", "Wuxing Analysis", "Origin Trace"],
    href: "/en/evaluate/form",
    gradient: "linear-gradient(135deg, #C8540A 0%, #E86A17 100%)",
    tag: null,
  },
];

// ─── 第4屏：客户评价 ───
const testimonials = [
  { name: "Michael C.", role: "New Dad", content: "The AI-generated names have cultural depth and match BaZi perfectly. My family is very satisfied!", rating: 5 },
  { name: "Sarah L.", role: "Mom of Two", content: "Second child! The names from SeekName are more meaningful than my first child's. Highly recommended!", rating: 5 },
  { name: "David W.", role: "Entrepreneur", content: "New company naming with industry characteristics and Yijing numerology. Grand and memorable!", rating: 5 },
];

// ─── 统计数据 ───
const stats = [
  { n: "120,000+", l: "Classic References" },
  { n: "99.6%", l: "Satisfaction Rate" },
  { n: "<30s", l: "Response Time" },
];

export default function HomeEN() {
  const [surname, setSurname] = useState("");
  const [gender, setGender] = useState<"male"|"female">("male");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [expectations, setExpectations] = useState("");
  const [style, setStyle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isComposing, setIsComposing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surname.trim()) return;
    if (!birthDate) return;
    setIsLoading(true);
    const genderCode = gender === "male" ? "M" : "F";
    const params = new URLSearchParams({
      surname,
      gender: genderCode,
      category: "personal",
      birthDate,
    });
    if (birthTime) params.set("birthTime", birthTime);
    if (expectations.trim()) params.set("expectations", expectations.trim());
    if (style.trim()) params.set("style", style.trim());
    window.location.href = `/naming?${params.toString()}`;
  };

  const handleInput = (rawValue: string) => {
    const chinese = rawValue.replace(/[^\u4e00-\u9fa5]/g, '');
    if (chinese.length > 0) return chinese.slice(0, 2);
    return rawValue.slice(0, 10);
  };

  return (
    <div className="relative" style={{ paddingTop: 60 }}>
      {/* ════════════ 第一屏：Hero ════════════ */}
      <section id="screen-1" className="fullscreen-section relative" style={{ minHeight: 'calc(100dvh - 60px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {/* 水墨背景装饰 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -left-20 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-[#2D1B0E]/6 to-transparent blur-3xl" />
          <svg className="absolute top-24 right-[15%] opacity-[0.04]" width="200" height="200" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90" stroke="#D4941A" strokeWidth="0.5" fill="none"/>
            <circle cx="100" cy="100" r="75" stroke="#D4941A" strokeWidth="0.5" fill="none"/>
            <circle cx="100" cy="100" r="60" stroke="#D4941A" strokeWidth="0.5" fill="none"/>
            <line x1="100" y1="10" x2="100" y2="190" stroke="#D4941A" strokeWidth="0.3"/>
            <line x1="10" y1="100" x2="190" y2="100" stroke="#D4941A" strokeWidth="0.3"/>
          </svg>
        </div>

        {/* ── 左右两栏主体 ── */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex items-center" style={{ paddingTop: 30 }}>
          <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-end z-10">

            {/* ══ 左栏：标题 + 表单 ══ */}
            <div className="flex flex-col items-center lg:items-start">
              {/* 标题 */}
              <div className="w-full mb-5 text-center lg:text-left" style={{ maxWidth: 620 }}>
                <div className="inline-flex items-center gap-3 mb-3 animate-ink-spread">
                  <span className="w-12 h-[1px] bg-gradient-to-r from-transparent to-[#D4941A]" />
                  <span className="text-[15px] tracking-[0.25em] text-[#D4941A] font-medium uppercase">Traditional Wisdom · Modern AI</span>
                  <span className="w-12 h-[1px] bg-gradient-to-l from-transparent to-[#D4941A]" />
                </div>
                <h1
                  className="text-[2.25rem] sm:text-[2.75rem] lg:text-[3.25rem] font-bold leading-[1.1] tracking-wide mb-2"
                  style={{ fontFamily: "'Noto Serif SC', 'Songti SC', serif" }}
                >
                  <span className="block text-[#2D1B0E] animate-char-reveal">AI Reads</span>
                  <span className="block text-[#E86A17] animate-char-reveal delay-200">Traditional Naming</span>
                </h1>
                <p className="text-[15px] lg:text-[17px] text-[#5A4334] leading-relaxed">
                  120,000+ Classics × Deep Learning × BaZi Wuxing · <span className="text-[#E86A17] font-semibold">30 seconds to 6 perfect names</span>
                </p>
              </div>

              {/* 统计数据行 */}
              <div className="flex gap-7 mb-4" style={{ maxWidth: 620 }}>
                {stats.map((s, i) => (
                  <div key={i} className="text-center">
                    <div className="text-[15px] font-bold text-[#E86A17]">{s.n}</div>
                    <div className="text-[11px] text-[#A09080] tracking-wide">{s.l}</div>
                  </div>
                ))}
              </div>

              {/* 表单 */}
              <form onSubmit={handleSubmit} className="w-full flex flex-col items-center lg:items-start">
                <div className="relative w-full" style={{ maxWidth: 620 }}>
                  <div
                    className="w-full p-8 rounded-2xl"
                    style={{
                      background: 'linear-gradient(145deg, rgba(255,255,255,0.95), rgba(255,248,240,0.90))',
                      border: '1px solid #DDD0C0',
                      boxShadow: '0 4px 24px rgba(44,24,16,0.08)',
                    }}
                  >
                    <h3 className="text-lg font-bold text-[#2D1B0E] mb-4" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                      Get Your Perfect Chinese Name
                    </h3>

                    {/* 姓氏 + 性别 */}
                    <div className="flex gap-3 mb-3">
                      <input
                        type="text"
                        inputMode="text"
                        value={surname}
                        onChange={(e) => {
                          if (isComposing) { setSurname(e.target.value); return; }
                          setSurname(handleInput(e.target.value));
                        }}
                        onCompositionStart={() => setIsComposing(true)}
                        onCompositionEnd={(e) => {
                          setIsComposing(false);
                          setSurname(handleInput((e.target as HTMLInputElement).value));
                        }}
                        placeholder="Your surname (e.g. 王)"
                        className="flex-1 min-w-0 px-3 py-2.5 text-[15px] rounded-lg"
                        style={{ fontFamily: "'Noto Serif SC', serif", color: '#3D2B1F', background: 'rgba(255, 252, 245, 0.95)', border: '1px solid rgba(180,160,130,0.4)', outline: 'none' }}
                        autoComplete="off"
                      />
                      <div className="flex rounded-lg overflow-hidden shrink-0" style={{ border: '1px solid rgba(180,160,130,0.4)' }}>
                        {(["male", "female"] as const).map((g) => (
                          <button key={g} type="button" onClick={() => setGender(g)}
                            className="px-4 py-2.5 text-[15px] font-medium transition-all duration-200"
                            style={{
                              background: gender === g ? (g === "male" ? "#4A90D9" : "#E870A0") : "rgba(255, 252, 245, 0.95)",
                              color: gender === g ? "#fff" : "#5A4334",
                              border: 'none', cursor: 'pointer',
                            }}
                          >{g === "male" ? "Male" : "Female"}</button>
                        ))}
                      </div>
                    </div>

                    {/* 生日日期 */}
                    <div className="flex gap-3 mb-3">
                      <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
                        className="flex-1 min-w-0 px-3 py-2.5 text-[15px] rounded-lg"
                        style={{ fontFamily: "'Noto Sans SC', sans-serif", color: '#2D1B0E', background: 'rgba(255, 252, 245, 0.95)', border: '1px solid rgba(180,160,130,0.4)', outline: 'none' }}
                      />
                      <input type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)}
                        className="flex-1 min-w-0 px-3 py-2.5 text-[15px] rounded-lg"
                        style={{ fontFamily: "'Noto Sans SC', sans-serif", color: '#2D1B0E', background: 'rgba(255, 252, 245, 0.95)', border: '1px solid rgba(180,160,130,0.4)', outline: 'none' }}
                      />
                    </div>

                    {/* 期望 + 风格 */}
                    <div className="flex gap-3 mb-4">
                      <input type="text" value={expectations} onChange={(e) => setExpectations(e.target.value)}
                        placeholder="Desired meaning (e.g. wisdom)" className="flex-1 min-w-0 px-3 py-2.5 text-[15px] rounded-lg"
                        style={{ fontFamily: "'Noto Sans SC', sans-serif", color: '#3D2B1F', background: 'rgba(255, 252, 245, 0.95)', border: '1px solid rgba(180,160,130,0.4)', outline: 'none' }}
                        autoComplete="off"
                      />
                      <input type="text" value={style} onChange={(e) => setStyle(e.target.value)}
                        placeholder="Style (e.g. classical)" className="flex-1 min-w-0 px-3 py-2.5 text-[15px] rounded-lg"
                        style={{ fontFamily: "'Noto Sans SC', sans-serif", color: '#3D2B1F', background: 'rgba(255, 252, 245, 0.95)', border: '1px solid rgba(180,160,130,0.4)', outline: 'none' }}
                        autoComplete="off"
                      />
                    </div>

                    {/* 提交按钮 */}
                    <button
                      type="submit"
                      disabled={!surname.trim() || !birthDate || isLoading}
                      className="w-full py-3 rounded-lg text-[15px] font-medium text-white transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: '#1a1a18',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        border: 'none',
                        cursor: surname.trim() && birthDate ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          Analyzing...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1.5">
                          <Sparkles className="w-4 h-4" />
                          Generate Names
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* 用户数提示 */}
                <p className="text-xs text-[#B0AAA0] mt-3 text-center lg:text-left">
                  Join <span className="text-[#E86A17] font-semibold">128,000+</span> users who found their perfect name
                </p>

                {/* 语言切换 */}
                <div className="mt-3">
                  <Link href="/" className="text-sm text-[#5C4A42] hover:text-[#E86A17] transition-colors">
                    🌐 中文
                  </Link>
                </div>
              </form>
            </div>

            {/* ══ 右栏：四张价值卡片 ══ */}
            <div className="flex flex-col items-center lg:items-center">
              <div className="grid grid-cols-2 gap-6 lg:gap-8 w-full animate-ink-spread delay-300">
                {valueCards.map((card, idx) => (
                  <div
                    key={idx}
                    className="group p-7 lg:p-9 text-center rounded-2xl transition-all duration-400 hover:-translate-y-1 hover:shadow-xl cursor-default"
                    style={{
                      background: 'linear-gradient(145deg, rgba(255,255,255,0.92), rgba(255,248,240,0.85))',
                      borderTop: `3px solid ${card.color}`,
                      border: '1px solid #DDD0C0',
                      boxShadow: '0 2px 16px rgba(44,24,16,0.05)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = '#E86A17';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 24px rgba(232,106,23,0.18)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = '#DDD0C0';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 16px rgba(44,24,16,0.05)';
                    }}
                  >
                    <div
                      className="w-16 h-16 lg:w-[76px] lg:h-[76px] mx-auto mb-3 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                      style={{ background: `${card.color}12` }}
                    >
                      <card.icon className="w-8 h-8 lg:w-10 lg:h-10" style={{ color: card.color }} />
                    </div>
                    <div className="text-[1.5rem] lg:text-[1.8rem] font-bold mb-1" style={{ color: card.color }}>
                      {card.title}
                    </div>
                    <div className="text-[13px] lg:text-sm font-medium text-[#2D1B0E]/80 mb-0.5">{card.subtitle}</div>
                    <div className="text-xs lg:text-[13px] text-[#5A4334]/70 leading-relaxed">{card.desc}</div>
                  </div>
                ))}
              </div>

              {/* 装饰文字 */}
              <div className="mt-5 flex justify-center">
                <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full" style={{ background: '#FFF5E6' }}>
                  <Award className="w-4 h-4 text-[#D4941A]" />
                  <span className="text-sm text-[#5A4334] font-medium">Traditional Wisdom × Modern Technology</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* ════════════ 第二屏：能力展示 ════════════ */}
      <section id="screen-2" className="fullscreen-section relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <svg className="absolute bottom-[-80px] left-[-100px] opacity-[0.03] rotate-12" width="350" height="350" viewBox="0 0 350 350">
            <rect x="25" y="25" width="300" height="300" rx="150" stroke="#D4941A" strokeWidth="0.5" fill="none"/>
            <rect x="55" y="55" width="240" height="240" rx="120" stroke="#D4941A" strokeWidth="0.5" fill="none"/>
          </svg>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="max-w-6xl mx-auto flex flex-col justify-center">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 mb-4">
                <Microscope className="w-5 h-5 text-[#D4941A]" />
                <span className="text-sm tracking-[0.2em] text-[#D4941A] uppercase font-medium">Technology</span>
              </div>
              <h2 className="text-[1.75rem] sm:text-2xl lg:text-3xl font-bold text-[#2D1B0E]">
                Not Random Combination, Every Name Has a Reason
              </h2>
              <p className="mt-3 text-[#5A4334] max-w-2xl mx-auto text-sm lg:text-base">
                We digitized traditional naming wisdom, letting ancient culture thrive in the AI era
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
              {capabilities.map((cap, idx) => (
                <div
                  key={idx}
                  className="group text-center p-6 lg:p-8 rounded-2xl transition-all duration-300 hover:-translate-y-1"
                  style={{ background: 'rgba(255,255,255,0.80)', border: '1px solid #DDD0C0', boxShadow: '0 2px 20px rgba(44,24,16,0.05)' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = '#E86A17';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 24px rgba(232,106,23,0.18)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = '#DDD0C0';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 20px rgba(44,24,16,0.05)';
                  }}
                >
                  <div
                    className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
                    style={{ background: `${cap.color}10` }}
                  >
                    <cap.icon className="w-8 h-8" style={{ color: cap.color }} />
                  </div>
                  <div className="flex items-baseline justify-center gap-1 mb-2">
                    <span className="text-3xl lg:text-4xl font-bold" style={{ color: cap.color }}>
                      {cap.number}
                    </span>
                    <span className="text-sm text-[#A09080]">{cap.unit}</span>
                  </div>
                  <div className="font-bold text-[#2D1B0E] text-base mb-2">{cap.label}</div>
                  <div className="text-xs text-[#5A4334]/70 leading-relaxed max-w-[160px] mx-auto">{cap.detail}</div>
                </div>
              ))}
            </div>

            {/* 底部说明 */}
            <div className="mt-10 text-center">
              <div className="inline-flex items-center gap-6 px-8 py-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.70)', border: '1px solid rgba(201,168,76,0.40)' }}>
                <div className="flex items-center gap-2">
                  <UnlockIcon className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-[#2D1B0E]"><strong>Free</strong> View ranks 4-6</span>
                </div>
                <div className="w-px h-6 bg-[#E8DDD0]" />
                <div className="flex items-center gap-2">
                  <LockIcon className="w-5 h-5 text-[#D4941A]" />
                  <span className="text-sm text-[#2D1B0E]"><strong>Unlock premium</strong> ranks 1-3</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ════════════ 第三屏：服务矩阵 ════════════ */}
      <section id="screen-3" className="fullscreen-section relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="max-w-6xl mx-auto flex flex-col justify-center">
            <div className="text-center mb-11">
              <div className="inline-flex items-center gap-2 mb-4">
                <Scroll className="w-5 h-5 text-[#D4941A]" />
                <span className="text-sm tracking-[0.2em] text-[#D4941A] uppercase font-medium">Services</span>
              </div>
              <h2 className="text-[1.75rem] sm:text-2xl lg:text-3xl font-bold text-[#2D1B0E]">
                Four Core Services for All Naming Needs
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
              {services.map((svc, idx) => (
                <Link
                  key={idx}
                  href={svc.href}
                  className="group block relative overflow-hidden rounded-2xl p-7 lg:p-8 transition-all duration-400 hover:-translate-y-1 hover:shadow-2xl"
                  style={{ background: 'linear-gradient(145deg, #FFFFFF, #FFFCF7)', border: '1px solid #DDD0C0', boxShadow: '0 2px 20px rgba(44,24,16,0.05)' }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget;
                    el.style.borderColor = '#E86A17';
                    el.style.boxShadow = '0 6px 28px rgba(232,106,23,0.18)';
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget;
                    el.style.borderColor = '#DDD0C0';
                    el.style.boxShadow = '0 2px 20px rgba(44,24,16,0.05)';
                  }}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full transition-all duration-400 group-hover:w-1.5" style={{ background: svc.gradient }} />

                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110"
                        style={{ background: `linear-gradient(135deg, ${svc.gradient}, ${svc.gradient}dd)` }}
                      >
                        <svc.icon className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-[#2D1B0E] flex items-center gap-2">
                          {svc.title}
                          {svc.tag && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full text-white font-normal tracking-wider"
                              style={{ background: svc.gradient }}>
                              {svc.tag}
                            </span>
                          )}
                        </h3>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#D4941A]/40 group-hover:text-[#D4941A] group-hover:translate-x-1 transition-all duration-300 shrink-0 mt-1" />
                  </div>

                  <p className="text-sm text-[#5A4334] leading-relaxed mb-5 pl-[4.5rem]">{svc.desc}</p>

                  <div className="flex flex-wrap gap-2 pl-[4.5rem]">
                    {svc.features.map((f, fi) => (
                      <span
                        key={fi}
                        className="text-xs px-3 py-1 rounded-full"
                        style={{ background: `${svc.gradient}0d`, color: '#5A4334', border: `1px solid ${svc.gradient}25` }}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-10 text-center">
              <p className="text-sm text-[#A09080]">Click any service card to start</p>
            </div>
          </div>
        </div>
      </section>


      {/* ════════════ 第四屏：信任背书 + 页脚 ════════════ */}
      <section id="screen-4" className="fullscreen-section relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="w-full max-w-6xl mx-auto flex-shrink">
            <div className="text-center mb-8 lg:mb-10">
              <div className="inline-flex items-center gap-2 mb-4">
                <Quote className="w-5 h-5 text-[#D4941A]" />
                <span className="text-sm tracking-[0.2em] text-[#D4941A] uppercase font-medium">Testimonials</span>
              </div>
              <h2 className="text-[1.75rem] sm:text-2xl lg:text-[2.25rem] font-bold text-[#2D1B0E]">
                What Our Users Say
              </h2>
              <p className="mt-2 text-sm lg:text-base text-[#5A4334]">
                Serving <span className="text-[#E86A17] font-bold">128,000+</span> families worldwide
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 justify-items-center max-w-5xl mx-auto">
              {testimonials.map((t, idx) => (
                <div
                  key={idx}
                  className="p-7 lg:p-8 rounded-2xl transition-all duration-300 hover:-translate-y-1 w-full"
                  style={{
                    background: 'rgba(255,255,255,0.9)',
                    border: '1px solid transparent',
                    boxShadow: '0 4px 20px rgba(44,24,16,0.06)'
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = '#E86A17';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 28px rgba(232,106,23,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(44,24,16,0.06)';
                  }}
                >
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-[#E86A17] text-[#E86A17]" />
                    ))}
                  </div>
                  <p className="text-sm lg:text-base text-[#5A4334] leading-relaxed mb-5 italic" style={{ lineHeight: '1.8' }}>
                    &ldquo;{t.content}&rdquo;
                  </p>
                  <div className="flex items-center gap-3 pt-3 border-t border-[#C8B8A8]/60">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ background: idx === 0 ? '#E86A17' : idx === 1 ? '#D4941A' : '#F09A3A' }}
                    >{t.name[0]}</div>
                    <div>
                      <div className="font-semibold text-sm text-[#2D1B0E]">{t.name}</div>
                      <div className="text-xs text-[#A09080]">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <p className="text-sm text-[#A09080]">Thank you for your trust and support</p>
            </div>
          </div>
        </div>

        {/* 页脚 */}
        <footer className="py-5 bg-[#1a1a18] text-gray-300 w-full">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 mb-4 text-center md:text-left">
              <div className="md:text-center">
                <div className="flex items-center gap-2 mb-2 justify-center">
                  <img src="/images/48-48-ICO-1.png" alt="SeekName" className="w-7 h-7 rounded" />
                  <div>
                    <div className="font-bold text-white text-xs">SeekName</div>
                    <div className="text-[9px] text-gray-500">seekname.cn</div>
                  </div>
                </div>
                <p className="text-gray-500 text-[11px] leading-relaxed hidden lg:block">
                  Traditional naming wisdom meets modern AI technology.
                </p>
              </div>

              <div className="text-center">
                <h4 className="font-bold mb-2 text-[#D4941A] text-[11px] tracking-wide">Services</h4>
                <ul className="space-y-1 text-[11px] text-gray-500">
                  {services.map((s, i) => (
                    <li key={i}><Link href={s.href} className="hover:text-white transition-colors duration-200">{s.title}</Link></li>
                  ))}
                </ul>
              </div>

              <div className="text-center">
                <h4 className="font-bold mb-2 text-[#D4941A] text-[11px] tracking-wide">About Us</h4>
                <ul className="space-y-1 text-[11px] text-gray-500">
                  {['About', 'Team', 'Contact', 'Careers'].map((item, i) => (
                    <li key={i}><Link href="#" className="hover:text-white transition-colors duration-200">{item}</Link></li>
                  ))}
                </ul>
              </div>

              <div className="text-center">
                <h4 className="font-bold mb-2 text-[#D4941A] text-[11px] tracking-wide">Support</h4>
                <ul className="space-y-1 text-[11px] text-gray-500">
                  {['Help Center', 'FAQ', 'Privacy', 'Terms'].map((item, i) => (
                    <li key={i}><Link href="#" className="hover:text-white transition-colors duration-200">{item}</Link></li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="border-t border-gray-800 pt-3 flex flex-col md:flex-row justify-between items-center gap-2 text-[10px] text-gray-600">
              <span>&copy; 2026 SeekName. All rights reserved.</span>
              <span>Made with ❤️ for Chinese naming culture</span>
            </div>
          </div>
        </footer>
      </section>
    </div>
  );
}

// ───────────── 内联图标组件 ─────────────
function UnlockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 019.9-1"/>
    </svg>
  );
}
