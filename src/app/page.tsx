"use client";

import { useState } from "react";
import { Sparkles, BookOpen, Brain, Shield, Zap, ChevronRight, Scroll, Award, Lock, Unlock, Quote, Star } from "lucide-react";
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

// 客户评价数据
const testimonials = [
  {
    name: "张先生",
    role: "新手爸爸",
    content: "给刚出生的女儿起名，AI生成的名字既有文化底蕴，又符合八字五行，非常满意！",
    rating: 5,
  },
  {
    name: "李女士",
    role: "二胎妈妈",
    content: "第二个宝宝了，这次用寻名网起名，比第一个名字更有寓意，家人都很喜欢。",
    rating: 5,
  },
  {
    name: "王先生",
    role: "企业主",
    content: "给新公司起名，结合了行业特点和易经数理，名字大气又好记，推荐！",
    rating: 5,
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
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center w-full max-w-7xl" style={{ minHeight: 'calc(100dvh - 4rem)' }}>
            
            {/* 左侧 - 震撼标题 + 直接起名 */}
            <div className="py-6 text-center lg:text-left">
              {/* 顶部标签 */}
              <div className="inline-flex items-center gap-2 mb-4 animate-ink-spread">
                <div className="w-8 h-[1px] bg-gradient-to-r from-transparent to-[#C9A84C]" />
                <span className="text-sm tracking-widest text-[#C9A84C] font-medium">千年智慧 · 一秒传承</span>
                <div className="w-8 h-[1px] bg-gradient-to-l from-transparent to-[#C9A84C]" />
              </div>
              
              {/* 震撼主标题 */}
              <h1 
                className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#2C1810] mb-3 leading-tight tracking-wide"
                style={{ fontFamily: "'Noto Serif SC', serif" }}
              >
                <span className="block animate-char-reveal">AI读懂</span>
                <span className="block text-[#C84A2A] mt-1 animate-char-reveal delay-200" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                  千年起名之道
                </span>
              </h1>
              
              {/* 副标题 - 突出技术+文化 */}
              <p 
                className="text-base lg:text-lg text-[#5C4A42] mb-6 max-w-lg leading-relaxed animate-fade-in-up delay-300"
                style={{ fontFamily: "'Noto Serif SC', serif" }}
              >
                12万部典籍 × 深度学习 × 八字五行
                <br />
                <span className="text-[#C84A2A]">30秒</span> 为您生成 <span className="text-[#C84A2A]">6个</span> 吉祥好名
              </p>
              
              {/* 直接起名表单 */}
              <form onSubmit={handleSubmit} className="animate-fade-in-up delay-400">
                <div className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto lg:mx-0">
                  <div className="relative flex-1 min-w-[200px]">
                    <input
                      type="text"
                      inputMode="text"
                      value={surname}
                      onChange={(e) => setSurname(e.target.value.slice(0, 2))}
                      placeholder="输入姓氏"
                      className="w-full px-5 py-3.5 text-lg bg-white/80 backdrop-blur border-2 border-[#E5DDD3] rounded-lg 
                                 focus:border-[#C9A84C] focus:outline-none transition-all duration-300
                                 placeholder:text-[#9CA3AF]"
                      style={{ fontFamily: "'Noto Serif SC', serif" }}
                      autoComplete="off"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#C9A84C] text-sm">
                      姓氏
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={!surname.trim() || isLoading}
                    className="btn-primary whitespace-nowrap px-6 py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div className="flex flex-wrap justify-center lg:justify-start gap-6 mt-6 animate-fade-in-up delay-500">
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
              <div className="grid grid-cols-2 gap-5">
                {valueCards.map((card, index) => (
                  <div
                    key={index}
                    className="ancient-card p-8 text-center group hover:scale-105 transition-all duration-300"
                    style={{ 
                      background: 'linear-gradient(135deg, #FDFAF4 0%, #F8F3EA 100%)',
                      borderTop: `3px solid ${card.color}`,
                      minHeight: '180px'
                    }}
                  >
                    <div 
                      className="w-16 h-16 mx-auto mb-4 rounded-lg flex items-center justify-center"
                      style={{ background: `${card.color}15` }}
                    >
                      <card.icon className="w-8 h-8" style={{ color: card.color }} />
                    </div>
                    <div 
                      className="text-3xl font-bold mb-1"
                      style={{ color: card.color, fontFamily: "'Noto Serif SC', serif" }}
                    >
                      {card.title}
                    </div>
                    <div className="text-base font-medium text-[#2C1810] mb-1">
                      {card.subtitle}
                    </div>
                    <div className="text-sm text-[#5C4A42]">
                      {card.description}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* 底部装饰文字 */}
              <div className="mt-5 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#F8F3EA] rounded-full">
                  <Award className="w-4 h-4 text-[#C9A84C]" />
                  <span className="text-sm text-[#5C4A42]">传统智慧 × 现代科技</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 滚动提示 */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-[#C9A84C]/30 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-3 bg-[#C9A84C]/50 rounded-full" />
          </div>
        </div>
      </section>

      {/* 服务介绍 - 第二屏 */}
      <section className="fullscreen-section ancient-pattern-bg" style={{ backgroundColor: '#F8F3EA' }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-center">
          <div className="w-full flex flex-col justify-center" style={{ minHeight: 'calc(100dvh - 4rem)' }}>
            <div className="text-center mb-10">
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
            <div className="mt-10 max-w-3xl mx-auto">
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

      {/* 客户评价 - 第三屏 */}
      <section className="fullscreen-section ancient-pattern-bg relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-center">
          <div className="w-full flex flex-col justify-center" style={{ minHeight: 'calc(100dvh - 4rem)' }}>
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 mb-4">
                <Quote className="w-5 h-5 text-[#C9A84C]" />
                <span className="text-sm tracking-widest text-[#C9A84C]">用户心声</span>
              </div>
              <h2 
                className="text-3xl md:text-4xl font-bold text-[#2C1810] mb-4"
                style={{ fontFamily: "'Noto Serif SC', serif" }}
              >
                听听他们怎么说
              </h2>
              <p className="text-[#5C4A42] max-w-2xl mx-auto">
                已有超过 10 万家庭通过寻名网找到心仪好名
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {testimonials.map((item, index) => (
                <div 
                  key={index} 
                  className="ancient-card p-6 bg-white/80"
                  style={{ minHeight: '200px' }}
                >
                  <div className="flex gap-1 mb-4">
                    {[...Array(item.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-[#C9A84C] text-[#C9A84C]" />
                    ))}
                  </div>
                  <p className="text-[#5C4A42] mb-4 leading-relaxed text-sm">
                    "{item.content}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C84A2A] to-[#A63A1E] flex items-center justify-center text-white font-bold">
                      {item.name[0]}
                    </div>
                    <div>
                      <div className="font-medium text-[#2C1810]">{item.name}</div>
                      <div className="text-xs text-[#9CA3AF]">{item.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 页脚 - 黑底通栏 */}
      <footer className="bg-[#1a1a1a] text-white py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-[#C84A2A] to-[#A63A1E] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg" style={{ fontFamily: "'Noto Serif SC', serif" }}>名</span>
                </div>
                <div>
                  <div className="font-bold text-lg" style={{ fontFamily: "'Noto Serif SC', serif" }}>寻名网</div>
                  <div className="text-xs text-gray-400">www.seekname.cn</div>
                </div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                传承千年起名智慧，融合现代AI技术，为每一个新生命赋予最美好的名字。
              </p>
            </div>
            
            <div>
              <h4 className="font-bold mb-4 text-[#C9A84C]">服务项目</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/personal" className="hover:text-white transition-colors">个人起名</Link></li>
                <li><Link href="/company" className="hover:text-white transition-colors">公司起名</Link></li>
                <li><Link href="/pet" className="hover:text-white transition-colors">宠物起名</Link></li>
                <li><Link href="/evaluate" className="hover:text-white transition-colors">名字测评</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-4 text-[#C9A84C]">关于我们</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/about" className="hover:text-white transition-colors">平台介绍</Link></li>
                <li><Link href="/team" className="hover:text-white transition-colors">专家团队</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">联系我们</Link></li>
                <li><Link href="/join" className="hover:text-white transition-colors">加入我们</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold mb-4 text-[#C9A84C]">帮助支持</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/help" className="hover:text-white transition-colors">使用帮助</Link></li>
                <li><Link href="/faq" className="hover:text-white transition-colors">常见问题</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">隐私政策</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">服务条款</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              © 2026 寻名网 seekname.cn 版权所有
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>ICP备案号：京ICP备XXXXXXXX号</span>
              <span>|</span>
              <span>京公网安备 XXXXXXXXXXXX号</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
