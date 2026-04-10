import { Sparkles, Users, Building2, PawPrint, Star, ChevronRight, Award, BookOpen, Brain, Shield, Zap, Quote, Scroll, Mountain, Cloud, Leaf, Heart } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const services = [
    {
      icon: Users,
      title: "个人起名",
      subtitle: "宝宝·成人",
      description: "结合生辰八字、五行命理、文化典籍，为您量身定制吉祥好名",
      features: ["生辰八字分析", "五行补缺", "诗词典籍引用"],
      href: "/personal",
      ancientIcon: Scroll,
    },
    {
      icon: Building2,
      title: "公司起名",
      subtitle: "公司·品牌·项目",
      description: "基于行业特点、地域文化、品牌定位，打造易记易传播的企业名称",
      features: ["行业分析", "品牌定位", "商标查询"],
      href: "/company",
      ancientIcon: Mountain,
    },
    {
      icon: PawPrint,
      title: "宠物起名",
      subtitle: "趣味·个性",
      description: "根据宠物品种、性格特点、主人喜好，起个有趣又贴切的名字",
      features: ["品种特点", "性格分析", "趣味创意"],
      href: "/pet",
      ancientIcon: Leaf,
    },
    {
      icon: Star,
      title: "名字测评",
      subtitle: "专业·科学",
      description: "运用姓名学原理，对您现有的名字进行专业评分和分析",
      features: ["五格剖象", "八字匹配", "音形义分析"],
      href: "/evaluate",
      ancientIcon: Shield,
    },
  ];

  const features = [
    {
      title: "文化典籍数据库",
      description: "收录唐诗宋词、四书五经等百万级文化典籍，智能提取优美词汇",
      stat: "100万+",
      icon: BookOpen,
    },
    {
      title: "AI智能分析",
      description: "基于大语言模型，结合传统文化与现代算法，科学起名",
      stat: "AI驱动",
      icon: Brain,
    },
    {
      title: "命理分析系统",
      description: "结合易经五行、生辰八字，科学分析名字的吉凶寓意",
      stat: "专业",
      icon: Shield,
    },
    {
      title: "快速生成",
      description: "AI智能算法，30秒内生成多个优质名字方案",
      stat: "30秒",
      icon: Zap,
    },
  ];

  const testimonials = [
    {
      name: "张先生",
      role: "科技公司创始人",
      content: "寻名网为我们公司起的名字既符合行业特点，又容易记忆，商标注册一次通过！",
      rating: 5,
      icon: Quote,
    },
    {
      name: "李女士",
      role: "新生儿妈妈",
      content: "根据宝宝的生辰八字起的名字，既有文化底蕴，又寓意美好，全家人都很喜欢。",
      rating: 5,
      icon: Heart,
    },
    {
      name: "王先生",
      role: "宠物店老板",
      content: "为客户的宠物起的名字既有趣又有特色，现在很多客户都专门来找我们起名。",
      rating: 5,
      icon: Cloud,
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section - 第一屏 */}
      <section className="fullscreen-section ancient-pattern-bg relative overflow-hidden">
        {/* 古风装饰元素 */}
        <div className="absolute top-10 left-10 w-24 h-24 opacity-10">
          <Scroll className="w-full h-full text-primary-600" />
        </div>
        <div className="absolute bottom-10 right-10 w-32 h-32 opacity-10">
          <Mountain className="w-full h-full text-primary-600" />
        </div>
        <div className="absolute top-1/4 right-20 w-16 h-16 opacity-5">
          <Leaf className="w-full h-full text-primary-600" />
        </div>
        
        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-center">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center w-full" style={{ minHeight: 'calc(100dvh - 4rem)' }}>
            <div className="py-8">
              {/* 金色装饰线 + 标签 */}
              <div className="flex items-center gap-4 mb-8 animate-ink-spread">
                <div className="w-12 h-[2px] bg-gradient-to-r from-transparent to-[#C9A84C]"></div>
                <div className="ancient-badge">
                  <Sparkles className="w-5 h-5 text-[#C9A84C] mr-2" />
                  <span className="text-base font-medium text-[#2C1810]">AI智能起名</span>
                </div>
                <div className="w-12 h-[2px] bg-gradient-to-l from-transparent to-[#C9A84C]"></div>
              </div>
              
              {/* 主标题 - 使用宋体，逐字浮现 */}
              <h1 
                className="text-5xl md:text-6xl xl:text-7xl font-bold text-[#2C1810] mb-8 leading-[1.3] tracking-wide animate-char-reveal"
                style={{ fontFamily: "'Noto Serif SC', serif" }}
              >
                <span className="block">寻一个好名</span>
                <span className="block text-[#C84A2A] mt-2 animate-char-reveal delay-200" style={{ fontFamily: "'Noto Serif SC', serif" }}>许一个未来</span>
              </h1>
              
              <p 
                className="text-xl xl:text-2xl text-[#5C4A42] mb-12 max-w-2xl leading-relaxed animate-fade-in-up delay-400"
                style={{ fontFamily: "'Noto Serif SC', serif" }}
              >
                融合<span className="text-[#C84A2A] font-semibold">易经五行</span>、<span className="text-[#C84A2A] font-semibold">生辰八字</span>、
                <span className="text-[#C84A2A] font-semibold">文化典籍</span>与现代AI技术，为您提供最专业的命名解决方案。
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 animate-fade-in-up delay-600">
                <Link
                  href="/personal"
                  className="btn-primary"
                >
                  <Sparkles className="w-6 h-6 mr-3" />
                  免费起名体验
                  <ChevronRight className="ml-2 w-6 h-6" />
                </Link>
                <Link
                  href="/about"
                  className="btn-secondary"
                >
                  <Scroll className="w-6 h-6 mr-3 text-[#C9A84C]" />
                  了解更多
                </Link>
              </div>
              
              {/* 数据统计 - 金色印章风格 */}
              <div className="mt-14 flex items-center gap-8 animate-fade-in-up delay-700">
                {[
                  { num: '10万+', label: '用户选择' },
                  { num: '99%', label: '满意率' },
                  { num: '30秒', label: '快速生成' },
                ].map((stat, i) => (
                  <div key={i} className="flex items-center gap-8">
                    <div className="text-center">
                      <div 
                        className="text-3xl font-bold text-[#C84A2A]"
                        style={{ fontFamily: "'Noto Serif SC', serif" }}
                      >
                        {stat.num}
                      </div>
                      <div className="text-sm text-[#5C4A42] mt-1">{stat.label}</div>
                    </div>
                    {i < 2 && <div className="w-[1px] h-10 bg-[#C9A84C]/30"></div>}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative animate-ink-spread delay-300">
              <div 
                className="ancient-card p-8 xl:p-10"
                style={{ background: '#F8F3EA' }}
              >
                <div 
                  className="absolute -top-3 -right-3 w-14 h-14 flex items-center justify-center"
                  style={{ 
                    background: '#C9A84C',
                    border: '1px solid #A68A3C'
                  }}
                >
                  <Award className="w-7 h-7 text-white" />
                </div>
                <div className="grid grid-cols-2 gap-8 xl:gap-10">
                  {services.slice(0, 4).map((service, index) => (
                    <div
                      key={index}
                      className="ancient-card hover:scale-105 transition-transform duration-300"
                    >
                      <div className="ancient-icon-container mb-6">
                        <service.ancientIcon className="w-10 h-10 text-primary-600" />
                      </div>
                      <h3 className="font-bold text-black mb-2 text-xl">{service.title}</h3>
                      <p className="text-sm text-black/60">{service.subtitle}</p>
                      <div className="mt-4 pt-3 border-t border-primary-100">
                        <div className="text-xs text-primary-500 font-medium">点击了解更多</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 pt-6 border-t border-primary-200 text-center">
                  <p className="text-sm text-black/70">四大核心服务，满足您的所有起名需求</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section - 第二屏 */}
      <section className="fullscreen-section ancient-pattern-bg" style={{ backgroundColor: '#F8F3EA' }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-center">
          <div className="w-full flex flex-col justify-center" style={{ minHeight: 'calc(100dvh - 4rem)' }}>
            <div className="text-center mb-12 md:mb-16">
              <h2 className="section-title">
                专业起名服务
              </h2>
              <p className="section-subtitle">
                我们提供全方位的命名解决方案，满足不同场景的起名需求
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {services.map((service, index) => (
                <Link
                  key={index}
                  href={service.href}
                  className="group ancient-card hover:border-gold transition-all duration-300"
                >
                  <div className="flex items-start mb-6">
                    <div className="ancient-icon-container mr-4 group-hover:scale-110 transition-transform duration-300">
                      <service.ancientIcon className="w-8 h-8 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-black mb-1">{service.title}</h3>
                      <p className="text-sm text-primary-600 font-medium">{service.subtitle}</p>
                    </div>
                  </div>
                  <p className="text-black/70 text-sm mb-4">{service.description}</p>
                  <ul className="space-y-2">
                    {service.features.map((feature, idx) => (
                      <li key={idx} className="text-sm text-black/60 flex items-center">
                        <span className="w-2 h-2 rounded-full bg-primary-400 mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 pt-4 border-t border-primary-100 flex items-center text-primary-600 font-medium">
                    <span>了解更多</span>
                    <ChevronRight className="ml-2 w-4 h-4" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - 第三屏 */}
      <section className="fullscreen-section ancient-pattern-bg" style={{ backgroundColor: '#F0EBE3' }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-center">
          <div className="w-full flex flex-col justify-center" style={{ minHeight: 'calc(100dvh - 4rem)' }}>
            <div className="text-center mb-12 md:mb-16">
              <div className="ancient-badge mb-6">
                <Sparkles className="w-5 h-5 text-[#C9A84C] mr-2" />
                <span className="text-sm font-medium text-[#2C1810]">AI驱动</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-[#2C1810]" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                为什么选择寻名网
              </h2>
              <p className="text-xl text-[#5C4A42] max-w-3xl mx-auto">
                融合传统文化智慧与现代AI技术，为您提供科学的命名方案
              </p>
            </div>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="ancient-card bg-[#FDFAF4] p-8 text-center"
                >
                  <div className="w-16 h-16 flex items-center justify-center mx-auto mb-6" style={{ background: '#C9A84C', border: '1px solid #A68A3C' }}>
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-3xl md:text-4xl font-bold mb-3 text-[#C84A2A]">{feature.stat}</div>
                  <h3 className="text-lg font-semibold mb-3 text-[#2C1810]">{feature.title}</h3>
                  <p className="text-sm text-[#5C4A42]">{feature.description}</p>
                </div>
              ))}
            </div>
            
            <div className="text-center mt-12">
              <Link
                href="/personal"
                className="btn-primary px-10 py-5"
              >
                <Sparkles className="w-6 h-6 mr-3" />
                立即体验AI起名
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Combined Testimonials & Footer Section - 第四屏 */}
      <section className="fullscreen-section ancient-pattern-bg relative" style={{ backgroundColor: '#FDFAF4' }}>
        {/* 客户评价部分 - 占据前2/3高度，添加顶部留白 */}
        <div className="h-2/3 flex flex-col">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center pt-12">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 mx-auto mb-4" style={{ background: '#C9A84C', border: '1px solid #A68A3C' }}>
                <Award className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-3 text-[#2C1810]" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                用户信赖，专业之选
              </h2>
              <p className="text-base text-[#5C4A42] max-w-2xl mx-auto">
                数千用户的选择与信任，见证我们的专业与品质
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 md:gap-8">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="ancient-card bg-[#F8F3EA] p-6 flex flex-col"
                >
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 flex items-center justify-center mr-4" style={{ background: '#F8F3EA', border: '1px solid #C9A84C' }}>
                      <testimonial.icon className="w-6 h-6 text-[#C9A84C]" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#2C1810] text-lg">{testimonial.name}</p>
                      <p className="text-base text-[#5C4A42]">{testimonial.role}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <span key={i} className="w-5 h-5 flex items-center justify-center mr-1" style={{ color: '#C9A84C', fontFamily: "'Noto Serif SC', serif" }}>★</span>
                    ))}
                  </div>
                  
                  <p className="text-[#5C4A42] text-lg mb-4 italic leading-relaxed flex-1" style={{ fontFamily: "'Noto Serif SC', serif" }}>"{testimonial.content}"</p>
                  
                  <div className="pt-4 border-t border-[#C9A84C]/20 mt-auto">
                    <div className="text-base text-[#C9A84C]">已验证用户评价</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* 通栏黑底白字页脚 - 占据后1/3高度，在页面最底部 */}
        <div className="h-1/3 absolute bottom-0 left-0 right-0" style={{ backgroundColor: '#2C1810' }}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {/* 品牌信息 */}
              <div className="md:col-span-2">
                <div className="flex items-center space-x-4 mb-3">
                  <div className="w-12 h-12 flex items-center justify-center" style={{ background: '#C84A2A', border: '1px solid #A63A1E' }}>
                    <span className="text-white text-xl font-bold">名</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">寻名网</h3>
                    <p className="text-sm text-gray-300">www.seekname.cn</p>
                  </div>
                </div>
                <p className="text-gray-300 text-sm mb-3">
                  寻一个好名，许一个未来。专业起名服务平台，融合传统文化与现代科技。
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/personal"
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white transition-all duration-200"
                    style={{ background: '#C84A2A', border: '1px solid #A63A1E', fontFamily: "'Noto Serif SC', serif" }}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    免费起名体验
                  </Link>
                </div>
              </div>
              
              {/* 快速链接 */}
              <div>
                <h4 className="text-sm font-semibold text-white mb-3">快速链接</h4>
                <ul className="space-y-2">
                  {['首页', '个人起名', '公司起名', '宠物起名', '名字测评'].map((item) => (
                    <li key={item}>
                      <Link
                        href={`/${item === '首页' ? '' : item}`}
                        className="text-gray-300 hover:text-white text-sm transition-colors duration-200"
                      >
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* 服务指南 */}
              <div>
                <h4 className="text-sm font-semibold text-white mb-3">服务指南</h4>
                <ul className="space-y-2">
                  {['用户协议', '隐私政策', '常见问题', '客服中心'].map((item) => (
                    <li key={item}>
                      <Link
                        href={`/${item}`}
                        className="text-gray-300 hover:text-white text-sm transition-colors duration-200"
                      >
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* 版权信息 - 三段文字分别居左、居中、居右 */}
            <div className="pt-3 border-t border-gray-700">
              <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
                <p className="text-gray-400 text-xs md:text-left">
                  © 2026 寻名网 SeekName 保留所有权利
                </p>
                <p className="text-xs text-gray-500 text-center">
                  寻一个好名，许一个未来 | 专业起名服务平台
                </p>
                <div className="flex items-center space-x-4">
                  <Link href="/privacy" className="text-gray-400 hover:text-white text-xs transition-colors duration-200">
                    隐私政策
                  </Link>
                  <Link href="/terms" className="text-gray-400 hover:text-white text-xs transition-colors duration-200">
                    用户协议
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}