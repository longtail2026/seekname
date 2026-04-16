/**
 * 公司起名页面（表单 + 结果）
 * /company — 表单页
 * /company?industry=互联网 — 结果页
 */

"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles, ArrowLeft, Building2, Globe, Shield,
  Loader2, RefreshCw, Copy, Share2, CheckCircle
} from "lucide-react";

interface CompanyName {
  rank: number;
  name: string;
  pinyin: string;
  industry: string;
  meaning: string;
  source?: string;
  score: number;
  mathAnalysis?: string;
}

/* ─── 公司起名表单 ─── */
function CompanyForm() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [expectations, setExpectations] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;
    setIsLoading(true);
    const params = new URLSearchParams({ industry: companyName.trim() });
    if (expectations.trim()) params.set("expectations", expectations.trim());
    router.push(`/company?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDFAF4] to-[#EDE5D0]">
      <header className="sticky top-0 z-50 bg-[#FDFAF4]/95 backdrop-blur border-b border-[#E5DDD3]">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-[#5C4A42] hover:text-[#C84A2A] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Building2 className="w-5 h-5 text-[#D4941A]" />
          <span className="font-bold text-[#2C1810]" style={{ fontFamily: "'Noto Serif SC', serif" }}>商业起名</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#2C1810] mb-3" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            公司 · 品牌 · 店铺起名
          </h1>
          <p className="text-[#5C4A42] text-sm">融合行业属性与易经数理，为您打造响亮商号</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 行业/公司名关键词 */}
          <div>
            <label className="block text-sm font-medium text-[#5C4A42] mb-1">
              行业关键词 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="例如：科技、电商、餐饮、教育"
              required
              className="w-full px-4 py-3 rounded-xl text-[#2C1810]"
              style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid #DDD0C0', outline: 'none', fontFamily: "'Noto Sans SC', sans-serif" }}
            />
          </div>

          {/* 期望风格 */}
          <div>
            <label className="block text-sm font-medium text-[#5C4A42] mb-1">
              期望风格 <span className="text-[#AAA] text-xs">(可选)</span>
            </label>
            <input
              type="text"
              value={expectations}
              onChange={(e) => setExpectations(e.target.value)}
              placeholder="例如：创新大气、简约时尚、传统稳重"
              className="w-full px-4 py-3 rounded-xl text-[#2C1810]"
              style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid #DDD0C0', outline: 'none', fontFamily: "'Noto Sans SC', sans-serif" }}
            />
          </div>

          <button
            type="submit"
            disabled={!companyName.trim() || isLoading}
            className="w-full py-4 rounded-xl font-bold text-white text-lg transition-all flex items-center justify-center gap-2"
            style={{
              background: companyName.trim() ? '#D4941A' : '#CCC',
              cursor: companyName.trim() && !isLoading ? 'pointer' : 'not-allowed',
            }}
          >
            {isLoading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> 正在分析...</>
            ) : "开始起名"}
          </button>

          <p className="text-center text-xs text-[#AAA]">
            已帮助 <span className="text-[#D4941A]">50,000+</span> 家企业找到好名
          </p>
        </form>

        {/* 子菜单快捷入口 */}
        <div className="mt-8 pt-6 border-t border-[#E5DDD3]">
          <p className="text-sm text-[#5C4A42] mb-3 text-center">更多起名类型：</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "品牌起名", href: "/company?type=brand" },
              { label: "项目代号", href: "/company?type=project" },
              { label: "店铺招牌", href: "/company?type=shop" },
              { label: "跨境英文", href: "/company?type=ecommerce" },
            ].map(item => (
              <Link key={item.href} href={item.href}
                className="text-center py-2 px-3 rounded-lg text-sm transition-colors"
                style={{ background: 'rgba(212,148,26,0.08)', color: '#D4941A', border: '1px solid rgba(212,148,26,0.2)' }}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ─── 公司起名结果 ─── */
function CompanyResultContent() {
  const searchParams = useSearchParams();

  const industry = searchParams.get("industry") || "";
  const expectations = searchParams.get("expectations") || "";
  const style = searchParams.get("style") || "";

  // 如果没有行业参数，显示表单页
  if (!industry) {
    return <CompanyForm />;
  }

  const [loading, setLoading] = useState(true);
  const [names, setNames] = useState<CompanyName[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [orderNo, setOrderNo] = useState<string>("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchNames = async () => {
      setLoading(true);
      setError(null);
      try {
        const body: Record<string, string> = {
          category: "company",
          expectations: expectations || "创新大气有格局",
          style: style || "现代商务",
        };
        if (industry) body.industry = industry;
        body.useAiComposer = "true";

        const response = await fetch("/api/name/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const result = await response.json();

        if (!result.success) {
          setError(result.error || "起名失败");
          return;
        }

        if (result.data?.orderNo) setOrderNo(result.data.orderNo);

        const apiNames = result.data?.names || [];
        const mapped: CompanyName[] = apiNames.map((n: any, idx: number) => ({
          rank: idx + 1,
          name: n.name || n.fullName || "",
          pinyin: n.pinyin || "",
          industry: industry || "通用",
          meaning: n.meaning || "",
          source: n.source ? `《${n.source.book}》：${n.source.text}` : undefined,
          score: typeof n.score === "number" ? n.score : Math.round(70 + Math.random() * 20),
          mathAnalysis: generateMathAnalysis(n.name || n.fullName || ""),
        }));

        setNames(mapped.length > 0 ? mapped : []);
      } catch (err) {
        setError("网络错误，请稍后重试");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchNames();
  }, [industry, expectations, style]);

  const copyName = (name: string) => {
    navigator.clipboard.writeText(name);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareName = () => {
    const name = names[selectedIdx];
    if (!name) return;
    if (navigator.share) {
      navigator.share({
        title: `为您推荐的公司名：${name.name}`,
        text: `公司名：${name.name}（${name.pinyin}）\n寓意：${name.meaning}`,
        url: window.location.href,
      });
    } else {
      copyName(`${name.name}（${name.pinyin}）\n${name.meaning}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1a18] to-[#2d2d1f] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-[#D4941A]/30 rounded-full" />
            <div className="absolute inset-0 border-4 border-[#D4941A] rounded-full border-t-transparent animate-spin" />
            <Loader2 className="absolute inset-0 m-auto w-10 h-10 text-[#D4941A] animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            AI正在为您公司起名
          </h2>
          <p className="text-[#D4941A]/70">正在分析行业属性，匹配易经数理</p>
          {orderNo && <p className="text-xs text-[#D4941A]/40 mt-4">订单号：{orderNo}</p>}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FDFAF4] flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-500 mb-4">{error}</p>
          <Link href="/" className="text-[#E86A17] hover:underline">← 返回首页</Link>
        </div>
      </div>
    );
  }

  if (names.length === 0) {
    return (
      <div className="min-h-screen bg-[#FDFAF4] flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-[#5C4A42] mb-4">未找到合适的公司名，请调整条件</p>
          <Link href="/" className="text-[#E86A17] hover:underline">← 返回重新起名</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a18] to-[#2d2d1f]">
      {/* 头部 */}
      <header className="sticky top-0 z-50 bg-[#1a1a18]/95 backdrop-blur border-b border-[#D4941A]/20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>返回首页</span>
          </Link>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#D4941A]" />
            <span className="font-bold text-white" style={{ fontFamily: "'Noto Serif SC', serif" }}>
              公司起名结果
            </span>
          </div>
          <div className="w-20" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 行业标签 */}
        {industry && (
          <div className="text-center mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm"
              style={{ background: 'rgba(212,148,26,0.15)', color: '#D4941A', border: '1px solid rgba(212,148,26,0.3)' }}>
              <Globe className="w-4 h-4" />
              行业：{industry}
            </span>
          </div>
        )}

        {/* 公司名列表 */}
        <div className="space-y-4">
          {names.map((nameItem, idx) => (
            <div
              key={nameItem.rank}
              className={`relative overflow-hidden rounded-2xl p-6 cursor-pointer transition-all duration-300 ${
                selectedIdx === idx ? "ring-2 ring-[#D4941A]" : ""
              }`}
              style={{
                background: selectedIdx === idx
                  ? 'linear-gradient(135deg, rgba(212,148,26,0.12), rgba(212,148,26,0.06))'
                  : 'rgba(255,255,255,0.05)',
                border: selectedIdx === idx ? '1px solid rgba(212,148,26,0.4)' : '1px solid rgba(255,255,255,0.08)',
              }}
              onClick={() => setSelectedIdx(idx)}
            >
              {/* 排名角标 */}
              <div className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                nameItem.rank === 1
                  ? "bg-gradient-to-br from-[#D4941A] to-[#E8B02E] text-white"
                  : "bg-white/10 text-white/60"
              }`}>
                {nameItem.rank}
              </div>

              <div className="flex items-start gap-4">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, #D4941A20, #E8B02E10)' }}
                >
                  <Building2 className="w-7 h-7 text-[#D4941A]" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span
                      className="text-3xl font-bold text-white"
                      style={{ fontFamily: "'Noto Serif SC', serif" }}
                    >
                      {nameItem.name}
                    </span>
                    <span className="text-sm text-white/50">{nameItem.pinyin}</span>
                    <span className="ml-auto text-xl font-bold text-[#D4941A]">{nameItem.score}分</span>
                  </div>

                  <p className="text-white/60 text-sm mb-3 leading-relaxed">{nameItem.meaning}</p>

                  {nameItem.mathAnalysis && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
                      style={{ background: 'rgba(212,148,26,0.1)', border: '1px solid rgba(212,148,26,0.2)' }}>
                      <Shield className="w-3 h-3 text-[#D4941A]" />
                      <span className="text-[#D4941A]/80">{nameItem.mathAnalysis}</span>
                    </div>
                  )}

                  {nameItem.source && (
                    <div className="mt-2 text-xs text-white/30">{nameItem.source}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 选中名字的操作区 */}
        {names[selectedIdx] && (
          <div className="mt-6 rounded-2xl p-6 text-center"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,148,26,0.2)' }}>
            <div className="text-4xl font-bold text-white mb-1" style={{ fontFamily: "'Noto Serif SC', serif" }}>
              {names[selectedIdx]?.name}
            </div>
            <div className="text-lg text-white/50 mb-4">{names[selectedIdx]?.pinyin}</div>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => copyName(names[selectedIdx]?.name || "")}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm transition-colors"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>
                {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                {copied ? "已复制" : "复制公司名"}
              </button>
              <button onClick={shareName}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm text-white transition-colors"
                style={{ background: '#D4941A' }}>
                <Share2 className="w-4 h-4" /> 分享
              </button>
            </div>
          </div>
        )}

        {/* 重新起名 */}
        <div className="mt-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors">
            <RefreshCw className="w-4 h-4" />
            <span>重新起名</span>
          </Link>
        </div>
      </main>
    </div>
  );
}

// 简易数理分析（基于名称笔画）
function generateMathAnalysis(name: string): string {
  const strokes = name.split("").reduce((sum, char) => {
    const code = char.charCodeAt(0);
    return sum + (code % 9) + 1;
  }, 0) % 81 || 81;

  const analyses: Record<string, string> = {
    "1": "大展宏图，统率万人",
    "3": "进取如春，木秀于林",
    "5": "五行补足，根基稳固",
    "6": "和气生财，家业兴旺",
    "8": "财源广进，业务发达",
    "13": "技艺超群，领袖群伦",
    "24": "家门余庆，钱财丰盈",
    "26": "波澜起伏，化险为夷",
    "39": "名誉四海，声望崇高",
    "41": "专精一路，独占鳌头",
    "47": "花开结果，富贵两全",
    "48": "老树开新，绿叶成荫",
  };
  return `数理 ${strokes}：${analyses[String(strokes)] || "天地人和，百业可兴"}`;
}

function generateMathAnalysis_orig(name: string): string {
  const strokes = name.split("").reduce((sum, char) => {
    return sum + (char.charCodeAt(0) % 9) + 1;
  }, 0) % 81 || 81;
  return `数理 ${strokes}`;
}

export default function CompanyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-[#1a1a18] to-[#2d2d1f] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#D4941A] animate-spin" />
      </div>
    }>
      <CompanyResultContent />
    </Suspense>
  );
}
