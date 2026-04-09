import { Sparkles, Users, Building2, PawPrint, Star, ChevronRight, Award } from "lucide-react";
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
    },
    {
      icon: Building2,
      title: "公司起名",
      subtitle: "公司·品牌·项目",
      description: "基于行业特点、地域文化、品牌定位，打造易记易传播的企业名称",
      features: ["行业分析", "品牌定位", "商标查询"],
      href: "/company",
    },
    {
      icon: PawPrint,
      title: "宠物起名",
      subtitle: "趣味·个性",
      description: "根据宠物品种、性格特点、主人喜好，起个有趣又贴切的名字",
      features: ["品种特点", "性格分析", "趣味创意"],
      href: "/pet",
    },
    {
      icon: Star,
      title: "名字测评",
      subtitle: "专业·科学",
      description: "运用姓名学原理，对您现有的名字进行专业评分和分析",
      features: ["五格剖象", "八字匹配", "音形义分析"],
      href: "/evaluate",
    },
  ];

  const features = [
    {
      title: "文化典籍数据库",
      description: "收录唐诗宋词、四书五经等百万级文化典籍，智能提取优美词汇",
      stat: "100万+",
    },
    {
      title: "AI智能分析",
      description: "基于大语言模型，结合传统文化与现代算法，科学起名",
      stat: "AI驱动",
    },
    {
      title: "命理分析系统",
      description: "结合易经五行、生辰八字，科学分析名字的吉凶寓意",
      stat: "专业",
    },
    {
      title: "快速生成",
      description: "AI智能算法，30秒内生成多个优质名字方案",
      stat: "30秒",
    },
  ];

  const testimonials = [
    {
      name: "张先生",
      role: "科技公司创始人",
      content: "寻名网为我们公司起的名字既符合行业特点，又容易记忆，商标注册一次通过！",
      rating: 5,
    },
    {
      name: "李女士",
      role: "新生儿妈妈",
      content: "根据宝宝的生辰八字起的名字，既有文化底蕴，又寓意美好，全家人都很喜欢。",
      rating: 5,
    },
    {
      name: "王先生",
      role: "宠物店老板",
      content: "为客户的宠物起的名字既有趣又有特色，现在很多客户都专门来找我们起名。",
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f26522' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
        
        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center min-h-[calc(100vh-64px)] py-8">
            <div className="animate-fadeIn py-4">
              <div className="inline-flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-5 py-2.5 rounded-full mb-8 border border-orange-100">
                <Sparkles className="w-5 h-5 text-orange-500" />
                <span className="text-base font-medium text-gray-700">AI智能起名平台</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl xl:text-6xl font-bold text-gray-900 mb-8 leading-tight">
                寻一个好名
                <span className="block gradient-text">许一个未来</span>
              </h1>
              
              <p className="text-lg xl:text-xl text-gray-600 mb-12 max-w-2xl leading-relaxed">
                结合中国传统文化与现代命名艺术，为个人、企业、宠物提供专业、文化、吉祥的命名服务。
                融合易经五行、姓名磁场学、历史文化典籍的智慧，打造独一无二的好名字。
              </p>
              
              <div className="flex flex-col sm:flex-row gap-5">
                <Link
                  href="/personal"
                  className="btn-primary text-lg px-8 py-4"
                >
                  免费起名体验
                  <ChevronRight className="ml-2 w-5 h-5" />
                </Link>
                <Link
                  href="/about"
                  className="btn-secondary text-lg px-8 py-4"
                >
                  了解更多
                </Link>
              </div>
            </div>
            
            <div className="relative hidden lg:block">
              <div className="relative bg-gradient-to-br from-orange-100 to-amber-100 rounded-3xl p-5 xl:p-6 shadow-2xl">
                <div className="grid grid-cols-2 gap-5 xl:gap-6">
                  {services.slice(0, 4).map((service, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-2xl p-5 xl:p-6 shadow-lg transform hover:-translate-y-1 transition-transform duration-300"
                    >
                      <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-full gradient-brand flex items-center justify-center mb-3">
                        <service.icon className="w-6 h-6 xl:w-7 xl:h-7 text-white" />
                      </div>
                      <h3 className="font-bold text-gray-900 mb-1 text-base">{service.title}</h3>
                      <p className="text-sm text-gray-500">{service.subtitle}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 md:py-20 bg-gradient-to-b from-orange-50/50 to-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              专业起名服务
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
              我们提供全方位的命名解决方案，满足不同场景的起名需求
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {services.map((service, index) => (
              <Link
                key={index}
                href={service.href}
                className="group block bg-orange-500 rounded-2xl p-6 md:p-8 border border-orange-400 shadow-sm hover:shadow-xl hover:border-orange-300 hover:bg-orange-400 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <service.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{service.title}</h3>
                <p className="text-sm text-orange-100 mb-3">{service.subtitle}</p>
                <p className="text-orange-50 text-sm mb-4">{service.description}</p>
                <ul className="space-y-1">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="text-sm text-orange-100 flex items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/60 mr-2" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-20 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-16">
            <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-medium">AI驱动</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              为什么选择寻名网
            </h2>
            <p className="text-lg md:text-xl text-orange-100 max-w-3xl mx-auto">
              融合传统文化智慧与现代AI技术，为您提供科学的命名方案
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 md:p-8 text-center hover:bg-white/20 transition-colors duration-300"
              >
                <div className="text-3xl md:text-4xl font-bold mb-2">{feature.stat}</div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-orange-100">{feature.description}</p>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Link
              href="/personal"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-orange-600 bg-white rounded-xl hover:bg-orange-50 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              立即体验AI起名
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 md:py-20 bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              用户评价
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
              数千用户的选择与信任
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-lg transition-shadow duration-300"
              >
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6">{testimonial.content}</p>
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full gradient-brand flex items-center justify-center text-white font-bold">
                    {testimonial.name[0]}
                  </div>
                  <div className="ml-3">
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20 bg-gray-900 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Award className="w-16 h-16 mx-auto mb-6 text-orange-400" />
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            立即开始您的起名之旅
          </h2>
          <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            无论您需要个人名字、公司名称还是宠物昵称，我们都能为您提供专业的命名方案
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-gray-900 bg-white rounded-xl hover:bg-gray-100 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              免费注册体验
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white border-2 border-white rounded-xl hover:bg-white/10 transition-all duration-300"
            >
              咨询客服
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
