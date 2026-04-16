/**
 * VIP 深度五行分析组件
 * 提供详细的五行相生相克分析和运势解读
 */

"use client";

import { useState } from "react";
import { Crown, TrendingUp, Zap, Shield, Sparkles } from "lucide-react";

interface WuxingChar {
  character: string;
  wuxing: string;
  pinyin?: string;
  meaning?: string;
}

interface WuxingAnalysisProps {
  surname: string;
  chars: WuxingChar[];
  birthDate?: string;
  gender?: "M" | "F";
}

// 五行详细信息
const WUXING_INFO: Record<string, {
  name: string;
  element: string;
  color: string;
  traits: string[];
  suitable: string[];
  unlucky: string[];
  emoji: string;
}> = {
  木: {
    name: "木",
    element: "东方青龙·青色",
    color: "#50C878",
    traits: ["仁慈", "正直", "生长", "向上", "柔和"],
    suitable: ["水", "火"],
    unlucky: ["金"],
    emoji: "🌲",
  },
  火: {
    name: "火",
    element: "南方朱雀·赤色",
    color: "#E74C3C",
    traits: ["热情", "活力", "光明", "积极", "奔放"],
    suitable: ["土", "木"],
    unlucky: ["水"],
    emoji: "🔥",
  },
  土: {
    name: "土",
    element: "中央麒麟·黄色",
    color: "#C9A227",
    traits: ["诚信", "厚重", "稳重", "包容", "诚实"],
    suitable: ["金", "火"],
    unlucky: ["木"],
    emoji: "🏔️",
  },
  金: {
    name: "金",
    element: "西方白虎·白色",
    color: "#95A5A6",
    traits: ["义气", "决断", "刚毅", "勇敢", "坚强"],
    suitable: ["水", "土"],
    unlucky: ["火"],
    emoji: "⚔️",
  },
  水: {
    name: "水",
    element: "北方玄武·黑色",
    color: "#3498DB",
    traits: ["智慧", "灵动", "变通", "机敏", "深沉"],
    suitable: ["金", "木"],
    unlucky: ["土"],
    emoji: "💧",
  },
};

// 五行相生相克
const SHENG: Record<string, string[]> = {
  木: ["火"],
  火: ["土"],
  土: ["金"],
  金: ["水"],
  水: ["木"],
};

const KE: Record<string, string[]> = {
  木: ["土"],
  土: ["水"],
  水: ["火"],
  火: ["金"],
  金: ["木"],
};

export default function WuxingAnalysisPanel({
  surname,
  chars,
  birthDate,
  gender,
}: WuxingAnalysisProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "detail" | "advice">(
    "overview"
  );

  // 提取五行
  const wuxings = chars.map((c) => c.wuxing).filter((w) =>
    ["木", "火", "土", "金", "水"].includes(w)
  );

  // 统计五行分布
  const wuxingCount: Record<string, number> = {};
  wuxings.forEach((w) => {
    wuxingCount[w] = (wuxingCount[w] || 0) + 1;
  });

  // 分析五行关系
  const relations: Array<{
    type: "生" | "克" | "同";
    from: string;
    to: string;
    desc: string;
    isPositive: boolean;
  }> = [];

  for (let i = 0; i < wuxings.length; i++) {
    if (i < wuxings.length - 1) {
      const current = wuxings[i];
      const next = wuxings[i + 1];

      if (SHENG[current]?.includes(next)) {
        relations.push({
          type: "生",
          from: current,
          to: next,
          desc: `${WUXING_INFO[current].emoji} 助 ${WUXING_INFO[next].emoji}`,
          isPositive: true,
        });
      } else if (KE[current]?.includes(next)) {
        relations.push({
          type: "克",
          from: current,
          to: next,
          desc: `${WUXING_INFO[current].emoji} 制 ${WUXING_INFO[next].emoji}`,
          isPositive: false,
        });
      }
    }
    // 检查是否连续相同
    if (i < wuxings.length - 1 && wuxings[i] === wuxings[i + 1]) {
      relations.push({
        type: "同",
        from: wuxings[i],
        to: wuxings[i],
        desc: `${WUXING_INFO[wuxings[i]].emoji} 叠加强化`,
        isPositive: true,
      });
    }
  }

  // 计算五行平衡度
  const totalCount = wuxings.length || 1;
  const balanceScore = Math.round(
    100 - Math.abs(wuxingCount["木"] || 0 - totalCount / 5) * 20 -
      Math.abs(wuxingCount["火"] || 0 - totalCount / 5) * 20 -
      Math.abs(wuxingCount["土"] || 0 - totalCount / 5) * 20 -
      Math.abs(wuxingCount["金"] || 0 - totalCount / 5) * 20 -
      Math.abs(wuxingCount["水"] || 0 - totalCount / 5) * 20
  );

  // 生成建议
  const getAdvice = () => {
    const advices: string[] = [];

    // 五行缺失建议
    const allWuxings = ["木", "火", "土", "金", "水"];
    const missing = allWuxings.filter((w) => !wuxingCount[w]);

    if (missing.length > 0) {
      missing.forEach((w) => {
        const info = WUXING_INFO[w];
        if (w === "木") advices.push(`五行缺木：宜用${info.traits.join("、")}的字，可多接触绿色植物或木质物品`);
        if (w === "火") advices.push(`五行缺火：宜用${info.traits.join("、")}的字，可多接触阳光或红色物品`);
        if (w === "土") advices.push(`五行缺土：宜用${info.traits.join("、")}的字，可多接触陶瓷或土地`);
        if (w === "金") advices.push(`五行缺金：宜用${info.traits.join("、")}的字，可多接触金属或白色物品`);
        if (w === "水") advices.push(`五行缺水：宜用${info.traits.join("、")}的字，可多接触水或黑色物品`);
      });
    }

    // 五行过旺建议
    const dominant = Object.entries(wuxingCount)
      .filter(([, count]) => count > totalCount / 3)
      .map(([w]) => w);

    if (dominant.length > 0) {
      dominant.forEach((w) => {
        const info = WUXING_INFO[w];
        const unlucky = info.unlucky[0];
        if (unlucky) {
          advices.push(`五行${w}较旺：宜用${unlucky}属性的字来调和，如${unlucky === "金" ? "鑫、铭、锋" : unlucky === "木" ? "林、森、桐" : unlucky === "水" ? "泽、洋、涛" : unlucky === "火" ? "炎、烨、灿" : "坤、培、基"}等`);
        }
      });
    }

    if (advices.length === 0) {
      advices.push("五行分布较为平衡，整体运势较为和谐");
    }

    return advices;
  };

  return (
    <div className="wuxing-analysis bg-gradient-to-br from-[#2D1B0E] to-[#4A2E18] rounded-2xl p-6 text-white">
      {/* 标题 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4941A] to-[#E86A17] flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-lg" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            深度五行分析
          </h3>
          <p className="text-white/60 text-xs">VIP 专属 · 详细解读</p>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2 mb-6">
        {[
          { key: "overview", label: "五行总览", icon: Crown },
          { key: "detail", label: "相生相克", icon: TrendingUp },
          { key: "advice", label: "运势建议", icon: Zap },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
              activeTab === tab.key
                ? "bg-white/20 text-white"
                : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 五行总览 */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {/* 五行分布图 */}
          <div className="grid grid-cols-5 gap-2">
            {["木", "火", "土", "金", "水"].map((wx) => {
              const count = wuxingCount[wx] || 0;
              const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
              const info = WUXING_INFO[wx];

              return (
                <div key={wx} className="text-center">
                  <div
                    className="w-full rounded-lg p-2 mb-1 transition-all"
                    style={{
                      background: `${info.color}30`,
                      minHeight: `${Math.max(40, percentage * 2)}px`,
                    }}
                  >
                    <span className="text-lg">{info.emoji}</span>
                  </div>
                  <div className="text-xs font-medium">{wx}</div>
                  <div className="text-xs text-white/50">
                    {count > 0 ? `${count}个` : "无"}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 平衡度 */}
          <div className="p-4 rounded-xl bg-white/10 backdrop-blur">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/80">五行平衡度</span>
              <span
                className={`text-lg font-bold ${
                  balanceScore >= 70
                    ? "text-green-400"
                    : balanceScore >= 50
                    ? "text-yellow-400"
                    : "text-red-400"
                }`}
              >
                {balanceScore}%
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${balanceScore}%`,
                  background:
                    balanceScore >= 70
                      ? "#50C878"
                      : balanceScore >= 50
                      ? "#F1C40F"
                      : "#E74C3C",
                }}
              />
            </div>
            <p className="text-xs text-white/50 mt-2">
              {balanceScore >= 70
                ? "五行分布较为平衡，整体运势和谐"
                : balanceScore >= 50
                ? "五行略有偏颇，建议注意调和"
                : "五行分布不均，需要特别注意调理"}
            </p>
          </div>

          {/* 详细属性 */}
          <div className="grid grid-cols-1 gap-3">
            {wuxings.map((wx, i) => {
              const info = WUXING_INFO[wx];
              const char = chars[i];

              return (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-white/5 backdrop-blur"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{info.emoji}</span>
                    <span className="font-medium">{char.character}</span>
                    <span className="text-sm text-white/60">{wx}属性</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {info.traits.map((trait) => (
                      <span
                        key={trait}
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: `${info.color}30` }}
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 相生相克 */}
      {activeTab === "detail" && (
        <div className="space-y-4">
          {/* 五行关系图 */}
          <div className="p-4 rounded-xl bg-white/10 backdrop-blur">
            <h4 className="text-sm text-white/80 mb-3">名字中五行流转</h4>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {wuxings.map((wx, i) => {
                const info = WUXING_INFO[wx];

                return (
                  <div key={i} className="flex items-center">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                      style={{ background: `${info.color}40` }}
                    >
                      {info.emoji}
                    </div>
                    {i < wuxings.length - 1 && (
                      <div className="mx-1">
                        {relations.find(
                          (r) =>
                            r.from === wx &&
                            relations.indexOf(r) === i &&
                            r.type !== "同"
                        )?.type === "生" ? (
                          <span className="text-green-400">→</span>
                        ) : relations.find(
                            (r) =>
                              r.from === wx &&
                              relations.indexOf(r) === i &&
                              r.type !== "同"
                          )?.type === "克" ? (
                          <span className="text-red-400">⭢</span>
                        ) : (
                          <span className="text-white/40">·</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 关系列表 */}
          <div className="space-y-2">
            <h4 className="text-sm text-white/80">五行关系详解</h4>
            {relations.length > 0 ? (
              relations.map((rel, i) => {
                const fromInfo = WUXING_INFO[rel.from];
                const toInfo = WUXING_INFO[rel.to];

                return (
                  <div
                    key={i}
                    className={`p-3 rounded-lg flex items-center gap-3 ${
                      rel.isPositive ? "bg-green-900/30" : "bg-red-900/30"
                    }`}
                  >
                    <span className="text-xl">{fromInfo.emoji}</span>
                    <div className="flex-1">
                      <div
                        className={`text-sm font-medium ${
                          rel.isPositive ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {rel.type === "生"
                          ? `相生 · ${fromInfo.name}生${toInfo.name}`
                          : rel.type === "克"
                          ? `相克 · ${fromInfo.name}克${toInfo.name}`
                          : `${fromInfo.name}重叠加强`}
                      </div>
                      <div className="text-xs text-white/60">
                        {rel.type === "生"
                          ? `${fromInfo.name}属性促进${toInfo.name}属性发展`
                          : rel.type === "克"
                          ? `${fromInfo.name}属性抑制${toInfo.name}属性`
                          : `同属性叠加，增强力量`}
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        rel.isPositive
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {rel.isPositive ? "吉" : "需注意"}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-white/50 py-4">
                暂无明显的五行生克关系
              </p>
            )}
          </div>

          {/* 相生相克表 */}
          <div className="p-4 rounded-xl bg-white/5">
            <h4 className="text-sm text-white/80 mb-3">五行生克规律</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-green-400 font-medium">相生：</span>
                <span className="text-white/70">
                  木生火🔥 → 火生土🏔️ → 土生金⚔️ → 金生水💧 → 水生木🌲
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-red-400 font-medium">相克：</span>
                <span className="text-white/70">
                  木克土🏔️ → 土克水💧 → 水克火🔥 → 火克金⚔️ → 金克木🌲
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 运势建议 */}
      {activeTab === "advice" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white/10 backdrop-blur">
            <h4 className="text-sm text-white/80 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              起名建议
            </h4>
            <div className="space-y-3">
              {getAdvice().map((advice, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-3 rounded-lg bg-white/5"
                >
                  <span className="w-5 h-5 rounded-full bg-[#E86A17]/30 flex items-center justify-center text-xs text-[#E86A17] shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm text-white/90 leading-relaxed">
                    {advice}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 性格特点 */}
          <div className="p-4 rounded-xl bg-white/5">
            <h4 className="text-sm text-white/80 mb-3">性格特点分析</h4>
            <div className="flex flex-wrap gap-2">
              {wuxings.flatMap((wx) => WUXING_INFO[wx].traits).filter((v, i, a) => a.indexOf(v) === i).map((trait) => (
                <span
                  key={trait}
                  className="px-3 py-1 rounded-full text-sm"
                  style={{ background: "rgba(255,255,255,0.1)" }}
                >
                  {trait}
                </span>
              ))}
            </div>
          </div>

          {/* 幸运数字 */}
          <div className="p-4 rounded-xl bg-white/5">
            <h4 className="text-sm text-white/80 mb-3">幸运指引</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-white/5">
                <div className="text-white/50 mb-1">幸运数字</div>
                <div className="text-lg font-bold text-[#D4941A]">
                  {wuxings[0] === "木"
                    ? "3、8"
                    : wuxings[0] === "火"
                    ? "2、7"
                    : wuxings[0] === "土"
                    ? "5、0"
                    : wuxings[0] === "金"
                    ? "4、9"
                    : wuxings[0] === "水"
                    ? "1、6"
                    : "随机"}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-white/5">
                <div className="text-white/50 mb-1">幸运颜色</div>
                <div className="text-lg font-bold">
                  {wuxings[0] === "木"
                    ? "🟢 绿色"
                    : wuxings[0] === "火"
                    ? "🔴 红色"
                    : wuxings[0] === "土"
                    ? "🟡 黄色"
                    : wuxings[0] === "金"
                    ? "⚪ 白色"
                    : wuxings[0] === "水"
                    ? "🔵 蓝色"
                    : "随机"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
