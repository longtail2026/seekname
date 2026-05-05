/**
 * 好名测试 · 智能名字体检 API
 * POST /api/evaluate
 *
 * 支持全类型：人名/英文名/外国人中文名/网名/公司名/品牌名/跨境名/宠物名/艺名/作品名
 * 6 维度评分（每项0-10分，总分60）+ 星级 + 最终评价
 */
import { NextRequest, NextResponse } from "next/server";

/* ─────────── 类型定义 ─────────── */
export interface DimensionScore {
  label: string;
  labelEn: string;
  score: number; // 0-10
  reason: string;
}

export interface EvaluateResponse {
  name: string;
  type: string;
  total: number; // 总分 0-60
  stars: number; // 1-5
  dimensions: DimensionScore[];
  summary: string;
  /** 降级标记（AI不可用时） */
  degraded?: boolean;
}

/* ─────────── 支持的类型 ─────────── */
const NAME_TYPES = [
  { id: "person",      label: "人名（宝宝/成人）",    labelEn: "Person Name" },
  { id: "english",     label: "英文名",              labelEn: "English Name" },
  { id: "chinese",     label: "外国人中文名",        labelEn: "Chinese Name for Foreigners" },
  { id: "social",      label: "社交网名",            labelEn: "Social Username" },
  { id: "company",     label: "公司名/品牌名",       labelEn: "Company/Brand Name" },
  { id: "crossborder", label: "跨境电商英文名",      labelEn: "Cross-border EN Name" },
  { id: "pet",         label: "宠物名",             labelEn: "Pet Name" },
  { id: "stage",       label: "艺名/笔名/游戏ID",   labelEn: "Stage/Pen/Gamer Name" },
  { id: "work",        label: "作品名（文章/影视）",labelEn: "Work Title" },
];

function getTypeLabel(typeId: string): string {
  return NAME_TYPES.find((t) => t.id === typeId)?.label || typeId;
}

/* ─────────── 请求体 ─────────── */
interface EvaluateBody {
  name: string;
  type?: string;
  info?: string; // 性别/行业/风格等额外信息
}

/* ─────────── 维度定义 ─────────── */
const DIMENSION_KEYS: { id: string; label: string; labelEn: string }[] = [
  { id: "sound",      label: "好听度（音律）",      labelEn: "Euphony" },
  { id: "meaning",    label: "寓意度（内涵）",      labelEn: "Meaning" },
  { id: "recognition",label: "辨识度（记忆传播）",  labelEn: "Recognition" },
  { id: "uniqueness", label: "独特性（重名率）",     labelEn: "Uniqueness" },
  { id: "safety",     label: "安全无歧义",          labelEn: "Safety" },
  { id: "fit",        label: "场景适配度",          labelEn: "Fit" },
];

/* ══════════════════════════════════════════════════
   AI 评测（优先） - 调用 DeepSeek
   ══════════════════════════════════════════════════ */
async function evaluateWithAI(
  name: string,
  typeLabel: string,
  info: string
): Promise<EvaluateResponse | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;

  const infoLine = info ? `性别/行业/风格：${info}` : "";
  const prompt = `你是专业的名字测评师，负责对用户输入的名字进行多维度体检打分。

名字：${name}
类型：${typeLabel}
${infoLine}

请按6个维度评分（每项0-10分，总分60），并给出简短明确理由：
1. 好听度（音律）：发音顺口吗？平仄和谐吗？会不会绕口？
2. 寓意度（内涵）：字义吉利吗？积极正面吗？有文化感吗？
3. 辨识度（好记好读）：好记吗？好写吗？好读吗？适合社交/品牌传播？
4. 独特性（不撞名）：是否烂大街？是否容易撞名？品牌/ID是否干净？
5. 安全无歧义（无负面、无不雅谐音）：有无歧义？有无不雅谐音？有无贬义、低俗、尴尬含义？
6. 场景适配度（适合该类型使用）：人名是否适合性别/气质；公司名是否适合行业；跨境名是否符合海外文化；网名是否符合风格；宠物名是否可爱顺口。

输出要求：
- 专业、简洁、中肯
- 必须给分 + 给理由
- 最后给出总评与建议（一段话，40-120字）
- 不迷信、不封建、只从现代语言学与使用体验评测

请返回 JSON 格式（纯 JSON，不要 markdown 代码块）：
{
  "dimensions": [
    {"label": "好听度（音律）", "score": 8, "reason": "发音流畅，音律和谐，朗朗上口。"},
    {"label": "寓意度（内涵）", "score": 9, "reason": "字义积极向上，内涵美好。"},
    {"label": "辨识度（记忆传播）", "score": 8, "reason": "简洁好记，易于传播。"},
    {"label": "独特性（重名率）", "score": 8, "reason": "小众不撞名，辨识度高。"},
    {"label": "安全无歧义", "score": 10, "reason": "无负面、无不雅谐音，非常安全。"},
    {"label": "场景适配度", "score": 8, "reason": "非常适合本场景，气质匹配。"}
  ],
  "summary": "这是一个高分优质好名，好听、好记、寓意吉利、无歧义，非常适合使用。"
}`;

  try {
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "你是专业的名字测评师，负责对用户输入的名字进行多维度体检打分。只返回纯 JSON，不要任何其他文字或 markdown 格式。",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[evaluate/ai] API 请求失败: ${response.status} ${errText.substring(0, 200)}`);
      return null;
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content || "";
    if (!content) {
      console.warn("[evaluate/ai] 返回空内容");
      return null;
    }

    // 解析 JSON
    let jsonStr = content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    const parsed = JSON.parse(jsonStr) as {
      dimensions?: { label: string; score: number; reason: string }[];
      summary?: string;
    };

    if (!parsed.dimensions?.length) {
      console.warn("[evaluate/ai] 维度数据为空");
      return null;
    }

    const dimensions: DimensionScore[] = parsed.dimensions.map((d) => ({
      label: d.label,
      labelEn: "",
      score: Math.max(0, Math.min(10, Math.round(d.score))),
      reason: d.reason || "",
    }));

    const total = dimensions.reduce((s, d) => s + d.score, 0);
    const roundedTotal = Math.round(total);
    const stars = Math.max(1, Math.min(5, Math.round(roundedTotal / 12)));

    return {
      name,
      type: typeLabel,
      total: roundedTotal,
      stars,
      dimensions,
      summary: parsed.summary || "名字整体表现良好。",
    };
  } catch (err) {
    console.error("[evaluate/ai] 调用异常:", err);
    return null;
  }
}

/* ══════════════════════════════════════════════════
   降级评分（AI 不可用时）
   ══════════════════════════════════════════════════ */
function fallbackEvaluate(name: string, typeLabel: string, info: string): EvaluateResponse {
  const lower = name.toLowerCase();
  const chars = name.replace(/\s+/g, "");

  // 1. 好听度
  let sound = 7;
  const len = chars.length;
  if (len <= 1) sound = 5; // 单字太短
  else if (len >= 8) sound = 6; // 太长
  else if (len === 2 || len === 3) sound = 8;

  // 检测重复字
  const uniqueChars = new Set(chars);
  if (uniqueChars.size < chars.length) sound = Math.max(4, sound - 2);

  // 检测是否有常见流畅模式
  const hasVowels = /[aeiouáàâãéèêíìîóòôõúùûüAEIOUÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÜ]/.test(name);
  if (hasVowels) sound = Math.min(10, sound + 1);

  // 英文字母连续辅音检测
  const consonantClusters = name.match(/[bcdfghjklmnpqrstvwxyz]{4,}/gi);
  if (consonantClusters) sound = Math.max(3, sound - 3);

  // 2. 寓意度
  let meaningScore = 6;
  // 检查是否存在正面含义的常见字/词
  const positiveCN = /[吉祥福禄寿喜美好恩爱乐和康宁安顺达兴盛富贵艳芳秀美佳丽睿智慧明德仁正义诚信谦和善]/;
  const positiveEN = /\b(good|great|fine|happy|joy|wise|noble|bright|grace|hope|love|peace|star|sun|moon|sky|gold|gem|rose|lily)\b/i;
  if (positiveCN.test(name) || positiveEN.test(name)) meaningScore = 8;

  // 3. 辨识度
  let recognition = 7;
  if (len >= 5) recognition = 6; // 偏长
  if (len >= 8) recognition = 4; // 太长
  if (len <= 2) recognition = 9; // 简短好记
  // 特殊字符检测
  if (/[@#\$%^&*()_+={}\[\]|\\:;"'<>,.?/~`]/.test(name)) recognition = Math.max(3, recognition - 3);

  // 4. 独特性
  let uniqueness = 6;
  // 常见中文名用字
  if (/[伟娜丽静婷勇军杰磊磊国建华平明英]/.test(name)) uniqueness = 4;
  // 常见英文名
  if (/\b(mike|john|tom|bob|jane|lily|lucy|jack|rose)\b/i.test(name)) uniqueness = 3;
  // 独特的长尾名字
  if (len >= 4 && uniqueChars.size >= len * 0.75) uniqueness = 8;

  // 5. 安全无歧义
  let safety = 8;
  // 检测负面词
  const negativeCN = /[死伤病残痛灾难穷苦败臭毒淫邪魔]|傻|笨|丑|脏|臭|烂|坏|贱|妓|奴|匪|盗/;
  const negativeEN = /\b(kill|die|death|pain|sick|poor|evil|devil|hell|damn|shit|fuck|crap|stupid|ugly|bad|sad|mad)\b/i;
  if (negativeCN.test(name) || negativeEN.test(name)) safety = 3;

  // 不雅谐音检测
  const badHomophones = /\b(wang|dan|dick|ass|butt|sex|gay|hoe|hoe|bitch|suck|piss)\b/i;
  if (badHomophones.test(name)) safety = 2;

  // 6. 场景适配度
  let fit = 7;
  const infoLower = info.toLowerCase();
  if (typeLabel.includes("人名") || typeLabel.includes("Person")) {
    if (infoLower.includes("女") && /[花娜丽艳淑]/.test(name)) fit = 9;
    if (infoLower.includes("男") && /[刚strong强伟杰龙]/.test(name)) fit = 9;
  }
  if (typeLabel.includes("公司") || typeLabel.includes("商场")) {
    if (/[科技技有限公司集团控股商贸]/.test(name)) fit = 8;
  }
  if (typeLabel.includes("宠物") || typeLabel.includes("Pet")) {
    if (len <= 4) fit = 9;
  }
  if (typeLabel.includes("跨境")) {
    if (!/[a-zA-Z]/.test(name)) fit = 5;
    else if (len >= 3 && len <= 8) fit = 9;
  }
  if (typeLabel.includes("作品") || typeLabel.includes("Work")) {
    if (len >= 4 && len <= 12) fit = 8;
  }

  const dimensions: DimensionScore[] = [
    { label: "好听度（音律）", labelEn: "Euphony", score: sound, reason: getFallbackSoundReason(sound, chars) },
    { label: "寓意度（内涵）", labelEn: "Meaning", score: meaningScore, reason: getFallbackMeaningReason(meaningScore) },
    { label: "辨识度（记忆传播）", labelEn: "Recognition", score: recognition, reason: getFallbackRecognitionReason(recognition, chars) },
    { label: "独特性（重名率）", labelEn: "Uniqueness", score: uniqueness, reason: getFallbackUniquenessReason(uniqueness) },
    { label: "安全无歧义", labelEn: "Safety", score: safety, reason: getFallbackSafetyReason(safety) },
    { label: "场景适配度", labelEn: "Fit", score: fit, reason: getFallbackFitReason(fit, typeLabel, info) },
  ];

  const total = dimensions.reduce((s, d) => s + d.score, 0);
  const stars = Math.max(1, Math.min(5, Math.round(total / 12)));

  const summary = total >= 48
    ? "这是一个高分优质好名，好听、好记、寓意吉利、无歧义，非常适合使用。"
    : total >= 36
    ? "名字整体表现不错，大多数维度表现良好，有一定使用价值。"
    : total >= 24
    ? "名字有部分优点，但存在一些需要注意的问题，建议综合考虑。"
    : "名字存在较多问题，建议重新考虑其他更合适的选择。";

  return { name, type: typeLabel, total, stars, dimensions, summary, degraded: true };
}

/* ───── 降级理由生成 ───── */
function getFallbackSoundReason(score: number, chars: string): string {
  if (score >= 8) return "发音流畅，音律和谐，朗朗上口。";
  if (score >= 6) return "发音较顺口，整体音律无明显问题。";
  if (chars.length <= 1) return "单字名过短，音律变化有限。";
  if (chars.length >= 8) return "名字偏长，可能不够朗朗上口。";
  return "发音尚可，但音律搭配有改进空间。";
}
function getFallbackMeaningReason(score: number): string {
  if (score >= 8) return "字义积极向上，内涵美好，富有正能量。";
  if (score >= 6) return "字义中性偏正面，有一定积极含义。";
  return "字义方面可以进一步优化。";
}
function getFallbackRecognitionReason(score: number, chars: string): string {
  if (score >= 8) return "简洁好记，易于书写和传播。";
  if (score >= 6) return "辨识度中等，较容易被记住。";
  if (chars.length >= 8) return "名字偏长，可能影响记忆和传播效率。";
  if (/[@#\$%^&*()_+={}\[\]|\\:;"'<>,.?/~`]/.test(chars)) return "含特殊字符，可能影响传播便利性。";
  return "辨识度一般，可考虑简化以便传播。";
}
function getFallbackUniquenessReason(score: number): string {
  if (score >= 8) return "小众不撞名，辨识度高。";
  if (score >= 6) return "有一定独特性，重名风险中等。";
  return "较为常见，可能容易与他人重名。";
}
function getFallbackSafetyReason(score: number): string {
  if (score >= 9) return "无负面、无不雅谐音，非常安全。";
  if (score >= 7) return "安全性较好，无明显的负面含义。";
  if (score >= 5) return "需要留意是否存在不雅谐音或歧义。";
  return "存在不雅谐音或负面含义，建议修改！";
}
function getFallbackFitReason(score: number, typeLabel: string, info: string): string {
  if (score >= 8) return `非常适合${typeLabel}场景，气质匹配。`;
  if (score >= 6) return `基本适合${typeLabel}场景使用。`;
  return `与${typeLabel}场景的匹配度一般，可能需要调整。`;
}

/* ══════════════════════════════════════════════════
   POST 入口
   ══════════════════════════════════════════════════ */
export async function POST(req: NextRequest) {
  try {
    const { name, type, info }: EvaluateBody = await req.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "名字不能为空" }, { status: 400 });
    }

    const trimmedName = name.trim();
    const typeLabel = getTypeLabel(type || "person");
    const extraInfo = info?.trim() || "";

    // 优先尝试 AI 评测
    const aiResult = await evaluateWithAI(trimmedName, typeLabel, extraInfo);
    if (aiResult) {
      return NextResponse.json(aiResult, { status: 200 });
    }

    // AI 不可用 → 降级到规则评分
    console.log(`[evaluate] AI 不可用，使用降级评分: name=${trimmedName}, type=${typeLabel}`);
    const fallbackResult = fallbackEvaluate(trimmedName, typeLabel, extraInfo);
    return NextResponse.json(fallbackResult, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/evaluate] 错误:", msg);

    // 即使整个崩溃也要返回降级结果
    return NextResponse.json({
      name: "",
      type: "未知",
      total: 0,
      stars: 1,
      dimensions: [],
      summary: "评测服务暂不可用，请稍后重试。",
      degraded: true,
    } satisfies EvaluateResponse, { status: 200 });
  }
}