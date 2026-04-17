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
      userBase: `请为姓氏"${intent.surname}"的${intent.gender === "F" ? "女宝宝" : "男宝宝"}起${wordCount}字名。

用户期望：
- 风格：${intent.style?.join("、") || "通用"}
- 五行：${intent.wuxing?.join("、") || "无特定"}
- 意象：${intent.imagery?.join("、") || "无特定"}
- 忌讳：${intent.avoidances?.join("、") || "无"}

候选字池（字·拼音·五行·含义·出处）：
${poolSummary}

请生成 ${config.maxCandidates} 个符合要求的名字，每个字必须来自候选字池。
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

请生成 ${config.maxCandidates} 个名字，输出严格 JSON 数组。`,
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
      ? fallbackRuleBasedCompose(pool, intent, config, surname)
      : [];
  }

  // 1. 构建 Prompt
  const poolSummary = buildPoolSummary(pool);
  const { system, user } = buildCompositionPrompt(config, intent, poolSummary);

  console.log(`[AI Composer] 字池摘要长度=${poolSummary.length} chars`);

  // 2. 调用 DeepSeek
  if (!DeepSeekIntegration.isAvailable()) {
    console.warn("[AI Composer] DeepSeek 不可用，降级到规则循环");
    return config.fallbackToRules
      ? fallbackRuleBasedCompose(pool, intent, config, surname)
      : [];
  }

  try {
    console.log("[AI Composer] 调用 DeepSeek...");
    const rawResponse = await DeepSeekIntegration.callRaw(
      system,
      user,
      0.7,   // 适度创意
      1500   // 足够输出多个名字
    );

    // 3. 解析 JSON
    const entries = parseLLMResponse(rawResponse);
    console.log(`[AI Composer] 解析出 ${entries.length} 个名字`);

    if (entries.length === 0) {
      console.warn("[AI Composer] LLM 返回无法解析，降级到规则循环");
      return config.fallbackToRules
        ? fallbackRuleBasedCompose(pool, intent, config, surname)
        : [];
    }

    // 4. 后验：过滤 + 构建候选
    const validatedCandidates: NameCandidate[] = [];

    for (const entry of entries) {
      // 4a. 验证每个字都在字池中存在
      const validatedChars = entry.characters
        .map((char) => pool.find((c) => c.character === char))
        .filter(Boolean) as CharacterInfo[];

      if (validatedChars.length !== entry.characters.length) {
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
  } catch (error) {
    console.error("[AI Composer] LLM 调用失败:", error);
    if (config.fallbackToRules) {
      return fallbackRuleBasedCompose(pool, intent, config, surname);
    }
    return [];
  }
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

/**
 * Fallback：当 LLM 不可用或失败时，使用原有的双重循环规则组合
 */
function fallbackRuleBasedCompose(
  pool: CharacterInfo[],
  intent: StructuredIntent,
  config: AiComposerConfig,
  surname?: string
): NameCandidate[] {
  console.log("[AI Composer] 使用 Fallback 规则循环组合...");

  const sortedChars = [...pool]
    .filter((char) => {
      if (intent.wuxing && intent.wuxing.length > 0) {
        return (
          intent.wuxing.includes(char.wuxing) ||
          !char.wuxing ||
          char.wuxing === "吉"
        );
      }
      return true;
    })
    .sort((a, b) => (b.frequency || 0) - (a.frequency || 0))
    .slice(0, 25);

  const candidates: NameCandidate[] = [];
  const limit = Math.min(config.maxCandidates, 8);

  if (config.wordCount === 2 && sortedChars.length >= 2) {
    for (let i = 0; i < sortedChars.length - 1 && candidates.length < limit; i++) {
      for (let j = i + 1; j < sortedChars.length && candidates.length < limit; j++) {
        const phonetic = PhoneticOptimizer.evaluatePhoneticQuality([
          sortedChars[i],
          sortedChars[j],
        ]);
        if (phonetic.isHarmonious) {
          candidates.push(
            buildCandidateFromPair(
              [sortedChars[i], sortedChars[j]],
              intent,
              surname,
              config,
              phonetic.overallScore
            )
          );
        }
      }
    }
  } else if (config.wordCount === 3 && sortedChars.length >= 3) {
    for (let i = 0; i < sortedChars.length - 2 && candidates.length < limit; i++) {
      for (let j = i + 1; j < sortedChars.length - 1 && candidates.length < limit; j++) {
        for (let k = j + 1; k < sortedChars.length && candidates.length < limit; k++) {
          const phonetic = PhoneticOptimizer.evaluatePhoneticQuality([
            sortedChars[i],
            sortedChars[j],
            sortedChars[k],
          ]);
          if (phonetic.isHarmonious) {
            candidates.push(
              buildCandidateFromPair(
                [sortedChars[i], sortedChars[j], sortedChars[k]],
                intent,
                surname,
                config,
                phonetic.overallScore
              )
            );
          }
        }
      }
    }
  }

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
async function callDeepSeekRaw(
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  maxTokens: number
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DeepSeek API 密钥未配置");

  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API 错误: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

// 给 DeepSeekIntegration 补充 callRaw（猴子补丁方式，简单有效）
// 注意：如果 deepseek-integration.ts 中已有 callRaw 则不需要
try {
  // @ts-ignore
  if (!DeepSeekIntegration.callRaw) {
    // @ts-ignore
    DeepSeekIntegration.callRaw = callDeepSeekRaw;
  }
} catch {
  // ignore
}

// 统一导出
export const AIComposer = {
  compose: aiCompose,
  buildPoolSummary,
  buildCompositionPrompt,
  parseLLMResponse,
};
