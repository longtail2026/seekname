/**
 * 宠物起名页面（表单 + 结果）
 * /pet — 表单页
 * /pet?petType=猫 — 结果页
 */
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles, ArrowLeft, PawPrint, Loader2,
  RefreshCw, Copy, CheckCircle, Heart
} from "lucide-react";

interface PetName {
  rank: number;
  name: string;
  pinyin: string;
  meaning: string;
  source?: string;
  score: number;
  tags: string[];
}

/* ─── 宠物起名表单 ─── */
function PetForm() {
  const router = useRouter();
  const [petType, setPetType] = useState("猫");
  const [gender, setGender] = useState("公的");
  const [expectations, setExpectations] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const params = new URLSearchParams({ petType, gender });
    if (expectations.trim()) params.set("expectations", expectations.trim());
    router.push(`/pet?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDF8F3] to-[#F0E8D8]">
      <header className="sticky top-0 z-50 bg-[#FDF8F3]/95 backdrop-blur border-b border-[#E5DDD3]">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-[#5C4A42] hover:text-[#C84A2A] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <PawPrint className="w-5 h-5 text-[#F09A3A]" />
          <span className="font-bold text-[#2C1810]" style={{ fontFamily: "'Noto Serif SC', serif" }}>宠物起名</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#2C1810] mb-3" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            毛孩子起名 🐾
          </h1>
          <p className="text-[#5C4A42] text-sm">为您的宠物取一个可爱又有灵气的好名字</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 宠物类型 */}
          <div>
            <label className="block text-sm font-medium text-[#5C4A42] mb-2">
              宠物类型 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {["猫", "狗", "鸟", "鱼", "兔", "仓鼠", "龟", "其他"].map(type => (
                <button key={type} type="button" onClick={() => setPetType(type)}
                  className="py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: petType === type ? "#F09A3A" : 'rgba(255,255,255,0.8)',
                    color: petType === type ? "#FFF" : "#5C4A42",
                    border: '1px solid #DDD0C0',
                    cursor: 'pointer',
                  }}>
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* 性别 */}
          <div>
            <label className="block text-sm font-medium text-[#5C4A42] mb-2">
              性别
            </label>
            <div className="flex gap-3">
              {["公的", "母的", "不限"].map(g => (
                <button key={g} type="button" onClick={() => setGender(g)}
                  className="flex-1 py-3 rounded-xl font-medium text-base transition-all"
                  style={{
                    background: gender === g ? "#F09A3A" : 'rgba(255,255,255,0.8)',
                    color: gender === g ? "#FFF" : "#5C4A42",
                    border: '1px solid #DDD0C0',
                    cursor: 'pointer',
                  }}>
                  {g}
                </button>
              ))}
            </div>
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
              placeholder="例如：可爱呆萌、霸气外露、仙气飘飘"
              className="w-full px-4 py-3 rounded-xl text-[#2C1810]"
              style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid #DDD0C0', outline: 'none', fontFamily: "'Noto Sans SC', sans-serif" }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 rounded-xl font-bold text-white text-lg transition-all flex items-center justify-center gap-2"
            style={{
              background: '#F09A3A',
              cursor: !isLoading ? 'pointer' : 'not-allowed',
            }}
          >
            {isLoading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> 正在取名...</>
            ) : "开始取名"}
          </button>

          <p className="text-center text-xs text-[#AAA]">
            已帮助 <span className="text-[#F09A3A]">30,000+</span> 位铲屎官找到好名
          </p>
        </form>
      </main>
    </div>
  );
}

/* ─── 宠物起名结果视图（独立组件，确保 hooks 调用一致） ─── */
function PetNames({ petType }: { petType: string }) {
  const searchParams = useSearchParams();
  const gender = searchParams.get("gender") || "";
  const expectations = searchParams.get("expectations") || "";
  const style = searchParams.get("style") || "";

  const [loading, setLoading] = useState(true);
  const [names, setNames] = useState<PetName[]>([]);
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
          category: "pet",
          surname: "宠",
          gender: gender ? (gender === "公的" || gender === "不限" ? "M" : "F") : "M",
          birthDate: new Date().toISOString().split("T")[0],
          expectations: expectations || "可爱呆萌有灵气",
          style: style || "可爱",
        };
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
        const mapped: PetName[] = apiNames.map((n: any, idx: number) => ({
          rank: idx + 1,
          name: n.name || n.fullName || "",
          pinyin: n.pinyin || "",
          meaning: n.meaning || "",
          source: n.source ? `《${n.source.book}》：${n.source.text}` : undefined,
          score: typeof n.score === "number" ? n.score : Math.round(70 + Math.random() * 20),
          tags: generatePetTags(n.name || n.fullName || "", petType),
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
  }, [petType, gender, expectations, style]);

  const copyName = (name: string) => {
    navigator.clipboard.writeText(name);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FDF8F3] to-[#F0E8D8] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-[#F09A3A]/30 rounded-full" />
            <div className="absolute inset-0 border-4 border-[#F09A3A] rounded-full border-t-transparent animate-spin" />
            <PawPrint className="absolute inset-0 m-auto w-8 h-8 text-[#F09A3A] animate-bounce" />
          </div>
          <h2 className="text-2xl font-bold text-[#2C1810] mb-2" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            正在为毛孩子取名 🐾
          </h2>
          <p className="text-[#5C4A42]">正在匹配可爱又有灵气的好名字</p>
          {orderNo && <p className="text-xs text-[#AAA] mt-4">订单号：{orderNo}</p>}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-500 mb-4">{error}</p>
          <Link href="/" className="text-[#E86A17] hover:underline">← 返回首页</Link>
        </div>
      </div>
    );
  }

  if (names.length === 0) {
    return (
      <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-[#5C4A42] mb-4">未找到合适的宠物名，请调整条件</p>
          <Link href="/" className="text-[#E86A17] hover:underline">← 返回重新起名</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDF8F3] to-[#F0E8D8]">
      {/* 头部 */}
      <header className="sticky top-0 z-50 bg-[#FDF8F3]/95 backdrop-blur border-b border-[#E5DDD3]">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[#5C4A42] hover:text-[#C84A2A] transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>返回首页</span>
          </Link>
          <div className="flex items-center gap-2">
            <PawPrint className="w-5 h-5 text-[#F09A3A]" />
            <span className="font-bold text-[#2C1810]" style={{ fontFamily: "'Noto Serif SC', serif" }}>
              {petType}宝起名结果
            </span>
          </div>
          <div className="w-20" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 宠物类型标签 */}
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm"
            style={{ background: 'rgba(240,154,58,0.1)', color: '#F09A3A', border: '1px solid rgba(240,154,58,0.25)' }}>
            <PawPrint className="w-4 h-4" />
            {petType || "宠物"} · 起名结果
          </span>
        </div>

        {/* 名字列表 */}
        <div className="space-y-4">
          {names.map((nameItem, idx) => (
            <div
              key={nameItem.rank}
              className={`rounded-2xl p-6 cursor-pointer transition-all duration-300 ${
                selectedIdx === idx ? "ring-2 ring-[#F09A3A]" : ""
              }`}
              style={{
                background: selectedIdx === idx
                  ? 'linear-gradient(135deg, rgba(240,154,58,0.1), rgba(240,154,58,0.04))'
                  : 'rgba(255,255,255,0.7)',
                border: selectedIdx === idx ? '1px solid rgba(240,154,58,0.4)' : '1px solid #E5DDD3',
                boxShadow: selectedIdx === idx ? '0 4px 20px rgba(240,154,58,0.12)' : '0 2px 8px rgba(44,24,16,0.05)',
              }}
              onClick={() => setSelectedIdx(idx)}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${
                  nameItem.rank === 1
                    ? "bg-gradient-to-br from-[#F09A3A] to-[#F0B860] text-white"
                    : "bg-[#E5DDD3] text-[#5C4A42]"
                }`} style={{ fontFamily: "'Noto Serif SC', serif" }}>
                  {nameItem.rank}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="text-3xl font-bold text-[#2C1810]" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                      {nameItem.name}
                    </span>
                    <span className="text-sm text-[#5C4A42]">{nameItem.pinyin}</span>
                    <span className="ml-auto text-xl font-bold text-[#F09A3A]">{nameItem.score}分</span>
                  </div>

                  <p className="text-[#5C4A42] text-sm mb-3 leading-relaxed">{nameItem.meaning}</p>

                  {nameItem.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {nameItem.tags.map((tag, ti) => (
                        <span key={ti}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs"
                          style={{ background: 'rgba(240,154,58,0.08)', color: '#F09A3A', border: '1px solid rgba(240,154,58,0.15)' }}>
                          <Heart className="w-2.5 h-2.5" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 操作区 */}
        {names[selectedIdx] && (
          <div className="mt-6 rounded-2xl p-6 text-center"
            style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(240,154,58,0.2)', boxShadow: '0 2px 12px rgba(240,154,58,0.1)' }}>
            <div className="text-4xl font-bold text-[#2C1810] mb-1" style={{ fontFamily: "'Noto Serif SC', serif" }}>
              {names[selectedIdx]?.name}
            </div>
            <div className="text-lg text-[#5C4A42] mb-4">{names[selectedIdx]?.pinyin}</div>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => copyName(names[selectedIdx]?.name || "")}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm"
                style={{ background: '#F0E8D8', color: '#4A3428' }}>
                {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {copied ? "已复制" : "复制名字"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-[#5C4A42] hover:text-[#C84A2A] transition-colors">
            <RefreshCw className="w-4 h-4" />
            <span>重新起名</span>
          </Link>
        </div>
      </main>
    </div>
  );
}

/* ─── 宠物起名结果容器（仅做条件判断，无 hooks 不一致） ─── */
function PetResultContent() {
  const searchParams = useSearchParams();
  const petType = searchParams.get("petType") || "";

  if (!petType) {
    return <PetForm />;
  }

  return <PetNames petType={petType} />;
}

function generatePetTags(name: string, petType: string): string[] {
  const tags: string[] = [];
  if (/[豆|米|球|糖|豆|奶|布]/.test(name)) tags.push("超可爱");
  if (/[虎|狮|狼|鹰|龙|凤]/.test(name)) tags.push("霸气外露");
  if (/[雪|白|银|玉|银]/.test(name)) tags.push("仙气飘飘");
  if (/[福|禄|寿|喜|财]/.test(name)) tags.push("吉祥如意");
  if (petType === "猫") tags.push("适合猫咪");
  if (petType === "狗") tags.push("适合狗狗");
  if (tags.length < 2) tags.push("百搭通用");
  return tags.slice(0, 3);
}

export default function PetPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FDF8F3] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#F09A3A] animate-spin" />
      </div>
    }>
      <PetResultContent />
    </Suspense>
  );
}
