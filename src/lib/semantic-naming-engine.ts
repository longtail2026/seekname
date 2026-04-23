/**
 * 语义匹配起名引擎
 * 基于BGE-M3语义匹配和DeepSeek AI生成名字
 *
 * 数据库表：classics_entries（124120条记录）
 * 关键词字段：keywords (text[] 数组类型)
 */

import { queryRaw } from "./prisma";
import { DeepSeekIntegration } from "./deepseek-integration";
import { searchSimilarClassicsByVector } from "./vector-similarity-search";

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
  reason: string;
  score?: number;
}

// 过滤结果
export interface FilterResult {
  passed: GeneratedName[];
  removed: Array<{ name: string; reason: string }>;
}

/**
 * 关键词匹配 - 从classics_entries表中查找相似典籍
 * keywords 是 text[] 数组类型，使用 array_to_string 进行 ILIKE 匹配
 */
async function findSemanticMatchesByKeyword(
  userInput: string,
  limit: number = 10
): Promise<ClassicsMatch[]> {
  try {
    console.log(`[关键词匹配] 开始查找相似典籍: "${userInput}"`);

    const phrases = userInput
      .split(/[,，、\s]+/)
      .map(k => k.trim())
      .filter(k => k.length > 0);

    const searchTerms: string[] = [];
    for (const phrase of phrases) {
      searchTerms.push(phrase);
      if (phrase.length > 1) {
        for (const char of phrase) {
          searchTerms.push(char);
        }
      }
    }
    const uniqueTerms = [...new Set(searchTerms)];

    console.log(`[关键词匹配] 拆分关键词: [${uniqueTerms.join(', ')}]`);

    if (uniqueTerms.length === 0) return [];

    // keywords 是 text[] 数组类型，用 array_to_string 转为逗号分隔字符串再 ILIKE
    const conditions = uniqueTerms.map(
      (_, i) =>
        `(array_to_string(keywords, ',') ILIKE $${i + 2} OR ancient_text ILIKE $${i + 2} OR modern_text ILIKE $${i + 2} OR book_name ILIKE $${i + 2})`
    );

    const firstKeyword = phrases[0];

    const query = `
      SELECT id, book_name, ancient_text, modern_text, keywords
      FROM classics_entries
      WHERE (${conditions.join(' OR ')})
      ORDER BY
        CASE
          WHEN array_to_string(keywords, ',') ILIKE $${uniqueTerms.length + 2} THEN 3
          WHEN ancient_text ILIKE $${uniqueTerms.length + 2} THEN 2
          WHEN modern_text ILIKE $${uniqueTerms.length + 2} THEN 1
          ELSE 0
        END DESC
      LIMIT $1
    `;

    const params = [
      limit,
      ...uniqueTerms.map(kw => `%${kw}%`),
      `%${firstKeyword}%`,
    ];

    const entries = await queryRaw<{
      id: string;
      book_name: string;
      ancient_text: string;
      modern_text: string;
      keywords: string[] | string;
    }>(query, params);

    console.log(`[关键词匹配] 找到 ${entries.length} 个相似典籍`);

    return entries.map((entry) => {
      const text = entry.ancient_text || entry.modern_text || "";
      return {
        id: typeof entry.id === 'string' ? parseInt(entry.id) : Number(entry.id),
        bookName: entry.book_name || "未知典籍",
        ancientText: entry.ancient_text || "",
        modernText: entry.modern_text || "",
        similarity: 0.8,
        extractedChars: extractMeaningfulChars(text),
        meaning: extractMeaning(text),
      };
    });
  } catch (error) {
    console.error("[关键词匹配] 查找失败:", error);
    return [];
  }
}

/**
 * 1. 语义匹配层 - 从classics_entries表中查找相似典籍
 */
export async function findSemanticMatches(
  userInput: string,
  limit: number = 10,
  gender: "M" | "F" = "M"
): Promise<ClassicsMatch[]> {
  try {
    console.log(`[语义匹配] 开始查找相似典籍: "${userInput}"`);

    const vectorMatches = await searchSimilarClassicsByVector(userInput, gender, {
      maxResults: limit,
    });

    const matches: ClassicsMatch[] = vectorMatches.map((match) => ({
      id: match.id,
      bookName: match.bookName,
      ancientText: match.ancientText,
      modernText: match.modernText,
      similarity: match.similarity,
      extractedChars: match.extractedChars,
      meaning: match.meaning,
    }));

    console.log(`[语义匹配] 向量搜索找到 ${matches.length} 个相似典籍`);

    if (matches.length < limit / 2) {
      console.log(`[语义匹配] 向量搜索结果不足(${matches.length})，尝试关键词匹配...`);
      const keywordMatches = await findSemanticMatchesByKeyword(userInput, limit);

      const allMatches = [...matches];
      const seenIds = new Set(matches.map((m) => m.id));

      for (const match of keywordMatches) {
        if (!seenIds.has(match.id) && allMatches.length < limit) {
          seenIds.add(match.id);
          allMatches.push(match);
        }
      }

      console.log(`[语义匹配] 合并后共 ${allMatches.length} 个相似典籍`);
      return allMatches;
    }

    return matches;
  } catch (error) {
    console.error("[语义匹配] 搜索失败:", error);
    return await findSemanticMatchesByKeyword(userInput, limit);
  }
}

/**
 * 2. 构建AI提示词（支持无典籍匹配情况下的降级）
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

  const genderText = gender === "M" ? "男" : "女";
  const styleText = style.join("，");

  if (matches.length === 0) {
    // 降级模式：无典籍匹配时，让 DeepSeek 直接根据寓意生成名字
    return `你是一位专业的中文起名专家。
请根据以下客户需求，生成50个中文名字（每个名字${wordCount}个字）。对每个名字提供：
1. 名字
2. 拼音（带声调）
3. 寓意说明（30-50字）
4. 符合客户需求的理由

客户需求：
- 性别：【${genderText}】
- 姓氏：【${surname}】
- 期望寓意：【${expectations}】
- 风格偏好：【${styleText}】

输出格式：用Markdown表格，列包括：序号、名字、拼音、寓意说明、匹配理由

注意：
1. 名字要优美、有文化内涵，符合客户性别和风格偏好
2. 拼音要准确，带声调标注
3. 寓意说明要具体、有诗意
4. 匹配理由要说明名字如何符合客户需求`;
  }

  const classicsInfo = matches
    .slice(0, 5)
    .map(
      (match, index) =>
        `${index + 1}. 《${match.bookName}》: "${match.ancientText}" (${match.modernText || "现代释义"})`
    )
    .join("\n");

  return `你是一位专业的中文起名专家。
请根据以下客户需求，生成50个中文名字（每个名字${wordCount}个字）。对每个名字提供：
1. 名字
2. 拼音（带声调）
3. 寓意说明（30-50字）
4. 符合客户需求的理由

客户需求：
- 性别：【${genderText}】
- 姓氏（可选）：【${surname}】
- 期望寓意：【${expectations}】
- 风格偏好：【${styleText}】
- 补充说明：【基于以下典籍进行创意起名】

参考典籍：
${classicsInfo}

输出格式：用Markdown表格，列包括：序号、名字、拼音、寓意说明、匹配理由

注意：
1. 名字要优美、有文化内涵，符合客户性别和风格偏好
2. 拼音要准确，带声调标注
3. 寓意说明要具体、有诗意
4. 匹配理由要说明名字如何符合客户需求`;
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

    const systemPrompt = `你是一位专业的中文起名专家，请严格按照要求的格式输出名字列表。
输出必须是Markdown表格格式，包含以下列：序号、名字、拼音、寓意说明、匹配理由。
不要添加任何额外的解释或说明文字。`;

    const response = await DeepSeekIntegration.callRaw(systemPrompt, prompt, 0.3, 2000);
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
 * 5. 主函数：完整的语义匹配起名流程
 * 当典籍匹配失败时，降级为直接使用 DeepSeek 生成名字
 */
export async function semanticNamingFlow(
  request: SemanticNamingRequest
): Promise<{
  success: boolean;
  matches: ClassicsMatch[];
  generatedNames: GeneratedName[];
  filteredNames: GeneratedName[];
  filterResult: FilterResult;
  message?: string;
}> {
  try {
    console.log("[语义起名] 开始流程...");

    // 1. 语义匹配
    const matches = await findSemanticMatches(request.rawInput || request.expectations || "");

    if (matches.length === 0) {
      console.log("[语义起名] 未找到典籍匹配，降级为直接使用 DeepSeek 生成名字");
      // 降级：无典籍匹配时，构建不含典籍引用的提示词
      const prompt = buildAIPrompt(request, []);
      const generatedNames = await generateNamesWithDeepSeek(prompt);

      if (generatedNames.length === 0) {
        return {
          success: false,
          matches: [],
          generatedNames: [],
          filteredNames: [],
          filterResult: { passed: [], removed: [] },
          message: "未找到匹配的典籍",
        };
      }

      const filterResult: FilterResult = {
        passed: [...generatedNames],
        removed: [],
      };

      console.log(`[语义起名] 降级完成: 生成${generatedNames.length}个名字`);

      return {
        success: true,
        matches: [],
        generatedNames,
        filteredNames: filterResult.passed,
        filterResult,
        message: `成功生成${generatedNames.length}个名字（基于AI直接生成）`,
      };
    }

    // 2. 有典籍匹配，构建AI提示词（含典籍引用）
    const prompt = buildAIPrompt(request, matches);

    // 3. 调用DeepSeek生成名字
    const generatedNames = await generateNamesWithDeepSeek(prompt);

    if (generatedNames.length === 0) {
      return {
        success: false,
        matches,
        generatedNames: [],
        filteredNames: [],
        filterResult: { passed: [], removed: [] },
        message: "DeepSeek生成名字失败",
      };
    }

    // 4. 过滤名字（暂时关闭）
    const filterResult: FilterResult = {
      passed: [...generatedNames],
      removed: [],
    };

    console.log(
      `[语义起名] 完成: 生成${generatedNames.length}个，过滤后${filterResult.passed.length}个（过滤已关闭）`
    );

    return {
      success: true,
      matches,
      generatedNames,
      filteredNames: filterResult.passed,
      filterResult,
      message: `成功生成${generatedNames.length}个名字`,
    };
  } catch (error) {
    console.error("[语义起名] 流程失败:", error);
    return {
      success: false,
      matches: [],
      generatedNames: [],
      filteredNames: [],
      filterResult: { passed: [], removed: [] },
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
          const name = cells[1];
          const pinyin = cells[2];
          const meaning = cells[3];
          const reason = cells[4];
          const givenName = name.slice(1) || "";

          names.push({
            name,
            givenName,
            pinyin,
            meaning,
            reason,
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
