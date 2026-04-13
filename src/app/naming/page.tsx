"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Sparkles, ArrowLeft, Lock, Unlock, Crown, BookOpen, 
  Flame, Droplets, Mountain, Wind, Loader2, RefreshCw
} from "lucide-react";
import Link from "next/link";

// 五行图标映射
const wuxingIcons: Record<string, React.ReactNode> = {
  "金": <Mountain className="w-4 h-4" />,
  "木": <Wind className="w-4 h-4" />,
  "水": <Droplets className="w-4 h-4" />,
  "火": <Flame className="w-4 h-4" />,
  "土": <Mountain className="w-4 h-4" />,
};

// 五行颜色
const wuxingColors: Record<string, string> = {
  "金": "#C9A84C",
  "木": "#2C5F4A", 
  "水": "#3B82F6",
  "火": "#C84A2A",
  "土": "#8B4513",
};

// 模拟起名结果
const mockNames = [
  { 
    rank: 1, 
    name: "李沐宸", 
    pinyin: "mù chén",
    wuxing: ["水", "土"],
    score: 98,
    meaning: "沐：润泽、洗涤，寓意心灵纯净；宸：帝王居所，象征尊贵与气度",
    source: "《诗经·小雅》'既见君子，我心则沐'",
    isPremium: true,
  },
  { 
    rank: 2, 
    name: "李思远", 
    pinyin: "sī yuǎn",
    wuxing: ["金", "土"],
    score: 96,
    meaning: "思：思考、智慧，寓意思维敏捷；远：远大、深远，象征志向高远",
    source: "《论语》'士不可以不弘毅，任重而道远'",
    isPremium: true,
  },
  { 
    rank: 3, 
    name: "李若溪", 
    pinyin: "ruò xī",
    wuxing: ["木", "水"],
    score: 94,
    meaning: "若：如、像，寓意温婉柔美；溪：小溪，象征清澈灵动",
    source: "《庄子》'相濡以沫，不如相忘于江湖'",
    isPremium: true,
  },
  { 
    rank: 4, 
    name: "李浩然", 
    pinyin: "hào rán",
    wuxing: ["水", "金"],
    score: 92,
    meaning: "浩：浩大、广阔，寓意胸怀宽广；然：自然、如此，象征坦荡正直",
    source: "《孟子》'吾善养吾浩然之气'",
    isPremium: false,
  },
  { 
    rank: 5, 
    name: "李瑾瑜", 
    pinyin: "jǐn yú",
    wuxing: ["火", "金"],
    score: 90,
    meaning: "瑾：美玉，寓意品德高尚；瑜：美玉的光彩，象征才华出众",
    source: "《楚辞》'怀瑾握瑜兮，穷不知所示'",
    isPremium: false,
  },
  { 
    rank: 6, 
    name: "李景行", 
    pinyin: "jǐng xíng",
    wuxing: ["木", "水"],
    score: 88,
    meaning: "景：日光、景致，寓意前程光明；行：行走、品行，象征德行高尚",
    source: "《诗经·小雅》'高山仰止，景行行止'",
    isPremium: false,
  },
];

import { SITE_CONFIG, isPremiumRank } from "@/lib/config";

// 根据配置更新名字的付费状态
const mockNames = [
  { 
    rank: 1, 
    name: "李沐宸", 
    pinyin: "mù chén",
    wuxing: ["水", "土"],
    score: 98,
    meaning: "沐：润泽、洗涤，寓意心灵纯净；宸：帝王居所，象征尊贵与气度",
    source: "《诗经·小雅》'既见君子，我心则沐'",
  },
  { 
    rank: 2, 
    name: "李思远", 
    pinyin: "sī yuǎn",
    wuxing: ["金", "土"],
    score: 96,
    meaning: "思：思考、智慧，寓意思维敏捷；远：远大、深远，象征志向高远",
    source: "《论语》'士不可以不弘毅，任重而道远'",
  },
  { 
    rank: 3, 
    name: "李若溪", 
    pinyin: "ruò xī",
    wuxing: ["木", "水"],
    score: 94,
    meaning: "若：如、像，寓意温婉柔美；溪：小溪，象征清澈灵动",
    source: "《庄子》'相濡以沫，不如相忘于江湖'",
  },
  { 
    rank: 4, 
    name: "李浩然", 
    pinyin: "hào rán",
    wuxing: ["水", "金"],
    score: 92,
    meaning: "浩：浩大、广阔，寓意胸怀宽广；然：自然、如此，象征坦荡正直",
    source: "《孟子》'吾善养吾浩然之气'",
  },
  { 
    rank: 5, 
    name: "李瑾瑜", 
    pinyin: "jǐn yú",
    wuxing: ["火", "金"],
    score: 90,
    meaning: "瑾：美玉，寓意品德高尚；瑜：美玉的光彩，象征才华出众",
    source: "《楚辞》'怀瑾握瑜兮，穷不知所示'",
  },
  { 
    rank: 6, 
    name: "李景行", 
    pinyin: "jǐng xíng",
    wuxing: ["木", "水"],
    score: 88,
    meaning: "景：日光、景致，寓意前程光明；行：行走、品行，象征德行高尚",
    source: "《诗经·小雅》'高山仰止，景行行止'",
  },
].map(name => ({
  ...name,
  isPremium: isPremiumRank(name.rank),
}));

function NamingResultContent() {
  const searchParams = useSearchParams();
  const surname = searchParams.get("surname") || "";
  
  const [loading, setLoading] = useState(true);
  const [names, setNames] = useState<typeof mockNames>([]);
  const [showPaywall, setShowPaywall] = useState(SITE_CONFIG.paywall.enabled);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    // 模拟API调用
    const timer = setTimeout(() => {
      setNames(mockNames);
      setLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [surname]);

  const handleUnlock = () => {
    // 实际应调用支付接口
    setUnlocked(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFAF4] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-[#E5DDD3] rounded-full" />
            <div className="absolute inset-0 border-4 border-[#C84A2A] rounded-full border-t-transparent animate-spin" />
            <Loader2 className="absolute inset-0 m-auto w-10 h-10 text-[#C84A2A] animate-spin" />
          </div>
          <h2 
            className="text-2xl font-bold text-[#2C1810] mb-2"
            style={{ fontFamily: "'Noto Serif SC', serif" }}
          >
            AI正在分析...
          </h2>
          <p className="text-[#5C4A42]">
            正在研读12万部典籍，匹配{surname}姓最佳用字
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFAF4]">
      {/* 头部 */}
      <header className="sticky top-0 z-50 bg-[#FDFAF4]/95 backdrop-blur border-b border-[#E5DDD3]">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-[#5C4A42] hover:text-[#C84A2A] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>返回首页</span>
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#C9A84C]" />
            <span 
              className="font-bold text-[#2C1810]"
              style={{ fontFamily: "'Noto Serif SC', serif" }}
            >
              {surname}姓起名结果
            </span>
          </div>
          <div className="w-20" /> {/* 占位平衡 */}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 八字分析摘要 */}
        <div className="ancient-card p-6 mb-8 bg-gradient-to-r from-[#F8F3EA] to-[#FDFAF4]">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-[#C9A84C]" />
            <span className="font-medium text-[#2C1810]">八字五行分析</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { label: "八字", value: "甲辰年 丙寅月" },
              { label: "五行", value: "木土 火木" },
              { label: "喜用神", value: "水、金" },
              { label: "用字建议", value: "补水补金" },
            ].map((item, i) => (
              <div key={i} className="p-3 bg-white rounded-lg">
                <div className="text-xs text-[#5C4A42] mb-1">{item.label}</div>
                <div className="font-medium text-[#2C1810]">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 名字列表 */}
        <div className="space-y-4">
          {names.map((nameItem) => {
            const isLocked = showPaywall && nameItem.isPremium && !unlocked;
            
            return (
              <div
                key={nameItem.rank}
                className={`ancient-card p-6 transition-all duration-300 ${
                  isLocked ? "opacity-75" : ""
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* 排名 */}
                  <div 
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0 ${
                      nameItem.rank <= 3 
                        ? "bg-gradient-to-br from-[#C9A84C] to-[#A68A3C] text-white" 
                        : "bg-[#E5DDD3] text-[#5C4A42]"
                    }`}
                    style={{ fontFamily: "'Noto Serif SC', serif" }}
                  >
                    {nameItem.rank}
                  </div>
                  
                  {/* 名字内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      {isLocked ? (
                        <>
                          <span className="text-2xl font-bold text-[#9CA3AF] blur-sm">
                            {surname}■■
                          </span>
                          <Lock className="w-5 h-5 text-[#C9A84C]" />
                        </>
                      ) : (
                        <>
                          <span 
                            className="text-2xl font-bold text-[#2C1810]"
                            style={{ fontFamily: "'Noto Serif SC', serif" }}
                          >
                            {nameItem.name}
                          </span>
                          <span className="text-sm text-[#5C4A42]">
                            {nameItem.pinyin}
                          </span>
                        </>
                      )}
                      
                      {/* 五行标签 */}
                      {!isLocked && nameItem.wuxing.map((wx, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                          style={{ 
                            background: `${wuxingColors[wx]}20`,
                            color: wuxingColors[wx]
                          }}
                        >
                          {wuxingIcons[wx]}
                          {wx}
                        </span>
                      ))}
                      
                      {/* 分数 */}
                      {!isLocked && (
                        <span 
                          className="ml-auto text-xl font-bold text-[#C84A2A]"
                          style={{ fontFamily: "'Noto Serif SC', serif" }}
                        >
                          {nameItem.score}分
                        </span>
                      )}
                    </div>
                    
                    {isLocked ? (
                      <div className="text-[#9CA3AF] text-sm">
                        解锁查看完整名字、五行分析及典籍出处
                      </div>
                    ) : (
                      <>
                        <p className="text-[#5C4A42] text-sm mb-2 leading-relaxed">
                          {nameItem.meaning}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-[#C9A84C]">
                          <BookOpen className="w-3 h-3" />
                          <span>出处：{nameItem.source}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 付费解锁区域 */}
        {showPaywall && !unlocked && (
          <div className="mt-8 ancient-card p-8 text-center bg-gradient-to-br from-[#F8F3EA] to-[#FDFAF4] border-[#C9A84C]">
            <Crown className="w-12 h-12 text-[#C9A84C] mx-auto mb-4" />
            <h3 
              className="text-xl font-bold text-[#2C1810] mb-2"
              style={{ fontFamily: "'Noto Serif SC', serif" }}
            >
              解锁前3个精选好名
            </h3>
            <p className="text-[#5C4A42] mb-6">
              查看完整解析、五行匹配度、典籍出处及用字建议
            </p>
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#C84A2A]">¥{SITE_CONFIG.paywall.price}</div>
                <div className="text-xs text-[#9CA3AF] line-through">¥{SITE_CONFIG.paywall.originalPrice}</div>
              </div>
              <div className="w-px h-12 bg-[#E5DDD3]" />
              <div className="text-sm text-[#5C4A42]">
                <div>✓ 3个精品名字</div>
                <div>✓ 详细八字分析</div>
                <div>✓ 终身可用</div>
              </div>
            </div>
            <button 
              onClick={handleUnlock}
              className="btn-primary w-full sm:w-auto px-12"
            >
              <Unlock className="w-5 h-5 mr-2" />
              立即解锁
            </button>
          </div>
        )}

        {/* 重新起名 */}
        <div className="mt-8 text-center">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-[#5C4A42] hover:text-[#C84A2A] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>重新起名</span>
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function NamingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FDFAF4] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#C84A2A] animate-spin" />
      </div>
    }>
      <NamingResultContent />
    </Suspense>
  );
}
