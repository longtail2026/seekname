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
  { icon: Library, title: "12万部", subtitle: "典籍数据库", desc: "唐诗宋词、四书五经", color: "#E86A17" },
  { icon: Brain, title: "AI驱动", subtitle: "深度学习", desc: "大模型智能分析", color: "#FF8A33" },
  { icon: Compass, title: "八字五行", subtitle: "命理分析", desc: "传统智慧科学算法", color: "#D4941A" },
  { icon: Zap, title: "30秒", subtitle: "极速生成", desc: "6个精选好名", color: "#C8540A" },
];

// ─── 第2屏：能力展示数据 ───
const capabilities = [
  {
    icon: BookOpen,
    number: "124,120",
    unit: "条",
    label: "典籍名句",
    detail: "覆盖诗经、楚辞、论语等经典著作",
    color: "#E86A17",
  },
  {
    icon: Shield,
    number: "24,097",
    unit: "字",
    label: "康熙字典",
    detail: "含笔画、拼音、五行属性完整收录",
    color: "#FF8A33",
  },
  {
    icon: Microscope,
    number: "88,431",
    unit: "例",
    label: "人名样本",
    detail: "按姓氏分布的真实姓名大数据",
    color: "#D4941A",
  },
  {
    icon: Clock,
    number: "<30s",
    unit: "",
    label: "响应速度",
    detail: "从输入到出结果，极速体验",
    color: "#C8540A",
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
    gradient: "linear-gradient(135deg, #E86A17 0%, #FF8A33 100%)",
    tag: "热门",
  },
  {
    icon: Building2,
    title: "公司起名",
    desc: "结合行业属性与易经数理，为企业打造大气易记、寓意深远的品牌名称",
    features: ["行业适配", "数理吉凶", "商标查询"],
    href: "/company/form",
    gradient: "linear-gradient(135deg, #D4941A 0%, #E8B02E 100%)",
    tag: null,
  },
  {
    icon: PawPrint,
    title: "宠物起名",
    desc: "根据宠物品种、性格特征和主人喜好，为毛孩子起个可爱又有寓意的名字",
    features: ["品种识别", "性格匹配", "趣味创意"],
    href: "/pet/form",
    gradient: "linear-gradient(135deg, #F09A3A 0%, #F0B860 100%)",
    tag: null,
  },
  {
    icon: BarChart3,
    title: "名字测评",
    desc: "已有名字想了解其内涵？深度解析名字的音律、字形、五行、典故等多维信息",
    features: ["音律评分", "五行分析", "典故溯源"],
    href: "/evaluate/form",
    gradient: "linear-gradient(135deg, #C8540A 0%, #E86A17 100%)",
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
  const [gender, setGender] = useState<"男"|"女">("男");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // 标记是否正在使用 IME 输入法（如拼音）
  const [isComposing, setIsComposing] = useState(false);
  
  // 新增状态：多选项
  const [selectedExpectations, setSelectedExpectations] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [additionalNotes, setAdditionalNotes] = useState("");
  
  // 定义相反的词语对
  const oppositeExpectationPairs = [
    // 暂时没有定义相反的寓意词语
  ];
  
  const oppositeStylePairs = [
    ["古风典雅", "洋气国际"],
    ["古风典雅", "现代简约"],
    ["现代简约", "洋气国际"],
    ["大气豪迈", "温柔婉约"],
    ["稳重成熟", "可爱灵动"],
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surname.trim()) return;
    if (!birthDate) return;
    setIsLoading(true);
    // 携带完整参数跳转到起名页面（性别转 M/F，补充 category=personal）
    const genderCode = gender === "男" ? "M" : "F";
    const params = new URLSearchParams({
      surname,
      gender: genderCode,
      category: "personal",
      birthDate,
    });
    if (birthTime) params.set("birthTime", birthTime);
    // 将多选数组转换为逗号分隔的字符串
    if (selectedExpectations.length > 0) {
      params.set("expectations", selectedExpectations.join(","));
    }
    if (selectedStyles.length > 0) {
      params.set("style", selectedStyles.join(","));
    }
    if (additionalNotes.trim()) params.set("additionalNotes", additionalNotes.trim());
    window.location.href = `/naming?${params.toString()}`;
  };

  // 统一的输入处理函数：提取中文部分（允许拼音输入法中途状态）
  const handleInput = (rawValue: string) => {
    // 如果包含中文，只保留中文（最多2个汉字）
    const chineseOnly = rawValue.replace(/[^\u4e00-\u9fa5]/g, '');
    if (chineseOnly.length > 0) {
      return chineseOnly.slice(0, 2);
    }
    // 否则保留原始值（拼音字母状态，最多10个字符防止过长）
    return rawValue.slice(0, 10);
  };

  // 处理取名寓意多选切换
  const handleExpectationToggle = (option: string) => {
    if (selectedExpectations.includes(option)) {
      // 如果已经选中，取消选中
      setSelectedExpectations(selectedExpectations.filter(item => item !== option));
    } else {
      // 如果未选中，添加选中
      // 检查是否有相反的词语（目前没有定义相反的寓意词语对）
      setSelectedExpectations([...selectedExpectations, option]);
    }
  };

  // 处理风格偏好多选切换
  const handleStyleToggle = (option: string) => {
    if (selectedStyles.includes(option)) {
      // 如果已经选中，取消选中
      setSelectedStyles(selectedStyles.filter(item => item !== option));
    } else {
      // 如果未选中，添加选中
      // 检查是否有相反的词语
      let newStyles = [...selectedStyles];
      
      // 找出与新选项相反的词语
      const oppositePairs = oppositeStylePairs.filter(pair => 
        pair.includes(option)
      );
      
      // 移除所有相反的词语
      oppositePairs.forEach(pair => {
        const oppositeOption = pair[0] === option ? pair[1] : pair[0];
        newStyles = newStyles.filter(item => item !== oppositeOption);
      });
      
      // 添加新选项
      newStyles.push(option);
      setSelectedStyles(newStyles);
    }
  };

  return (
    <div className="relative" style={{ paddingTop: 60 }}>
      {/* ════════════ 第一屏：Hero 入口（垂直偏下布局） ════════════ */}
      <section id="screen-1" className="fullscreen-section relative" style={{ minHeight: 'calc(100dvh - 60px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: '60px' }}>
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

        {/* 居中主体内容 */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex items-center justify-center" style={{ paddingTop: 30 }}>
          <div className="max-w-5xl mx-auto w-full flex flex-col items-center justify-center z-10">
            {/* 标题（画轴上方） */}
            <div className="w-full mb-8 text-center" style={{ maxWidth: 800 }}>
              <div className="inline-flex items-center gap-3 mb-4 animate-ink-spread">
                <span className="w-12 h-[1px] bg-gradient-to-r from-transparent to-[#D4941A]" />
                <span className="text-[15px] tracking-[0.25em] text-[#D4941A] font-medium uppercase">千年智慧 · 一秒传承</span>
                <span className="w-12 h-[1px] bg-gradient-to-l from-transparent to-[#D4941A]" />
              </div>
              <h1
                className="text-[2.5rem] sm:text-[3rem] lg:text-[3.5rem] font-bold leading-[1.1] tracking-wide mb-3"
                style={{ fontFamily: "'Noto Serif SC', 'Songti SC', serif" }}
              >
                <span className="block text-[#2D1B0E] animate-char-reveal">AI读懂</span>
                <span className="block text-[#E86A17] animate-char-reveal delay-200">千年起名之道</span>
              </h1>
              <p className="text-[16px] lg:text-[18px] text-[#5A4334] leading-relaxed" style={{ fontFamily: "'Noto Sans SC', sans-serif" }}>
                12万部典籍 × 深度学习 × 八字五行 · <span className="text-[#E86A17] font-semibold">30秒生成6个吉祥好名</span>
              </p>
            </div>

            {/* 统计数据行 */}
            <div className="flex gap-8 mb-6">
              {[
                { n: "12万+", l: "典籍收录" },
                { n: "99.6%", l: "好评率" },
                { n: "<30s", l: "响应速度" },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <div className="text-[16px] font-bold text-[#E86A17]" style={{ fontFamily: "'Noto Serif SC', serif" }}>{s.n}</div>
                  <div className="text-[12px] text-[#A09080] tracking-wide">{s.l}</div>
                </div>
              ))}
            </div>

            {/* 画轴表单 - 放大尺寸 */}
            <form onSubmit={handleSubmit} className="w-full flex flex-col items-center">
              <div className="relative w-full" style={{ maxWidth: 900 }}>
                <img
                  src="/images/画轴.png"
                  alt="起名画轴"
                  className="w-full h-auto"
                  style={{ display: 'block', borderRadius: 4 }}
                  draggable={false}
                />
                <div className="absolute inset-0 flex flex-col justify-center" style={{ padding: '45px 60px' }}>
                  {/* 第一行：姓氏 + 性别 */}
                  <div className="flex gap-4 mb-2">
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
                      placeholder="请输入您的姓氏"
                      className="flex-1 min-w-0 px-4 py-2 text-[14px] rounded"
                      style={{ fontFamily: "'Noto Serif SC', serif", color: '#3D2B1F', background: 'rgba(255, 252, 245, 0.92)', border: '1px solid rgba(180,160,130,0.5)', outline: 'none' }}
                      autoComplete="off"
                    />
                    <div className="flex rounded overflow-hidden shrink-0" style={{ border: '1px solid rgba(180,160,130,0.5)' }}>
                      {(["男", "女"] as const).map((g) => (
                        <button key={g} type="button" onClick={() => setGender(g)}
                          className="px-6 py-2 text-[14px] font-medium transition-all duration-200"
                          style={{
                            background: gender === g ? (g === "男" ? "#4A90D9" : "#E870A0") : "rgba(255, 252, 245, 0.92)",
                            color: gender === g ? "#fff" : "#5A4334",
                            border: 'none', cursor: 'pointer', fontFamily: "'Noto Sans SC', sans-serif",
                          }}
                        >{g}</button>
                      ))}
                    </div>
                  </div>
                  
                  {/* 第二行：出生年月日 + 出生时间 */}
                  <div className="flex gap-4 mb-3">
                    <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
                      className="flex-1 min-w-0 px-4 py-2 text-[14px] rounded"
                      style={{ fontFamily: "'Noto Sans SC', sans-serif", color: '#2D1B0E', background: 'rgba(255, 252, 245, 0.92)', border: '1px solid rgba(180,160,130,0.5)', outline: 'none' }}
                    />
                    <input type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)}
                      className="flex-1 min-w-0 px-4 py-2 text-[14px] rounded"
                      style={{ fontFamily: "'Noto Sans SC', sans-serif", color: '#2D1B0E', background: 'rgba(255, 252, 245, 0.92)', border: '1px solid rgba(180,160,130,0.5)', outline: 'none' }}
                    />
                  </div>
                  
                  {/* 第三行：取名寓意（多选项） */}
                  <div className="mb-4">
                    <div className="text-[14px] font-medium text-[#5A4334] mb-2">取名寓意（可多选）</div>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        "平安健康", "聪明智慧", "事业有成", "富贵财富", "品德高尚",
                        "阳光开朗", "美丽俊俏", "勇敢坚强", "幸福美满", "才华艺术"
                      ].map((option) => (
                        <label key={option} className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedExpectations.includes(option)}
                            onChange={() => handleExpectationToggle(option)}
                            className="w-4 h-4"
                          />
                          <span className="text-[12px] text-[#5A4334]">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  {/* 第四行：风格偏好（多选项） */}
                  <div className="mb-4">
                    <div className="text-[14px] font-medium text-[#5A4334] mb-2">风格偏好（可多选）</div>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        "古风典雅", "现代简约", "清新自然", "大气豪迈", "温柔婉约",
                        "独特个性", "可爱灵动", "稳重成熟", "诗意浪漫", "洋气国际"
                      ].map((option) => (
                        <label key={option} className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedStyles.includes(option)}
                            onChange={() => handleStyleToggle(option)}
                            className="w-4 h-4"
                          />
                          <span className="text-[12px] text-[#5A4334]">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  {/* 第五行：补充说明 */}
                  <div className="mb-1">
                    <input
                      type="text"
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      placeholder="补充说明（可不填）"
                      className="w-full px-4 py-1 text-[14px] rounded"
                      style={{ fontFamily: "'Noto Sans SC', sans-serif", color: '#3D2B1F', background: 'rgba(255, 252, 245, 0.92)', border: '1px solid rgba(180,160,130,0.5)', outline: 'none' }}
                      autoComplete="off"
                    />
                  </div>
                  
                  {/* 立即起名按钮 */}
                  <button
                    type="submit"
                    disabled={!surname.trim() || !birthDate || isLoading}
                    className="w-full py-2 rounded text-[15px] font-medium text-white transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
                        分析中...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-1.5">
                        <Sparkles className="w-5 h-5" />
                        立即起名
                      </span>
                    )}
                  </button>
                </div>
              </div>
              {/* 已有用户数提示 */}
              <p className="text-sm text-[#B0AAA0] mt-4 text-center">
                已有 <span className="text-[#E86A17] font-semibold">{SITE_CONFIG.stats.totalUsers.toLocaleString()}</span> 位用户找到心仪好名
              </p>
            </form>
          </div>
        </div>
      </section>


      {/* ════════════ 第二屏：能力展示（Why Us） ════════════ */}
      <section id="screen-2" className="fullscreen-section relative overflow-hidden">
        {/* 背景 */}
        <div className="absolute inset-0 pointer-events-none">
          <svg className="absolute bottom-[-80px] left-[-100px] opacity-[0.03] rotate-12" width="350" height="350" viewBox="0 0 350 350">
            <rect x="25" y="25" width="300" height="300" rx="150" stroke="#D4941A" strokeWidth="0.5" fill="none"/>
            <rect x="55" y="55" width="240" height="240" rx="120" stroke="#D4941A" strokeWidth="0.5" fill="none"/>
          </svg>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="max-w-6xl mx-auto flex flex-col justify-center">
            {/* 标题 */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 mb-4">
                <Microscope className="w-5 h-5 text-[#D4941A]" />
                <span className="text-sm tracking-[0.2em] text-[#D4941A] uppercase font-medium">技术实力</span>
              </div>
              <h2
                className="text-[1.75rem] sm:text-2xl lg:text-3xl font-bold text-[#2D1B0E]"
                style={{ fontFamily: "'Noto Serif SC', serif" }}
              >
                不只是随机组合，每一个名字都有据可依
              </h2>
              <p className="mt-3 text-[#5A4334] max-w-2xl mx-auto text-sm lg:text-base">
                我们将传统起名智慧数字化，让千年文化在 AI 时代焕发新生
              </p>
            </div>

            {/* 能力卡片 */}
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
                    <span className="text-3xl lg:text-4xl font-bold" style={{ color: cap.color, fontFamily: "'Noto Serif SC', serif" }}>
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
                  <span className="text-sm text-[#2D1B0E]"><strong>免费查看</strong> 排名 4-6 名</span>
                </div>
                <div className="w-px h-6 bg-[#E8DDD0]" />
                <div className="flex items-center gap-2">
                  <LockIcon className="w-5 h-5 text-[#D4941A]" />
                  <span className="text-sm text-[#2D1B0E]"><strong>解锁精品</strong> 排名 1-3 名</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ════════════ 第三屏：服务矩阵（What We Offer） ════════════ */}
      <section id="screen-3" className="fullscreen-section relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="max-w-6xl mx-auto flex flex-col justify-center">
            {/* 标题 */}
            <div className="text-center mb-11">
              <div className="inline-flex items-center gap-2 mb-4">
                <Scroll className="w-5 h-5 text-[#D4941A]" />
                <span className="text-sm tracking-[0.2em] text-[#D4941A] uppercase font-medium">服务项目</span>
              </div>
              <h2
                className="text-[1.75rem] sm:text-2xl lg:text-3xl font-bold text-[#2D1B0E]"
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
                          className="text-xl font-bold text-[#2D1B0E] flex items-center gap-2"
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
                    <ChevronRight className="w-5 h-5 text-[#D4941A]/40 group-hover:text-[#D4941A] group-hover:translate-x-1 transition-all duration-300 shrink-0 mt-1" />
                  </div>

                  {/* 描述 */}
                  <p className="text-sm text-[#5A4334] leading-relaxed mb-5 pl-[4.5rem]">{svc.desc}</p>

                  {/* 特性标签 */}
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

            {/* 底部引导 */}
            <div className="mt-10 text-center">
              <p className="text-sm text-[#A09080]">点击任意服务卡片，即刻开始体验</p>
            </div>
          </div>
        </div>
      </section>


      {/* ════════════ 第四屏：信任背书 + 页脚 ════════════ */}
      <section id="screen-4" className="fullscreen-section relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="w-full max-w-6xl mx-auto flex-shrink">
            {/* 标题 */}
            <div className="text-center mb-8 lg:mb-10">
              <div className="inline-flex items-center gap-2 mb-4">
                <Quote className="w-5 h-5 text-[#D4941A]" />
                <span className="text-sm tracking-[0.2em] text-[#D4941A] uppercase font-medium">用户心声</span>
              </div>
              <h2
                className="text-[1.75rem] sm:text-2xl lg:text-[2.25rem] font-bold text-[#2D1B0E]"
                style={{ fontFamily: "'Noto Serif SC', serif" }}
              >
                听听他们怎么说
              </h2>
              <p className="mt-2 text-sm lg:text-base text-[#5A4334]">
                已服务超过 <span className="text-[#E86A17] font-bold">128,000+</span> 家庭
              </p>
            </div>

            {/* 评价卡片 - 居中，等宽三列 */}
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

            {/* 底部引导 */}
            <div className="mt-10 text-center">
              <p className="text-sm text-[#A09080]">感谢每一位用户的信任与支持</p>
            </div>
          </div>
        </div>

        {/* 页脚 - 黑底通栏，固定在第四屏底部 */}
        <footer className="py-5 bg-[#1a1a18] text-gray-300 w-full">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 mb-4 text-center md:text-left">
              <div className="md:text-center">
                <div className="flex items-center gap-2 mb-2 justify-center">
                  <img src="/images/48-48-ICO-1.png" alt="寻名网" className="w-7 h-7 rounded" />
                  <div>
                    <div className="font-bold text-white text-xs" style={{ fontFamily: "'Noto Serif SC', serif" }}>寻名网</div>
                    <div className="text-[9px] text-gray-500">www.seekname.cn</div>
                  </div>
                </div>
                <p className="text-gray-500 text-[11px] leading-relaxed hidden lg:block">
                  传承千年起名智慧，融合现代 AI 技术。
                </p>
              </div>

              <div className="text-center">
                <h4 className="font-bold mb-2 text-[#D4941A] text-[11px] tracking-wide">服务项目</h4>
                <ul className="space-y-1 text-[11px] text-gray-500">
                  {services.map((s, i) => (
                    <li key={i}><Link href={s.href} className="hover:text-white transition-colors duration-200">{s.title}</Link></li>
                  ))}
                </ul>
              </div>

              <div className="text-center">
                <h4 className="font-bold mb-2 text-[#D4941A] text-[11px] tracking-wide">关于我们</h4>
                <ul className="space-y-1 text-[11px] text-gray-500">
                  {['平台介绍', '专家团队', '联系我们', '加入我们'].map((item, i) => (
                    <li key={i}><Link href="#" className="hover:text-white transition-colors duration-200">{item}</Link></li>
                  ))}
                </ul>
              </div>

              <div className="text-center">
                <h4 className="font-bold mb-2 text-[#D4941A] text-[11px] tracking-wide">帮助支持</h4>
                <ul className="space-y-1 text-[11px] text-gray-500">
                  {['使用帮助', '常见问题', '隐私政策', '服务条款'].map((item, i) => (
                    <li key={i}><Link href="#" className="hover:text-white transition-colors duration-200">{item}</Link></li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="border-t border-gray-800 pt-3 flex flex-col md:flex-row justify-between items-center gap-2 text-[10px] text-gray-600">
              <span>&copy; 2026 寻名网 seekname.cn 版权所有</span>
              <span>ICP备案号：京ICP备XXXXXXXX号-1</span>
            </div>
          </div>
        </footer>
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
