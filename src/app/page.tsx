"use client";

import { useState } from "react";
import { Sparkles, BookOpen, Brain, Shield, Zap, ChevronRight, Scroll, Award, Lock, Unlock } from "lucide-react";
import Link from "next/link";
import { SITE_CONFIG } from "@/lib/config";

// 价值展示卡片数据
const valueCards = [
  {
    icon: BookOpen,
    title: "12万部",
    subtitle: "典籍数据库",
    description: "唐诗宋词、四书五经",
    color: "#C9A84C",
  },
  {
    icon: Brain,
    title: "AI驱动",
    subtitle: "深度学习",
    description: "大模型智能分析",
    color: "#C84A2A",
  },
  {
    icon: Shield,
    title: "八字五行",
    subtitle: "命理分析",
    description: "传统智慧科学算法",
    color: "#2C5F4A",
  },
  {
    icon: Zap,
    title: "30秒",
    subtitle: "极速生成",
    description: "6个精选好名",
    color: "#8B4513",
  },
];

export default function Home() {
  const [surname, setSurname] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surname.trim()) return;
    
    setIsLoading(true);
    // 跳转到起名页面，带上姓氏参数
    window.location.href = `/naming?surname=${encodeURIComponent(surname)}`;
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section - 第一屏 */}
      <section className="fullscreen-section ancient-pattern-bg relative overflow-hidden">
        {/* 背景装饰 - 水墨元素 */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-gradient-to-br from-[#2C1810] to-transparent blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-gradient-to-tl from-[#C84A2A] to-transparent blur-3xl" />
        </div>
        
        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-center">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center w-full" style={{ minHeight: 'calc(100dvh - 4rem)' }}>
            
            {/* 左侧 - 震撼标题 + 直接起名 */}
            <div className="py-8 text-center lg:text-left">
              {/* 顶部标签 */}
              <div className="inline-flex items-center gap-2 mb-6 animate-ink-spread">
                <div className="w-8 h-[1px] bg-gradient-to-r from-transparent to-[#C9A84C]" />
                <span className="text-sm tracking-widest text-[#C9A84C] font-medium">千年智慧 · 一秒传承</span>
                <div className="w-8 h-[1px] bg-gradient-to-l from-transparent to-[#C9A84C]" />
              </div>
              
              {/* 震撼主标题 */}
              <h1 
                className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#2C1810] mb-4 leading-tight tracking-wide"
                style={{ fontFamily: "'Noto Serif SC', serif" }}
              >
                <span className="block animate-char-reveal">AI读懂</span>
                <span className="block text-[#C84A2A] mt-2 animate-char-reveal delay-200" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                  千年起名之道
                </span>
              </h1>
              
              {/* 副标题 - 突出技术+文化 */}
              <p 
                className="text-lg lg:text-xl text-[#5C4A42] mb-8 max-w-xl leading-relaxed animate-fade-in-up delay-300"
                style={{ fontFamily: "'Noto Serif SC', serif" }}
              >
                12万部典籍 × 深度学习 × 八字五行
                <br />
                <span className="text-[#C84A2A]">30秒</span> 为您生成 <span className="text-[#C84A2A]">6个</span> 吉祥好名
              </p>
              
              {/* 直接起名表单 */}
              <form onSubmit={handleSubmit} className="animate-fade-in-up delay-400">
                <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto lg:mx-0">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={surname}
                      onChange={(e) => setSurname(e.target.value.slice(0, 2))}
                      placeholder="输入姓氏（如：李、欧阳）"
                      className="w-full px-6 py-4 text-lg bg-white/80 backdrop-blur border-2 border-[#E5DDD3] rounded-lg 
                                 focus:border-[#C9A84C] focus:outline-none transition-all duration-300
                                 placeholder:text-[#9CA3AF]"
                      style={{ fontFamily: "'Noto Serif SC', serif" }}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#C9A84C] text-sm">
                      姓氏
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={!surname.trim() || isLoading}
                    className="btn-primary whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        分析中...
                      </span>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        立即起名
                        <ChevronRight className="ml-2 w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
                <p className="text-sm text-[#9CA3AF] mt-3">
                  已有 <span className="text-[#C84A2A] font-semibold">{SITE_CONFIG.stats.totalUsers.toLocaleString()}</span> 位家长找到心仪好名
                </p>
              </form>
              
              {/* 信任标识 */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-6 mt-8 animate-fade-in-up delay-500">
                {[
                  { num: SITE_CONFIG.stats.classicsCount, label: "典籍收录" },
                  { num: SITE_CONFIG.stats.satisfactionRate, label: "好评率" },
                  { num: SITE_CONFIG.stats.generateTime, label: "极速生成" },
                ].map((stat, i) => (
                  <div key={i} className="text-center">
                    <div 
                      className="text-2xl font-bold text-[#C84A2A]"
                      style={{ fontFamily: "'Noto Serif SC', serif" }}
                    >
                      {stat.num}
                    </div>
                    <div className="text-xs text-[#5C4A42]">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* 右侧 - 四张价值展示卡片 */}
            <div className="relative animate-ink-spread delay-300">
              <div className="grid grid-cols-2 gap-4">
                {valueCards.map((card, index) => (
                  <div
                    key={index}
                    className="ancient-card p-6 text-center group hover:scale-105 transition-all duration-300"
                    style={{ 
                      background: 'linear-gradient(135deg, #FDFAF4 0%, #F8F3EA 100%)',
                      borderTop: `3px solid ${card.color}`
                    }}
                  >
                    <div 
                      className="w-14 h-14 mx-auto mb-4 rounded-lg flex items-center justify-center"
                      style={{ background: `${card.color}15` }}
                    >
                      <card.icon className="w-7 h-7" style={{ color: card.color }} />
                    </div>
                    <div 
                      className="text-3xl font-bold mb-1"
                      style={{ color: card.color, fontFamily: "'Noto Serif SC', serif" }}
                    >
                      {card.title}
                    </div>
                    <div className="text-sm font-medium text-[#2C1810] mb-1">
                      {card.subtitle}
                    </div>
                    <div className="text-xs text-[#5C4A42]">
                      {card.description}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* 底部装饰文字 */}
              <div className="mt-6 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#F8F3EA] rounded-full">
                  <Award className="w-4 h-4 text-[#C9A84C]" />
                  <span className="text-sm text-[#5C4A42]">传统智慧 × 现代科技</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 滚动提示 */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-[#C9A84C]/30 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-3 bg-[#C9A84C]/50 rounded-full" />
          </div>
        </div>
      </section>

      {/* 服务介绍 - 第二屏 */}
      <section className="fullscreen-section ancient-pattern-bg" style={{ backgroundColor: '#F8F3EA' }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-center">
          <div className="w-full flex flex-col justify-center" style={{ minHeight: 'calc(100dvh - 4rem)' }}>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 mb-4">
                <Scroll className="w-5 h-5 text-[#C9A84C]" />
                <span className="text-sm tracking-widest text-[#C9A84C]">起名流程</span>
              </div>
              <h2 
                className="text-3xl md:text-4xl font-bold text-[#2C1810] mb-4"
                style={{ fontFamily: "'Noto Serif SC', serif" }}
              >
                三步获取专属好名
              </h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                { step: "01", title: "输入姓氏", desc: "填写宝宝姓氏，选择性别" },
                { step: "02", title: "AI分析", desc: "深度学习12万部典籍，八字五行匹配" },
                { step: "03", title: "获取好名", desc: "生成6个候选名字，附详细解析" },
              ].map((item, index) => (
                <div key={index} className="text-center">
                  <div 
                    className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center text-2xl font-bold"
                    style={{ 
                      background: 'linear-gradient(135deg, #C84A2A 0%, #A63A1E 100%)',
                      color: 'white',
                      fontFamily: "'Noto Serif SC', serif"
                    }}
                  >
                    {item.step}
                  </div>
                  <h3 className="text-xl font-bold text-[#2C1810] mb-2">{item.title}</h3>
                  <p className="text-[#5C4A42]">{item.desc}</p>
                </div>
              ))}
            </div>
            
            {/* 付费模式说明 */}
            <div className="mt-12 max-w-3xl mx-auto">
              <div className="ancient-card p-6 bg-white/50">
                <div className="flex items-center justify-center gap-8 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Unlock className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium text-[#2C1810]">免费查看</div>
                      <div className="text-sm text-[#5C4A42]">排名 4、5、6 的名字</div>
                    </div>
                  </div>
                  <div className="w-px h-12 bg-[#E5DDD3] hidden sm:block" />
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#C9A84C]/20 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-[#C9A84C]" />
                    </div>
                    <div>
                      <div className="font-medium text-[#2C1810]">解锁精品</div>
                      <div className="text-sm text-[#5C4A42]">排名 1、2、3 的名字</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
