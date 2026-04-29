/**
 * 语义匹配起名引擎（OVHcloud BGE-M3 版）— v3.0 新流程
 * 
 * ★ 核心新流程（2026-04 更新）：
 * 第一步：在 naming_materials 表（已向量化的起名素材表）做语义向量匹配
 *   → 如果匹配到 ≥5 个候选短语 → 直接给出 20~30 个候选名字构成提示词，交由 AI 润色
 *   → 如果匹配不到（<5 个）→ 回退到旧流程（naming_classics 典籍搜索 + 传统 prompt）
 * 
 * 旧流程（兜底）：
 * 1. 在 naming_classics 表中做 pgvector 余弦相似度搜索
 * 2. 从匹配到的典籍中提取字词，构建提示词交给 DeepSeek 生成名字
 * 
 * 策略矩阵集成（v2.0）：
 * - 根据客户风格偏好，自动选择「古典原字优先」「现代实用优先」「古今双轨展示」策略
 * 
 * 数据库表：
 * - naming_materials（起名素材表，embedding vector(1024)，HNSW 索引）
 * - naming_classics（典籍词句表，combined_text_embedding vector(1024)）
 */

import { DeepSeekIntegration } from "./deepseek-integration";
import { pinyin } from "pinyin-pro";
import { searchNamingClassics } from "./semantic-search-naming-classics";
import { searchNamingMaterials, type NamingMaterialMatch } from "./semantic-search-naming-materials";
import {
  NamingStrategyType,
  determineStrategy,
  getStrategyPromptBlock,
  getStrategyTag,
  STRATEGY_LABELS,
} from "./naming-strategy";
import { hardFilterNames, HardFilterOptions, summarizeRemoved } from "./hard-filter";
import { scoreAndSortNames, NameScorerV2, type ScoringContext } from "./name-scorer-v2";

// 用户意图接口
export interface SemanticNamingRequest {
  rawInput: string;
  surname?: string;
  gender?: "M" | "F";
  birthDate?: string;
  birthTime?: string;
  expectations?: string;
  style?: string[];
  wordCount?: 2 | 3;
  /** 由 API route 或页面传入，如果为空则自动推导 */
  strategyType?: NamingStrategyType;
  /** 多选意向词数组（每个选项独立向量化+独立搜索，合并去重后返回） */
  intentions?: string[];
  /** 多选风格词数组 */
  styles?: string[];
}

// 典籍匹配结果
export interface ClassicsMatch {
  id: number;
  bookName: string;
  ancientText: string;
  modernText: string;
  similarity: number;
  extractedChars: string[];
  meaning: string;
}

// 生成的候选名字
export interface GeneratedName {
  name: string;
  givenName: string;
  pinyin: string;
  meaning: string;
  reason: string; // 选字理由（详细说明每个字取自哪篇哪句）
  source: string; // 典籍出处原文（含篇章名和原句）
  modernText?: string; // 白话译文
  score?: number;

  // ─── 策略矩阵扩展字段 ───
  /** 适用策略类型 */
  strategyType?: NamingStrategyType;
  /** 古籍原字版本（双轨展示时使用） */
  originalName?: string;
  /** 古籍原字的拼音 */
  originalPinyin?: string;
  /** 现代同义字版本 */
  modernName?: string;
  /** 现代同义字的拼音 */
  modernPinyin?: string;
  /** 生僻度评级（1-5，5最生僻） */
  rarityScore?: number;
  /** 生僻度文字描述 */
  rarityLabel?: string;
  /** 关键字释义数组：{char: "熙", ancientMeaning: "光明也", modernUsage: "光明和乐"} */
  charMeanings?: Array<{
    char: string;
    ancientMeaning: string;
    modernUsage: string;
  }>;
}

// 过滤结果
export interface FilterResult {
  passed: GeneratedName[];
  removed: Array<{ name: string; reason: string }>;
}

/**
 * 1. 语义匹配层
 * 
 * 支持两种搜索模式：
 * - 字符串模式（向后兼容）：单次搜索，将整个输入作为一个向量
 * - 数组模式（推荐）：每个选项独立搜索，合并去重后按相似度排序
 *   这种模式下每个选项的语义信号都不会被稀释，匹配精度显著提升
 */
export async function findSemanticMatches(
  userInput: string | string[],
  limit: number = 10,
  gender: "M" | "F" = "M"
): Promise<ClassicsMatch[]> {
  try {
    // ── 数组模式：每个选项独立搜索 → 合并去重 → 排序 ──
    if (Array.isArray(userInput)) {
      const validItems = userInput.filter(item => item && item.trim().length > 0);
      
      if (validItems.length === 0) {
        return [];
      }
      
      console.log(`[语义匹配-独立搜索] 开始: ${validItems.length}个选项 = [${validItems.join(", ")}]`);
      
      const allResults: ClassicsMatch[] = [];
      const seenIds = new Set<number>();
      
      for (let i = 0; i < validItems.length; i++) {
        const item = validItems[i].trim();
        console.log(`[语义匹配-独立搜索] 第${i + 1}/${validItems.length}项: "${item}"`);
        
        try {
          const matches = await searchNamingClassics(item, gender, limit);
          console.log(`[语义匹配-独立搜索] "${item}" → 找到 ${matches.length} 条典籍`);
          
          for (const match of matches) {
            if (!seenIds.has(match.id)) {
              seenIds.add(match.id);
              allResults.push(match);
            }
          }
        } catch (e) {
          console.error(`[语义匹配-独立搜索] 选项"${item}"搜索失败:`, e);
        }
      }
      
      // 按相似度降序排列
      allResults.sort((a, b) => b.similarity - a.similarity);
      
      const finalMatches = allResults.slice(0, limit);
      console.log(
        `[语义匹配-独立搜索] 完成: ${validItems.length}个选项独立搜索 → 合并去重后 ${allResults.length} 条 → 取前 ${finalMatches.length} 条`
      );
      return finalMatches;
    }
    
    // ── 字符串模式（向后兼容）──
    console.log(`[语义匹配-OVHcloud] 开始查找相似典籍: "${userInput}"`);
    const matches = await searchNamingClassics(userInput, gender, limit);
    console.log(`[语义匹配] 最终返回 ${matches.length} 个相似典籍`);
    return matches;
  } catch (error) {
    console.error("[语义匹配] 搜索失败:", error);
    return [];
  }
}

// ─── 拼音生成（基于 pinyin-pro 库，直接为每个汉字生成标准拼音）───
// 注意：从 v3.1 起，不再「修正」AI 输出的拼音，而是直接用 pinyin-pro 库重新生成。
// 因为 AI 输出的拼音错误率较高，且 pinyin-pro 对单音字能返回唯一正确读音，
// 对多音字也能返回最常用的读音（如"乐"→lè、"重"→zhòng），这在起名场景中足够准确。
// 相比「修正」策略，直接生成避免了多音字判断逻辑的各类 bug（如"诗"→shī vs shì 无法区分）。

/**
 * 直接用 pinyin-pro 库为 givenName 生成标准拼音（带声调符号）
 * 
 * 这是 v3.1 的核心改进：不再「修正」AI 的拼音，而是完全用 pinyin-pro 重新生成。
 * 原因：
 * 1. AI 输出拼音的错误率高达 5-10%（如"诗"→shì、"婉"→yuán），修正逻辑复杂且易漏
 * 2. pinyin-pro 对所有单音字能返回唯一正确读音，不会出错
 * 3. 对多音字返回最常用读音，在起名场景中足够准确（如"乐"→lè、"重"→zhòng、"朝"→zhāo）
 * 4. 对生僻字（如"妡""旸""昫"）也能准确返回读音
 * 
 * @param givenName 名字（不含姓氏）
 * @returns 每个字拼音以空格分隔，带声调符号，如 "shī yǔ"
 */
function generatePinyinFromPro(givenName: string): string {
  if (!givenName) return "";
  
  const nameChars = givenName.split("");
  const pinyinParts: string[] = [];
  
  for (const char of nameChars) {
    try {
      const py = pinyin(char, { toneType: 'symbol' });
      if (py && py.trim().length > 0) {
        pinyinParts.push(py.trim());
      } else {
        // pinyin-pro 未返回结果，记录日志但保留原字符位
        console.warn(`[拼音生成] pinyin-pro 未返回字符"${char}"的拼音`);
        pinyinParts.push(char);
      }
    } catch (e) {
      console.warn(`[拼音生成] pinyin-pro 查询"${char}"失败:`, e);
      pinyinParts.push(char);
    }
  }
  
  const result = pinyinParts.join(" ");
  return result;
}

/**
 * 2a. 构建AI提示词 - naming_materials 新路径
 * 当 naming_materials 匹配到候选短语时，直接给出20~30个候选名字构成提示词
 */
export function buildNamingMaterialsPrompt(
  request: SemanticNamingRequest,
  materials: NamingMaterialMatch[]
): string {
  const {
    surname = "张",
    gender = "F",
    expectations = "平安健康，聪明智慧",
    style = ["古风典雅"],
    wordCount = 2,
  } = request;

  const genderText = gender === "M" ? "男" : "女";
  const styleText = style.join("，");

  // 从 matching materials 中构建候选名字列表
  const candidateNames = materials
    .slice(0, 30)
    .map((m, i) => `  ${i + 1}. 「${m.phrase}」 - ${m.meaning}（出处: ${m.source}，风格: ${m.style.join("/")}，性别倾向: ${m.gender === "M" ? "男" : m.gender === "F" ? "女" : "通用"}）`)
    .join("\n");

  return `你是一位专业的中文起名专家。

【核心任务】请从以下候选名字素材中精选并润色，生成50个最优的中文名字（每个名字${wordCount}个字）。

【客户需求】
- 性别：【${genderText}】
- 姓氏：【${surname}】
- 期望寓意：【${expectations}】
- 风格偏好：【${styleText}】

【候选名字素材库】（以下是从语义匹配到的起名素材中提取的候选短语，请从中优先选用和润色）
${candidateNames}
以上 30 个候选短语仅供参考，您不必全部使用，而是从中精选最符合客户需求的 20~30 个进行润色，也可以基于这些素材的字意、意境创作新的变体。

        【润色要求】
1. 每个名字应当像完整的词语，有画面感和诗意（如"若溪"如同溪流、"书瑶"如诗书瑶华）
2. 避免两个抽象字的机械拼接（如"智仁"缺乏画面感）
3. 注意声调平仄搭配，读起来朗朗上口
4. 男名宜用刚健、宏大、英武类字，女名宜用柔美、温婉、秀丽类字
5. 可以基于候选素材的某个字进行同义替换创作（如"若溪"→"若川""若岚"）
6. 【★ 关键】用字必须多样化、分散：同一个汉字在全表50个名字中至多出现2次（包括双字名的2个字均算）。举例：如果"婉"字已经用于"婉如"、"婉妡"，则"婉"不能再出现第3次。必须不断换用其他同义字（如"婉"可换成"婌""嫣""娇""娴""姝"等）；
7. 【★ 关键】两个同音字不能在多于2个名字中出现。例如"欣"和"昕"同音，总计出现不超过2次。

【输出格式】用Markdown表格，列包括：序号、名字、拼音、寓意说明、选字理由、典籍出处、现代译文

【重要】
1. 必须输出50个名字，一个不能少
2. 每个名字的出处不能重复
3. 【关键】选字理由必须包含典籍中的具体篇章名和原文段落（带引号），格式为："某"字出自《某书·某篇》"……原文……"。不能只说"出自《诗经》"这种缺少篇章名和原文的笼统表述；
4. 【关键】典籍出处列必须精确到篇章名和原文句子，不能只说"《诗经》「明朗」、「开朗」"这种缺少篇章名和原文的表述；正确示例："《诗经·大雅·文王》"於昭于天""
5. 【关键】现代译文列必须用通俗易懂的白话文完整翻译名字的意境，不能为空；
6. 名字数量分配：约1/4的名字是单名（即名字只有一个字，如"毅""彤"），其余为双字名；
7. 不要添加任何额外的解释、开头语或结尾语
8. 【关键一致性检查】选字理由中引用的每个字必须确实存在于名字中
9. 【★ 严防编造】典籍出处列**严禁编造**！如果没有真实的典籍原文可以引用（即候选素材中没有对应某个字的典籍出处），请**将典籍出处列和选字理由列都留空**，不要自行编造。**宁可完全没有出处，也不要错误的出处。** 对于部分没有真实典籍素材对应的名字，只写寓意说明即可，不强制要求出处。`
}

/**
 * 2b. 构建AI提示词 - 旧流程（典籍搜索兜底，集成策略矩阵）
 */
export function buildAIPrompt(
  request: SemanticNamingRequest,
  matches: ClassicsMatch[]
): string {
  const {
    surname = "张",
    gender = "F",
    expectations = "平安健康，聪明智慧",
    style = ["古风典雅"],
    wordCount = 2,
  } = request;

  // 确定策略
  const strategy = request.strategyType || determineStrategy(style, expectations?.split(/[,，、\s]+/));
  const strategyPrompt = getStrategyPromptBlock(strategy);
  const strategyTag = getStrategyTag(strategy);

  const genderText = gender === "M" ? "男" : "女";
  const styleText = style.join("，");

  // ─── 降级模式 ───
  if (matches.length === 0) {
      return `你是一位专业的中文起名专家。
请根据以下客户需求，生成50个中文名字（每个名字${wordCount}个字）。

${strategyPrompt}

客户需求：
- 性别：【${genderText}】
- 姓氏：【${surname}】
- 期望寓意：【${expectations}】
- 风格偏好：【${styleText}】

输出格式：用Markdown表格，列包括：序号、名字、拼音、寓意说明、选字理由、典籍出处、现代译文

注意：
1. 【核心】名字应该像一个完整的词语，有画面感和诗意，不能是简单的好字堆砌。例如"若溪"（如同溪流）是好的，"智仁"（智慧+仁义）是两个抽象字的机械拼接、效果差；
2. 优先选择寓意美好的实词组合（如"语晴""沐晨""书瑶"），而非抽象概念的拼接；
3. 注意声调平仄搭配，读起来朗朗上口；
4. 拼音要准确，带声调标注；
5. 寓意说明要具体、有诗意；
6. 【关键】选字理由必须点名每个字取自哪部典籍哪篇哪段，且必须带引号引用该段原文（如：庄字出自《礼记·乐记》"故听其雅、颂之声，志意得广焉；执其干戚，习其俯仰诎伸，容貌得庄焉；"）；
7. 典籍出处必须精确到篇章名和原句，不能只说"出自《诗经》"这种笼统表述，也不能只写"象征坚强不屈"却不引用原文；
8. 名字要体现性别特点：男名宜用刚健、宏大、英武类字，女名宜用柔美、温婉、秀丽类字；
9. 【重要】每个名字的出处不能重复：请确保50个名字的出处覆盖不同的典籍篇章；
10. 现代译文列必须用通俗易懂的白话文解释名字的意境；
11. 名字数量分配：请确保约1/4的名字是单名（即名字只有一个字，如"李毅""陈彤"），其余为双字名；
12. 【关键一致性检查】选字理由中引用的每个字（如"庄"字出自…"庄"）必须确实存在于"名字"列中。名字不含的字，理由里不能引用。
13. 【★ 关键】用字必须多样化、分散：同一个汉字在全表50个名字中至多出现2次（包括双字名的2个字均算）。如果"婉"字已经用于"婉如"、"婉妡"，则"婉"不能再出现第3次。必须不断换用其他同义字；
14. 【★ 关键】两个同音字不能在多于2个名字中出现。例如"欣"和"昕"同音（都读xīn），总计出现不超过2次。
15. 【★ 严防编造】典籍出处列**严禁编造**！如果没有真实的典籍原文可以引用，请**将典籍出处列和选字理由列都留空**，不要自行编造。**宁可完全没有出处，也不要错误的出处。** 对于部分没有真实典籍对应的名字，只写寓意说明即可。`;
  }

  // ─── 有典籍匹配 ───
  const classicsInfo = matches
    .slice(0, 5)
    .map(
      (match, index) =>
        `${index + 1}. 《${match.bookName}》: "${match.ancientText}" (${match.modernText || "现代释义"})`
    )
    .join("\n");

  return `你是一位专业的中文起名专家。
请根据以下客户需求，生成50个中文名字（每个名字${wordCount}个字）。

${strategyPrompt}

客户需求：
- 性别：【${genderText}】
- 姓氏（可选）：【${surname}】
- 期望寓意：【${expectations}】
- 风格偏好：【${styleText}】
- 当前策略：【${strategyTag.label}】${strategyTag.description}

参考典籍（这些典籍已经语义匹配到与客户需求相关，请优先从中提取）：
${classicsInfo}

输出格式：用Markdown表格，列包括：序号、名字、拼音、寓意说明、选字理由、典籍出处、现代译文

注意：
1. 名字要优美、有文化内涵，符合客户性别和风格偏好
2. 拼音要准确，带声调标注
3. 寓意说明要具体、有诗意
4. 【关键】选字理由必须点名每个字取自哪部典籍哪篇哪段，且必须带引号引用该段原文（如：庄字出自《礼记·乐记》"故听其雅、颂之声，志意得广焉；执其干戚，习其俯仰诎伸，容貌得庄焉；"）；
5. 典籍出处必须精确到篇章名和原句，不能只说"出自《诗经》"这种笼统表述，也不能只写"象征坚强不屈"却不引用原文；
6. 名字要体现性别特点：男名宜用刚健、宏大、英武类字，女名宜用柔美、温婉、秀丽类字。
7. 【重要】每个名字的出处不能重复：请确保50个名字的出处覆盖不同的典籍篇章；
8. 【核心】名字应该像一个完整的词语，有画面感和诗意，不能是简单的好字堆砌。例如"若溪"（如同溪流）是好的，"智仁"（智慧+仁义）是两个抽象字的机械拼接、效果差；
9. 优先选择寓意美好的实词组合（如"语晴""沐晨""书瑶"），而非抽象概念的拼接；
10. 注意声调平仄搭配，读起来朗朗上口；
11. 现代译文列必须用通俗易懂的白话文解释名字的意境；
12. 名字数量分配：请确保约1/4的名字是单名（即名字只有一个字，如"李毅""陈彤"），其余为双字名；
13. 【关键一致性检查】选字理由中引用的每个字（如"庄"字出自…"庄"）必须确实存在于"名字"列中。名字不含的字，理由里不能引用。`;
}
/**
 * 3. 调用DeepSeek API生成名字
 */
export async function generateNamesWithDeepSeek(prompt: string): Promise<GeneratedName[]> {
  try {
    console.log("[DeepSeek] 开始生成名字...");

    if (!DeepSeekIntegration.isAvailable()) {
      throw new Error("DeepSeek API不可用");
    }

    const systemPrompt = `你是一位专业的国学起名专家，擅长从古典文化中提炼意境，为新生儿创作优雅、有内涵的名字。

命名原则：
1. 名字应该像一个完整的词语，有画面感和诗意，不能是简单的好字堆砌
2. 例如："若溪"（如同溪流）、"语晴"（言语如晴）、"书瑶"（诗书瑶华）、"沐晨"（沐浴晨光）
3. 优先选择寓意美好的实词组合，而非抽象概念的拼接
4. 注意声调平仄搭配，读起来朗朗上口
5. 结合用户选择的寓意方向和风格偏好

输出必须是用Markdown表格，列包括：序号、名字、拼音、寓意说明、选字理由、典籍出处、现代译文。

关键要求：
1. 必须输出50个名字，一个不能少
2. 每个名字的出处不能重复，覆盖不同典籍篇章
3. 选字理由必须包含典籍中的具体原文段落（带引号），不能只说"取自《礼记》"这种缺乏原文的笼统表述；
4. 典籍出处必须精确到篇章名和原句，不能只说"出自《诗经》"这种笼统表述；
5. 现代译文列用通俗易懂的白话文解释名字的意境；
6. 名字数量分配：约1/4的名字是单名（即名字只有一个字，如"毅""彤"），其余为双字名；
7. 不要添加任何额外的解释、开头语或结尾语
8. 【重要】名字必须是完整的词语组合（如"若溪"），而不是两个抽象字的机械拼接（如"智仁"就没意义——它们的组合没有画面感）。
9. 【★ 关键】用字必须多样化、分散：同一个汉字在全部50个名字中至多出现2次。如果"婉"字已经用于"婉如"、"婉妡"，则"婉"不能再出现第3次。必须不断换用其他同义字（如"婉"可换成"婌""嫣""娇""娴""姝"等）；
10. 【★ 关键】两个同音字不能在多于2个名字中出现。例如"欣"和"昕"同音，总计出现不超过2次。
11. 【★ 严防编造】典籍出处列**严禁编造**！如果没有真实的典籍原文可以引用，请**将典籍出处列和选字理由列都留空**，不要自行编造。**宁可完全没有出处，也不要错误的出处。** 对于部分没有真实典籍对应的名字，只写寓意说明即可。`;

    const response = await DeepSeekIntegration.callRaw(systemPrompt, prompt, 0.3, 4096);
    const names = parseMarkdownTable(response);

    console.log(`[DeepSeek] 成功生成 ${names.length} 个名字`);
    return names;
  } catch (error) {
    console.error("[DeepSeek] 生成名字失败:", error);
    return [];
  }
}

/**
 * 4. 过滤逻辑
 * 
 * 注意：不再使用 COMMON_CHARS 白名单过滤（过于严格，会把"梦""紫""雪""韵"等常见好字误杀），
 * 改为只检查禁忌字黑名单。
 */

const TABOO_CHARS = new Set([
  "死", "亡", "病", "痛", "伤", "残", "废", "败", "衰", "弱",
  "贫", "穷", "苦", "难", "凶", "恶", "毒", "狠", "奸", "诈",
]);

export function filterNames(
  names: GeneratedName[],
  gender: "M" | "F" = "F"
): FilterResult {
  const passed: GeneratedName[] = [];
  const removed: Array<{ name: string; reason: string }> = [];

  for (const name of names) {
    // 注意：name.givenName 已经是去掉姓氏后的名字（由 extractGivenName 处理）
    // name.name 与 givenName 相同（由 parseMarkdownTable 设置）
    const givenName = name.givenName || name.name;
    let shouldRemove = false;
    let reason = "";

    // 1. 性别不适合
    if (gender === "M" && ["柔", "婉", "淑", "娴", "婷", "嫣", "妍", "娇", "娜", "婵", "媚", "媛"].some(c => givenName.includes(c))) {
      shouldRemove = true;
      reason = "名字含女性化字，不适合男性";
    }
    if (gender === "F" && ["刚", "强", "雄", "伟", "浩", "毅", "猛", "霸", "彪"].some(c => givenName.includes(c))) {
      shouldRemove = true;
      reason = "名字含男性化字，不适合女性";
    }

    // 2. 负面含义（逐个字符检查）
    if ([...givenName].some(c => TABOO_CHARS.has(c))) {
      shouldRemove = true;
      reason = "含负面含义的字";
    }

    // 3. 长度检查：名字只能是1~2个字（不包含姓氏）
    if (givenName.length > 2 || givenName.length < 1) {
      shouldRemove = true;
      reason = `名字长度异常（${givenName.length}个字），正常应为1~2个字`;
    }

    if (shouldRemove) {
      removed.push({ name: name.name, reason });
    } else {
      passed.push(name);
    }
  }

  return { passed, removed };
}

/**
 * 完整的语义起名流程
 * 
 * ★ 新流程（两步走）：
 *   第一步：搜索 naming_materials 表
 *     → 匹配到 ≥5 个 → 走新路径（素材润色）
 *     → 匹配不到 → 回退到 naming_classics 搜索
 * 
 * ★ 旧流程（兜底）：
 *   搜索 naming_classics → 构建提示词 → DeepSeek 生成 → 评分排序
 */
export async function semanticNamingFlow(
  request: SemanticNamingRequest
): Promise<{
  success: boolean;
  matches: ClassicsMatch[];
  generatedNames: GeneratedName[];
  filteredNames: GeneratedName[];
  filterResult: FilterResult;
  strategyType: NamingStrategyType;
  message: string;
}> {
  const startTime = Date.now();
  console.log("[语义起名] ========== 开始 ==========");
  console.log("[语义起名] 输入参数:", JSON.stringify(request, null, 2));

  const { gender = "F" } = request;
  const strategy = request.strategyType || determineStrategy(request.style || [], request.expectations?.split(/[,，、\s]+/));
  console.log(`[语义起名] 策略矩阵: 策略=${STRATEGY_LABELS[strategy]}`);

  try {
    // ================================================================
    // ★ 第一步：搜索 naming_materials 表（新流程）
    // ================================================================
    console.log("[语义起名-新流程] ★ 第一步：搜索 naming_materials 表");

    // 构建搜索词：优先用 expections + style 组合，其次用 rawInput
    let currentSearchInput: string;
    if (request.expectations && request.style && request.style.length > 0) {
      currentSearchInput = `${request.expectations} ${request.style.join(" ")}`;
    } else {
      currentSearchInput = request.rawInput || request.expectations || "";
    }
    console.log(`[语义起名-新流程] ★ 第一步：搜索 naming_materials 表: "${currentSearchInput}"`);

    const namingMaterials = await searchNamingMaterials(
      currentSearchInput,
      gender,
      30  // 最多取30个候选
    );

    // ════════════════════════════════════════════════════════════════
    // 在新路径下也搜索 naming_classics，用于充实 modernText 和典籍来源
    // ════════════════════════════════════════════════════════════════
    console.log("[语义起名-新流程] ★★ 同步搜索 naming_classics 表，用于充实典籍出处和现代译文");
    
    // 合并意向词和原始输入进行典籍搜索
    let classicsSearchInput = currentSearchInput;
    if (request.intentions && request.intentions.length > 0) {
      classicsSearchInput = `${currentSearchInput} ${request.intentions.join(" ")}`;
    }
    
    let classicsMatches: ClassicsMatch[] = [];
    try {
      classicsMatches = await findSemanticMatches(classicsSearchInput, 10, gender);
      console.log(`[语义起名-新流程] naming_classics 找到 ${classicsMatches.length} 条典籍记录`);
    } catch (e) {
      console.warn("[语义起名-新流程] naming_classics 搜索失败:", e);
    }

    if (namingMaterials.length >= 5) {
      // ================================================================
      // ★★ 新路径：naming_materials 匹配足够 → 直接构造候选名字让 AI 润色
      // ================================================================
      console.log(`[语义起名-新流程] ★★ naming_materials 匹配到 ${namingMaterials.length} 个候选短语 → 走新路径`);

      // 2a. 构建带候选素材的提示词
      const prompt = buildNamingMaterialsPrompt(request, namingMaterials);

      // 3a. 调用DeepSeek润色生成名字
      const generatedNames = await generateNamesWithDeepSeek(prompt);

      if (generatedNames.length === 0) {
        return {
          success: false,
          matches: classicsMatches,
          generatedNames: [],
          filteredNames: [],
          filterResult: { passed: [], removed: [] },
          strategyType: strategy,
          message: "DeepSeek润色失败（新路径）",
        };
      }

      // 4a. 标记策略
      const taggedNames = generatedNames.map((n) => ({
        ...n,
        strategyType: strategy,
      }));

      // ✅ 硬性过滤
      const hardFilterOptions: HardFilterOptions = {
        surname: request.surname,
      };
      const hardResult = hardFilterNames(taggedNames, hardFilterOptions);
      const filterResult: FilterResult = {
        passed: hardResult.passed,
        removed: hardResult.removed.map((r) => ({
          name: r.name,
          reason: r.reasons.map((rr) => rr.reason).join("; "),
        })),
      };

      console.log(
        `[语义起名-新路径] 硬性过滤: ${taggedNames.length} → 通过${filterResult.passed.length}, 移除${filterResult.removed.length}`
      );

      // ✅ 七维加权打分排序（附带典籍匹配用于文化维度评分）
      const scoringContext: ScoringContext = {
        expectations: request.expectations || "",
        styles: request.style || [],
        matchedClassics: classicsMatches,
        gender: request.gender || "M",
        surname: request.surname,
      };
      const scoredNames = await scoreAndSortNames(filterResult.passed, scoringContext, { concurrency: 3 });
      const finalScored = scoredNames.map(sn => {
        const { scoreBreakdownV2, ...rest } = sn as any;
        return { ...rest, score: sn.score, scoreBreakdownV2 };
      }) as GeneratedName[];

      console.log(
        `[语义起名-新路径] 七维打分排序完成: 前5名 = ${finalScored.slice(0, 5).map(n => `${n.name}(${n.score}分)`).join(", ")}`
      );

      return {
        success: true,
        matches: classicsMatches,  // ✅ 传回典籍匹配列表，供 API route 用于充实 modernText
        generatedNames: taggedNames,
        filteredNames: finalScored,
        filterResult,
        strategyType: strategy,
        message: `成功生成${taggedNames.length}个名字（新路径：naming_materials素材润色）`,
      };
    }

    // ================================================================
    // ★★ 回退路径：naming_materials 匹配不足（<5）→ 走原来的 naming_classics 搜索流程
    // ================================================================
    console.log(`[语义起名-回退] naming_materials 仅匹配到 ${namingMaterials.length} 个（<5），回退到旧典籍搜索流程`);

    // 1. 语义匹配 — 根据是否有 intentions 选择搜索模式
    let searchInput: string | string[];
    if (request.intentions && request.intentions.length > 0) {
      searchInput = request.intentions;
      console.log(`[语义起名-回退] 使用独立搜索模式: ${request.intentions.length}个意向词`);
    } else {
      searchInput = request.rawInput || request.expectations || "";
      console.log(`[语义起名-回退] 使用混合搜索模式: "${searchInput}"`);
    }

    const matches = await findSemanticMatches(
      searchInput,
      10,
      gender
    );

    if (matches.length === 0) {
      console.log("[语义起名-回退] 未找到典籍匹配，降级为直接使用 DeepSeek 生成名字");
      const prompt = buildAIPrompt(request, []);
      const generatedNames = await generateNamesWithDeepSeek(prompt);

      if (generatedNames.length === 0) {
        return {
          success: false,
          matches: [],
          generatedNames: [],
          filteredNames: [],
          filterResult: { passed: [], removed: [] },
          strategyType: strategy,
          message: "未找到匹配的典籍",
        };
      }

      const taggedNames = generatedNames.map((n) => ({
        ...n,
        strategyType: strategy,
      }));

      const hardFilterOptions: HardFilterOptions = {
        surname: request.surname,
      };
      const hardResult = hardFilterNames(taggedNames, hardFilterOptions);

      const filterResult: FilterResult = {
        passed: hardResult.passed,
        removed: hardResult.removed.map((r) => ({
          name: r.name,
          reason: r.reasons.map((rr) => rr.reason).join("; "),
        })),
      };

      console.log(
        `[语义起名-回退-降级] 硬性过滤: ${taggedNames.length} → 通过${filterResult.passed.length}, 移除${filterResult.removed.length}`
      );

      const scoringContext: ScoringContext = {
        expectations: request.expectations || "",
        styles: request.style || [],
        matchedClassics: [],
        gender: request.gender || "M",
        surname: request.surname,
      };
      const scoredNames = await scoreAndSortNames(filterResult.passed, scoringContext, { concurrency: 3 });
      const finalScored = scoredNames.map(sn => {
        const { scoreBreakdownV2, ...rest } = sn as any;
        return { ...rest, score: sn.score, scoreBreakdownV2 };
      }) as GeneratedName[];

      console.log(
        `[语义起名-回退-降级] 七维打分排序完成: 前5名 = ${finalScored.slice(0, 5).map(n => `${n.name}(${n.score}分)`).join(", ")}`
      );

      return {
        success: true,
        matches: [],
        generatedNames: taggedNames,
        filteredNames: finalScored,
        filterResult,
        strategyType: strategy,
        message: `成功生成${taggedNames.length}个名字（回退降级：AI直接生成）`,
      };
    }

    // 2b. 构建提示词（旧流程，有典籍匹配）
    const prompt = buildAIPrompt(request, matches);

    // 3b. 调用DeepSeek
    const generatedNames = await generateNamesWithDeepSeek(prompt);

    if (generatedNames.length === 0) {
      return {
        success: false,
        matches: [],
        generatedNames: [],
        filteredNames: [],
        filterResult: { passed: [], removed: [] },
        strategyType: strategy,
        message: "DeepSeek生成名字失败",
      };
    }

    // 4. 为每个名字标记策略
    const taggedNames = generatedNames.map((n) => ({
      ...n,
      strategyType: strategy,
    }));

    // ✅ 硬性过滤
    const hardFilterOptions: HardFilterOptions = {
      surname: request.surname,
    };
    const hardResult = hardFilterNames(taggedNames, hardFilterOptions);

    const filterResult: FilterResult = {
      passed: hardResult.passed,
      removed: hardResult.removed.map((r) => ({
        name: r.name,
        reason: r.reasons.map((rr) => rr.reason).join("; "),
      })),
    };

    console.log(
      `[语义起名-主路径] 硬性过滤: ${taggedNames.length} → 通过${filterResult.passed.length}, 移除${filterResult.removed.length}`
    );

      if (summarizeRemoved(hardResult.removed).length > 0) {
        console.log(`[语义起名-主路径] 淘汰详情:\n${summarizeRemoved(hardResult.removed)}`);
      }

      // ✅ 七维加权打分排序（主路径）
      const mainScoringContext: ScoringContext = {
        expectations: request.expectations || "",
        styles: request.style || [],
        matchedClassics: matches,
        gender: request.gender || "M",
        surname: request.surname,
      };
      const mainScoredNames = await scoreAndSortNames(filterResult.passed, mainScoringContext, { concurrency: 3 });
      const mainFinalScored = mainScoredNames.map(sn => {
        const { scoreBreakdownV2, ...rest } = sn as any;
        return { ...rest, score: sn.score, scoreBreakdownV2 };
      }) as GeneratedName[];

      console.log(
        `[语义起名-主路径] 七维打分排序完成: 前5名 = ${mainFinalScored.slice(0, 5).map(n => `${n.name}(${n.score}分)`).join(", ")}`
      );

      console.log(
        `[语义起名] 完成: 策略=${STRATEGY_LABELS[strategy]}, 生成${taggedNames.length}个`
      );

      return {
        success: true,
        matches,
        generatedNames: taggedNames,
        filteredNames: mainFinalScored,
        filterResult,
        strategyType: strategy,
        message: `成功生成${taggedNames.length}个名字`,
      };
  } catch (error) {
    console.error("[语义起名] 流程失败:", error);
    return {
      success: false,
      matches: [],
      generatedNames: [],
      filteredNames: [],
      filterResult: { passed: [], removed: [] },
      strategyType: NamingStrategyType.BALANCED,
      message: `语义起名流程失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ========== 辅助函数 ==========

function extractMeaningfulChars(text: string): string[] {
  if (!text) return [];
  const chars: string[] = [];
  for (const char of text) {
    if (isChineseCharacter(char) && !chars.includes(char)) {
      chars.push(char);
    }
  }
  return chars.slice(0, 10);
}

function extractMeaning(text: string): string {
  if (!text) return "美好寓意";
  return text.length > 30 ? text.slice(0, 30) + "..." : text;
}

function isChineseCharacter(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 0x4E00 && code <= 0x9FFF;
}

/**
 * 校验并清洗 reason：确保 reason 中引用的汉字都存在于名字中
 * 如果引用了名字中不存在的字（LLM幻觉），移除包含该字的句子
 */
function sanitizeReason(reason: string, givenName: string): string {
  if (!reason || !givenName) return reason;
  
  // 名字中的实际汉字（去掉姓氏后的所有字）
  const nameChars = new Set<string>();
  for (const ch of givenName) {
    if (isChineseCharacter(ch)) {
      nameChars.add(ch);
    }
  }
  if (nameChars.size === 0) return reason;

  // 按句号、分号、换行分隔句子
  const sentences = reason.split(/[。；;\n]/).map(s => s.trim()).filter(s => s.length > 0);
  const cleaned: string[] = [];

  for (const sentence of sentences) {
    // 提取句子中所有被引用的汉字：
    // 模式1: "远"字出自 或 "远"出自
    // 模式2: 远字出自（无引号）
    const citedChars: string[] = [];
    const charRefRegex = /["""'『「]?([\u4e00-\u9fff])["""'』」]?(?:字)?(?=出自)/g;
    let match;
    while ((match = charRefRegex.exec(sentence)) !== null) {
      citedChars.push(match[1]);
    }

    // 如果句子没有引用任何字，保留（可能是解释性文字）
    if (citedChars.length === 0) {
      cleaned.push(sentence);
      continue;
    }

    // 检查引用的每个字是否都在名字中
    const hasHallucinated = citedChars.some(c => !nameChars.has(c));
    if (!hasHallucinated) {
      cleaned.push(sentence);
    } else {
      console.log(`[sanitizeReason] 移除幻觉句子: "${sentence}" (名字="${givenName}", 引用了=${citedChars.join(",")})`);
    }
  }

  return cleaned.length > 0 ? cleaned.join('；') : reason;
}

/**
 * 检测表格是否有某列。通过检查前几行数据的列数分布，推断实际列数
 * 解决AI输出列数不定（有时6列有时7列）导致列索引错位的问题
 */
function detectColumnCount(tableLines: string[]): number {
  // 取前10行数据行，统计列数分布
  const colCounts: number[] = [];
  for (const line of tableLines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("|")) {
      const cells = trimmed.split("|").filter(c => c.trim().length > 0);
      if (cells.length >= 4) {
        colCounts.push(cells.length);
      }
    }
  }
  
  if (colCounts.length === 0) return 7; // 默认7列
  
  // 取众数作为实际列数
  const freq: Record<number, number> = {};
  for (const c of colCounts) {
    freq[c] = (freq[c] || 0) + 1;
  }
  
  let detectedCols = 7;
  let maxFreq = 0;
  for (const [cols, count] of Object.entries(freq)) {
    if (count > maxFreq) {
      maxFreq = count;
      detectedCols = parseInt(cols);
    }
  }
  
  return detectedCols;
}

/**
 * 增强版表格解析
 * 
 * 核心改进：检测AI输出的实际列数（6列或7列），自适应调整列索引
 * - 如果检测到7列 → 标准模式：序号、名字、拼音、寓意、理由、出处、现代译文
 * - 如果检测到6列（缺少现代译文列）→ 调整模式：序号、名字、拼音、寓意、理由、出处
 * - 如果检测到5列 → 降级模式：序号、名字、拼音、寓意、理由+出处混合
 */
function parseMarkdownTable(markdown: string): GeneratedName[] {
  const names: GeneratedName[] = [];
  try {
    const lines = markdown.split("\n");
    let inTable = false;
    let detectedCols = 7;
    const dataLines: string[] = [];

    // 第一遍：收集所有表格行并检测列数
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("|") && trimmed.includes("名字") && trimmed.includes("拼音")) {
        inTable = true;
        continue;
      }
      if (inTable && trimmed.startsWith("|") && trimmed.includes("---")) {
        continue;
      }
      if (inTable && trimmed.startsWith("|")) {
        dataLines.push(trimmed);
      }
    }
    
    // 检测实际列数
    detectedCols = detectColumnCount(dataLines);
    console.log(`[解析表格] 检测到列数: ${detectedCols}（数据行数: ${dataLines.length}）`);

    // 第二遍：按检测到的列数解析
    for (const line of dataLines) {
      const cells = line
        .split("|")
        .map((cell) => cell.trim())
        .filter((cell) => cell);

      if (cells.length < 5) continue; // 至少需要5列

      // ── 自适应列映射 ──
      // 实际列数 >= 7 → 7列标准模式
      // 实际列数 = 6 → 无现代译文模式
      // 实际列数 = 5 → 降级模式（出处合并在理由中）
      
      let givenName: string;
      let pinyin: string;
      let meaning: string;
      let reason: string;
      let source: string;
      let modernText: string;

      if (cells.length >= 7) {
        // 标准7列模式: 序号、名字、拼音、寓意说明、选字理由、典籍出处、现代译文
        const rawName = cells[1];
        givenName = extractGivenName(rawName);
        pinyin = cells[2];
        meaning = cells[3];
        reason = cells[4];
        source = cells[5];
        modernText = cells[6];
      } else if (cells.length === 6) {
        // 6列模式（缺现代译文）: 序号、名字、拼音、寓意说明、选字理由、典籍出处
        const rawName = cells[1];
        givenName = extractGivenName(rawName);
        pinyin = cells[2];
        meaning = cells[3];
        reason = cells[4];
        source = cells[5];
        modernText = ""; // 无现代译文
      } else {
        // 5列降级模式: 序号、名字、拼音、寓意说明、选字理由+出处混合
        const rawName = cells[1];
        givenName = extractGivenName(rawName);
        pinyin = cells[2];
        meaning = cells[3];
        // 尝试从理由中分离出处
        const combined = cells[4];
        const sourceMatch = combined.match(/[（(]?出自.*?[）)]?/);
        if (sourceMatch) {
          source = sourceMatch[0];
          reason = combined.replace(sourceMatch[0], "").trim();
        } else {
          reason = combined;
          source = "";
        }
        modernText = "";
      }

      // ✅ v3.1 改进：完全用 pinyin-pro 重新生成拼音，不再修正 AI 输出
      pinyin = generatePinyinFromPro(givenName);

      // ✅ 关键修复：过滤4字名（含姓3字或4字都不行）
      if (givenName.length > 2 || givenName.length < 1) {
        console.log(`[解析表格] 跳过长度异常的名字: "${givenName}"（${givenName.length}个字）`);
        continue;
      }

      // ✅ 校验 reason：移除引用了名字中不存在的汉字的部分（LLM幻觉防御）
      const cleanedReason = sanitizeReason(reason, givenName);

      names.push({
        name: givenName,
        givenName,
        pinyin,
        meaning,
        reason: cleanedReason,
        source,
        modernText,
        score: 80,
      });
    }

    console.log(`[解析表格] 解析完成: 共 ${names.length} 个名字`);
  } catch (error) {
    console.error("[解析表格] 失败:", error);
  }
  return names;
}

/**
 * 从可能的"姓氏+名字"格式中提取名字（givenName）
 * 处理 "张美欣" → "美欣"，"李毅" → "毅"
 */
function extractGivenName(rawName: string): string {
  // 常见姓氏列表
  const commonSurnames = new Set([
    "赵","钱","孙","李","周","吴","郑","王","冯","陈","褚","卫","蒋","沈","韩","杨",
    "朱","秦","尤","许","何","吕","施","张","孔","曹","严","华","金","魏","陶","姜",
    "戚","谢","邹","喻","柏","水","窦","章","云","苏","潘","葛","奚","范","彭","郎",
    "鲁","韦","昌","马","苗","凤","花","方","俞","任","袁","柳","酆","鲍","史","唐",
    "费","廉","岑","薛","雷","贺","倪","汤","滕","殷","罗","毕","郝","邬","安","常",
    "乐","于","时","傅","皮","卞","齐","康","伍","余","元","卜","顾","孟","平","黄",
    "和","穆","萧","尹","姚","邵","湛","汪","祁","毛","禹","狄","米","贝","明","臧",
    "计","伏","成","戴","谈","宋","茅","庞","熊","纪","舒","屈","项","祝","董","梁",
    "杜","阮","蓝","闵","席","季","麻","强","贾","路","娄","危","江","童","颜","郭",
    "梅","盛","林","刁","钟","徐","邱","骆","高","夏","蔡","田","樊","胡","凌","霍",
    "虞","万","支","柯","昝","管","卢","莫","经","房","裘","缪","干","解","应","宗",
    "丁","宣","贲","邓","郁","单","杭","洪","包","诸","左","石","崔","吉","钮","龚",
    "程","嵇","邢","滑","裴","陆","荣","翁","荀","羊","於","惠","甄","曲","家","封",
    "芮","羿","储","靳","汲","邴","糜","松","井","段","富","巫","乌","焦","巴","弓",
    "牧","隗","山","谷","车","侯","宓","蓬","全","郗","班","仰","秋","仲","伊","宫",
    "宁","仇","栾","暴","甘","钭","厉","戎","祖","武","符","刘","景","詹","束","龙",
    "叶","幸","司","韶","郜","黎","蓟","薄","印","宿","白","怀","蒲","邰","从","鄂",
    "索","咸","籍","赖","卓","蔺","屠","蒙","池","乔","阴","郁","胥","能","苍","双",
    "闻","莘","党","翟","谭","贡","劳","逄","姬","申","扶","堵","冉","宰","郦","雍",
    "郤","璩","桑","桂","濮","牛","寿","通","边","扈","燕","冀","郏","浦","尚","农",
    "温","别","庄","晏","柴","瞿","阎","充","慕","连","茹","习","宦","艾","鱼","容",
    "向","古","易","慎","戈","廖","庾","终","暨","居","衡","步","都","耿","满","弘",
    "匡","国","文","寇","广","禄","阙","东","欧","殳","沃","利","蔚","越","夔","隆",
    "师","巩","厍","聂","晁","勾","敖","融","冷","訾","辛","阚","那","简","饶","空",
    "曾","毋","沙","乜","养","鞠","须","丰","巢","关","蒯","相","查","后","荆","红",
    "游","竺","权","逯","盖","益","桓","公","万俟","司马","上官","欧阳","夏侯","诸葛",
    "闻人","东方","赫连","皇甫","尉迟","公羊","澹台","公冶","宗政","濮阳","淳于","单于",
    "太叔","申屠","公孙","仲孙","轩辕","令狐","钟离","宇文","长孙","慕容","鲜于","闾丘",
    "司徒","司空","亓官","司寇","仉","督","子车","颛孙","端木","巫马","公西","漆雕",
    "乐正","壤驷","公良","拓跋","夹谷","宰父","谷梁","晋","楚","闫","法","汝","鄢","涂",
    "钦","段干","百里","东郭","南门","呼延","归","海","羊舌","微生","岳","帅","缑","亢",
    "况","后","有","琴","梁丘","左丘","东门","西门","商","牟","佘","佴","伯","赏","南宫",
    "墨","哈","谯","笪","年","爱","阳","佟","第五","言","福",
  ]);

  if (!rawName) return "";

  // 尝试去掉常见姓氏
  const potentialDoubleSurname = rawName.slice(0, 2);
  if (commonSurnames.has(potentialDoubleSurname)) {
    return rawName.slice(2);
  }
  const potentialSingleSurname = rawName.slice(0, 1);
  if (commonSurnames.has(potentialSingleSurname) && rawName.length >= 2) {
    return rawName.slice(1);
  }
  
  // 如果实际传入的 fullName 里没有姓（可能AI没有加姓），直接作为 givenName
  return rawName;
}

/**
 * 后处理去重/分散逻辑：确保同一汉字在同批名字中至多出现 MAX_REPEAT 次
 * 作为 AI prompt 之外的安全兜底——即使 AI 没有遵守 prompt 中关于用字分散的要求，
 * 本函数也会自动替换重复使用的字，确保最终输出的名字不至于滥用某一字。
 * 
 * 原理：统计每个汉字在所有名字中出现的总次数（双字名中2个字各算一次），
 * 如果某个字出现次数超过 maxRepeat，则按评分从低到高逐步剔除包含该字的名字。
 */
function diversifyNames(
  names: GeneratedName[],
  maxRepeat: number = 2,
  maxHomophoneRepeat: number = 2
): { diversified: GeneratedName[]; removed: Array<{ name: string; reason: string }> } {
  if (names.length <= 10) {
    return { diversified: names, removed: [] }; // 名字太少时不做分散处理
  }

  // 按分数降序排列（高分在前，优先保留）
  const sorted = [...names].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const removed: Array<{ name: string; reason: string }> = [];
  
  // ─── 第一步：按汉字频次去重 ───
  const charCount = new Map<string, number>();
  const result1: GeneratedName[] = [];

  for (const name of sorted) {
    const givenName = name.givenName || name.name;
    if (!givenName) {
      result1.push(name);
      continue;
    }

    // 先模拟如果添加这个名，各字出现次数
    const newChars = [...givenName].filter(c => isChineseCharacter(c));
    let wouldExceed = false;
    
    for (const ch of newChars) {
      const current = charCount.get(ch) ?? 0;
      if (current >= maxRepeat) {
        wouldExceed = true;
        removed.push({ name: name.name || givenName, reason: `字"${ch}"已出现${current}次（上限${maxRepeat}次），需分散用字` });
        console.log(`[分散后处理] 剔除"${givenName}"：字"${ch}"已出现${current}次`);
        break;
      }
    }

    if (!wouldExceed) {
      // 增加计数
      for (const ch of newChars) {
        charCount.set(ch, (charCount.get(ch) ?? 0) + 1);
      }
      result1.push(name);
    }
  }

  // ─── 第二步：按同音字去重（使用 pinyin-pro 查询读音，避免靠手写映射表）───
  const homophoneCount = new Map<string, number>();
  const result2: GeneratedName[] = [];

  for (const name of result1) {
    const givenName = name.givenName || name.name;
    if (!givenName) {
      result2.push(name);
      continue;
    }

    const newChars = [...givenName].filter(c => isChineseCharacter(c));
    let wouldExceed = false;

    for (const ch of newChars) {
      try {
        const py = pinyin(ch, { toneType: 'none' }); // 不带声调的同音判断
        if (py) {
          const current = homophoneCount.get(py) ?? 0;
          if (current >= maxHomophoneRepeat) {
            wouldExceed = true;
            removed.push({ name: name.name || givenName, reason: `读音"${py}"已出现${current}次（上限${maxHomophoneRepeat}次），需分散读音` });
            break;
          }
        }
      } catch {
        // 拼音查询失败则跳过
      }
    }

    if (!wouldExceed) {
      for (const ch of newChars) {
        try {
          const py = pinyin(ch, { toneType: 'none' });
          if (py) {
            homophoneCount.set(py, (homophoneCount.get(py) ?? 0) + 1);
          }
        } catch {}
      }
      result2.push(name);
    }
  }

  if (removed.length > 0) {
    console.log(`[分散后处理] 去重完成: 原${names.length}个 → 汉字去重后${result1.length}个 → 同音去重后${result2.length}个, 移除${removed.length}个`);
  }

  return { diversified: result2, removed };
}

/**
 * 意气类别匹配：名字寓意与典籍译文的意气类别是否相符
 * 
 * 将名字寓意和典籍译文分别归类，确保匹配的典籍气质与名字寓意方向一致，
 * 防止出现"豪迈大气"配"谦卑恭谨"这种意气背离的问题。
 */

// 通用负面词列表（任何典籍译文包含这些词 → 直接否决此出处）
const GENERAL_NEGATIVE_TERMS = [
  "骄溢", "骄躁", "急躁", "表里不一", "心术不正",
  "奸诈", "虚伪", "粗俗", "浮滑",
  "困苦", "危难", "险恶", "动荡",
  "愚钝", "昏聩", "浅薄", "鄙陋",
  "哀愁", "悲戚", "凄凉", "怨愤",
  "平庸", "平凡", "庸俗", "卑微",
];

// 意气类别与关键词映射表
const SPIRIT_CATEGORIES: Record<string, {
  keywords: string[];
  nameMatch: string[];
  classicsMatch: string[];
  incompatible: string[];
}> = {
  "豪迈大气": {
    keywords: ["豪迈", "大气", "雄壮", "宏伟", "刚健", "刚强", "强大", "霸业", "威武", "壮志", "奋发", "激昂", "昂扬"],
    nameMatch: ["豪迈大气", "大气豪迈", "豪迈", "雄壮", "威武"],
    classicsMatch: ["壮志", "奋发", "刚强", "宏大", "雄壮", "豪迈", "气势", "奋发图强"],
    incompatible: ["谦恭", "谨慎", "温顺", "谦卑", "恭敬", "小心", "柔顺", "怯弱"],
  },
  "阳光开朗": {
    keywords: ["阳光", "开朗", "明亮", "明媚", "曙光", "光明", "灿烂", "温暖", "朝气", "活力", "乐观"],
    nameMatch: ["阳光开朗", "开朗", "阳光", "明亮", "温暖"],
    classicsMatch: ["光明", "灿烂", "温暖", "阳光", "晨曦", "朝霞"],
    incompatible: ["阴郁", "低沉", "忧伤", "哀愁", "肃杀", "哀戚", "悲凉", "愁苦"],
  },
  "品德高尚": {
    keywords: ["品德", "高尚", "仁德", "正直", "高洁", "廉洁", "谦和", "诚信", "忠诚", "仁义", "君子", "贤德"],
    nameMatch: ["品德高尚", "高尚", "仁德", "正直", "君子", "贤德"],
    classicsMatch: ["仁德", "正直", "高洁", "诚信", "谦和", "仁义"],
    incompatible: ["武力", "权谋", "战争", "奸诈", "诡计", "骄溢", "心术不正", "表里不一", "刚愎", "虚伪", "骄躁", "傲慢", "暴戾", "苛责", "严酷"],
  },
  "温文儒雅": {
    keywords: ["温文", "儒雅", "谦和", "恬淡", "从容", "文雅", "淡泊", "优雅", "书卷", "文采", "风雅"],
    nameMatch: ["温文儒雅", "儒雅", "文雅", "优雅", "书卷气"],
    classicsMatch: ["从容", "谦和", "恬淡", "文雅", "优雅", "风雅"],
    incompatible: ["雄壮", "霸业", "武力", "战争", "刚猛", "粗俗", "浮滑", "骄溢", "心术不正"],
  },
  "事业有成": {
    keywords: ["事业", "有成", "进取", "功业", "成就", "奋发", "勉励", "建功", "立业", "卓越", "腾达"],
    nameMatch: ["事业有成", "进取", "功业", "成就", "奋发"],
    classicsMatch: ["进取", "功业", "勉励", "奋发", "励志"],
    incompatible: ["退隐", "消极", "无为", "出世", "遁世", "困苦", "失败", "落魄", "蹉跎", "失意"],
  },
  "独特个性": {
    keywords: ["独特", "个性", "与众不同", "特别", "创新", "独特魅力"],
    nameMatch: ["独特个性", "独特", "个性"],
    classicsMatch: ["创新", "独特", "独立"],
    incompatible: ["平庸", "随俗", "从众", "平凡", "庸俗", "普通"],
  },
  "洋气国际": {
    keywords: ["洋气", "国际", "时尚", "现代", "潮流", "国际化"],
    nameMatch: ["洋气国际", "国际", "时尚", "洋气"],
    classicsMatch: ["时尚", "现代", "国际"],
    incompatible: ["守旧", "陈腐", "传统", "古板", "迂腐", "陈旧", "保守"],
  },
};

/**
 * 智能检测名字寓意的意气类别
 */
function detectNameSpirit(meaning: string): string[] {
  if (!meaning) return ["通用"];
  
  const matchedCategories: string[] = [];
  const meaningLower = meaning.toLowerCase();
  
  for (const [category, config] of Object.entries(SPIRIT_CATEGORIES)) {
    for (const keyword of config.keywords) {
      if (meaningLower.includes(keyword)) {
        matchedCategories.push(category);
        break;
      }
    }
  }
  
  return matchedCategories.length > 0 ? matchedCategories : ["通用"];
}

/**
 * 智能检测典籍译文的意气类别
 */
function detectClassicsSpirit(modernText: string, ancientText: string): string[] {
  const textToCheck = `${modernText || ""} ${ancientText || ""}`.toLowerCase();
  if (!textToCheck.trim()) return ["通用"];
  
  // ── 通用负面检测：如果典籍译文包含任何通用负面词 → 直接标记不兼容，后续整体否决 ──
  for (const term of GENERAL_NEGATIVE_TERMS) {
    if (textToCheck.includes(term)) {
      console.log(`[意气检测-通用负面] 典籍译文含"${term}"，标记为不兼容:通用`);
      return [`不兼容:通用`]; // 直接返回，不再做任何正面匹配
    }
  }
  
  const matchedCategories: string[] = [];
  
  for (const [category, config] of Object.entries(SPIRIT_CATEGORIES)) {
    for (const keyword of config.classicsMatch) {
      if (textToCheck.includes(keyword)) {
        matchedCategories.push(category);
        break;
      }
    }
  }
  
  // 检测不兼容词
  for (const [category, config] of Object.entries(SPIRIT_CATEGORIES)) {
    for (const keyword of config.incompatible) {
      if (textToCheck.includes(keyword)) {
        // 标记为"不兼容此类别"，用于排除
        matchedCategories.push(`不兼容:${category}`);
        break;
      }
    }
  }
  
  return matchedCategories.length > 0 ? matchedCategories : ["通用"];
}

/**
 * 计算意气匹配得分
 * 得分越高，名字寓意和典籍译文越匹配
 */
function calculateSpiritScore(meaning: string, modernText: string, ancientText: string, expectations?: string): number {
  const nameSpirits = detectNameSpirit(meaning);
  const classicsSpirits = detectClassicsSpirit(modernText, ancientText);
  
  // ── 通用负面：典籍译文包含负面词 → 直接否决 ──
  if (classicsSpirits.includes("不兼容:通用")) {
    console.log(`[意气得分] 典籍含通用负面内容，直接否决（-100分）`);
    return -100;
  }
  
  let score = 0;
  
  // 1. 直接匹配：名字意气类别与典籍意气类别一致
  for (const nameSpirit of nameSpirits) {
    for (const classicsSpirit of classicsSpirits) {
      if (nameSpirit === classicsSpirit) {
        score += 3; // 直接匹配高分
      }
    }
  }
  
  // 2. 不兼容检测：如果典籍有不兼容词
  for (const classicsSpirit of classicsSpirits) {
    if (classicsSpirit.startsWith("不兼容:")) {
      const incompatibleCat = classicsSpirit.replace("不兼容:", "");
      for (const nameSpirit of nameSpirits) {
        if (nameSpirit === incompatibleCat || nameSpirit === "通用") {
          score -= 10; // 严重扣分（提升力度）
        }
      }
    }
  }
  
  // 3. 如果寓意和译文有语义上的正面关联（通过期望词补充匹配）
  if (expectations) {
    const expLower = expectations.toLowerCase();
    for (const [category, config] of Object.entries(SPIRIT_CATEGORIES)) {
      for (const keyword of config.keywords) {
        if (expLower.includes(keyword) && classicsSpirits.includes(category)) {
          score += 2;
          break;
        }
      }
    }
  }
  
  return score;
}

/**
 * findBestClassicsMatch：根据意气匹配算法，找到与名字寓意最匹配的典籍出处
 * 
 * @param meaning 名字的寓意描述
 * @param reason 名字的选字理由
 * @param matches 可用的典籍匹配列表
 * @param expectations 用户期望（可选）
 * @returns 最佳匹配的典籍，如果没有合适的则返回 null
 */
export function findBestClassicsMatch(
  meaning: string,
  reason: string,
  matches: Array<{ bookName: string; ancientText: string; modernText: string; similarity?: number }>,
  expectations?: string
): { bookName: string; ancientText: string; modernText: string; spiritScore: number } | null {
  if (!matches || matches.length === 0) return null;
  
  // 为每个典籍计算意气匹配得分
  const scored = matches.map(m => ({
    ...m,
    spiritScore: calculateSpiritScore(meaning, m.modernText || "", m.ancientText || "", expectations),
  }));
  
  // 按得分降序排列
  scored.sort((a, b) => b.spiritScore - a.spiritScore);
  
  // 找出最高分
  const best = scored[0];
  
  // 如果有匹配且得分 > 0，返回最佳匹配
  if (best && best.spiritScore > 0) {
    console.log(`[意气匹配] 名字寓意="${meaning.slice(0, 20)}", 最佳典籍=《${best.bookName}》, 意气得分=${best.spiritScore}`);
    return {
      bookName: best.bookName,
      ancientText: best.ancientText,
      modernText: best.modernText,
      spiritScore: best.spiritScore,
    };
  }
  
  // 没有合适的意气匹配，返回 null（不展示出处）
  console.log(`[意气匹配] 名字寓意="${meaning.slice(0, 20)}", 无合适典籍匹配（最高意气得分=${best?.spiritScore ?? -999}），不展示出处`);
  return null;
}

// 导出
export const SemanticNamingEngine = {
  findSemanticMatches,
  buildAIPrompt,
  generateNamesWithDeepSeek,
  filterNames,
  semanticNamingFlow,
  diversifyNames,
  findBestClassicsMatch,
};
