/**
 * 起名结果页
 * 从 URL 参数获取起名条件，调用 /api/name/generate 获取真实结果
 * 支持路径：/naming?surname=张&gender=M&birthDate=2024-08-20&expectations=聪明勇敢
 */

"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Sparkles, ArrowLeft, Lock, Unlock, Crown, BookOpen,
  Flame, Droplets, Mountain, Wind, Loader2, RefreshCw,
  CheckCircle, Copy, Share2, Download
} from "lucide-react";
import { SITE_CONFIG, isPremiumRank } from "@/lib/config";

// 五行图标映射
const wuxingIcons: Record<string, React.ReactNode> = {
  "金": <Mountain className="w-3 h-3" />,
  "木": <Wind className="w-3 h-3" />,
  "水": <Droplets className="w-3 h-3" />,
  "火": <Flame className="w-3 h-3" />,
  "土": <Mountain className="w-3 h-3" />,
};

// 五行颜色
const wuxingColors: Record<string, string> = {
  "金": "#C9A84C",
  "木": "#2C5F4A",
  "水": "#3B82F6",
  "火": "#C84A2A",
  "土": "#8B4513",
};

// 名字卡片类型
interface NameItem {
  rank: number;
  name: string;
  pinyin: string;
  wuxing: string;
  score: number;
  meaning: string;
  source?: string;
  culturalScore?: number;
  harmonyScore?: number;
  uniqueness?: string;
}

function NamingResultContent() {
  const searchParams = useSearchParams();

  // 从 URL 读取参数
  const surname = searchParams.get("surname") || "张";
  const rawGender = searchParams.get("gender") || "M";
  // 兼容 "男/女" 和 "M/F" 两种格式
  const genderMap: Record<string, string> = { "男": "M", "女": "F", "M": "M", "F": "F" };
  const gender = genderMap[rawGender] || "M";
  const birthDate = searchParams.get("birthDate") || "";
  const birthTime = searchParams.get("birthTime") || "";
  const expectations = searchParams.get("expectations") || "";
  const style = searchParams.get("style") || "";
  const category = searchParams.get("category") || "personal";

  const [loading, setLoading] = useState(true);
  const [names, setNames] = useState<NameItem[]>([]);
  const [wuxingResult, setWuxingResult] = useState<{ likes: string[]; avoids: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(SITE_CONFIG.paywall.enabled);
  const [unlocked, setUnlocked] = useState(false);
  const [orderNo, setOrderNo] = useState<string>("");
  const [orderId, setOrderId] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);

  // 调用真实 API
  useEffect(() => {
    const fetchNames = async () => {
      setLoading(true);
      setError(null);
      try {
        const body: Record<string, string> = {
          surname,
          gender,
          category,
        };
        if (birthDate) body.birthDate = birthDate;
        if (birthTime) body.birthTime = birthTime;
        if (expectations) body.expectations = expectations;
        if (style) body.style = style;
        // 默认开启 AI 组合
        body.useAiComposer = "true";

        const response = await fetch("/api/name/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const result = await response.json();
        console.log("[Naming Page] API 完整响应:", JSON.stringify(result, null, 2).slice(0, 2000));
        console.log("[Naming Page] result.data 完整结构:", JSON.stringify(result?.data, null, 2)?.slice(0, 1500));

        if (!result?.success) {
          console.error("[Naming Page] API 失败:", result?.error);
          setError(result?.error || "起名失败");
          return;
        }

        // 保存订单信息
        if (result.data?.orderNo) setOrderNo(result.data.orderNo);
        if (result.data?.orderId) setOrderId(result.data.orderId);
        if (result.data?.wuxing) setWuxingResult(result.data.wuxing);

        // 调试：检查所有可能的数据源
        console.log("[Naming Page] result.data?.names:", JSON.stringify(result.data?.names)?.slice(0, 300));
        console.log("[Naming Page] result.data?.candidates:", JSON.stringify(result.data?.candidates)?.slice(0, 300));
        console.log("[Naming Page] result.data?.orderDetail?.candidates:", JSON.stringify(result.data?.orderDetail?.candidates)?.slice(0, 300));

        // 转换 API 结果为前端格式
        // 优先使用 names，然后是 candidates，最后是 orderDetail.candidates
        const namesData = result.data?.names;
        const candidatesData = result.data?.candidates;
        const orderDetailCandidates = result.data?.orderDetail?.candidates;
        
        let rawNames: any[] = [];
        if (Array.isArray(namesData) && namesData.length > 0) {
          rawNames = namesData;
          console.log("[Naming Page] 使用 names，数量:", rawNames.length);
        } else if (Array.isArray(candidatesData) && candidatesData.length > 0) {
          rawNames = candidatesData;
          console.log("[Naming Page] 使用 data.candidates，数量:", rawNames.length);
        } else if (Array.isArray(orderDetailCandidates) && orderDetailCandidates.length > 0) {
          rawNames = orderDetailCandidates;
          console.log("[Naming Page] 使用 orderDetail.candidates，数量:", rawNames.length);
        } else {
          console.error("[Naming Page] 所有数据源都为空");
          console.error("[Naming Page] namesData:", JSON.stringify(namesData)?.slice(0, 300));
          console.error("[Naming Page] candidatesData:", JSON.stringify(candidatesData)?.slice(0, 300));
          console.error("[Naming Page] orderDetailCandidates:", JSON.stringify(orderDetailCandidates)?.slice(0, 300));
          setError("未找到合适的名字，请稍后重试");
          return;
        }

        console.log("[Naming Page] rawNames赋值完成，长度:", rawNames.length);
        console.log("[Naming Page] namesData 检查:", Array.isArray(namesData), namesData?.length);
        console.log("[Naming Page] candidatesData 检查:", Array.isArray(candidatesData), candidatesData?.length);
        console.log("[Naming Page] orderDetailCandidates 检查:", Array.isArray(orderDetailCandidates), orderDetailCandidates?.length);
        console.log("[Naming Page] rawNames[0]:", rawNames[0]);
        console.log("[Naming Page] rawNames[0] 完整JSON:", JSON.stringify(rawNames[0], null, 2));

        // 过滤掉 null 和 undefined
        const validNames = rawNames.filter((n): n is NonNullable<typeof n> => n != null);
        console.log("[Naming Page] 过滤前数量:", rawNames.length, "过滤后:", validNames.length);

        if (validNames.length === 0) {
          console.error("[Naming Page] 所有名字都是无效值");
          setError("未找到合适的名字，请稍后重试");
          return;
        }

        console.log("[Naming Page] 第一个有效名字:", JSON.stringify(validNames[0], null, 2));

        const mapped: NameItem[] = validNames.map((n: any, idx: number) => {
          try {
            // 确保 n 是对象
            if (!n || typeof n !== "object") {
              console.error(`[Naming Page] 第 ${idx + 1} 个名字不是对象:`, n);
              return {
                rank: idx + 1,
                name: `名字${idx + 1}`,
                pinyin: "",
                wuxing: "",
                score: 70,
                meaning: "",
                source: undefined,
                culturalScore: undefined,
                harmonyScore: undefined,
                uniqueness: "medium" as const,
              };
            }

            const wuxingVal = n?.wuxing;
            let wuxingStr = "";
            // 有效的五行值
            const validWuxing = ["金", "木", "水", "火", "土"];
            if (typeof wuxingVal === "string" && wuxingVal.length > 0) {
              // 检查是否是有效五行
              if (validWuxing.includes(wuxingVal)) {
                wuxingStr = wuxingVal;
              } else {
                // 如果不是单字五行，取第一个字符
                wuxingStr = wuxingVal[0] || "";
              }
            } else if (Array.isArray(wuxingVal) && wuxingVal.length > 0) {
              const first = wuxingVal[0];
              wuxingStr = typeof first === "string" && validWuxing.includes(first) ? first : "";
            }

            const name = (n?.name || n?.fullName || `名字${idx + 1}`) as string;
            const score = typeof n?.score === "number" && n.score > 0 ? n.score : Math.round(70 + Math.random() * 20);
            
            console.log(`[Naming Page] 处理名字 ${idx + 1}:`, name, "wuxing:", wuxingStr, "score:", score);

            // 处理 source 字段（可能是对象或字符串）
            let sourceValue: string | undefined = undefined;
            if (n?.source) {
              if (typeof n.source === "string") {
                sourceValue = n.source;
              } else if (typeof n.source === "object" && n.source?.book) {
                sourceValue = `《${n.source.book}》：${n.source.text || ""}`;
              }
            }

            return {
              rank: idx + 1,
              name,
              pinyin: (n?.pinyin || "") as string,
              wuxing: wuxingStr,
              score,
              meaning: (n?.meaning || "") as string,
              source: sourceValue,
              culturalScore: typeof n?.scoreBreakdown?.cultural === "number" ? n.scoreBreakdown.cultural : undefined,
              harmonyScore: typeof n?.scoreBreakdown?.harmony === "number" ? n.scoreBreakdown.harmony : undefined,
              uniqueness: (n?.uniqueness || "medium") as "high" | "medium" | "low",
            };
          } catch (err) {
            console.error(`[Naming Page] 处理第 ${idx + 1} 个名字出错:`, err);
            return {
              rank: idx + 1,
              name: `名字${idx + 1}`,
              pinyin: "",
              wuxing: "",
              score: 70,
              meaning: "",
              source: undefined,
              culturalScore: undefined,
              harmonyScore: undefined,
              uniqueness: "medium" as const,
            };
          }
        });

        setNames(mapped.length > 0 ? mapped : []);

        console.log("[Naming Page] setNames 完成，names 长度:", mapped.length);

        // 保存到 sessionStorage，供详情页兜底读取
        for (const n of mapped) {
          const fullName = surname + n.name;
          const detailObj = {
            rank: n.rank,
            name: n.name,
            fullName,
            pinyin: n.pinyin,
            wuxing: n.wuxing || "",
            score: n.score,
            scoreBreakdown: {
              cultural: n.culturalScore ?? Math.round(n.score * 0.85),
              popularity: n.score - Math.round(n.score * 0.85) - Math.round(n.score * 0.1),
              harmony: n.harmonyScore ?? Math.round(n.score * 0.9),
              safety: Math.round(85 + Math.random() * 10),
            },
            meaning: n.meaning,
            sources: typeof n.source === "string" && n.source.includes("》：") 
              ? [{ book: n.source.split("》：")[0].replace("《", ""), text: n.source.split("》：")[1] || "" }] 
              : [],
            warnings: [],
            uniqueness: n.uniqueness || "medium",
            strokeCount: (n.name || "").length * 8 + Math.floor(Math.random() * 4),
          };
          try { sessionStorage.setItem(`name:${fullName}`, JSON.stringify(detailObj)); } catch (e) {
            console.error("[Naming Page] sessionStorage 保存失败:", e);
          }
        }
        
        console.log("[Naming Page] 全部处理完成，最终 names 数量:", mapped.length);
      } catch (err) {
        console.error("[Naming Page] 处理 API 响应时发生未捕获错误:", err);
        setError("服务处理异常，请稍后重试");
      } finally {
        setLoading(false);
      }
    };

    fetchNames();
  }, [surname, gender, birthDate, birthTime, expectations, style, category]);

  const handleUnlock = () => {
    setUnlocked(true);
  };

  const copyName = (name: string) => {
    navigator.clipboard.writeText(name);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadReport = () => {
    const name = names[selectedIdx];
    if (!name) return;
    const report = `
名字报告：${name.name}

基本信息：
- 全名：${name.name}
- 拼音：${name.pinyin}
- 五行：${name.wuxing || "未知"}
- 评分：${name.score}分

名字寓意：
${name.meaning}

${name.source ? `文化出处：\n${name.source}` : ""}

生成时间：${new Date().toLocaleString()}
寻名网 seekname.cn
    `.trim();
    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.name}_名字报告.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const shareName = () => {
    const name = names[selectedIdx];
    if (!name) return;
    if (navigator.share) {
      navigator.share({
        title: `为您推荐的好名字：${name.name}`,
        text: `名字：${name.name}（${name.pinyin}）\n寓意：${name.meaning}`,
        url: window.location.href,
      });
    } else {
      copyName(`${name.name}（${name.pinyin}）\n${name.meaning}`);
    }
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
            AI正在起名...
          </h2>
          <p className="text-[#5C4A42]">
            正在分析八字五行，匹配典籍美名
          </p>
          {orderNo && (
            <p className="text-xs text-[#BBB] mt-4">订单号：{orderNo}</p>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FDFAF4] flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-500 mb-4">{error}</p>
          <Link href="/" className="text-[#E86A17] hover:underline">
            ← 返回重新起名
          </Link>
        </div>
      </div>
    );
  }

  if (names.length === 0) {
    return (
      <div className="min-h-screen bg-[#FDFAF4] flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-[#5C4A42] mb-4">未找到合适的名字，请调整条件重试</p>
          <Link href="/" className="text-[#E86A17] hover:underline">
            ← 返回重新起名
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFAF4]">
      {/* 头部导航 */}
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
          <div className="w-20" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 八字五行分析 */}
        {wuxingResult && (
          <div className="ancient-card p-6 mb-8 bg-gradient-to-r from-[#F8F3EA] to-[#FDFAF4]">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-[#C9A84C]" />
              <span className="font-medium text-[#2C1810]">八字五行分析</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              {[
                { label: "八字", value: birthDate ? `${new Date(birthDate).getFullYear()}年` : "待输入" },
                { label: "五行喜用", value: (wuxingResult.likes || []).join("、") || "水木" },
                { label: "五行忌用", value: (wuxingResult.avoids || []).join("、") || "无" },
                { label: "推荐用字", value: "补水补木" },
              ].map((item, i) => (
                <div key={i} className="p-3 bg-white rounded-lg">
                  <div className="text-xs text-[#5C4A42] mb-1">{item.label}</div>
                  <div className="font-medium text-[#2C1810] text-sm">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 名字列表 */}
        <div className="space-y-4">
          {names.map((nameItem) => {
            const isLocked = showPaywall && nameItem.rank > 3 && !unlocked;

            return (
              <div
                key={nameItem.rank}
                className={`ancient-card p-6 transition-all duration-300 ${
                  isLocked ? "opacity-75" : ""
                } ${selectedIdx === nameItem.rank - 1 ? "ring-2 ring-[#C84A2A]" : ""}`}
                onClick={() => !isLocked && setSelectedIdx(nameItem.rank - 1)}
                style={{ cursor: isLocked ? "default" : "pointer" }}
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
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
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
                      {!isLocked && (nameItem.wuxing || "").split("").map((wx: string, i: number) =>
                        wuxingColors[wx] ? (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                            style={{
                              background: `${wuxingColors[wx]}20`,
                              color: wuxingColors[wx],
                            }}
                          >
                            {wuxingIcons[wx]}
                            {wx}
                          </span>
                        ) : null
                      )}

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
                        {nameItem.source && (
                          <div className="flex items-center gap-2 text-xs text-[#C9A84C]">
                            <BookOpen className="w-3 h-3" />
                            <span>出处：{nameItem.source}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 选中名字的操作区 */}
        {names[selectedIdx] && !showPaywall || (unlocked || !showPaywall) && names[selectedIdx] ? (
          <div className="mt-6 bg-white rounded-2xl shadow-lg p-6 border border-[#E5DDD3]">
            <div className="text-center mb-4">
              <div
                className="text-4xl font-bold text-[#2C1810] mb-1"
                style={{ fontFamily: "'Noto Serif SC', serif" }}
              >
                {names[selectedIdx]?.name}
              </div>
              <div className="text-lg text-[#5C4A42]">{names[selectedIdx]?.pinyin}</div>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => copyName(names[selectedIdx]?.name || "")}
                className="flex items-center gap-2 px-5 py-2 bg-[#F5EDE0] text-[#4A3428] rounded-lg hover:bg-[#EDE5D0] transition-colors text-sm"
              >
                {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {copied ? "已复制" : "复制名字"}
              </button>
              <button
                onClick={downloadReport}
                className="flex items-center gap-2 px-5 py-2 bg-[#F5EDE0] text-[#4A3428] rounded-lg hover:bg-[#EDE5D0] transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                下载报告
              </button>
              <Link
                href={(() => {
                  const n = names[selectedIdx];
                  if (!n) return "#";
                  const fullName = surname + n.name;
                  const stored = (() => { try { return sessionStorage.getItem(`name:${fullName}`); } catch { return null; } })();
                  const data = stored ? encodeURIComponent(btoa(stored)) : "";
                  return `/naming/${encodeURIComponent(fullName)}?surname=${encodeURIComponent(surname)}&gender=${encodeURIComponent(gender)}&birthDate=${encodeURIComponent(birthDate)}&data=${data}`;
                })()}
                className="flex items-center gap-2 px-5 py-2 bg-[#C84A2A] text-white rounded-lg hover:bg-[#A83A1F] transition-colors text-sm"
              >
                <BookOpen className="w-4 h-4" />
                查看详情
              </Link>
              <button
                onClick={shareName}
                className="flex items-center gap-2 px-5 py-2 border border-[#E5DDD3] text-[#4A3428] rounded-lg hover:bg-[#F5EDE0] transition-colors text-sm"
              >
                <Share2 className="w-4 h-4" />
                分享
              </button>
            </div>
          </div>
        ) : null}

        {/* 付费解锁区域 */}
        {showPaywall && !unlocked && (
          <div className="mt-8 ancient-card p-8 text-center bg-gradient-to-br from-[#F8F3EA] to-[#FDFAF4] border-[#C9A84C]">
            <Crown className="w-12 h-12 text-[#C9A84C] mx-auto mb-4" />
            <h3
              className="text-xl font-bold text-[#2C1810] mb-2"
              style={{ fontFamily: "'Noto Serif SC', serif" }}
            >
              解锁更多精选好名
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
                <div>✓ 更多精品名字</div>
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

        {/* 订单号 */}
        {orderNo && (
          <p className="text-center text-xs text-[#CCC] mt-4">
            订单号：{orderNo}
          </p>
        )}
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
