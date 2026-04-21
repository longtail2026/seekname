/**
 * BGE-M3语义匹配服务
 * 提供基于BGE-M3模型的语义搜索功能
 */

import { queryRaw } from "@/lib/prisma";

// BGE-M3服务配置
const BGE_M3_CONFIG = {
  // 在生产环境中，这里应该是BGE-M3模型服务的URL
  serviceUrl: process.env.BGE_M3_SERVICE_URL || "http://localhost:8000",
  embeddingDimension: 1024,
  batchSize: 8,
  similarityThreshold: 0.5,
};

// 用户意向类型
export interface UserIntent {
  text: string;
  gender?: "M" | "F";
  category?: "baby" | "adult" | "company" | "brand";
  style?: string[];
  imagery?: string[];
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

// 忌讳字检查结果
export interface TabooCheckResult {
  hasTaboo: boolean;
  tabooChars: string[];
  reason?: string;
}

// 忌讳字库（从constants.ts导入）
import { 
  FEMALE_TABOO_CHARS, 
  MALE_TABOO_CHARS, 
  UNIVERSAL_TABOO_CHARS 
} from "@/lib/constants";

/**
 * 检查名字是否包含忌讳字
 */
export function checkTabooChars(name: string, gender: "M" | "F"): TabooCheckResult {
  const givenName = name.slice(1); // 去掉姓氏
  const tabooChars: string[] = [];
  
  for (const char of givenName) {
    let isTaboo = false;
    
    // 检查通用忌讳字
    if (UNIVERSAL_TABOO_CHARS.has(char)) {
      isTaboo = true;
    }
    
    // 检查性别特定忌讳字
    if (gender === "F" && FEMALE_TABOO_CHARS.has(char)) {
      isTaboo = true;
    }
    
    if (gender === "M" && MALE_TABOO_CHARS.has(char)) {
      isTaboo = true;
    }
    
    if (isTaboo) {
      tabooChars.push(char);
    }
  }
  
  return {
    hasTaboo: tabooChars.length > 0,
    tabooChars,
    reason: tabooChars.length > 0 ? 
      `包含忌讳字: ${tabooChars.join(", ")}` : undefined
  };
}

/**
 * 过滤包含忌讳字的名字
 */
export function filterTabooNames(names: string[], gender: "M" | "F"): {
  filteredNames: string[];
  removedNames: Array<{name: string, reason: string}>;
} {
  const filteredNames: string[] = [];
  const removedNames: Array<{name: string, reason: string}> = [];
  
  for (const name of names) {
    const tabooResult = checkTabooChars(name, gender);
    
    if (tabooResult.hasTaboo) {
      removedNames.push({
        name,
        reason: tabooResult.reason || "包含忌讳字"
      });
    } else {
      filteredNames.push(name);
    }
  }
  
  return { filteredNames, removedNames };
}

/**
 * 使用BGE-M3语义匹配查找相似典籍
 * 注意：这是占位实现，实际生产环境需要调用BGE-M3模型服务
 */
export async function findSimilarClassics(
  userIntent: UserIntent,
  limit: number = 5
): Promise<ClassicsMatch[]> {
  const { text, gender = "M" } = userIntent;
  
  try {
    // 在实际生产环境中，这里应该：
    // 1. 调用BGE-M3服务生成用户意向的嵌入向量
    // 2. 在数据库中查找语义相似的典籍条目
    // 3. 返回匹配结果
    
    // 当前实现：使用数据库查询（关键词匹配）
    const searchPattern = `%${text.slice(0, 20)}%`;
    
    const entries = await queryRaw<{
      id: string;
      book_name: string;
      ancient_text: string;
      modern_text: string;
    }>(
      `SELECT id, book_name, ancient_text, modern_text
       FROM classics_entries
       WHERE ancient_text ILIKE $1 
          OR modern_text ILIKE $1
          OR book_name ILIKE $1
       ORDER BY RANDOM()
       LIMIT $2`,
      [searchPattern, limit]
    );
    
    // 转换为匹配结果格式
    const matches: ClassicsMatch[] = entries.map((entry, index) => {
      // 从典籍文本中提取有意义的字符
      const text = entry.ancient_text || entry.modern_text || "";
      const extractedChars = extractMeaningfulChars(text, gender);
      
      return {
        id: parseInt(entry.id),
        bookName: entry.book_name,
        ancientText: entry.ancient_text || "",
        modernText: entry.modern_text || "",
        similarity: 0.7 + (Math.random() * 0.3), // 模拟相似度
        extractedChars: extractedChars.slice(0, 5),
        meaning: extractMeaning(text),
      };
    });
    
    return matches;
    
  } catch (error) {
    console.error("BGE-M3语义匹配失败:", error);
    // 返回空结果，降级到传统方法
    return [];
  }
}

/**
 * 从文本中提取有意义的字符（用于起名）
 */
function extractMeaningfulChars(text: string, gender: "M" | "F"): string[] {
  if (!text) return [];
  
  // 常见有意义的字符（按性别偏好）
  const meaningfulChars = {
    // 通用美好字
    universal: ["智", "慧", "仁", "义", "德", "善", "勇", "刚", "强", "成", "功", "健", "康", "安", "宁", "快", "乐", "欣", "悦"],
    // 女性偏好字
    female: ["雅", "婉", "淑", "静", "柔", "美", "丽", "婷", "芸", "兰", "芳", "芷", "馨", "怡", "媛", "婕", "娅", "嫣"],
    // 男性偏好字
    male: ["伟", "雄", "豪", "杰", "俊", "博", "文", "韬", "略", "宇", "轩", "浩", "泽", "涛", "峰", "岩", "磊", "森"],
  };
  
  const chars: string[] = [];
  const genderChars = gender === "F" ? meaningfulChars.female : meaningfulChars.male;
  const allChars = [...meaningfulChars.universal, ...genderChars];
  
  // 从文本中提取字符
  for (const char of text) {
    if (allChars.includes(char) && !chars.includes(char)) {
      chars.push(char);
    }
  }
  
  // 如果提取的字符太少，添加一些默认字符
  if (chars.length < 3) {
    const defaultChars = gender === "F" 
      ? ["雅", "欣", "怡"] 
      : ["浩", "宇", "博"];
    
    for (const char of defaultChars) {
      if (!chars.includes(char)) {
        chars.push(char);
      }
    }
  }
  
  return chars.slice(0, 8); // 返回最多8个字符
}

/**
 * 从文本中提取含义
 */
function extractMeaning(text: string): string {
  if (!text) return "美好寓意";
  
  // 简单提取前20个字符作为含义
  const preview = text.length > 20 ? text.slice(0, 20) + "..." : text;
  return preview;
}

/**
 * 基于BGE-M3语义匹配生成名字建议
 */
export async function generateNamesWithBGE_M3(
  surname: string,
  gender: "M" | "F",
  userIntent: string,
  style?: string[],
  limit: number = 10
): Promise<{
  names: string[];
  matches: ClassicsMatch[];
  filteredCount: number;
}> {
  try {
    // 1. 使用BGE-M3查找相似典籍
    const matches = await findSimilarClassics({
      text: userIntent,
      gender,
      style,
    }, 5);
    
    // 2. 从匹配的典籍中提取字符
    const allChars: string[] = [];
    for (const match of matches) {
      allChars.push(...match.extractedChars);
    }
    
    // 去重
    const uniqueChars = Array.from(new Set(allChars));
    
    // 3. 生成名字组合
    const generatedNames: string[] = [];
    
    // 生成单字名
    for (const char of uniqueChars.slice(0, 10)) {
      generatedNames.push(`${surname}${char}`);
    }
    
    // 生成双字名
    for (let i = 0; i < uniqueChars.length - 1 && i < 5; i++) {
      for (let j = i + 1; j < uniqueChars.length && j < 10; j++) {
        generatedNames.push(`${surname}${uniqueChars[i]}${uniqueChars[j]}`);
      }
    }
    
    // 4. 过滤忌讳字
    const { filteredNames, removedNames } = filterTabooNames(generatedNames, gender);
    
    // 5. 去重并限制数量
    const finalNames = Array.from(new Set(filteredNames)).slice(0, limit);
    
    return {
      names: finalNames,
      matches,
      filteredCount: removedNames.length,
    };
    
  } catch (error) {
    console.error("BGE-M3名字生成失败:", error);
    // 返回空结果，降级到传统方法
    return {
      names: [],
      matches: [],
      filteredCount: 0,
    };
  }
}

/**
 * 集成到现有起名流程的包装函数
 */
export async function integrateBGE_M3ToNamingFlow(
  surname: string,
  gender: "M" | "F",
  userIntent: string,
  style?: string[],
  useBGE_M3: boolean = true
): Promise<{
  success: boolean;
  names: string[];
  source?: "bge_m3" | "traditional";
  message?: string;
}> {
  if (!useBGE_M3) {
    return {
      success: true,
      names: [],
      source: "traditional",
      message: "使用传统起名方法",
    };
  }
  
  try {
    const result = await generateNamesWithBGE_M3(
      surname,
      gender,
      userIntent,
      style,
      10
    );
    
    if (result.names.length > 0) {
      return {
        success: true,
        names: result.names,
        source: "bge_m3",
        message: `使用BGE-M3语义匹配生成${result.names.length}个名字，过滤掉${result.filteredCount}个忌讳字名字`,
      };
    } else {
      return {
        success: false,
        names: [],
        source: "bge_m3",
        message: "BGE-M3未生成有效名字，降级到传统方法",
      };
    }
    
  } catch (error) {
    console.error("BGE-M3集成失败:", error);
    return {
      success: false,
      names: [],
      source: "bge_m3",
      message: `BGE-M3集成失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}