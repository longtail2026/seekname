/**
 * 语义匹配起名引擎（OVHcloud BGE-M3 版）
 * 
 * 核心流程：
 * 1. 客户输入起名意向（如"希望孩子聪明智慧、才华横溢"）
 * 2. 调用 OVHcloud BGE-M3 API（免费、无需 API Key）生成 1024 维语义向量
 * 3. 在 naming_classics 表中做 pgvector 余弦相似度搜索
 * 4. 如果向量搜索结果不足，自动降级到关键词搜索兜底
 * 5. 从匹配到的典籍中提取字词，构建提示词交给 DeepSeek 生成名字
 * 
 * 策略矩阵集成（v2.0）：
 * - 根据客户风格偏好，自动选择「古典原字优先」「现代实用优先」「古今双轨展示」策略
 * - 策略影响 AI prompt 指令和前端展示方式
 * 
 * 数据库表：naming_classics（典籍词句表，已做 BGE-M3 向量化）
 * 向量列：combined_text_embedding (vector(1024))
 * 索引：idx_naming_classics_embedding (HNSW, cosine_ops)
 */

import { DeepSeekIntegration } from "./deepseek-integration";
import { searchNamingClassics } from "./semantic-search-naming-classics";
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

/**
 * 2. 构建AI提示词（集成策略矩阵）
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

输出格式：用Markdown表格，列包括：序号、名字、拼音、寓意说明、选字理由、典籍出处

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
10. 【关键一致性检查】选字理由中引用的每个字（如"庄"字出自…"庄"）必须确实存在于"名字"列中。名字不含的字，理由里不能引用。`;
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

输出格式：用Markdown表格，列包括：序号、名字、拼音、寓意说明、选字理由、典籍出处

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
11. 【关键一致性检查】选字理由中引用的每个字（如"庄"字出自…"庄"）必须确实存在于"名字"列中。名字不含的字，理由里不能引用。`;
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

输出必须是用Markdown表格，列包括：序号、名字、拼音、寓意说明、选字理由、典籍出处。

关键要求：
1. 必须输出50个名字，一个不能少
2. 每个名字的出处不能重复，覆盖不同典籍篇章
3. 选字理由和典籍出处要简洁（一句话即可），不要长篇大论
4. 不要添加任何额外的解释、开头语或结尾语
5. 【重要】选字理由必须包含典籍中的具体原文段落（带引号），不能只说"取自《礼记》"这种缺乏原文的笼统表述；
6. 【重要】名字必须是完整的词语组合（如"若溪"），而不是两个抽象字的机械拼接（如"智仁"就没意义——它们的组合没有画面感）。`;

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
 */
const COMMON_CHARS = new Set([
  "智", "慧", "仁", "义", "德", "善", "勇", "刚", "强", "成", "功",
  "健", "康", "安", "宁", "快", "乐", "欣", "悦", "雅", "婉", "淑",
  "静", "柔", "美", "丽", "婷", "芸", "兰", "芳", "芷", "馨", "怡",
  "媛", "婕", "娅", "嫣", "伟", "雄", "豪", "杰", "俊", "博", "文",
  "韬", "略", "宇", "轩", "浩", "泽", "涛", "峰", "岩", "磊", "森",
  "铭", "锦", "钧", "铮", "铄", "钰", "锐", "锋", "瑞", "璋", "珞",
  "瑜", "铎", "锡", "铠", "林", "桐", "楠", "梓", "柏", "松", "桦",
  "柳", "梅", "榆", "槐", "楷", "桂", "枫", "涵", "泽", "洋", "涛",
  "浩", "清", "源", "沐", "沛", "润", "澜", "淳", "溪", "沁", "瀚",
  "炎", "煜", "炜", "烨", "熠", "灿", "炅", "煦", "燃", "烽", "焕",
  "炫", "耀", "辉", "灵", "坤", "培", "基", "城", "垣", "堂", "均",
  "圣", "壤", "坚", "壁", "堪", "塘", "增", "墨",
]);

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
    const givenName = name.name.slice(1);
    let shouldRemove = false;
    let reason = "";

    for (const char of givenName) {
      if (TABOO_CHARS.has(char)) {
        shouldRemove = true;
        reason = `包含忌讳字: ${char}`;
        break;
      }
    }

    if (shouldRemove) {
      removed.push({ name: name.name, reason });
      continue;
    }

    for (const char of givenName) {
      if (!COMMON_CHARS.has(char)) {
        shouldRemove = true;
        reason = `包含生僻字: ${char}`;
        break;
      }
    }

    if (shouldRemove) {
      removed.push({ name: name.name, reason });
      continue;
    }

    passed.push(name);
  }

  return { passed, removed };
}

/**
 * 5. 主函数：完整的语义匹配起名流程（集成策略矩阵）
 */
export async function semanticNamingFlow(
  request: SemanticNamingRequest
): Promise<{
  success: boolean;
  matches: ClassicsMatch[];
  generatedNames: GeneratedName[];
  filteredNames: GeneratedName[];
  filterResult: FilterResult;
  /** 本次使用的策略类型 */
  strategyType: NamingStrategyType;
  message?: string;
}> {
  try {
    console.log("[语义起名] 开始流程...");

    // 确定策略
    const gender = request.gender || "M";
    const expectations = request.expectations || "";
    const styles = request.style || [];
    const strategy = request.strategyType || determineStrategy(styles, expectations?.split(/[,，、\s]+/));
    request.strategyType = strategy;

    console.log(`[语义起名] 策略选定: ${STRATEGY_LABELS[strategy]}`);

    // 1. 语义匹配 — 根据是否有 intentions 选择搜索模式
    let searchInput: string | string[];
    if (request.intentions && request.intentions.length > 0) {
      // 独立搜索模式：每个意向词单独向量化搜索
      searchInput = request.intentions;
      console.log(`[语义起名] 使用独立搜索模式: ${request.intentions.length}个意向词`);
    } else {
      // 默认混合搜索模式
      searchInput = request.rawInput || expectations || "";
      console.log(`[语义起名] 使用混合搜索模式: "${searchInput}"`);
    }

    const matches = await findSemanticMatches(
      searchInput,
      10,
      gender
    );

    if (matches.length === 0) {
      console.log("[语义起名] 未找到典籍匹配，降级为直接使用 DeepSeek 生成名字");
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

      // 为每个名字标记策略
      const taggedNames = generatedNames.map((n) => ({
        ...n,
        strategyType: strategy,
      }));

      // ✅ 硬性过滤
      const hardFilterOptions: HardFilterOptions = {
        surname: request.surname,
      };
      const hardResult = hardFilterNames(taggedNames, hardFilterOptions);

      // 转换 FilterResult 格式
      const filterResult: FilterResult = {
        passed: hardResult.passed,
        removed: hardResult.removed.map((r) => ({
          name: r.name,
        reason: r.reasons.map((rr) => rr.reason).join("; "),
        })),
      };

      console.log(
        `[语义起名-降级] 硬性过滤: ${taggedNames.length} → 通过${filterResult.passed.length}, 移除${filterResult.removed.length}`
      );

      // ✅ 七维加权打分排序
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
        `[语义起名-降级] 七维打分排序完成: 前5名 = ${finalScored.slice(0, 5).map(n => `${n.name}(${n.score}分)`).join(", ")}`
      );

      return {
        success: true,
        matches: [],
        generatedNames: taggedNames,
        filteredNames: finalScored,
        filterResult,
        strategyType: strategy,
        message: `成功生成${taggedNames.length}个名字（降级：AI直接生成）`,
      };
    }

    // 2. 构建提示词
    const prompt = buildAIPrompt(request, matches);

    // 3. 调用DeepSeek
    const generatedNames = await generateNamesWithDeepSeek(prompt);

    if (generatedNames.length === 0) {
      return {
        success: false,
        matches,
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

function parseMarkdownTable(markdown: string): GeneratedName[] {
  const names: GeneratedName[] = [];
  try {
    const lines = markdown.split("\n");
    let inTable = false;

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
        const cells = trimmed
          .split("|")
          .map((cell) => cell.trim())
          .filter((cell) => cell);

        if (cells.length >= 5) {
          const rawName = cells[1];
          let givenName = rawName;

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

          if (/^[\u4e00-\u9fff]{3,}$/.test(rawName)) {
            const potentialDoubleSurname = rawName.slice(0, 2);
            if (commonSurnames.has(potentialDoubleSurname)) {
              givenName = rawName.slice(2);
            } else {
              const potentialSingleSurname = rawName.slice(0, 1);
              if (commonSurnames.has(potentialSingleSurname) && rawName.length >= 3) {
                givenName = rawName.slice(1);
              }
            }
          }

          const pinyin = cells[2];
          const meaning = cells[3];
          const reason = cells[4];
          const source = cells.length >= 6 ? cells[5] : "";
          const name = givenName;

          // 校验 reason：移除引用了名字中不存在的汉字的部分（LLM幻觉防御）
          const cleanedReason = sanitizeReason(reason, givenName);

          names.push({
            name,
            givenName,
            pinyin,
            meaning,
            reason: cleanedReason,
            source,
            score: 80,
          });
        }
      }

      if (names.length >= 50) break;
    }
  } catch (error) {
    console.error("[解析表格] 失败:", error);
  }
  return names;
}

// 导出
export const SemanticNamingEngine = {
  findSemanticMatches,
  buildAIPrompt,
  generateNamesWithDeepSeek,
  filterNames,
  semanticNamingFlow,
};