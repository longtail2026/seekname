/**
 * 名字详情页
 * 入口：从起名结果页点击"查看详情"，进入独立可分享的名字分析报告
 *
 * URL 结构：/naming/[fullName]?data=<base64>&surname=张&gender=M&birthDate=2024-08-20
 * - fullName: 全名（URL 编码），作为页面标题
 * - data: base64(JSON.stringify(nameObject))，包含完整名字分析数据
 * - surname/gender/birthDate: 备用查询参数
 */

"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { jsPDF } from "jspdf";
import {
  ArrowLeft, Star, BookOpen, Shield, Zap, Award, Heart,
  TrendingUp, TrendingDown, AlertCircle, Lock, Crown,
  Flame, Droplets, Mountain, Wind, Download, Share2, CheckCircle,
  Loader2, RefreshCw, Copy
} from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuth } from "@/contexts/AuthContext";

// ─── 类型定义 ───

interface SourceItem {
  book: string;
  text: string;
}

interface NameCandidate {
  rank: number;
  name: string;          // 名字（不含姓）
  fullName: string;      // 全名
  pinyin: string;
  wuxing: string;
  score: number;
  scoreBreakdown: {
    cultural: number;
    popularity: number;
    harmony: number;
    safety: number;
  };
  meaning: string;
  sources: SourceItem[];
  warnings: string[];
  uniqueness: string;
  strokeCount: number;
}

// 五行图标
const WUXING_ICONS: Record<string, React.ReactNode> = {
  "金": <Mountain className="w-3.5 h-3.5" />,
  "木": <Wind className="w-3.5 h-3.5" />,
  "水": <Droplets className="w-3.5 h-3.5" />,
  "火": <Flame className="w-3.5 h-3.5" />,
  "土": <Mountain className="w-3.5 h-3.5" />,
};

const WUXING_COLORS: Record<string, { bar: string; badge: string }> = {
  "金": { bar: "bg-yellow-500", badge: "text-yellow-700 bg-yellow-50 border-yellow-200" },
  "木": { bar: "bg-green-500",  badge: "text-green-700  bg-green-50  border-green-200"  },
  "水": { bar: "bg-blue-500",   badge: "text-blue-700   bg-blue-50   border-blue-200"   },
  "火": { bar: "bg-red-500",    badge: "text-red-700    bg-red-50    border-red-200"    },
  "土": { bar: "bg-amber-500",  badge: "text-amber-700 bg-amber-50 border-amber-200"  },
};

const UNIQUENESS_CONFIG: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  high:   { color: "text-green-700 bg-green-50",  icon: TrendingUp,   label: "独特小众" },
  medium: { color: "text-amber-700 bg-amber-50", icon: TrendingUp,   label: "适中"     },
  low:    { color: "text-red-700 bg-red-50",      icon: TrendingDown, label: "常见"     },
};

// ─── 子组件 ───

function ScoreRing({ score }: { score: number }) {
  const pct = Math.round(score);
  const color = pct >= 80 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#ef4444";
  const r = 44;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);

  return (
    <div className="relative w-28 h-28 flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#f3f4f6" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>{pct}</span>
        <span className="text-[10px] text-gray-400">/100</span>
      </div>
    </div>
  );
}

function BreakdownBar({ label, score, icon }: { label: string; score: number; icon: React.ReactNode }) {
  const pct = Math.round(score);
  const color = pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-3">
      <div className="w-6 h-6 flex-shrink-0 text-gray-400">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span className="truncate">{label}</span>
          <span className="font-medium text-gray-700 ml-1">{pct}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

function WuxingBadge({ char }: { char: string }) {
  const cfg = WUXING_COLORS[char] || { badge: "text-gray-700 bg-gray-50 border-gray-200" };
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 text-sm font-medium rounded-full border ${cfg.badge}`}>
      {char}
    </span>
  );
}

function UniquenessBadge({ level }: { level: string }) {
  const cfg = UNIQUENESS_CONFIG[level] || UNIQUENESS_CONFIG.medium;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ─── 主页面 ───

function NameDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const { user } = useAuth();

  const fullName = decodeURIComponent(String(params?.name || ""));
  const dataParam = searchParams.get("data");
  const surname = searchParams.get("surname") || fullName.charAt(0);
  const gender = searchParams.get("gender") || "M";
  const birthDate = searchParams.get("birthDate") || "";

  const [name, setName] = useState<NameCandidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  // 解码名字数据
  const decodeData = useCallback((): NameCandidate | null => {
    if (!dataParam) return null;
    try {
      const json = atob(dataParam);
      const obj = JSON.parse(json);
      return obj as NameCandidate;
    } catch {
      return null;
    }
  }, [dataParam]);

  useEffect(() => {
    const decoded = decodeData();
    if (decoded) {
      setName(decoded);
      setLoading(false);
    } else {
      // 兜底：从 sessionStorage 读取
      try {
        const stored = sessionStorage.getItem(`name:${fullName}`);
        if (stored) {
          setName(JSON.parse(stored));
          setLoading(false);
          return;
        }
      } catch {}
      // 无法恢复数据，显示空状态
      setError("无法加载名字详情，请返回起名结果页重新查看");
      setLoading(false);
    }
  }, [decodeData, fullName]);

  // 导出 PDF
  const handleExportPdf = async () => {
    if (!name) return;
    setExporting(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();

      // 封面背景
      doc.setFillColor(245, 232, 200);
      doc.rect(0, 0, pageW, 297, "F");

      // 名字
      doc.setFont("helvetica", "bold");
      doc.setFontSize(28);
      doc.setTextColor(44, 24, 16);
      doc.text(name.fullName, pageW / 2, 60, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(120);
      doc.text(`${name.pinyin}  ·  五行：${name.wuxing}  ·  评分：${name.score}/100`, pageW / 2, 74, { align: "center" });

      // 综合评分
      doc.setFontSize(18);
      doc.setTextColor(200, 148, 26);
      doc.text(`${t("name.detail.overallScore")}：${name.score}`, pageW / 2, 90, { align: "center" });

      // 分项评分
      let y = 108;
      doc.setFontSize(10);
      doc.setTextColor(80);
      const breakdown = [
        { label: t("name.detail.culturalHeritage"), score: name.scoreBreakdown.cultural },
        { label: t("name.detail.popularity"), score: name.scoreBreakdown.popularity },
        { label: t("name.detail.phoneticHarmony"), score: name.scoreBreakdown.harmony },
        { label: t("name.detail.safety"), score: name.scoreBreakdown.safety },
      ];
      for (const item of breakdown) {
        doc.text(`${item.label}：${item.score}/100`, 20, y);
        y += 6;
      }

      // 寓意
      y += 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(44, 24, 16);
      doc.text(t("name.detail.meaning"), 20, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(80);
      const meaningLines = doc.splitTextToSize(name.meaning, pageW - 40);
      doc.text(meaningLines, 20, y);
      y += meaningLines.length * 5 + 6;

      // 出处
      if (name.sources.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(44, 24, 16);
        doc.text(t("name.detail.classicSource"), 20, y);
        y += 6;
        for (const src of name.sources.slice(0, 2)) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(80);
          doc.text(src.book, 20, y);
          y += 5;
          doc.setFont("helvetica", "italic");
          doc.text(`"${src.text}"`, 20, y);
          y += 8;
        }
      }

      // 结尾页
      doc.addPage();
      doc.setFillColor(245, 232, 200);
      doc.rect(0, 0, pageW, 297, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(44, 24, 16);
      doc.text(name.fullName, pageW / 2, 130, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text("seekname.cn · " + new Date().toLocaleDateString("zh-CN"), pageW / 2, 145, { align: "center" });

      doc.save(`seekname-${name.fullName}.pdf`);
    } catch (e) {
      console.error("[PDF]", e);
      alert("导出失败，请重试");
    } finally {
      setExporting(false);
    }
  };

  // 复制分享
  const handleCopy = () => {
    if (!name) return;
    navigator.clipboard.writeText(`${name.fullName}（${name.pinyin}）\n寓意：${name.meaning}\n评分：${name.score}/100\n来源：seekname.cn`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // 收藏到典藏本
  const handleSave = async () => {
    if (!name || !user) {
      alert("请先登录");
      return;
    }
    try {
      const res = await fetch("/api/names/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surname: surname || name.fullName.charAt(0),
          fullName: name.fullName,
          gender: gender || "M",
          score: name.score,
          analysis: {
            phonetic: { score: name.scoreBreakdown.harmony, details: [t("name.detail.phoneticNote")] },
            classic: name.sources[0] ? { score: name.scoreBreakdown.cultural, source: name.sources[0].book, poem: name.sources[0].text } : undefined,
            uniqueness: { riskLevel: name.uniqueness },
          },
          wuxing: name.wuxing.split(""),
        }),
      });
      if (res.ok) {
        alert("已收藏到典藏本！");
      } else {
        const err = await res.json();
        alert(err.message || "收藏失败");
      }
    } catch {
      alert("收藏失败，请重试");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFAF4] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-[#C84A2A] animate-spin mx-auto mb-4" />
          <p className="text-[#5C4A42]">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (error || !name) {
    return (
      <div className="min-h-screen bg-[#FDFAF4] flex flex-col items-center justify-center">
        <p className="text-red-500 mb-4">{error || "未找到名字详情"}</p>
        <Link href="/naming" className="px-4 py-2 bg-amber-600 text-white rounded-lg">
          返回起名结果
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFAF4]">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-[#FDFAF4]/95 backdrop-blur border-b border-[#E5DDD3]">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/naming" className="flex items-center gap-2 text-[#5C4A42] hover:text-[#C84A2A] transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">{t("name.detail.back")}</span>
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="p-2 text-[#5C4A42] hover:text-[#C84A2A] transition-colors"
              title="复制分享"
            >
              {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
            </button>
            <button
              onClick={handleExportPdf}
              disabled={exporting}
              className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {t("name.detail.exportPdf")}
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* 名字头部 */}
        <div className="text-center mb-8">
          <h1
            className="text-5xl font-bold text-[#2C1810] mb-2"
            style={{ fontFamily: "'Noto Serif SC', serif" }}
          >
            {name.fullName}
          </h1>
          <div className="flex items-center justify-center gap-4 text-[#5C4A42] text-sm">
            <span>{name.pinyin}</span>
            <span className="text-[#E5DDD3]">|</span>
            <span>{gender === "M" ? t("name.detail.male") : t("name.detail.female")}</span>
            {birthDate && (
              <>
                <span className="text-[#E5DDD3]">|</span>
                <span>{birthDate}</span>
              </>
            )}
          </div>
        </div>

        {/* 综合评分 */}
        <div className="ancient-card p-6 mb-6 flex items-center gap-6">
          <ScoreRing score={name.score} />
          <div className="flex-1 space-y-3">
            <BreakdownBar
              label={t("name.detail.culturalHeritage")}
              score={name.scoreBreakdown.cultural}
              icon={<BookOpen className="w-4 h-4" />}
            />
            <BreakdownBar
              label={t("name.detail.popularity")}
              score={name.scoreBreakdown.popularity}
              icon={<Award className="w-4 h-4" />}
            />
            <BreakdownBar
              label={t("name.detail.phoneticHarmony")}
              score={name.scoreBreakdown.harmony}
              icon={<Zap className="w-4 h-4" />}
            />
            <BreakdownBar
              label={t("name.detail.safety")}
              score={name.scoreBreakdown.safety}
              icon={<Shield className="w-4 h-4" />}
            />
          </div>
        </div>

        {/* 五行 + 独特性 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="ancient-card p-5">
            <div className="text-xs text-[#5C4A42] mb-3">{t("name.detail.wuxingElements")}</div>
            <div className="flex flex-wrap gap-2">
              {name.wuxing.split("").map((char) => (
                <span key={char} className="inline-flex items-center gap-1 text-sm font-medium text-[#5C4A42]">
                  {WUXING_ICONS[char]}
                  <WuxingBadge char={char} />
                </span>
              ))}
              <span className="ml-2 text-xs text-gray-400 self-center">
                {name.strokeCount}{t("name.detail.strokes")}
              </span>
            </div>
          </div>
          <div className="ancient-card p-5">
            <div className="text-xs text-[#5C4A42] mb-3">{t("name.detail.uniqueness")}</div>
            <UniquenessBadge level={name.uniqueness} />
          </div>
        </div>

        {/* 名字寓意 */}
        <div className="ancient-card p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-[#2C1810]">{t("name.detail.meaning")}</span>
          </div>
          <p className="text-[#5C4A42] leading-relaxed text-sm">{name.meaning}</p>
        </div>

        {/* 典籍出处 */}
        {name.sources.length > 0 && (
          <div className="ancient-card p-6 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-[#C9A84C]" />
              <span className="text-sm font-medium text-[#2C1810]">{t("name.detail.classicSource")}</span>
            </div>
            <div className="space-y-3">
              {name.sources.slice(0, 2).map((src, i) => (
                <div key={i} className="p-3 bg-[#F8F3EA] rounded-lg">
                  <div className="text-xs text-[#C9A84C] font-medium mb-1">{src.book}</div>
                  <p className="text-sm text-[#5C4A42] italic leading-relaxed">"{src.text}"</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 警告 */}
        {name.warnings.length > 0 && (
          <div className="ancient-card p-6 mb-6 border-amber-200 bg-amber-50">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-800">{t("name.detail.warnings")}</span>
            </div>
            <ul className="space-y-1">
              {name.warnings.map((w, i) => (
                <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleSave}
            className="flex-1 py-3 px-4 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Heart className="w-4 h-4" />
            {t("name.detail.saveToCollection")}
          </button>
          <Link
            href="/naming"
            className="flex-1 py-3 px-4 border border-[#E5DDD3] text-[#5C4A42] rounded-lg hover:bg-[#F8F3EA] transition-colors flex items-center justify-center gap-2 text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            {t("name.detail.regenerate")}
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function NameDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FDFAF4] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#C84A2A] animate-spin" />
      </div>
    }>
      <NameDetailContent />
    </Suspense>
  );
}
