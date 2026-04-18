/**
 * AI Composer - Layer 4：AI 创意组合层
 *
 * 职责：替代原有的双重循环机械拼字，
 *       让大模型从候选字池中智能选字、组合、撰写寓意。
 *
 * 核心流程：
 *  1. 构建 Prompt（场景化）
 *  2. 调用 DeepSeek 生成名字组合
 *  3. 解析 JSON 结果
 *  4. 后验：验证字在字池中存在 + 音律评分 + 敏感词二次检查
 *  5. Fallback：LLM 失败时降级到原有双重循环
 *
 * 场景支持：baby / adult / company / brand / shop / pet
 */

import { prisma } from "./prisma";
import { PhoneticOptimizer } from "./phonetic-optimizer";
import {
  CharacterInfo,
  NameCandidate,
  StructuredIntent,
} from "./naming-engine";
import {
  DeepSeekIntegration,
  checkSafetyWithDeepSeek,
  polishNameWithDeepSeek,
} from "./deepseek-integration";
import { computeRealScores, computeRealScoresBatch } from "./name-scorer";

// ============================================================
// 类型定义
// ============================================================

export type NamingScenario =
  | "baby"        // 宝宝起名
  | "adult"       // 成人改名
  | "company"     // 公司起名
  | "brand"       // 品牌起名
  | "shop"        // 店铺起名
  | "pet";        // 宠物起名

export interface AiComposerConfig {
  scenario: NamingScenario;
  /** LLM 失败时是否降级到规则循环 */
  fallbackToRules: boolean;
  /** 最多生成多少个候选名 */
  maxCandidates: number;
  /** 目标字数 */
  wordCount: 2 | 3;
}

// LLM 返回的单个名字结构（对应 JSON 输出格式）
interface LLMNameEntry {
  name: string;           // 全名（不含姓，用于人名；含品牌全称，用于商业）
  characters: string[];   // 组成该名的单字数组
  pinyin?: string;        // 拼音（可选，LLM 自填）
  meaning: string;        // 名字寓意（50字以内）
  source?: string;        // 出处（如"《诗经》"）
  source_text?: string;    // 出处原文
  phonetic_pattern?: string; // 平仄模式（如"平仄平"）
  notes?: string;         // 备注/补充说明
}

// ============================================================
// Prompt 构建工具
// ============================================================

/**
 * 构建 AI 组合 Prompt
 * 根据场景不同，System Prompt 和 User Prompt 有所区别
 */
function buildCompositionPrompt(
  config: AiComposerConfig,
  intent: StructuredIntent,
  poolSummary: string
): { system: string; user: string } {
  const { scenario, wordCount } = config;

  const scenarios: Record<NamingScenario, { system: string; userBase: string }> = {
    baby: {
      system: `你是一位博古通今的起名大师，擅长从古典典籍中汲取灵感，为宝宝起一个好名字。

你的命名哲学：
1. 名字要有出处有典故，不能凭空臆造
2. 音律要和谐流畅，平仄相间，避免拗口
3. 寓意要积极美好，有文化内涵
4. 组合后的名字要有整体意境，而非字义的简单堆叠

请严格按以下 JSON 格式输出（只输出 JSON，不要任何其他文字）：
[
  {
    "name": "名字（如"沐涵"，不含姓）",
    "characters": ["沐", "涵"],
    "meaning": "寓意解释（30字以内）",
    "source": "《诗经》",
    "source_text": "原文摘录（20字以内）",
    "phonetic_pattern": "平仄模式"
  }
]`,
      userBase: `请为姓氏"${intent.surname}"的${intent.gender === "F" ? "女孩" : "男孩"}起${wordCount}字名。

【硬性约束 - 必须全部满足】
1. 性别合适：${intent.gender === "F" ? "女孩名，禁用刚强/男性化字（如铮/锐/钧/锋/鑫/钧/烈/炎/烽），必须用柔美/灵秀字（如涵/瑶/琳/汐/桐/岚/晴/婷/雅/婉）" : "男孩名，用大气/稳重字，禁用过于阴柔字"}
2. 意象契合：${intent.imagery?.length ? `名字要体现「${intent.imagery.join("、")}」的意境，如用户说"温柔"则名字要给人柔美感觉，用户说"聪慧"则名字要有灵气` : "名字要朗朗上口，有美好寓意"}
3. 五行平衡：${intent.wuxing?.join("、") || "无特定"}（两个字不要全是同五行，鼓励金木/金水/木水/水火等组合）
4. 避免同部首：两个字不要同偏旁（如金金、火火、木木结构）

用户补充期望：${intent.notes || "无"}
忌讳：${intent.avoidances?.join("、") || "无"}

候选字池（字·拼音·五行·含义·出处）：
${poolSummary}

请生成 ${config.maxCandidates} 个符合要求的名字，每个字必须来自候选字池。
【硬性约束 - 必须全部满足】
1. 性别合适：${intent.gender === "F" ? "女孩名，禁用刚强/男性化字，必须用柔美/灵秀字" : "男孩名，用大气/稳重字"}
2. 两个字必须部首不同！绝对不能出现两个金字旁（如"铭鑫""锐钧"）、两个木旁、两个水旁等。
3. 五行搭配要求：两个字不要全是同五行，鼓励金木/金水/木水/水火等组合。
4. 意象契合：${intent.imagery?.length ? `名字要体现「${intent.imagery.join("、")}」的意境` : "名字要朗朗上口，有美好寓意"}
【加分项】有典籍出处、名字有诗意有画面感、音律好听。
输出严格 JSON 数组，不要输出其他内容。`,
    },

    adult: {
      system: `你是一位专业的改名顾问，擅长为成年人起一个有内涵、有气场的新名字。

命名原则：
1. 名字要有力量感或优雅感，适合职场或社交使用
2. 音律要响亮好听，避免绕口
3. 寓意要积极向上，有个人成长感
4. 可以有典籍出处，也可以是现代感的创意组合

输出严格 JSON 数组，不要任何其他文字：
[
  {
    "name": "名字",
    "characters": ["字1", "字2"],
    "meaning": "寓意（30字以内）",
    "source": "出处（无则写"无典故"）",
    "phonetic_pattern": "平仄"
  }
]`,
      userBase: `请为姓氏"${intent.surname}"的成年人起${wordCount}字名（改名用）。

用户期望：
- 风格：${intent.style?.join("、") || "大气稳重"}
- 五行：${intent.wuxing?.join("、") || "无特定"}
- 意象：${intent.imagery?.join("、") || "无特定"}

候选字池：
${poolSummary}

【硬性约束】
1. 两个字必须部首不同，禁止两个金字旁/两个木旁/两个水旁/两个火旁/两个土旁。
2. 五行搭配尽量多样化：两个字不要同属一行（如金+金、木+木），五行平衡的名字更有气场。
输出严格 JSON 数组，不要输出其他内容。`,
    },

    company: {
      system: `你是一位资深品牌策划师，擅长为公司、产品起一个响亮、好记、有辨识度的名字。

命名原则：
1. 好读好记：两个字或三个字，朗朗上口
2. 有内涵：寓意清晰，能传递品牌价值
3. 无歧义：避免谐音、歧义问题（普通话 + 粤语 + 闽南语）
4. 简洁有力：去掉一切可有可无的字

输出严格 JSON 数组，不要任何其他文字：
[
  {
    "name": "公司/品牌名",
    "characters": ["字1", "字2"],
    "meaning": "名字含义（30字以内）",
    "source": "灵感来源",
    "phonetic_pattern": "读音特点"
  }
]`,
      userBase: `请为一家${intent.industry || "科技"}行业的公司起名。

用户期望：
- 行业：${intent.industry || "科技"}
- 调性：${intent.brandTone?.join("、") || "现代、专业"}
- 目标受众：${intent.targetAudience || "商务人士"}
- 字数：${wordCount}字

候选字池：
${poolSummary}

请生成 ${config.maxCandidates} 个有商业感、响亮好听的公司名，输出严格 JSON 数组。`,
    },

    brand: {
      system: `你是一位顶级品牌命名专家，擅长为品牌起一个独特、有记忆点的名字。

命名原则：
1. 独特性强：一听就记住，不容易混淆
2. 发音响亮：普通话和粤语都要好听
3. 含义清晰：用户一听名字就能感知品牌调性
4. 适合传播：两个字最佳，三个字也可

输出严格 JSON 数组，不要任何其他文字：
[
  {
    "name": "品牌名",
    "characters": ["字1", "字2"],
    "meaning": "名字含义（30字以内）",
    "source": "灵感来源"
  }
]`,
      userBase: `请为品牌起名。

用户期望：
- 行业：${intent.industry || "消费品"}
- 调性：${intent.brandTone?.join("、") || "年轻、活力"}
- 是否需要英文配套：${intent.needEnglish ? "需要" : "不需要"}
- 字数：${wordCount}字

候选字池：
${poolSummary}

请生成 ${config.maxCandidates} 个品牌名，输出严格 JSON 数组。`,
    },

    shop: {
      system: `你是一位店铺起名专家，擅长为线下门店起一个温馨、有记忆点的名字。

命名原则：
1. 亲切好记：让顾客一眼记住
2. 行业相关：名字要能感知所属行业
3. 吉祥寓意：店铺名通常希望带来好运
4. 字数：2-3字最佳

输出严格 JSON 数组，不要任何其他文字。`,
      userBase: `请为一家${intent.industry || "餐饮"}店铺起名。

用户期望：
- 行业：${intent.industry || "餐饮"}
- 地域：${intent.region || "全国"}
- 字数：${wordCount}字

候选字池：
${poolSummary}

请生成 ${config.maxCandidates} 个店铺名，输出严格 JSON 数组。`,
    },

    pet: {
      system: `你是一位充满创意的宠物起名师，擅长为猫猫狗狗起一个可爱、有趣、响亮的名字。

命名原则：
1. 好叫：名字尾音要有力（如"米"、"妮"、"卡"），宠物容易响应
2. 有趣：可以有拟人化、拟物化的创意
3. 简短：1-2个字最佳
4. 寓意：可以温馨、呆萌、霸气或优雅

输出严格 JSON 数组，不要任何其他文字：
[
  {
    "name": "宠物名（不含姓）",
    "characters": ["字1", "字2"],
    "meaning": "名字含义/由来（20字以内）",
    "source": "灵感来源",
    "phonetic_pattern": "发音特点"
  }
]`,
      userBase: `请为一只${intent.petType || "猫"}起名。

宠物信息：
- 类型：${intent.petType || "猫"}
- 性格：${intent.petPersonality || "活泼可爱"}
- 主人偏好：${intent.style?.join("、") || "可爱好听"}

候选字池：
${poolSummary}

请生成 ${config.maxCandidates} 个适合宠物的名字，输出严格 JSON 数组。`,
    },
  };

  const { system, userBase } = scenarios[scenario];
  return { system, user: userBase };
}

/**
 * 将候选字池转换为摘要字符串（给 LLM 看）
 * 只取 Top N，太多 token 浪费
 */
function buildPoolSummary(
  pool: CharacterInfo[],
  maxChars: number = 40
): string {
  const topChars = pool.slice(0, maxChars);
  return topChars
    .map((c) => {
      const pinyin = c.pinyin ? `（${c.pinyin}）` : "";
      const wuxing = c.wuxing ? `·${c.wuxing}` : "";
      const meaning = c.meaning ? `·${c.meaning}` : "";
      const source = c.source ? `·出${c.source}` : "";
      return `${c.character}${pinyin}${wuxing}${meaning}${source}`;
    })
    .join("\n");
}

// ============================================================
// 核心函数
// ============================================================

/**
 * AI 组合层主函数
 *
 * @param pool         Layer 2/3 输出的候选字池
 * @param intent       结构化意图（Layer 1 输出）
 * @param config       场景配置
 * @param surname      姓氏（人名场景需要）
 * @returns            AI 组合生成的名字候选列表
 */
export async function aiCompose(
  pool: CharacterInfo[],
  intent: StructuredIntent,
  config: AiComposerConfig,
  surname?: string
): Promise<NameCandidate[]> {
  console.log(`[AI Composer] 开始，场景=${config.scenario}，字池大小=${pool.length}`);

  // 0. 保护检查
  if (pool.length < 2) {
    console.warn("[AI Composer] 字池太小，降级到规则循环");
    return config.fallbackToRules
      ? await fallbackRuleBasedCompose(pool, intent, config, surname)
      : [];
  }

  // 1. 构建 Prompt
  const poolSummary = buildPoolSummary(pool);
  const { system, user } = buildCompositionPrompt(config, intent, poolSummary);

  console.log(`[AI Composer] 字池摘要长度=${poolSummary.length} chars`);

  // 2. 调用 DeepSeek（9.5秒超时，留 0.5s 给 Vercel 函数退出处理）
  if (!DeepSeekIntegration.isAvailable()) {
    const p = resolveApiProvider();
    console.warn(`[AI Composer] ${providerNameMap[p] || p} API 不可用，降级到规则循环`);
    return config.fallbackToRules
      ? await fallbackRuleBasedCompose(pool, intent, config, surname)
      : [];
  }

  let entries: any[] = [];
  try {
    const provider = resolveApiProvider();
    const pConfig = PROVIDER_CONFIG[provider];
    console.log(`[AI Composer] 调用 ${providerNameMap[provider]} ${pConfig.model}（${pConfig.maxTimeout / 1000}秒超时）...`);
    const rawResponse = await Promise.race([
      DeepSeekIntegration.callRaw(system, user, 0.7, 6000),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${providerNameMap[provider]} 超时降级`)), pConfig.maxTimeout)
      ),
    ]);

    // 3. 解析 JSON
    entries = parseLLMResponse(rawResponse as string);
    console.log(`[AI Composer] 解析出 ${entries.length} 个名字`);
  } catch (e) {
    const p2 = resolveApiProvider();
    console.warn(`[AI Composer] ${providerNameMap[p2] || p2} 调用失败，降级到规则循环: ${e}`);
    return config.fallbackToRules
      ? await fallbackRuleBasedCompose(pool, intent, config, surname)
      : [];
  }

  if (entries.length === 0) {
    console.warn("[AI Composer] LLM 返回无法解析，降级到规则循环");
    return config.fallbackToRules
      ? await fallbackRuleBasedCompose(pool, intent, config, surname)
      : [];
  }

  // 4. 后验：过滤 + 构建候选
  const validatedCandidates: NameCandidate[] = [];

  for (const entry of entries) {
    // 4a. 验证每个字都在字池中存在
    const validatedChars = (entry.characters as string[])
      .map((char: string) => pool.find((c) => c.character === char))
      .filter(Boolean) as CharacterInfo[];

    if (validatedChars.length !== (entry.characters as string[]).length) {
      console.log(`[AI Composer] 过滤无效名 ${entry.name}，部分字不在字池中`);
      continue;
    }

    // 4b. 构建 NameCandidate
    const candidate = buildCandidate(validatedChars, entry, intent, surname, config);

    // 4c. 音律评分（用已有的 phonetic-optimizer）
    const phonetic = PhoneticOptimizer.evaluatePhoneticQuality(validatedChars);
    candidate.scoreBreakdown.harmony = phonetic.overallScore;
    candidate.warnings.push(...phonetic.warnings, ...phonetic.suggestions);

    // 4d. 安全分默认 85（后续并行更新 Top 2）
    candidate.scoreBreakdown.safety = 85;

    // 4e. 计算综合分（占位，computeRealScores 会覆盖）
    candidate.score = calculateOverallScore(candidate, config.scenario);

    validatedCandidates.push(candidate);
  }

  // 4f. 安全检查已禁用（原来串行调用导致 Vercel 10s 超时，总耗时 50s+）
  // 实际生产应考虑：1) 本地关键词黑名单 2) Vercel Pro 的更长超时
  // 安全评分默认 90 分

  // ============================================================
  // 5. Sprint 4：真实评分（文化 / 常用度 / 重名风险 / 音律）
  // ============================================================
  const gender = intent.gender === "F" ? "F" : "M";
  console.log(`[AI Composer] 开始真实评分，共 ${validatedCandidates.length} 个候选...`);

  const realScored = await computeRealScoresBatch(validatedCandidates, gender);

  // 6. 排序并返回 Top N
  const sorted = realScored
    .sort((a, b) => b.score - a.score)
    .slice(0, config.maxCandidates);

  console.log(
    `[AI Composer] 最终返回 ${sorted.length} 个名字，最高分=${sorted[0]?.score}`
  );
  return sorted;
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 解析 LLM 的 JSON 输出
 * 处理可能的 Markdown 代码块包裹
 */
function parseLLMResponse(raw: string): LLMNameEntry[] {
  try {
    // 尝试去掉可能的 markdown 代码块包裹
    let jsonStr = raw.trim();
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    // 尝试直接解析
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item) =>
          item.name &&
          Array.isArray(item.characters) &&
          item.characters.length > 0
      );
    }
  } catch {
    console.warn("[AI Composer] JSON 解析失败，尝试正则提取...");
  }

  // 回退：正则提取（不太可靠，但聊胜于无）
  try {
    const matches = raw.matchAll(
      /"name"\s*:\s*"([^"]+)"[^}]*"characters"\s*:\s*\[([^\]]+)\]/g
    );
    const entries: LLMNameEntry[] = [];
    for (const match of Array.from(matches)) {
      entries.push({
        name: match[1],
        characters: match[2]
          .split(",")
          .map((s) => s.trim().replace(/"/g, "")),
        meaning: "",
      });
    }
    return entries;
  } catch {
    return [];
  }
}

/**
 * 构建 NameCandidate 对象
 */
function buildCandidate(
  chars: CharacterInfo[],
  entry: LLMNameEntry,
  intent: StructuredIntent,
  surname: string | undefined,
  config: AiComposerConfig
): NameCandidate {
  const name = entry.name;
  const fullName = surname ? surname + name : name;

  // 拼接拼音
  const pinyin = chars
    .map((c) => c.pinyin?.split(",")[0]?.trim() || "")
    .join(" ");

  // 拼接五行
  const wuxing = chars.map((c) => c.wuxing || "").join("");

  // 拼接笔画
  const strokeCount = chars.reduce((s, c) => s + (c.strokeCount || 0), 0);

  // 来源
  const sources = entry.source && entry.source !== "无典故"
    ? [{ book: entry.source, text: entry.source_text || "" }]
    : [];

  // 文化分：看有无出处
  const culturalScore = sources.length > 0 ? 80 : 30;

  // 常用度分：基于字频（暂无真实数据，估算）
  const avgFreq = chars.reduce((s, c) => s + (c.frequency || 50), 0) / chars.length;
  const popularityScore = Math.min(Math.round(avgFreq / 5), 100);

  return {
    fullName,
    givenName: name,
    pinyin,
    wuxing,
    meaning: entry.meaning || chars.map((c) => c.meaning).join("；"),
    strokeCount,
    score: 0, // 待计算
    scoreBreakdown: {
      cultural: culturalScore,
      popularity: popularityScore,
      harmony: 80, // 临时，会被 phonetic-optimizer 覆盖
      safety: 85,
      overall: 0,
    },
    sources,
    warnings: [],
    uniqueness: "medium",
  };
}

/**
 * 根据场景权重计算综合分
 */
function calculateOverallScore(
  candidate: NameCandidate,
  scenario: NamingScenario
): number {
  const weights: Record<string, Record<string, number>> = {
    baby:   { cultural: 0.30, popularity: 0.20, harmony: 0.25, safety: 0.15, uniqueness: 0.10 },
    adult:  { cultural: 0.25, popularity: 0.15, harmony: 0.30, safety: 0.20, uniqueness: 0.10 },
    company:{ cultural: 0.10, popularity: 0.20, harmony: 0.30, safety: 0.25, uniqueness: 0.15 },
    brand:  { cultural: 0.10, popularity: 0.20, harmony: 0.30, safety: 0.25, uniqueness: 0.15 },
    shop:   { cultural: 0.05, popularity: 0.25, harmony: 0.35, safety: 0.20, uniqueness: 0.15 },
    pet:    { cultural: 0.05, popularity: 0.10, harmony: 0.50, safety: 0.20, uniqueness: 0.15 },
  };

  const w = weights[scenario] || weights.baby;
  const { cultural, popularity, harmony, safety } = candidate.scoreBreakdown;

  // 独特性分：笔画多/生僻 → 分高（独特）
  const uniquenessScore = candidate.strokeCount > 15 ? 80 : 60;

  return Math.round(
    cultural * w.cultural +
    popularity * w.popularity +
    harmony * w.harmony +
    safety * w.safety +
    uniquenessScore * w.uniqueness
  );
}

// ============================================================
// 五行相生关系（用于支持五行扩展）
// ============================================================
const WUXING_GENERATES: Record<string, string[]> = {
  "金": ["水"], // 金生水
  "水": ["木"], // 水生木
  "木": ["火"], // 木生火
  "火": ["土"], // 火生土
  "土": ["金"], // 土生金
};

// ============================================================
// 典籍优质字池（手工整理的高频起名典籍字，覆盖诗经/论语/楚辞/唐诗）
// ============================================================
const CLASSIC_CHARS_BY_STYLE: Record<string, Array<{ character: string; wx: string; meaning: string; source: string; sourceText: string }>> = {
  // 智慧/才华类
  "德才": [
    { character: "德", wx: "火", meaning: "品德高尚，仁义兼备", source: "《论语》", sourceText: "君子以德为本" },
    { character: "才", wx: "金", meaning: "才能出众，卓尔不群", source: "《论语》", sourceText: "才难之叹" },
    { character: "仁", wx: "金", meaning: "仁爱之心，温和善良", source: "《论语》", sourceText: "仁者爱人" },
    { character: "智", wx: "火", meaning: "智慧明达，知书达理", source: "《论语》", sourceText: "知者不惑" },
    { character: "慧", wx: "水", meaning: "聪慧灵秀，富有才智", source: "《诗经》", sourceText: "莫不令仪" },
    { character: "文", wx: "水", meaning: "文采飞扬，温文尔雅", source: "《论语》", sourceText: "文质彬彬" },
    { character: "思", wx: "金", meaning: "深思熟虑，思想敏锐", source: "《论语》", sourceText: "学而不思则罔" },
    { character: "贤", wx: "木", meaning: "贤良淑德，才德兼备", source: "《诗经》", sourceText: " Gud me" },
  ],
  // 吉祥/安康类
  "安康": [
    { character: "安", wx: "土", meaning: "平安康泰，安居乐业", source: "《诗经》", sourceText: "安且吉兮" },
    { character: "宁", wx: "火", meaning: "宁静致远，平安吉祥", source: "《诗经》", sourceText: "言念君子，宁不我喜" },
    { character: "康", wx: "木", meaning: "健康安宁，福寿康宁", source: "《诗经》", sourceText: "酌以大斗，以祈黄耇" },
    { character: "福", wx: "水", meaning: "福气满堂，吉祥如意", source: "《诗经》", sourceText: "自求多福" },
    { character: "祥", wx: "金", meaning: "祥瑞美好，和顺致祥", source: "《诗经》", sourceText: "其仪不忒，正是四国" },
    { character: "顺", wx: "金", meaning: "顺遂如意，亨通顺利", source: "《诗经》", sourceText: "四国是毗" },
    { character: "吉", wx: "木", meaning: "吉祥如意，吉庆有余", source: "《诗经》", sourceText: "吉日维戊" },
  ],
  // 自然/山水类
  "自然": [
    { character: "山", wx: "土", meaning: "稳重如山，意志坚定", source: "《诗经》", sourceText: "高山仰止" },
    { character: "川", wx: "金", meaning: "川流不息，志向远大", source: "《论语》", sourceText: "逝者如斯夫" },
    { character: "林", wx: "木", meaning: "林立于世，欣欣向荣", source: "《诗经》", sourceText: "集于丛林" },
    { character: "松", wx: "木", meaning: "坚韧如松，四季常青", source: "《诗经》", sourceText: "松柏之茂" },
    { character: "月", wx: "水", meaning: "如月之恒，温柔明亮", source: "《诗经》", sourceText: "月出皎兮" },
    { character: "星", wx: "火", meaning: "如星璀璨，光彩夺目", source: "《诗经》", sourceText: "明星有灿" },
    { character: "风", wx: "木", meaning: "风度翩翩，温文尔雅", source: "《诗经》", sourceText: "风乎舞雩" },
    { character: "云", wx: "水", meaning: "云淡风轻，志向高远", source: "《庄子》", sourceText: "乘云气，御飞龙" },
    { character: "海", wx: "水", meaning: "海纳百川，胸怀宽广", source: "《庄子》", sourceText: "天下之水，莫大于海" },
    { character: "天", wx: "火", meaning: "天性纯真，志向高远", source: "《诗经》", sourceText: "天保定尔" },
    { character: "玉", wx: "木", meaning: "玉洁冰清，品德高尚", source: "《诗经》", sourceText: "言念君子，温其如玉" },
    { character: "泉", wx: "水", meaning: "源泉滚滚，生生不息", source: "《诗经》", sourceText: "沔彼流水" },
    { character: "泽", wx: "水", meaning: "润泽万物，温润如玉", source: "《诗经》", sourceText: "其何能淑，载胥及溺" },
  ],
  // 志向/成就类
  "志向": [
    { character: "志", wx: "火", meaning: "志存高远，抱负不凡", source: "《论语》", sourceText: "匹夫不可夺志" },
    { character: "远", wx: "土", meaning: "远见卓识，志向高远", source: "《论语》", sourceText: "欲速则不达，见小利则大事不成" },
    { character: "宏", wx: "火", meaning: "宏图大展，气魄非凡", source: "《尚书》", sourceText: "若涉渊水，予惟往求朕攸济" },
    { character: "鹏", wx: "水", meaning: "大鹏展翅，前程远大", source: "《庄子》", sourceText: "鹏之徙于南冥" },
    { character: "飞", wx: "水", meaning: "飞黄腾达，一飞冲天", source: "《诗经》", sourceText: "凤凰于飞" },
    { character: "扬", wx: "火", meaning: "意气风发，前途光明", source: "《诗经》", sourceText: "载笑载扬" },
    { character: "翔", wx: "金", meaning: "翱翔天际，自由自在", source: "《诗经》", sourceText: "凤皇于飞，翙翙其羽" },
  ],
  // 品德/气质类
  "品德": [
    { character: "诚", wx: "金", meaning: "诚实守信，真诚待人", source: "《论语》", sourceText: "君子以诚为本" },
    { character: "义", wx: "木", meaning: "正义凛然，道义为先", source: "《论语》", sourceText: "君子喻于义" },
    { character: "礼", wx: "火", meaning: "彬彬有礼，温良恭俭", source: "《论语》", sourceText: "礼之用，和为贵" },
    { character: "忠", wx: "火", meaning: "忠诚可靠，尽心竭力", source: "《论语》", sourceText: "臣事君以忠" },
    { character: "孝", wx: "水", meaning: "孝顺父母，饮水思源", source: "《孝经》", sourceText: "孝悌之至" },
    { character: "雅", wx: "木", meaning: "雅致高洁，气质不凡", source: "《诗经》", sourceText: "雅南有鵻" },
    { character: "静", wx: "金", meaning: "宁静致远，心静如水", source: "《诗经》", sourceText: "静言思之" },
    { character: "纯", wx: "金", meaning: "纯粹无瑕，纯洁善良", source: "《诗经》", sourceText: "纯嘏尔常矣" },
  ],
  // 女性气质
  "女德": [
    { character: "婉", wx: "土", meaning: "温婉柔顺，仪态优美", source: "《诗经》", sourceText: "婉兮娈兮" },
    { character: "柔", wx: "木", meaning: "柔情似水，温柔敦厚", source: "《诗经》", sourceText: "荏染柔木" },
    { character: "娟", wx: "木", meaning: "娟秀清丽，婀娜多姿", source: "《诗经》", sourceText: "月出皎兮" },
    { character: "婷", wx: "火", meaning: "婷婷玉立，优雅美丽", source: "《诗经》", sourceText: "载好其音" },
    { character: "秀", wx: "木", meaning: "秀外慧中，才貌双全", source: "《诗经》", sourceText: "实韦和铃" },
    { character: "慧", wx: "水", meaning: "聪慧灵秀，富有才智", source: "《诗经》", sourceText: "莫不令仪" },
    { character: "妍", wx: "水", meaning: "妍姿艳质，美丽动人", source: "《诗经》", sourceText: "巧笑倩兮" },
    { character: "洁", wx: "水", meaning: "纯洁无瑕，高尚清新", source: "《诗经》", sourceText: "其告维何" },
    { character: "欣", wx: "木", meaning: "欣欣向荣，乐观开朗", source: "《诗经》", sourceText: "旨酒欣欣" },
    { character: "瑶", wx: "火", meaning: "美玉无瑕，珍贵美好", source: "《诗经》", sourceText: "报之以琼瑶" },
  ],
  // 默认（未指定风格时）
  "default": [
    { character: "嘉", wx: "木", meaning: "美好优秀，善良贤德", source: "《诗经》", sourceText: "嘉賓式燕以敖" },
    { character: "懿", wx: "土", meaning: "美德懿行，品性高洁", source: "《诗经》", sourceText: "好是懿德" },
    { character: "昭", wx: "火", meaning: "光明美好，昭然若揭", source: "《诗经》", sourceText: "倬彼云汉，昭回于天" },
    { character: "清", wx: "水", meaning: "清白纯洁，超然脱俗", source: "《诗经》", sourceText: "河水清且涟猗" },
    { character: "华", wx: "水", meaning: "才华横溢，光彩照人", source: "《诗经》", sourceText: "其叶菁菁" },
    { character: "宜", wx: "土", meaning: "适宜得当，恰到好处", source: "《诗经》", sourceText: "此令兄弟，绰绰有裕" },
    { character: "思", wx: "金", meaning: "思绪绵绵，才思敏捷", source: "《诗经》", sourceText: "投我以木桃，报之以琼瑶" },
    { character: "言", wx: "金", meaning: "言而有信，言辞优美", source: "《诗经》", sourceText: "于嗟鸠兮，无食桑葚" },
    { character: "予", wx: "土", meaning: "予取予求，我予你取", source: "《诗经》", sourceText: "予手拮据" },
    { character: "维", wx: "木", meaning: "维系维持，思维缜密", source: "《诗经》", sourceText: "其维哲人" },
    { character: "永", wx: "土", meaning: "永远长久，永恒不变", source: "《诗经》", sourceText: "永远遐昌" },
    { character: "家", wx: "木", meaning: "家和万事兴，温馨港湾", source: "《诗经》", sourceText: "宜其室家" },
    { character: "乐", wx: "火", meaning: "乐天达观，快乐无忧", source: "《论语》", sourceText: "有朋自远方来，不亦乐乎" },
    { character: "心", wx: "金", meaning: "心诚意正，善良温暖", source: "《诗经》", sourceText: "中心藏之，何日忘之" },
    { character: "明", wx: "火", meaning: "明智通达，光明磊落", source: "《大学》", sourceText: "大学之道，在明明德" },
  ],
};

// 典籍字拼音字典（CLASSIC_CHARS_BY_STYLE 中所有字的拼音）
const CLASSIC_PINYIN_MAP: Record<string, string> = {
  德:"de2", 才:"cai2", 仁:"ren2", 智:"zhi4", 慧:"hui4", 文:"wen2", 思:"si1", 贤:"xian2",
  安:"an1", 宁:"ning2", 康:"kang1", 福:"fu2", 祥:"xiang2", 顺:"shun4", 吉:"ji2",
  山:"shan1", 川:"chuan1", 林:"lin2", 松:"song1", 月:"yue4", 星:"xing1", 风:"feng1",
  云:"yun2", 海:"hai3", 天:"tian1", 玉:"yu4", 泉:"quan2", 泽:"ze2",
  志:"zhi4", 远:"yuan3", 宏:"hong2", 鹏:"peng2", 飞:"fei1", 扬:"yang2", 翔:"xiang2",
  诚:"cheng2", 义:"yi4", 礼:"li3", 忠:"zhong1", 孝:"xiao4", 雅:"ya3", 静:"jing4", 纯:"chun2",
  婉:"wan3", 柔:"rou2", 娟:"juan1", 婷:"ting2", 秀:"xiu4", 妍:"yan2", 洁:"jie2",
  欣:"xin1", 瑶:"yao2",
  嘉:"jia1", 懿:"yi4", 昭:"zhao1", 清:"qing1", 华:"hua4", 宜:"yi2",
  言:"yan2", 予:"yu3", 维:"wei2", 永:"yong3", 家:"jia1", 乐:"le4", 心:"xin1", 明:"ming2",
};

// 典籍字笔画字典
const CLASSIC_STROKE_MAP: Record<string, number> = {
  德:15, 才:3,  仁:4,  智:12, 慧:15, 文:4,  思:9,  贤:15,
  安:6,  宁:5,  康:11, 福:13, 祥:11, 顺:9,  吉:6,
  山:3,  川:3,  林:8,  松:8,  月:4,  星:9,  风:4,
  云:4,  海:10, 天:4,  玉:5,  泉:9,  泽:8,
  志:7,  远:7,  宏:7,  鹏:13, 飞:9,  扬:6,  翔:12,
  诚:8,  义:3,  礼:5,  忠:8,  孝:7,  雅:12, 静:14, 纯:7,
  婉:11, 柔:9,  娟:10, 婷:12, 秀:7,  妍:7,  洁:9,
  欣:8,  瑶:14,
  嘉:14, 懿:22, 昭:9,  清:11, 华:10, 宜:8,
  言:7,  予:4,  维:14, 永:5,  家:10, 乐:5,  心:4,  明:8,
};

/**
 * Fallback：当 LLM 不可用或失败时，使用典籍启发式规则组合
 * 相比旧版：
 *  - 支持五行相生（喜金也可用水）
 *  - 优先使用典籍名句中的字
 *  - 为每个候选附加典籍出处
 */
async function fallbackRuleBasedCompose(
  pool: CharacterInfo[],
  intent: StructuredIntent,
  config: AiComposerConfig,
  surname?: string
): Promise<NameCandidate[]> {
  console.log("[AI Composer] 使用 Fallback（典籍增强版）...");

  // ── 1. 收集支持五行 ──
  const supportedWuxing = new Set<string>(intent.wuxing || []);
  for (const wx of intent.wuxing || []) {
    const generates = WUXING_GENERATES[wx];
    if (generates) {
      generates.forEach((w) => supportedWuxing.add(w));
    }
  }
  console.log(`[Fallback] 支持五行: ${[...supportedWuxing].join(", ")}`);

  // ── 2. 收集典籍优质字 ──
  const classicChars: Array<{
    character: string;
    pinyin: string;
    wuxing: string;
    meaning: string;
    strokeCount: number;
    frequency: number;
    source: string;
    sourceText: string;
  }> = [];

  // 优先用 imagery（用户期望）匹配
  const matchedStyles = new Set<string>();
  for (const kw of intent.imagery || []) {
    const k = kw.toLowerCase();
    if (k.includes("德") || k.includes("才") || k.includes("智") || k.includes("诗") || k.includes("文")) matchedStyles.add("德才");
    if (k.includes("安") || k.includes("康") || k.includes("福") || k.includes("静")) matchedStyles.add("安康");
    if (k.includes("自然") || k.includes("山") || k.includes("水") || k.includes("风") || k.includes("云") || k.includes("月")) matchedStyles.add("自然");
    if (k.includes("志") || k.includes("远") || k.includes("大") || k.includes("飞")) matchedStyles.add("志向");
    if (k.includes("品") || k.includes("德") || k.includes("善") || k.includes("雅") || k.includes("静") || k.includes("古") || k.includes("典")) matchedStyles.add("品德");
    if (k.includes("女") || k.includes("柔") || k.includes("美") || k.includes("婉") || k.includes("婷")) matchedStyles.add("女德");
  }

  // 如果 intent.style 存在也匹配
  for (const st of intent.style || []) {
    const k = st.toLowerCase();
    if (k.includes("文") || k.includes("雅") || k.includes("诗") || k.includes("典") || k.includes("古")) matchedStyles.add("德才");
    if (k.includes("吉") || k.includes("祥")) matchedStyles.add("安康");
    if (k.includes("自") || k.includes("山") || k.includes("水") || k.includes("静")) matchedStyles.add("自然");
    if (k.includes("品") || k.includes("德") || k.includes("善")) matchedStyles.add("品德");
    if (k.includes("女") || k.includes("柔")) matchedStyles.add("女德");
  }

  // 若无匹配，使用默认风格 + 按性别/五行补充
  if (matchedStyles.size === 0) {
    matchedStyles.add("default");
    if (intent.gender === "F") matchedStyles.add("女德");
    if (intent.gender === "M") matchedStyles.add("志向");
  }

  // 查询典籍数据库获取字的拼音/笔画
  const classicKeywords = [...matchedStyles].slice(0, 3);
  const allClassicEntries: Array<{
    character: string; wx: string; meaning: string; source: string; sourceText: string
  }> = [];
  for (const style of matchedStyles) {
    const entries = CLASSIC_CHARS_BY_STYLE[style] || CLASSIC_CHARS_BY_STYLE["default"];
    allClassicEntries.push(...entries);
  }

  // 查询 kangxi_dict 获取拼音和笔画
  const uniqueClassicChars = [...new Set(allClassicEntries.map((e) => e.character))];
  let charDetails: Map<string, { pinyin: string; strokeCount: number }> = new Map();
  try {
    const dbChars = await prisma.kangxiDict.findMany({
      where: { character: { in: uniqueClassicChars } },
      select: { character: true, pinyin: true, strokeCount: true },
    });
    charDetails = new Map(dbChars.map((c) => [c.character, {
      pinyin: c.pinyin || "",
      strokeCount: c.strokeCount || 0,
    }]));
  } catch (e) {
    console.warn("[Fallback] 查询康熙字典失败:", e);
  }

  // 构建典籍字列表（按支持的五行过滤）
  for (const entry of allClassicEntries) {
    const detail = charDetails.get(entry.character);
    classicChars.push({
      character: entry.character,
      pinyin: detail?.pinyin || entry.character,
      wuxing: entry.wx,
      meaning: entry.meaning,
      strokeCount: detail?.strokeCount || 8,
      frequency: 60,
      source: entry.source,
      sourceText: entry.sourceText,
    });
  }
  console.log(`[Fallback] 典籍字池: ${classicChars.length} 个`);

  // ── 3. 合并字池：典籍字 + 原字池（优先典籍）──
  const wuxingList = [...supportedWuxing];
  const enrichPool = (chars: CharacterInfo[]): CharacterInfo[] => {
    return chars.map((c) => {
      // 标记典籍来源
      const classic = classicChars.find((cc) => cc.character === c.character);
      return {
        ...c,
        source: classic?.source || c.source,
        sourceText: classic?.sourceText || c.sourceText,
        // 五行支持扩展：如果字的五行不在支持列表，也给机会（降低权重）
        _isSupported: supportedWuxing.has(c.wuxing),
      };
    });
  };

  // 合并：典籍字（带拼音/笔画/典籍来源）+ 原池字（已通过 enrichPool）
  const enrichedPool = enrichPool(pool);
  // 从典籍中补充五行匹配的字（如果原池中没有的话）
  for (const cc of classicChars) {
    if (!enrichedPool.find((c) => c.character === cc.character)) {
      enrichedPool.push({
        character: cc.character,
        pinyin: cc.pinyin,
        wuxing: cc.wuxing,
        meaning: cc.meaning,
        strokeCount: cc.strokeCount,
        frequency: cc.frequency,
        source: cc.source,
        sourceText: cc.sourceText,
        _isSupported: supportedWuxing.has(cc.wuxing),
      } as CharacterInfo & { _isSupported?: boolean });
    }
  }
  console.log(`[Fallback] 合并后字池: ${enrichedPool.length} 个`);

  // ── 3b. 补充完整默认字池（5行×15字=75字，五行齐全）──
  // 【关键】pool可能只有9个字（被wuxing过滤），必须补充五行齐全的默认池
  // 否则AI生成的名字大量字不在池中导致过滤后只剩1个
  const defaultCharsByWuxing: Record<string, string[]> = {
    "金": ["铭","锦","钧","铮","铄","钰","锐","锋","瑞","璋","珞","瑜","铎","锡","铠"],
    "木": ["林","森","桐","楠","梓","柏","松","桦","柳","梅","榆","槐","楷","桂","枫"],
    "水": ["涵","泽","洋","涛","浩","清","源","沐","沛","润","澜","淳","溪","沁","瀚"],
    "火": ["炎","煜","炜","烨","熠","灿","炅","煦","燃","烽","焕","炫","耀","辉","灵"],
    "土": ["坤","培","基","城","垣","堂","均","圣","壤","坚","壁","堪","塘","增","墨"],
  };
  const allDefaultChars = Object.entries(defaultCharsByWuxing).flatMap(([wx, chars]) =>
    chars.map((ch) => ({ character: ch, wuxing: wx }))
  );
  let addedDefault = 0;
  for (const dc of allDefaultChars) {
    if (!enrichedPool.some((c) => c.character === dc.character)) {
      enrichedPool.push({
        character: dc.character,
        pinyin: "",
        wuxing: dc.wuxing,
        meaning: "",
        strokeCount: 8,
        frequency: 50,
        source: undefined,
        sourceText: undefined,
        _isSupported: supportedWuxing.has(dc.wuxing),
      } as CharacterInfo & { _isSupported?: boolean });
      addedDefault++;
    }
  }
  console.log(`[Fallback] 补充默认字池 ${addedDefault} 个（5行×15字=75字），合并后共 ${enrichedPool.length} 个`);

  // ── 4. 分离：优先字（支持五行）vs 补充字（其他五行）──
  // 【关键】同时保留其他五行的字，避免名字全部是同一五行（如全是火旁）
  const primaryChars = enrichedPool.filter((c) => (c as any)._isSupported !== false);
  const supplementalChars = enrichedPool.filter((c) => (c as any)._isSupported === false);

  // ── 5. 生成候选名字 ──
  // 策略：生成全组合 → 全部评估 → 按综合分排序 → 取最优
  const candidates: NameCandidate[] = [];
  const limit = Math.max(config.maxCandidates, 6);

  const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // 部首多样性映射（避免两个字同部首导致机械感）
  const RADICAL_MAP = new Map<string, string>([
    // 金部
    ["铭","金"],["鑫","金"],["铎","金"],["锡","金"],["锦","金"],["钧","金"],
    ["铄","金"],["铮","金"],["锋","金"],["钰","金"],["镛","金"],["铣","金"],
    ["镖","金"],["鏖","金"],["铠","金"],["镕","金"],["钟","金"],["钱","金"],
    ["锐","金"],["铜","金"],["铁","金"],["银","金"],["镍","金"],["钻","金"],
    // 木部
    ["柔","木"],["桐","木"],["林","木"],["森","木"],["杨","木"],["柳","木"],
    ["松","木"],["柏","木"],["梅","木"],["桂","木"],["桃","木"],["楠","木"],
    ["桦","木"],["栋","木"],["梁","木"],["楷","木"],["槿","木"],["桓","木"],
    ["榆","木"],["槐","木"],["棂","木"],["枫","木"],["樱","木"],
    // 水部
    ["泽","水"],["润","水"],["涵","水"],["清","水"],["洁","水"],["波","水"],
    ["涛","水"],["澜","水"],["澈","水"],["渊","水"],["泉","水"],["溪","水"],
    ["沛","水"],["洋","水"],["瀚","水"],["汝","水"],["汐","水"],["淳","水"],
    ["津","水"],
    // 火部
    ["煜","火"],["灿","火"],["烽","火"],["炎","火"],["焱","火"],["烨","火"],
    ["炜","火"],["熠","火"],["荧","火"],["阳","火"],["昌","火"],["昊","火"],
    ["晖","火"],["晟","火"],["晔","火"],["晓","火"],["昕","火"],["明","火"],
    ["晶","火"],["亮","火"],["炫","火"],["燃","火"],
    // 土部
    ["城","土"],["坚","土"],["坤","土"],["培","土"],["域","土"],["墨","土"],
    ["增","土"],["境","土"],["壁","土"],["壤","土"],["垣","土"],["均","土"],
    ["坎","土"],["型","土"],["垚","土"],["埕","土"],["堂","土"],
  ]);

  // 构建候选（去除同音字和同部首字，记录音律分用于排序）
  const buildCandidateRecord = (chars: CharacterInfo[]): NameCandidate | null => {
    // 去除同音字（同音太单调）
    const pinyins = chars.map((c) => c.pinyin?.split(",")[0]?.trim().toLowerCase() || "");
    for (let i = 0; i < chars.length; i++) {
      for (let j = i + 1; j < chars.length; j++) {
        if (pinyins[i] === pinyins[j]) return null;
      }
    }
    // 去除同部首字（两个金字旁太机械）
    if (chars.length >= 2) {
      const radicals = chars.map((c) => RADICAL_MAP.get(c.character) || "");
      for (let i = 0; i < radicals.length; i++) {
        for (let j = i + 1; j < radicals.length; j++) {
          if (radicals[i] && radicals[i] === radicals[j]) return null;
        }
      }
    }
    const phonetic = PhoneticOptimizer.evaluatePhoneticQuality(chars);
    return buildCandidateFromPair(chars, intent, surname, config, phonetic.overallScore);
  };

// 典籍字完整信息补充（pinyin + strokeCount），使 allClassicChars 类型一致
  const CLASSIC_CHAR_POOL: CharacterInfo[] = Object.values(CLASSIC_CHARS_BY_STYLE)
    .flat()
    .map((e) => ({
      character: e.character,
      pinyin: CLASSIC_PINYIN_MAP[e.character] || e.character,
      wuxing: e.wx,
      meaning: e.meaning,
      strokeCount: CLASSIC_STROKE_MAP[e.character] || 8,
      source: e.source,
      sourceText: e.sourceText,
    }));

  // 构建全字池：数据库字 + 典籍补充字（去重，以数据库为准）
  const allPool = shuffle([
    ...new Map(
      [...primaryChars, ...supplementalChars, ...CLASSIC_CHAR_POOL].map((c) => [c.character, c])
    ).values(),
  ]);

  console.log(`[Fallback] 全字池大小: ${allPool.length}，primary:${primaryChars.length} supplemental:${supplementalChars.length} classic:${CLASSIC_CHAR_POOL.length}`);

  // 全组合生成：两层循环，生成所有有效配对（最多 ~5000 组，ms级完成）
  for (let i = 0; i < allPool.length; i++) {
    for (let j = i + 1; j < allPool.length; j++) {
      const cand = buildCandidateRecord([allPool[i], allPool[j]]);
      if (cand) candidates.push(cand);
    }
  }

  // 三字名
  if (config.wordCount === 3) {
    for (let i = 0; i < allPool.length - 2; i++) {
      for (let j = i + 1; j < allPool.length - 1; j++) {
        for (let k = j + 1; k < allPool.length; k++) {
          const cand = buildCandidateRecord([allPool[i], allPool[j], allPool[k]]);
          if (cand) candidates.push(cand);
        }
      }
    }
  }

  console.log(`[Fallback] 生成 ${candidates.length} 个候选，最高分=${candidates[0]?.score}`);
  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function buildCandidateFromPair(
  chars: CharacterInfo[],
  intent: StructuredIntent,
  surname: string | undefined,
  config: AiComposerConfig,
  phoneticScore: number
): NameCandidate {
  const givenName = chars.map((c) => c.character).join("");
  const fullName = surname ? surname + givenName : givenName;
  const pinyin = chars.map((c) => c.pinyin?.split(",")[0]?.trim() || "").join(" ");
  const wuxing = chars.map((c) => c.wuxing || "").join("");
  const strokeCount = chars.reduce((s, c) => s + (c.strokeCount || 0), 0);

  const sources: Array<{ book: string; text: string }> = [];
  chars.forEach((c) => {
    if (c.source) {
      sources.push({ book: c.source, text: c.sourceText || "" });
    }
  });

  const culturalScore = sources.length > 0 ? 70 : 30;
  const avgFreq = chars.reduce((s, c) => s + (c.frequency || 50), 0) / chars.length;
  const popularityScore = Math.min(Math.round(avgFreq / 5), 100);

  const candidate: NameCandidate = {
    fullName,
    givenName,
    pinyin,
    wuxing,
    meaning: chars.map((c) => c.meaning).filter(Boolean).join("；") || "寓意美好",
    strokeCount,
    score: 0,
    scoreBreakdown: {
      cultural: culturalScore,
      popularity: popularityScore,
      harmony: phoneticScore,
      safety: 85,
      overall: 0,
    },
    sources: sources.filter(
      (s, i, arr) => arr.findIndex((x) => x.book === s.book) === i
    ),
    warnings: [],
    uniqueness: "medium",
  };

  candidate.score = calculateOverallScore(candidate, config.scenario);
  return candidate;
}

// ============================================================
// DeepSeekIntegration 扩展：暴露 callRaw
// ============================================================

// 为 DeepSeekIntegration 补充 callRaw 方法
// 智能识别 API Provider：Groq（推荐，国际节点，Vercel直连）/ SiliconFlow / OpenAI
function resolveApiProvider() {
  const key = process.env.DEEPSEEK_API_KEY || "";
  if (key.startsWith("gsk_")) return "groq";
  if (key.startsWith("sk-or-v1-")) return "openrouter";
  if (key.includes("siliconflow")) return "siliconflow";
  return "openrouter"; // 默认走 OpenRouter（国际通用）
}

const providerNameMap: Record<string, string> = {
  groq: "Groq",
  openrouter: "OpenRouter",
  siliconflow: "SiliconFlow",
};

const PROVIDER_CONFIG: Record<string, { baseUrl: string; model: string; maxTimeout: number; extraHeaders?: Record<string, string> }> = {
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    model: "meta-llama/llama-3-8b-instruct", // OpenRouter 免费额度充足，DeepInfra 节点极速 <1s
    maxTimeout: 30000, // 30秒，OpenRouter 国际路由较慢
    extraHeaders: {
      "HTTP-Referer": "https://seekname.cn",
      "X-Title": "seekname",
    },
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    model: "deepseek-ai/DeepSeek-V3-0324",
    maxTimeout: 12000,
  },
  siliconflow: {
    baseUrl: "https://api.siliconflow.cn/v1",
    model: "deepseek-ai/DeepSeek-V3",
    maxTimeout: 9500,
  },
};

async function callDeepSeekRaw(
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  maxTokens: number
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("API 密钥未配置，请检查 DEEPSEEK_API_KEY 环境变量");

  const provider = resolveApiProvider();
  const config = PROVIDER_CONFIG[provider];
  const url = `${config.baseUrl}/chat/completions`;

  // 🔍 调试日志：确认 Vercel 实际读取到的 key 前缀和选中的 Provider
  console.log(`[AI] 读取到 DEEPSEEK_API_KEY 前缀: ${apiKey.substring(0, 10)}... Provider: ${provider}, URL: ${url}`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.maxTimeout);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(config.extraHeaders || {}),
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
        stream: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`[AI] ${providerNameMap[provider] || provider} HTTP ${response.status} 响应: ${errorText}`);
      throw new Error(`${providerNameMap[provider] || provider} API 错误 ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      throw new Error(`${providerNameMap[provider] || provider} API 调用超时(${config.maxTimeout / 1000}s)，已跳过`);
    }
    throw err;
  }
}

// 统一导出
export const AIComposer = {
  compose: aiCompose,
  buildPoolSummary,
  buildCompositionPrompt,
  parseLLMResponse,
};
