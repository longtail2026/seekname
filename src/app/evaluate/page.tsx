/**
 * 好名测试 · 智能名字体检 - 测评结果页
 * /evaluate?name=张浩然&type=person&info=男
 *
 * 6维度评分（每项0-10分，总分60）+ 星级 + 最终评价
 * 全类型通用：人名/英文名/中文名/网名/公司名/跨境名/宠物名/艺名/作品名
 */
"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Star,
  Loader2,
  RefreshCw,
  Music,
  BookOpen,
  Eye,
  Sparkles,
  Shield,
  Target,
  Award,
  AlertTriangle,
  BarChart3,
} from "lucide-react";

/* ─── 维度配置 ─── */
const DIMENSION_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; bar: string }> = {
  "好听度（音律）": {
    icon: <Music className="w-5 h-5" />,
    color: "#E86A17",
    bg: "#FFF0E5",
    bar: "linear-gradient(90deg, #E86A17, #F5A623)",
  },
  "寓意度（内涵）": {
    icon: <BookOpen className="w-5 h-5" />,
    color: "#8B5CF6",
    bg: "#F5F0FF",
    bar: "linear-gradient(90deg, #8B5CF6, #A78BFA)",
  },
  "辨识度（记忆传播）": {
    icon: <Eye className="w-5 h-5" />,
    color: "#06B6D4",
    bg: "#EFFAFC",
    bar: "linear-gradient(90deg, #06B6D4, #22D3EE)",
  },
  "独特性（重名率）": {
    icon: <Sparkles className="w-5 h-5" />,
    color: "#F59E0B",
    bg: "#FFFBF0",
    bar: "linear-gradient(90deg, #F59E0B, #FBBF24)",
  },
  "安全无歧义": {
    icon: <Shield className="w-5 h-5" />,
    color: "#10B981",
    bg: "#F0FFF5",
    bar: "linear-gradient(90deg, #10B981, #34D399)",
  },
  "场景适配度": {
    icon: <Target className="w-5 h-5" />,
    color: "#EC4899",
    bg: "#FFF0F5",
    bar: "linear-gradient(90deg, #EC4899, #F472B6)",
  },
};

/* ─── API 响应类型 ─── */
interface DimensionScore {
  label: string;
  labelEn: string;
  score: number;
  reason: string;
}

interface EvaluateResponse {
  name: string;
  type: string;
  total: number;
  stars: number;
  dimensions: DimensionScore[];
  summary: string;
  degraded?: boolean;
}

/* ─── 组件 ─── */
function EvaluateContent() {
  const searchParams = useSearchParams();
  const name = searchParams.get("name") || "";
  const type = searchParams.get("type") || "person";
  const info = searchParams.get("info") || "";

  const [result, setResult] = useState<EvaluateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(-1);

  useEffect(() => {
    if (!name) {
      setLoading(false);
      return;
    }

    const evaluateName = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch("/api/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), type, info: info.trim() }),
        });

        if (!res.ok) {
          throw new Error(`API returned ${res.status}`);
        }

        const data: EvaluateResponse = await res.json();
        setResult(data);
      } catch {
        setError(true);
        // 极度降级：完全离线fallback
        setResult({
          name: name.trim(),
          type: getTypeLabel(type),
          total: 30,
          stars: 3,
          dimensions: [
            { label: "好听度（音律）", labelEn: "Euphony", score: 6, reason: "发音较顺口，音律搭配合理。" },
            { label: "寓意度（内涵）", labelEn: "Meaning", score: 6, reason: "字义中性偏正面。" },
            { label: "辨识度（记忆传播）", labelEn: "Recognition", score: 6, reason: "辨识度中等。" },
            { label: "独特性（重名率）", labelEn: "Uniqueness", score: 6, reason: "有一定独特性。" },
            { label: "安全无歧义", labelEn: "Safety", score: 6, reason: "无明显负面含义。" },
            { label: "场景适配度", labelEn: "Fit", score: 6, reason: "基本适合本场景使用。" },
          ],
          summary: "名字整体表现尚可，但建议进一步优化以提升整体品质。",
          degraded: true,
        });
      } finally {
        setLoading(false);
      }
    };

    evaluateName();
  }, [name, type, info]);

  // 星级渲染
  const StarsDisplay = useMemo(() => {
    if (!result) return null;
    const s = result.stars;
    return (
      <div className="flex items-center justify-center gap-1 my-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`w-6 h-6 ${i <= s ? "text-[#F59E0B] fill-[#F59E0B]" : "text-gray-200"}`}
          />
        ))}
      </div>
    );
  }, [result]);

  if (!name) {
    return (
      <div className="min-h-screen bg-[#FDFAF4] flex items-center justify-center">
        <div className="text-center px-4">
          <Star className="w-12 h-12 text-[#DDD0C0] mx-auto mb-4" />
          <p className="text-xl text-[#5C4A42] mb-4" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            请先输入要测评的名字
          </p>
          <Link
            href="/evaluate/form"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#E86A17] text-white rounded-xl font-medium hover:bg-[#D55A0B] transition-colors"
          >
            ← 返回测评
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDFAF4] to-[#EDE5D8]">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-[#FDFAF4]/95 backdrop-blur border-b border-[#E5DDD3]">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/evaluate/form" className="text-[#5C4A42] hover:text-[#E86A17] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <BarChart3 className="w-5 h-5 text-[#E86A17]" />
          <span className="font-bold text-[#2C1810] text-sm" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            名字测评报告
          </span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="w-12 h-12 text-[#E86A17] animate-spin mx-auto mb-4" />
            <p className="text-[#5C4A42]" style={{ fontFamily: "'Noto Serif SC', serif" }}>
              正在深度分析名字...
            </p>
            <p className="text-[#AAA] text-sm mt-2">6大维度综合评测中</p>
          </div>
        ) : result ? (
          <div className="space-y-5">
            {/* 降级提示 */}
            {result.degraded && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>当前为离线评分（AI服务不可用），评分结果仅供参考</span>
              </div>
            )}

            {/* 姓名 + 类型 + 总分 + 星级 */}
            <div className="bg-white rounded-2xl p-8 text-center border border-[#F0E8DD] shadow-sm">
              <div className="text-xs text-[#AAA] mb-2 uppercase tracking-wider">{result.type}</div>

              <h1
                className="text-5xl font-bold text-[#2C1810] mb-3"
                style={{ fontFamily: "'Noto Serif SC', serif" }}
              >
                {result.name}
              </h1>

              {/* 总分大号展示 */}
              <div className="relative inline-flex items-center justify-center mb-1">
                <div className="text-6xl font-bold text-[#E86A17]" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                  {result.total}
                </div>
                <div className="text-base text-[#AAA] ml-1 mt-4">/ 60</div>
              </div>

              {StarsDisplay}

              <div className="text-sm text-[#AAA]">综合评分</div>
            </div>

            {/* 6维度评分 */}
            <div className="space-y-3">
              {result.dimensions.map((dim, i) => {
                const config = DIMENSION_CONFIG[dim.label] || DIMENSION_CONFIG["好听度（音律）"];
                const isExpanded = expanded === i;
                return (
                  <div
                    key={i}
                    className="bg-white rounded-xl border border-[#F0E8DD] overflow-hidden transition-all hover:shadow-sm cursor-pointer"
                    onClick={() => setExpanded(isExpanded ? -1 : i)}
                  >
                    {/* 维度头部 */}
                    <div className="p-4 flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: config.bg, color: config.color }}
                      >
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-[#2C1810] text-sm">{dim.label}</span>
                          <span className="font-bold text-lg" style={{ color: config.color }}>
                            {dim.score}
                            <span className="text-xs text-[#AAA] font-normal">/10</span>
                          </span>
                        </div>
                        {/* 进度条 */}
                        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{
                              width: `${(dim.score / 10) * 100}%`,
                              background: config.bar,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* 展开的理由 */}
                    <div
                      className={`overflow-hidden transition-all duration-200 ${
                        isExpanded ? "max-h-40" : "max-h-0"
                      }`}
                    >
                      <div className="px-4 pb-4 pt-0">
                        <div className="text-sm text-[#5C4A42] leading-relaxed bg-[#FDFAF4] rounded-lg p-3">
                          {dim.reason}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 总分汇总条 */}
            <div className="bg-white rounded-2xl p-6 border border-[#F0E8DD] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="font-bold text-[#2C1810]" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                  总分汇总
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-[#E86A17]">{result.total}</span>
                  <span className="text-[#AAA]">/ 60</span>
                </div>
              </div>

              {/* 总分进度条 - 变色 */}
              <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${(result.total / 60) * 100}%`,
                    background:
                      result.total >= 48
                        ? "linear-gradient(90deg, #10B981, #34D399)"
                        : result.total >= 36
                        ? "linear-gradient(90deg, #F59E0B, #FBBF24)"
                        : result.total >= 24
                        ? "linear-gradient(90deg, #F97316, #FB923C)"
                        : "linear-gradient(90deg, #EF4444, #F87171)",
                  }}
                />
              </div>

              {/* 星级（重复一次，方便底部查看） */}
              <div className="flex items-center justify-center gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i <= (result?.stars || 0)
                        ? "text-[#F59E0B] fill-[#F59E0B]"
                        : "text-gray-200"
                    }`}
                  />
                ))}
              </div>
              <div className="text-center text-xs text-[#AAA] mt-1">
                {result.total >= 48
                  ? "⭐ 超优好名"
                  : result.total >= 36
                  ? "⭐ 优质好名"
                  : result.total >= 24
                  ? "⭐ 中等品质"
                  : "⭐ 需要改进"}
              </div>
            </div>

            {/* 最终评价 */}
            <div className="bg-gradient-to-br from-[#FFF8F3] to-white rounded-2xl p-6 border border-[#F0E8DD]">
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-5 h-5 text-[#E86A17]" />
                <span className="font-bold text-[#2C1810]" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                  最终评价
                </span>
              </div>
              <p className="text-[#5C4A42] text-sm leading-relaxed">{result.summary}</p>
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href="/evaluate/form"
                className="flex-1 flex items-center justify-center gap-2 py-4 bg-white border border-[#DDD0C0] rounded-xl text-[#5C4A42] hover:bg-[#FDFAF4] transition-all font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                测评另一个名字
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-[#5C4A42]">暂无数据</p>
          </div>
        )}
      </main>
    </div>
  );
}

/* ─── 类型标签映射 ─── */
function getTypeLabel(typeId: string): string {
  const map: Record<string, string> = {
    person: "人名（宝宝/成人）",
    english: "英文名",
    chinese: "外国人中文名",
    social: "社交网名",
    company: "公司名/品牌名",
    crossborder: "跨境电商英文名",
    pet: "宠物名",
    stage: "艺名/笔名/游戏ID",
    work: "作品名（文章/影视）",
  };
  return map[typeId] || typeId;
}

/* ─── 导出（Suspense 包裹） ─── */
export default function EvaluatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FDFAF4] flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-[#E86A17] animate-spin" />
        </div>
      }
    >
      <EvaluateContent />
    </Suspense>
  );
}