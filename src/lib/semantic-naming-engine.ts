/**
 * 语义匹配起名引擎
 * 基于BGE-M3语义匹配和DeepSeek AI生成名字
 */

import { queryRaw } from "./prisma";
import { DeepSeekIntegration } from "./deepseek-integration";
import { PhoneticOptimizer } from "./phonetic-optimizer";
import { searchSimilarClassicsByVector } from "./vector-similarity-search";
import { enhancedFilterNames, GeneratedName as GeneratedNameFromFilter, FilterResult as FilterResultFromFilter } from "./name-filter";

// 用户意图接口
export interface SemanticNamingRequest {
  // 用户输入
  rawInput: string;
  
  // 结构化参数
  surname?: string;
  gender?: "M" | "F";
  birthDate?: string; // YYYY-MM-DD
  birthTime?: string; // 时辰
  expectations?: string; // 期望寓意描述
  style?: string[]; // 风格偏好
  wordCount?: 2 | 3; // 名字字数
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
  name: string; // 完整名字（含姓）
  givenName: string; // 名（不含姓）
  pinyin: string; // 拼音（带声调）
  meaning: string; // 寓意说明
  reason: string; // 符合客户需求的理由
  score?: number; // 评分
}

// 过滤结果
export interface FilterResult {
  passed: GeneratedName[];
  removed: Array<{
    name: string;
    reason: string;
  }>;
}

/**
 * 关键词匹配 - 从naming_classics表中查找相似典籍（回退方案）
 * 将用户输入拆分为单个关键词，搜索 keywords 字段和文本字段
 */
async function findSemanticMatchesByKeyword(
  userInput: string,
  limit: number = 10,
  gender: "M" | "F" = "M"
): Promise<ClassicsMatch[]> {
  try {
    console.log(`[关键词匹配] 开始查找相似典籍: "${userInput}"`);
    
    // 将用户输入拆分为单个关键词（按中文逗号、英文逗号、空格分隔）
    const phrases = userInput
      .split(/[,，、\s]+/)
      .map(k => k.trim())
      .filter(k => k.length > 0);
    
    // 短语展开为单字以提高匹配率（用户输入"聪明智慧,才华艺术"需要匹配关键词中独立的"智慧"或"才华"）
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
    
    if (uniqueTerms.length === 0) {
      return [];
    }
    
    // 构建关键词匹配条件：搜索 keywords 字段和文本字段
    const conditions = uniqueTerms.map((_, i) => 
      `(keywords ILIKE $${i + 2} OR ancient_text ILIKE $${i + 2} OR modern_text ILIKE $${i + 2} OR book_name ILIKE $${i + 2})`
    );
    
    const firstKeyword = phrases[0];
    
    const query = `
      SELECT id, book_name, ancient_text, modern_text, keywords
      FROM naming_classics
      WHERE (${conditions.join(' OR ')})
      ORDER BY 
        CASE 
          WHEN keywords ILIKE $${uniqueTerms.length + 2} THEN 3
          WHEN ancient_text ILIKE $${uniqueTerms.length + 2} THEN 2
          WHEN modern_text ILIKE $${uniqueTerms.length + 2} THEN 1
          ELSE 0
        END DESC
      LIMIT $1
    `;
    
    const params = [
      limit,
      ...uniqueTerms.map(kw => `%${kw}%`),
      `%${firstKeyword}%`
    ];
    
    const entries = await queryRaw<{
      id: string;
      book_name: string;
      ancient_text: string;
      modern_text: string;
      keywords: string;
    }>(query, params);
    
    console.log(`[关键词匹配] 找到 ${entries.length} 个相似典籍`);
    
    // 转换为匹配结果格式
    const matches: ClassicsMatch[] = entries.map((entry) => {
      const text = entry.ancient_text || entry.modern_text || "";
      
      return {
        id: typeof entry.id === 'string' ? parseInt(entry.id) : Number(entry.id),
        bookName: entry.book_name || "未知典籍",
        ancientText: entry.ancient_text || "",
        modernText: entry.modern_text || "",
        similarity: 0.8, // 关键词匹配固定相似度
        extractedChars: extractMeaningfulChars(text),
        meaning: extractMeaning(text),
      };
    });
    
    return matches;
    
  } catch (error) {
    console.error("[关键词匹配] 查找失败:", error);
    return [];
  }
}

/**
 * 1. 语义匹配层 - 从naming_classics表中查找相似典籍
 */
export async function findSemanticMatches(
  userInput: string,
  limit: number = 10,
  gender: "M" | "F" = "M"
): Promise<ClassicsMatch[]> {
  try {
    console.log(`[语义匹配] 开始查找相似典籍: "${userInput}"`);
    
    // 使用向量相似度搜索
    const vectorMatches = await searchSimilarClassicsByVector(
      userInput,
      gender,
      {
        maxResults: limit,
        similarityThreshold: 0.3, // 较低的阈值以获取更多结果
      }
    );
    
    // 转换为ClassicsMatch格式（去除keywords字段）
    const matches: ClassicsMatch[] = vectorMatches.map(match => ({
      id: match.id,
      bookName: match.bookName,
      ancientText: match.ancientText,
      modernText: match.modernText,
      similarity: match.similarity,
      extractedChars: match.extractedChars,
      meaning: match.meaning,
    }));
    
    console.log(`[语义匹配] 向量搜索找到 ${matches.length} 个相似典籍`);
    
    // 如果向量搜索结果不足，回退到关键词匹配
    if (matches.length < limit / 2) {
      console.log(`[语义匹配] 向量搜索结果不足(${matches.length})，尝试关键词匹配...`);
      const keywordMatches = await findSemanticMatchesByKeyword(userInput, limit, gender);
      
      // 合并结果，去重
      const allMatches = [...matches];
      const seenIds = new Set(matches.map(m => m.id));
      
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
    console.error("[语义匹配] 向量搜索失败:", error);
    // 回退到关键词匹配
    return await findSemanticMatchesByKeyword(userInput, limit, gender);
  }
}

/**
 * 2. 构建AI提示词
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
    wordCount = 2
  } = request;
  
  // 提取匹配典籍的关键信息
  const classicsInfo = matches.slice(0, 5).map((match, index) => {
    return `${index + 1}. 《${match.bookName}》: "${match.ancientText}" (${match.modernText || "现代释义"})`;
  }).join('\n');
  
  const prompt = `你是一位专业的中文起名专家。
请根据以下客户需求，生成50个中文名字（每个名字${wordCount}个字）。对每个名字提供：
1. 名字
2. 拼音（带声调）
3. 寓意说明（30-50字）
4. 符合客户需求的理由

客户需求：
- 性别：【${gender === 'M' ? '男' : '女'}】
- 姓氏（可选）：【${surname}】
- 期望寓意：【${expectations}】
- 风格偏好：【${style.join('，')}】
- 补充说明：【基于以下典籍进行创意起名】

参考典籍：
${classicsInfo}

输出格式：用Markdown表格，列包括：序号、名字、拼音、寓意说明、匹配理由

注意：
1. 名字要优美、有文化内涵，符合客户性别和风格偏好
2. 拼音要准确，带声调标注
3. 寓意说明要具体、有诗意
4. 匹配理由要说明名字如何符合客户需求`;

  return prompt;
}

/**
 * 3. 调用DeepSeek API生成名字
 */
export async function generateNamesWithDeepSeek(
  prompt: string
): Promise<GeneratedName[]> {
  try {
    console.log("[DeepSeek] 开始生成名字...");
    
    if (!DeepSeekIntegration.isAvailable()) {
      throw new Error("DeepSeek API不可用");
    }
    
    const systemPrompt = `你是一位专业的中文起名专家，请严格按照要求的格式输出名字列表。
输出必须是Markdown表格格式，包含以下列：序号、名字、拼音、寓意说明、匹配理由。
不要添加任何额外的解释或说明文字。`;
    
    const response = await DeepSeekIntegration.callRaw(systemPrompt, prompt, 0.3, 2000);
    
    // 解析Markdown表格
    const names = parseMarkdownTable(response);
    
    console.log(`[DeepSeek] 成功生成 ${names.length} 个名字`);
    return names;
    
  } catch (error) {
    console.error("[DeepSeek] 生成名字失败:", error);
    // 返回空结果，降级到传统方法
    return [];
  }
}

/**
 * 4. 过滤逻辑
 */

// 生僻字判断（基于起名经验）
const COMMON_CHARS = new Set([
  // 常用美好字
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
  "圣", "壤", "坚", "壁", "堪", "塘", "增", "墨"
]);

// 忌讳字（简化版）
const TABOO_CHARS = new Set([
  "死", "亡", "病", "痛", "伤", "残", "废", "败", "衰", "弱",
  "贫", "穷", "苦", "难", "凶", "恶", "毒", "狠", "奸", "诈"
]);

/**
 * 过滤名字
 */
export function filterNames(
  names: GeneratedName[],
  gender: "M" | "F" = "F"
): FilterResult {
  const passed: GeneratedName[] = [];
  const removed: Array<{name: string, reason: string}> = [];
  
  for (const name of names) {
    const givenName = name.name.slice(1); // 去掉姓氏
    let shouldRemove = false;
    let reason = "";
    
    // 1. 检查忌讳字
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
    
    // 2. 检查生僻字
    for (const char of givenName) {
      if (!COMMON_CHARS.has(char)) {
        // 简单判断：如果不在常用字列表中，认为是生僻字
        shouldRemove = true;
        reason = `包含生僻字: ${char}`;
        break;
      }
    }
    
    if (shouldRemove) {
      removed.push({ name: name.name, reason });
      continue;
    }
    
    // 3. 检查发音困难
    const pronResult = checkPronunciationDifficulty(name.name);
    if (pronResult.isDifficult) {
      removed.push({ name: name.name, reason: `发音困难: ${pronResult.reason}` });
      continue;
    }
    
    // 4. 检查笔画数（简化版）
    // 注意：这里需要实际的笔画数据，暂时跳过
    
    passed.push(name);
  }
  
  return { passed, removed };
}

/**
 * 检查发音困难
 */
function checkPronunciationDifficulty(name: string): {
  isDifficult: boolean;
  reason: string;
} {
  const givenName = name.slice(1);
  if (givenName.length < 2) {
    return { isDifficult: false, reason: "" };
  }
  
  // 提取拼音（简化版）
  // 在实际实现中，需要调用拼音转换库
  
  // 检查连续同声母
  // 检查连续同韵母
  // 检查声调搭配
  
  // 暂时返回不困难
  return { isDifficult: false, reason: "" };
}

/**
 * 5. 主函数：完整的语义匹配起名流程
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
      return {
        success: false,
        matches: [],
        generatedNames: [],
        filteredNames: [],
        filterResult: { passed: [], removed: [] },
        message: "未找到匹配的典籍"
      };
    }
    
    // 2. 构建AI提示词
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
        message: "DeepSeek生成名字失败"
      };
    }
    
    // 4. 过滤名字（暂时关闭过滤功能，全部放行）
    // const filterResult = enhancedFilterNames(generatedNames, request.gender);
    const filterResult: FilterResult = { 
      passed: [...generatedNames], 
      removed: [] 
    };
    
    console.log(`[语义起名] 完成: 生成${generatedNames.length}个，过滤后${filterResult.passed.length}个（过滤已关闭）`);
    
    return {
      success: true,
      matches,
      generatedNames,
      filteredNames: filterResult.passed,
      filterResult,
      message: `成功生成${generatedNames.length}个名字`
    };
    
  } catch (error) {
    console.error("[语义起名] 流程失败:", error);
    return {
      success: false,
      matches: [],
      generatedNames: [],
      filteredNames: [],
      filterResult: { passed: [], removed: [] },
      message: `语义起名流程失败: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// 辅助函数

/**
 * 从文本中提取有意义的字符
 */
function extractMeaningfulChars(text: string): string[] {
  if (!text) return [];
  
  const chars: string[] = [];
  
  // 提取中文字符
  for (const char of text) {
    if (isChineseCharacter(char) && !chars.includes(char)) {
      chars.push(char);
    }
  }
  
  return chars.slice(0, 10); // 返回最多10个字符
}

/**
 * 从文本中提取含义
 */
function extractMeaning(text: string): string {
  if (!text) return "美好寓意";
  
  // 简单提取前30个字符作为含义
  const preview = text.length > 30 ? text.slice(0, 30) + "..." : text;
  return preview;
}

/**
 * 判断是否为中文字符
 */
function isChineseCharacter(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 0x4E00 && code <= 0x9FFF;
}

/**
 * 解析Markdown表格
 */
function parseMarkdownTable(markdown: string): GeneratedName[] {
  const names: GeneratedName[] = [];
  
  try {
    // 查找表格内容
    const lines = markdown.split('\n');
    let inTable = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // 检测表格开始
      if (trimmed.startsWith('|') && trimmed.includes('名字') && trimmed.includes('拼音')) {
        inTable = true;
        continue;
      }
      
      // 跳过表头分隔线
      if (inTable && trimmed.startsWith('|') && trimmed.includes('---')) {
        continue;
      }
      
      // 解析表格行
      if (inTable && trimmed.startsWith('|')) {
        const cells = trimmed.split('|').map(cell => cell.trim()).filter(cell => cell);
        
        // 期望格式: 序号、名字、拼音、寓意说明、匹配理由
        if (cells.length >= 5) {
          const name = cells[1];
          const pinyin = cells[2];
          const meaning = cells[3];
          const reason = cells[4];
          
          // 提取姓氏和名字
          const surname = name[0] || '';
          const givenName = name.slice(1) || '';
          
          names.push({
            name,
            givenName,
            pinyin,
            meaning,
            reason,
            score: 80 // 默认评分
          });
        }
      }
      
      // 限制最多50个名字
      if (names.length >= 50) {
        break;
      }
    }
    
  } catch (error) {
    console.error("[解析表格] 失败:", error);
  }
  
  return names;
}

// 导出工具函数
export const SemanticNamingEngine = {
  findSemanticMatches,
  buildAIPrompt,
  generateNamesWithDeepSeek,
  filterNames,
  semanticNamingFlow,
};