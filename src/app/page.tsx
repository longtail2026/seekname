"use client";

import { useState } from "react";
import {
  Sparkles, BookOpen, Brain, Shield, Zap,
  ChevronRight, Scroll, Award, Quote, Star,
  User, Building2, PawPrint, BarChart3,
  Compass, Library, Microscope, Clock
} from "lucide-react";
import Link from "next/link";
import { SITE_CONFIG } from "@/lib/config";

// ─── 第1屏：价值展示卡片 ───
const valueCards = [
  { icon: Library, title: "12万部", subtitle: "典籍数据库", desc: "唐诗宋词、四书五经", color: "#C9A84C" },
  { icon: Brain, title: "AI驱动", subtitle: "深度学习", desc: "大模型智能分析", color: "#C84A2A" },
  { icon: Compass, title: "八字五行", subtitle: "命理分析", desc: "传统智慧科学算法", color: "#2C5F4A" },
  { icon: Zap, title: "30秒", subtitle: "极速生成", desc: "6个精选好名", color: "#8B4513" },
];

// ─── 第2屏：能力展示数据 ───
const capabilities = [
  {
    icon: BookOpen,
    number: "124,120",
    unit: "条",
    label: "典籍名句",
    detail: "覆盖诗经、楚辞、论语等经典著作",
    color: "#C9A84C",
  },
  {
    icon: Shield,
    number: "24,097",
    unit: "字",
    label: "康熙字典",
    detail: "含笔画、拼音、五行属性完整收录",
    color: "#C84A2A",
  },
  {
    icon: Microscope,
    number: "88,431",
    unit: "例",
    label: "人名样本",
    detail: "按姓氏分布的真实姓名大数据",
    color: "#2C5F4A",
  },
  {
    icon: Clock,
    number: "<30s",
    unit: "",
    label: "响应速度",
    detail: "从输入到出结果，极速体验",
    color: "#8B4513",
  },
];

// ─── 第3屏：服务矩阵 ───
const services = [
  {
    icon: User,
    title: "个人起名",
    desc: "为新生儿或改名需求，融合八字五行与典籍文化，AI智能推荐吉祥美名",
    features: ["八字分析", "典籍出处", "五行匹配"],
    href: "/personal",
    gradient: "linear-gradient(135deg, #C84A2A 0%, #E07050 100%)",
    tag: "热门",
  },
  {
    icon: Building2,
    title: "公司起名",
    desc: "结合行业属性与易经数理，为企业打造大气易记、寓意深远的品牌名称",
    features: ["行业适配", "数理吉凶", "商标查询"],
    href: "/company",
    gradient: "linear-gradient(135deg, #2C5F4A 0%, #3D8068 100%)",
    tag: null,
  },
  {
    icon: PawPrint,
    title: "宠物起名",
    desc: "根据宠物品种、性格特征和主人喜好，为毛孩子起个可爱又有寓意的名字",
    features: ["品种识别", "性格匹配", "趣味创意"],
    href: "/pet",
    gradient: "linear-gradient(135deg, #C9A84C 0%, #DCC06A 100%)",
    tag: null,
  },
  {
    icon: BarChart3,
    title: "名字测评",
    desc: "已有名字想了解其内涵？深度解析名字的音律、字形、五行、典故等多维信息",
    features: ["音律评分", "五行分析", "典故溯源"],
    href: "/evaluate",
    gradient: "linear-gradient(135deg, #8B4513 0%, #A85B20 100%)",
    tag: null,
  },
];

// ─── 第4屏：客户评价 ───
const testimonials = [
  { name: "张先生", role: "新手爸爸", content: "给女儿起名，AI生成的名字既有文化底蕴又符合八字五行，家人都很满意！", rating: 5 },
  { name: "李女士", role: "二胎妈妈", content: "第二个宝宝了，这次用寻名网起的名字更有寓意，比第一个好听多了。", rating: 5 },
  { name: "王先生", role: "企业主", content: "新公司起名，结合了行业特点和易经数理，名字大气好记，推荐！", rating: 5 },
];

export default function Home() {
  const [surname, setSurname] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // 标记是否正在使用 IME 输入法（如拼音）
  const [isComposing, setIsComposing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surname.trim()) return;
    setIsLoading(true);
    window.location.href = `/naming?surname=${encodeURIComponent(surname)}`;
  };

  // 统一的输入处理函数
  const handleInput = (rawValue: string) => {
    // 只保留中文字符，最多2个
    return rawValue.replace(/[^\u4e00-\u9fa5]/g, '').slice(0, 2);
  };

  return (
    <div className="min-h-screen">
      {/* ════════════ 第一屏：Hero 入口 ════════════ */}
      <section id="screen-1" className="fullscreen-section ancient-pattern-bg relative overflow-hidden">
        {/* 水墨背景装饰 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -left-20 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-[#2C1810]/6 to-transparent blur-3xl" />
          <div className="absolute -bottom-32 -right-20 w-[600px] h-[600px] rounded-full bg-gradient-to-tl from-[#C84A2A]/5 to-transparent blur-3xl" />
          {/* 古风装饰线条 */}
          <svg className="absolute top-24 right-[15%] opacity-[0.04]" width="200" height="200" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90" stroke="#C9A84C" strokeWidth="0.5" fill="none"/>
            <circle cx="100" cy="100" r="75" stroke="#C9A84C" strokeWidth="0.5" fill="none"/>
            <circle cx="100" cy="100" r="60" stroke="#C9A84C" strokeWidth="0.5" fill="none"/>
            <line x1="100" y1="10" x2="100" y2="190" stroke="#C9A84C" strokeWidth="0.3"/>
            <line x1="10" y1="100" x2="190" y2="100" stroke="#C9A84C" strokeWidth="0.3"/>
          </svg>
        </div>

        {/* 主内容区 */}
        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-center">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center w-full max-w-7xl">

            {/* ── 左侧：标题 + 起名入口 ── */}
            <div className="text-center lg:text-left z-10">
              {/* 顶部标签 */}
              <div className="inline-flex items-center gap-3 mb-5 animate-ink-spread">
                <span className="w-10 h-[1px] bg-gradient-to-r from-transparent to-[#C9A84C]" />
                <span className="text-sm tracking-[0.25em] text-[#C9A84C] font-medium uppercase">千年智慧 · 一秒传承</span>
                <span className="w-10 h-[1px] bg-gradient-to-l from-transparent to-[#C9A84C]" />
              </div>

              {/* 震撼标题 */}
              <h1
                className="text-[2.5rem] sm:text-[3rem] lg:text-[3.75rem] xl:text-6xl font-bold leading-[1.15] tracking-wide mb-4"
                style={{ fontFamily: "'Noto Serif SC', 'Songti SC', serif" }}
              >
                <span className="block text-[#2C1810] animate-char-reveal">AI读懂</span>
                <span className="block text-[#C84A2A] mt-1 animate-char-reveal delay-200">千年起名之道</span>
              </h1>

              {/* 副标题 */}
              <p
                className="text-base lg:text-lg text-[#5C4A42] mb-7 max-w-md mx-auto lg:mx-0 leading-relaxed"
                style={{ fontFamily: "'Noto Sans SC', sans-serif" }}
              >
                12万部典籍 × 深度学习 × 八字五行<br/>
                <span className="text-[#C84A2A] font-semibold">30秒</span> 为您生成 <span className="text-[#C84A2A] font-semibold">6个</span> 吉祥好名
              </p>

              {/* 起名表单 */}
              <form onSubmit={handleSubmit} className="mb-6">
                <div className="flex gap-3 max-w-lg mx-auto lg:mx-0">
                  <div className="relative flex-1 min-w-0">
                    <input
                      type="text"
                      inputMode="text"
                      value={surname}
                      onChange={(e) => {
                        // IME 输入中（拼音输入过程），允许原始输入，不过滤
                        if (isComposing) {
                          setSurname(e.target.value);
                          return;
                        }
                        // 非IME状态：只保留中文
                        setSurname(handleInput(e.target.value));
                      }}
                      onCompositionStart={() => setIsComposing(true)}
                      onCompositionEnd={(e) => {
                        setIsComposing(false);
                        const val = handleInput((e.target as HTMLInputElement).value);
                        setSurname(val);
                      }}
                      placeholder="请输入您的姓氏"
                      className="w-full px-5 py-3.5 text-base sm:text-lg bg-white/90 backdrop-blur-sm border-2 border-[#E5DDD3]
                                 rounded-xl focus:border-[#C9A84C] focus:outline-none focus:shadow-[0_0_0_3px_rgba(201,168,76,0.15)]
                                 transition-all duration-300 placeholder:text-[#B0AAA0]"
                      style={{ fontFamily: "'Noto Serif SC', serif" }}
                      autoComplete="off"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#C9A84C]/60 font-medium tracking-wider">姓氏</span>
                  </div>
                  <button
                    type="submit"
                    disabled={!surname.trim() || isLoading}
                    className="btn-primary whitespace-nowrap px-7 py-3.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed text-base"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        分析中
                      </span>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-1.5" />
                        立即起名
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-[#B0AAA0] mt-3 ml-1">
                  已有 <span className="text-[#C84A2A] font-semibold">{SITE_CONFIG.stats.totalUsers.toLocaleString()}</span> 位用户找到心仪好名
                </p>
              </form>

              {/* 底部统计 */}
              <div className="flex justify-center lg:justify-start gap-8 mt-2">
                {[
                  { n: SITE_CONFIG.stats.classicsCount, l: "典籍收录" },
                  { n: SITE_CONFIG.stats.satisfactionRate, l: "好评率" },
                  { n: SITE_CONFIG.stats.generateTime, l: "响应速度" },
                ].map((s, i) => (
                  <div key={i} className="text-left">
                    <div className="text-xl font-bold text-[#C84A2A]" style={{ fontFamily: "'Noto Serif SC', serif" }}>{s.n}</div>
                    <div className="text-[11px] text-[#9CA3AF] tracking-wide">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 右侧：四张价值卡片 ── */}
            <div className="animate-ink-spread delay-300 z-10">
              <div className="grid grid-cols-2 gap-4 lg:gap-5">
                {valueCards.map((card, idx) => (
                  <div
                    key={idx}
                    className="group p-5 lg:p-6 text-center rounded-2xl transition-all duration-400 hover:-translate-y-1 hover:shadow-xl cursor-default"
                    style={{
                      background: 'linear-gradient(145deg, rgba(255,255,255,0.92), rgba(248,243,234,0.85))',
                      borderTop: `3px solid ${card.color}`,
                      boxShadow: '0 2px 16px rgba(44,24,16,0.05)',
                    }}
                  >
                    {/* 图标 */}
                    <div
                      className="w-14 h-14 lg:w-16 lg:h-16 mx-auto mb-3 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                      style={{ background: `${card.color}12` }}
                    >
                      <card.icon className="w-7 h-7 lg:w-8 lg:h-8" style={{ color: card.color }} />
                    </div>
                    {/* 标题数字 */}
                    <div className="text-2xl lg:text-[1.75rem] font-bold mb-0.5" style={{ color: card.color, fontFamily: "'Noto Serif SC', serif" }}>
                      {card.title}
                    </div>
                    <div className="text-sm font-medium text-[#2C1810]/80 mb-1">{card.subtitle}</div>
                    <div className="text-xs text-[#5C4A42]/70 leading-relaxed">{card.desc}</div>
                  </div>
                ))}
              </div>

              {/* 装饰文字 */}
              <div className="mt-5 flex justify-center">
                <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full" style={{ background: '#F5F0E6' }}>
                  <Award className="w-4 h-4 text-[#C9A84C]" />
                  <span className="text-sm text-[#5C4A42] font-medium">传统智慧 × 现代科技</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 滚动提示 */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <div className="w-6 h-10 border-2 border-[#C9A84C]/25 rounded-full flex justify-center pt-2">
            <div className="w-1 h-2.5 bg-[#C9A84C]/40 rounded-full" />
          </div>
        </div>
      </section>


      {/* ════════════ 第二屏：能力展示（Why Us） ════════════ */}
      <section id="screen-2" className="fullscreen-section relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #FAF7F2 0%, #F5F0E6 100%)' }}>
        {/* 背景 */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/20 to-transparent" />
          <svg className="absolute bottom-[-80px] left-[-100px] opacity-[0.03] rotate-12" width="350" height="350" viewBox="0 0 350 350">
            <rect x="25" y="25" width="300" height="300" rx="150" stroke="#C9A84C" strokeWidth="0.5" fill="none"/>
            <rect x="55" y="55" width="240" height="240" rx="120" stroke="#C9A84C" strokeWidth="0.5" fill="none"/>
          </svg>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-center">
          <div className="w-full max-w-6xl flex flex-col justify-center" style={{ minHeight: 'calc(100dvh - 4rem)' }}>
            {/* 标题 */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 mb-4">
                <Microscope className="w-5 h-5 text-[#C9A84C]" />
                <span className="text-sm tracking-[0.2em] text-[#C9A84C] uppercase font-medium">技术实力</span>
              </div>
              <h2
                className="text-[1.75rem] sm:text-2xl lg:text-3xl font-bold text-[#2C1810]"
                style={{ fontFamily: "'Noto Serif SC', serif" }}
              >
                不只是随机组合，每一个名字都有据可依
              </h2>
              <p className="mt-3 text-[#5C4A42] max-w-2xl mx-auto text-sm lg:text-base">
                我们将传统起名智慧数字化，让千年文化在 AI 时代焕发新生
              </p>
            </div>

            {/* 能力卡片 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
              {capabilities.map((cap, idx) => (
                <div
                  key={idx}
                  className="group text-center p-6 lg:p-8 rounded-2xl transition-all duration-300 hover:-translate-y-1"
                  style={{ background: 'rgba(255,255,255,0.75)', boxShadow: '0 2px 20px rgba(44,24,16,0.04)' }}
                >
                  <div
                    className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
                    style={{ background: `${cap.color}10` }}
                  >
                    <cap.icon className="w-8 h-8" style={{ color: cap.color }} />
                  </div>
                  <div className="flex items-baseline justify-center gap-1 mb-2">
                    <span className="text-3xl lg:text-4xl font-bold" style={{ color: cap.color, fontFamily: "'Noto Serif SC', serif" }}>
                      {cap.number}
                    </span>
                    <span className="text-sm text-[#9CA3AF]">{cap.unit}</span>
                  </div>
                  <div className="font-bold text-[#2C1810] text-base mb-2">{cap.label}</div>
                  <div className="text-xs text-[#5C4A42]/70 leading-relaxed max-w-[160px] mx-auto">{cap.detail}</div>
                </div>
              ))}
            </div>

            {/* 底部说明 */}
            <div className="mt-10 text-center">
              <div className="inline-flex items-center gap-6 px-8 py-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(201,168,76,0.2)' }}>
                <div className="flex items-center gap-2">
                  <UnlockIcon className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-[#2C1810]"><strong>免费查看</strong> 排名 4-6 名</span>
                </div>
                <div className="w-px h-6 bg-[#E5DDD3]" />
                <div className="flex items-center gap-2">
                  <LockIcon className="w-5 h-5 text-[#C9A84C]" />
                  <span className="text-sm text-[#2C1810]"><strong>解锁精品</strong> 排名 1-3 名</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ════════════ 第三屏：服务矩阵（What We Offer） ════════════ */}
      <section id="screen-3" className="fullscreen-section ancient-pattern-bg relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-center">
          <div className="w-full max-w-6xl flex flex-col justify-center" style={{ minHeight: 'calc(100dvh - 4rem)' }}>
            {/* 标题 */}
            <div className="text-center mb-11">
              <div className="inline-flex items-center gap-2 mb-4">
                <Scroll className="w-5 h-5 text-[#C9A84C]" />
                <span className="text-sm tracking-[0.2em] text-[#C9A84C] uppercase font-medium">服务项目</span>
              </div>
              <h2
                className="text-[1.75rem] sm:text-2xl lg:text-3xl font-bold text-[#2C1810]"
                style={{ fontFamily: "'Noto Serif SC', serif" }}
              >
                四大核心服务，满足全场景起名需求
              </h2>
            </div>

            {/* 服务网格 */}
            <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
              {services.map((svc, idx) => (
                <Link
                  key={idx}
                  href={svc.href}
                  className="group block relative overflow-hidden rounded-2xl p-7 lg:p-8 transition-all duration-400 hover:-translate-y-1 hover:shadow-2xl"
                  style={{ background: 'linear-gradient(145deg, #FFFFFF, #FDFAF4)', border: '1px solid #F0EBE3', boxShadow: '0 2px 20px rgba(44,24,16,0.04)' }}
                >
                  {/* 左侧色条 */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full transition-all duration-400 group-hover:w-1.5" style={{ background: svc.gradient }} />

                  {/* 头部 */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110"
                        style={{ background: `linear-gradient(135deg, ${svc.gradient}, ${svc.gradient}dd)` }}
                      >
                        <svc.icon className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3
                          className="text-xl font-bold text-[#2C1810] flex items-center gap-2"
                          style={{ fontFamily: "'Noto Serif SC', serif" }}
                        >
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
                    <ChevronRight className="w-5 h-5 text-[#C9A84C]/40 group-hover:text-[#C9A84C] group-hover:translate-x-1 transition-all duration-300 shrink-0 mt-1" />
                  </div>

                  {/* 描述 */}
                  <p className="text-sm text-[#5C4A42] leading-relaxed mb-5 pl-[4.5rem]">{svc.desc}</p>

                  {/* 特性标签 */}
                  <div className="flex flex-wrap gap-2 pl-[4.5rem]">
                    {svc.features.map((f, fi) => (
                      <span
                        key={fi}
                        className="text-xs px-3 py-1 rounded-full"
                        style={{ background: `${svc.gradient}0d`, color: '#5C4A42', border: `1px solid ${svc.gradient}25` }}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>

            {/* 底部引导 */}
            <div className="mt-10 text-center">
              <p className="text-sm text-[#9CA3AF]">点击任意服务卡片，即刻开始体验</p>
            </div>
          </div>
        </div>
      </section>


      {/* ════════════ 第四屏：信任背书 + 页脚 ════════════ */}
      <section id="screen-4" className="fullscreen-section relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col">
          {/* 上半部分（约75%）：评价区域 - 浅色背景 */}
          <div className="flex-[3] flex flex-col items-center justify-center relative"
            style={{ background: 'linear-gradient(180deg, #FDFAF4 0%, #F5F0E6 100%)', minHeight: 0 }}
          >
            {/* 背景分割线 */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#E5DDD3] to-transparent" />

            <div className="w-full max-w-6xl">
              {/* 标题 */}
              <div className="text-center mb-8 lg:mb-10">
                <div className="inline-flex items-center gap-2 mb-4">
                  <Quote className="w-5 h-5 text-[#C9A84C]" />
                  <span className="text-sm tracking-[0.2em] text-[#C9A84C] uppercase font-medium">用户心声</span>
                </div>
                <h2
                  className="text-[1.5rem] sm:text-[1.75rem] lg:text-2xl font-bold text-[#2C1810]"
                  style={{ fontFamily: "'Noto Serif SC', serif" }}
                >
                  听听他们怎么说
                </h2>
                <p className="mt-2 text-[#5C4A42] text-sm">
                  已服务超过 <span className="text-[#C84A2A] font-bold">128,000+</span> 家庭
                </p>
              </div>

              {/* 评价卡片 */}
              <div className="grid md:grid-cols-3 gap-5 lg:gap-6">
                {testimonials.map((t, idx) => (
                  <div
                    key={idx}
                    className="p-5 lg:p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1"
                    style={{
                      background: 'rgba(255,255,255,0.85)',
                      boxShadow: '0 2px 16px rgba(44,24,16,0.05)'
                    }}
                  >
                    <div className="flex gap-0.5 mb-3">
                      {[...Array(t.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-[#C9A84C] text-[#C9A84C]" />
                      ))}
                    </div>
                    <p className="text-sm text-[#5C4A42] leading-relaxed mb-4 italic" style={{ lineHeight: '1.7' }}>
                      &ldquo;{t.content}&rdquo;
                    </p>
                    <div className="flex items-center gap-3 pt-3 border-t border-[#E5DDD3]/50">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                        style={{ background: idx === 0 ? '#C84A2A' : idx === 1 ? '#2C5F4A' : '#C9A84C' }}
                      >{t.name[0]}</div>
                      <div>
                        <div className="font-bold text-sm text-[#2C1810]">{t.name}</div>
                        <div className="text-xs text-[#9CA3AF]">{t.role}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 下半部分（约25%）：页脚 - 黑底通栏 */}
          <footer className="shrink-0 py-6 lg:py-8 bg-[#1a1a18] text-gray-300">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#C84A2A] to-[#A63A1E] rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-base" style={{ fontFamily: "'Noto Serif SC', serif" }}>名</span>
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm" style={{ fontFamily: "'Noto Serif SC', serif" }}>寻名网</div>
                    <div className="text-[10px] text-gray-500">www.seekname.cn</div>
                  </div>
                </div>
                <p className="text-gray-500 text-xs leading-relaxed hidden lg:block">
                  传承千年起名智慧，融合现代 AI 技术。
                </p>
              </div>

              <div>
                <h4 className="font-bold mb-2 text-[#C9A84C] text-xs tracking-wide">服务项目</h4>
                <ul className="space-y-1.5 text-xs text-gray-500">
                  {services.map((s, i) => (
                    <li key={i}><Link href={s.href} className="hover:text-white transition-colors duration-200">{s.title}</Link></li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-bold mb-2 text-[#C9A84C] text-xs tracking-wide">关于我们</h4>
                <ul className="space-y-1.5 text-xs text-gray-500">
                  {['平台介绍', '专家团队', '联系我们', '加入我们'].map((item, i) => (
                    <li key={i}><Link href="#" className="hover:text-white transition-colors duration-200">{item}</Link></li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-bold mb-2 text-[#C9A84C] text-xs tracking-wide">帮助支持</h4>
                <ul className="space-y-1.5 text-xs text-gray-500">
                  {['使用帮助', '常见问题', '隐私政策', '服务条款'].map((item, i) => (
                    <li key={i}><Link href="#" className="hover:text-white transition-colors duration-200">{item}</Link></li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="border-t border-gray-800 pt-4 flex flex-col md:flex-row justify-between items-center gap-2 text-[11px] text-gray-600">
              <span>© 2026 寻名网 seekname.cn 版权所有</span>
              <span>ICP备案号：京ICP备XXXXXXXX号-1</span>
            </div>
          </footer>
        </div>
      </section>
    </div>
  );
}

// ───────────── 简单内联图标组件 ─────────────
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
