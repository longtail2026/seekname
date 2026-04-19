/**
 * 寻名网起名引擎 - 四层过滤 + AI 精排架构
 * 
 * 核心思路：
 * 1. 意图解析层（大模型干） - 用户输入结构化提取
 * 2. 典籍匹配层（数据库干） - 根据意象、五行、风格检索古籍库
 * 3. 真实人名合规层（5600万库干） - 常用度过滤、音律和谐度、重名风险
 * 4. 安全过滤层（敏感词库） - 谐音检测、政治敏感、不雅谐音
 * 5. AI 组合与润色层（大模型干） - 组合名字、保证音律平仄、写释义+出处
 */

import { prisma, queryRaw } from "./prisma";
import { DeepSeekIntegration } from "./deepseek-integration";
import { PhoneticOptimizer } from "./phonetic-optimizer";
import { FEMALE_TABOO_CHARS, MALE_TABOO_CHARS, UNIVERSAL_TABOO_CHARS } from "./constants";

// 类型定义
export interface NamingRequest {
  // 用户输入
  rawInput: string; // 原始输入文本，如："女孩，姓张，2025年3月15日出生，希望名字温柔诗意，喜欢水意象"
  
  // 结构化参数（可选，可由大模型解析）
  surname?: string;
  gender?: "M" | "F";
  birthDate?: string; // YYYY-MM-DD
  birthTime?: string; // 时辰
  expectations?: string; // 期望寓意描述
  style?: string; // 风格偏好
}

export interface StructuredIntent {
  // 解析结果
  surname: string;
  gender: "M" | "F";
  birthDate: string;
  birthTime?: string;

  // 风格偏好
  style: string[]; // ["温柔", "诗意", "古风"]
  wordCount: 2 | 3; // 2字/3字
  wuxing: string[]; // 五行需求，如 ["水"]
  avoidances: string[]; // 禁忌，如 ["生僻字", "复杂字"]
  imagery: string[]; // 意象，如 ["清", "涵", "汐", "沐", "雨", "淇", "雯"]
  sourcePreference: string[]; // 出处偏好，如 ["诗经"]

  // 公司/品牌场景扩展字段
  industry?: string;
  brandTone?: string[];
  targetAudience?: string;
  needEnglish?: boolean;
  category?: string;        // 行业分类（公司/品牌/店铺场景）
  region?: string;          // 地域（店铺场景）
  petType?: string;        // 宠物类型
  petStyle?: string;       // 宠物风格
  petPersonality?: string;  // 宠物性格
  businessExpectations?: string[]; // 商业期望

  // 其他
  notes?: string;
}

export interface CharacterInfo {
  character: string;
  pinyin: string;
  wuxing: string;
  meaning: string;
  strokeCount: number;
  frequency?: number; // 在5600万库中的出现频率
  source?: string; // 出处
  sourceText?: string; // 原文
}

export interface NameCandidate {
  fullName: string;
  givenName: string; // 名（不含姓）
  pinyin: string;
  wuxing: string;
  meaning: string;
  strokeCount: number;
  
  // 评分
  score: number;
  scoreBreakdown: {
    cultural: number; // 文化底蕴分
    popularity: number; // 常用度分
    harmony: number; // 音律和谐分
    safety: number; // 安全分
    overall: number; // 综合分
  };
  
  // 来源
  sources: Array<{
    book: string;
    text: string;
    chapter?: string;
    modernText?: string; // 现代释义
  }>;
  
  // 风险提示
  warnings: string[];
  uniqueness: "high" | "medium" | "low"; // 重名风险
}

export interface NamingResult {
  success: boolean;
  requestId?: string;
  structuredIntent: StructuredIntent;
  candidates: NameCandidate[];
  statistics: {
    totalCharactersConsidered: number;
    totalClassicsEntriesMatched: number;
    totalNameSamplesAnalyzed: number;
    safetyChecksPerformed: number;
    generationTime: number;
  };
  warnings?: string[];
}

/**
 * 1. 意图解析层 - 使用大模型解析用户输入
 * 支持两种模式：DeepSeek AI解析 或 规则解析
 */
export async function parseIntent(request: NamingRequest): Promise<StructuredIntent> {
  // 如果有原始输入文本，优先使用AI解析
  if (request.rawInput && request.rawInput.trim().length > 10) {
    try {
      if (DeepSeekIntegration.isAvailable()) {
        console.log('意图解析层: 使用DeepSeek AI解析');
        const aiIntent = await DeepSeekIntegration.parseIntent(request.rawInput, {
          surname: request.surname,
          gender: request.gender,
          birthDate: request.birthDate,
          birthTime: request.birthTime,
        });
        return aiIntent;
      }
    } catch (error) {
      console.warn('DeepSeek意图解析失败，使用规则解析:', error);
    }
  }
  
  // 规则解析（回退方案）
  console.log('意图解析层: 使用规则解析');
  const defaultIntent: StructuredIntent = {
    surname: request.surname || "张",
    gender: request.gender || "F",
    birthDate: request.birthDate || "2025-03-15",
    birthTime: request.birthTime,
    style: ["温柔", "诗意"],
    wordCount: 2,
    wuxing: ["水"],
    avoidances: ["生僻字", "复杂字"],
    imagery: ["清", "涵", "汐", "沐", "雨"],
    sourcePreference: ["诗经"],
  };
  
  // 如果有expectations，尝试提取关键词
  if (request.expectations) {
    const keywords = extractKeywords(request.expectations);
    defaultIntent.imagery = [...defaultIntent.imagery, ...keywords];
  }
  
  if (request.style) {
    defaultIntent.style = [request.style];
  }
  
  return defaultIntent;
}

/**
 * 2. 典籍匹配层 - 根据意图检索古籍库
 * 核心优化：扩大检索 + 来源多样化（避免被单一典籍垄断）
 */
export async function matchClassics(intent: StructuredIntent): Promise<CharacterInfo[]> {
  const characters: CharacterInfo[] = [];

  try {
    // 1. 根据意象关键词查询典籍条目（扩大范围）
    const keywords = [...intent.imagery, ...intent.style];
    console.log(`典籍匹配层: 搜索关键词: ${keywords.join(', ')}`);

    // 扩大检索：50→200，增加多样性
    const entries = await prisma.classicsEntry.findMany({
      where: {
        OR: [
          { keywords: { hasSome: keywords } },
          { ancientText: { contains: keywords[0] || "" } },
        ],
      },
      take: 200,
      include: {
        book: true,
      },
    });

    console.log(`典籍匹配层: 找到 ${entries.length} 个典籍条目`);

    // 2. 从典籍文本中提取候选字
    const extractedChars = new Set<string>();
    for (const entry of entries) {
      const text = entry.ancientText;
      for (const char of text) {
        if (isChineseCharacter(char) && !extractedChars.has(char)) {
          extractedChars.add(char);
        }
      }
    }

    console.log(`典籍匹配层: 从典籍中提取 ${extractedChars.size} 个候选字`);

    // 3. 查询康熙字典获取字的详细信息
    const charArray = Array.from(extractedChars);
    if (charArray.length > 0) {
      // 扩大：100→200
      const dictEntries = await prisma.kangxiDict.findMany({
        where: {
          character: { in: charArray },
        },
        take: 200,
      });

      console.log(`典籍匹配层: 从康熙字典找到 ${dictEntries.length} 个字的信息`);

      // 4. 转换为CharacterInfo格式，同时建立「字→来源」映射（取不同典籍）
      const charSourceMap = new Map<string, { book: string; text: string }>();
      for (const entry of entries) {
        for (const char of entry.ancientText) {
          if (isChineseCharacter(char) && !charSourceMap.has(char)) {
            charSourceMap.set(char, {
              book: entry.bookName || "",
              text: entry.ancientText?.slice(0, 30) || "",
            });
          }
        }
      }

      for (const dict of dictEntries) {
        const src = charSourceMap.get(dict.character);
        characters.push({
          character: dict.character,
          pinyin: dict.pinyin || "",
          wuxing: dict.wuxing || "",
          meaning: dict.meaning || "",
          strokeCount: dict.strokeCount || 0,
          source: src?.book || undefined,
          sourceText: src?.text ? src.text + "..." : undefined,
        });
      }
    }
    
    // 5. 如果没有找到足够的字，从五行字库大量补充
    if (characters.length < 50) {
      console.log(`典籍匹配层: 字符不足 (${characters.length})，从五行字库补充`);

      // 策略：优先查 name_wuxing（高覆盖），再回退 kangxi_dict 补全字段
      const wxChars: { character: string; wuxing: string; pinyin: string; meaning: string; strokeCount: number }[] = [];
      for (const wx of intent.wuxing) {
        const wxRows = await queryRaw<{ name_char: string; wuxing: string }>(
          `SELECT name_char, wuxing FROM name_wuxing WHERE wuxing = $1 LIMIT 60`,
          [wx]
        );
        const charList = wxRows.map(r => r.name_char);
        if (charList.length === 0) continue;

        // 从 kangxi_dict 补全 pinyin / meaning / stroke_count
        const placeholders = charList.map((_, i) => `$${i + 1}`).join(", ");
        const dictRows = await queryRaw<{ character: string; pinyin: string; meaning: string; stroke_count: number }>(
          `SELECT character, pinyin, meaning, stroke_count FROM kangxi_dict WHERE character IN (${placeholders})`,
          charList
        );
        const dictMap = new Map<string, { pinyin: string; meaning: string; stroke_count: number }>();
        for (const r of dictRows) dictMap.set(r.character, r);

        for (const r of wxRows) {
          const d = dictMap.get(r.name_char);
          wxChars.push({
            character: r.name_char,
            wuxing: r.wuxing,
            pinyin: d?.pinyin || "",
            meaning: d?.meaning || "",
            strokeCount: d?.stroke_count || 0,
          });
        }
      }

      console.log(`典籍匹配层: 从 name_wuxing 找到 ${wxChars.length} 个字`);
      for (const wxChar of wxChars) {
        if (!characters.some(c => c.character === wxChar.character)) {
          characters.push({
            character: wxChar.character,
            pinyin: wxChar.pinyin,
            wuxing: wxChar.wuxing,
            meaning: wxChar.meaning,
            strokeCount: wxChar.strokeCount,
          });
        }
      }
    }
    
    // 6. 如果还是没有足够的字，使用默认的五行字
    // 【关键】必须包含所有五行的字，避免名字全是同一五行（如全是火旁）
    if (characters.length < 10) {
      console.log(`典籍匹配层: 字符仍然不足 (${characters.length})，使用默认字`);

      // 默认字池：每行15字×5行=75字，五行齐全
      const defaultCharsByWuxing: Record<string, string[]> = {
        "金": ["铭", "锦", "钧", "铮", "铄", "钰", "锐", "锋", "瑞", "璋", "珞", "瑜", "铎", "锡", "铠"],
        "木": ["林", "森", "桐", "楠", "梓", "柏", "松", "桦", "柳", "梅", "榆", "槐", "楷", "桂", "枫"],
        "水": ["涵", "泽", "洋", "涛", "浩", "清", "源", "沐", "沛", "润", "澜", "淳", "溪", "沁", "瀚"],
        "火": ["炎", "煜", "炜", "烨", "熠", "灿", "炅", "煦", "燃", "烽", "焕", "炫", "耀", "辉", "灵"],
        "土": ["坤", "培", "基", "城", "垣", "堂", "均", "圣", "壤", "坚", "壁", "堪", "塘", "增", "墨"],
      };

      // 先补充所有五行（确保多样性），再加重喜用的五行
      const allWuxing = ["金", "木", "水", "火", "土"];

      for (const wx of allWuxing) {
        const defaultChars = defaultCharsByWuxing[wx] || [];
        for (const char of defaultChars) {
          if (!characters.some(c => c.character === char)) {
            characters.push({
              character: char,
              pinyin: "",
              wuxing: wx,
              meaning: "美好寓意",
              strokeCount: 10,
            });
          }
        }
      }
    }
    
    console.log(`典籍匹配层: 最终返回 ${characters.length} 个字符`);
    
  } catch (error) {
    console.error("典籍匹配层错误:", error);
  }
  
  return characters;
}

/**
 * 3. 真实人名合规层 - 使用5600万人名库过滤
 */
export async function applyNameCompliance(
  characters: CharacterInfo[],
  intent: StructuredIntent
): Promise<CharacterInfo[]> {
  console.log(`人名合规层: 开始处理 ${characters.length} 个字符`);
  const compliantChars: CharacterInfo[] = [];
  
  try {
    // 1. 查询这些字在5600万库中的出现频率
    const charStrings = characters.map(c => c.character);
    console.log(`人名合规层: 查询 ${Math.min(10, charStrings.length)} 个字符的频率`);
    
    const nameSamples = await prisma.nameSample.findMany({
      where: {
        OR: [
          { givenName: { contains: charStrings[0] || "" } },
          ...charStrings.slice(1, 10).map(char => ({ givenName: { contains: char } })),
        ],
        gender: intent.gender,
      },
      take: 1000,
    });
    
    console.log(`人名合规层: 找到 ${nameSamples.length} 个人名样本`);
    
    // 2. 统计每个字的出现频率
    const frequencyMap = new Map<string, number>();
    for (const sample of nameSamples) {
      if (sample.givenName) {
        for (const char of sample.givenName) {
          if (charStrings.includes(char)) {
            frequencyMap.set(char, (frequencyMap.get(char) || 0) + 1);
          }
        }
      }
    }
    
    console.log(`人名合规层: 统计了 ${frequencyMap.size} 个字符的频率`);
    
    // 3. 过滤和评分
    for (const char of characters) {
      const frequency = frequencyMap.get(char.character) || 0;
      
      // 应用过滤规则
      let passed = true;
      
      // 避免生僻字（频率太低）
      if (frequency < 10 && intent.avoidances.includes("生僻字")) {
        console.log(`人名合规层: 过滤生僻字 ${char.character}，频率 ${frequency}`);
        passed = false;
      }
      
      // 避免复杂字（笔画太多）
      if (char.strokeCount > 20 && intent.avoidances.includes("复杂字")) {
        console.log(`人名合规层: 过滤复杂字 ${char.character}，笔画 ${char.strokeCount}`);
        passed = false;
      }
      
      if (passed) {
        compliantChars.push({
          ...char,
          frequency,
        });
      }
    }
    
    // 4. 如果过滤后字符太少，放宽条件
    if (compliantChars.length < characters.length * 0.3 && characters.length > 0) {
      console.log(`人名合规层: 过滤后字符太少 (${compliantChars.length}/${characters.length})，放宽条件`);
      
      // 放宽条件：只过滤笔画过多的字
      for (const char of characters) {
        const frequency = frequencyMap.get(char.character) || 0;
        
        // 只过滤笔画过多的字
        if (char.strokeCount <= 25) { // 放宽到25画
          if (!compliantChars.some(c => c.character === char.character)) {
            compliantChars.push({
              ...char,
              frequency,
            });
          }
        }
      }
    }
    
    console.log(`人名合规层: 返回 ${compliantChars.length} 个合规字符`);
    
  } catch (error) {
    console.error("人名合规层错误:", error);
    // 出错时返回所有字符
    return characters.map(char => ({ ...char, frequency: 0 }));
  }
  
  return compliantChars;
}

/**
 * 4. 安全过滤层 - 敏感词检测 + 忌用字过滤
 */
export async function applySafetyFilter(
  characters: CharacterInfo[],
  surname: string,
  gender?: "M" | "F"
): Promise<CharacterInfo[]> {
  const safeChars: CharacterInfo[] = [];

  // 1. 查询敏感词库
  const sensitiveWords = await prisma.sensitiveWord.findMany({
    where: {
      OR: characters.map(char => ({
        word: { contains: char.character },
      })),
    },
    take: 100,
  });

  // 2. 构建敏感字集合
  const sensitiveChars = new Set<string>();
  for (const word of sensitiveWords) {
    for (const char of word.word) {
      sensitiveChars.add(char);
    }
  }

  // 3. 合并所有忌用字（通用 + 性别相关）
  const allTabooChars = new Set(UNIVERSAL_TABOO_CHARS);
  if (gender === "F") {
    for (const c of FEMALE_TABOO_CHARS) allTabooChars.add(c);
  } else if (gender === "M") {
    for (const c of MALE_TABOO_CHARS) allTabooChars.add(c);
  }

  // 4. 过滤敏感字 + 忌用字
  for (const char of characters) {
    if (sensitiveChars.has(char.character)) {
      continue; // 敏感字过滤
    }
    if (allTabooChars.has(char.character)) {
      console.log(`[安全过滤] 过滤忌用字: ${char.character}${gender ? ` (${gender === "F" ? "女" : "男"})` : ""}`);
      continue; // 忌用字过滤
    }
    safeChars.push(char);
  }

  // 5. 谐音检测（简化版）
  const homophoneFiltered = safeChars.filter(char => {
    const pinyin = char.pinyin.toLowerCase();
    // 避免不吉利的谐音
    const badHomophones = ["si", "wang", "bai", "po", "can"];
    return !badHomophones.some(bad => pinyin.includes(bad));
  });

  return homophoneFiltered;
}

/**
 * 5. AI组合与润色层 - 生成最终名字
 * 注意：这里实现简化版本，实际应该调用大模型API
 */
export async function generateAndPolishNames(
  characters: CharacterInfo[],
  intent: StructuredIntent
): Promise<NameCandidate[]> {
  console.log(`AI组合层: 开始处理 ${characters.length} 个字符`);
  const candidates: NameCandidate[] = [];
  
  // 1. 根据字数要求生成组合
  const nameLength = intent.wordCount;
  const surname = intent.surname;
  
  console.log(`AI组合层: 姓氏=${surname}, 字数=${nameLength}, 五行需求=${intent.wuxing.join(',')}`);
  
  // 2. 筛选合适的字（按五行、频率等排序）
  // 【关键】五字过滤：只过滤掉明确与喜用相克的字，保留其他所有字
  // 喜金则水生金/土生金，金木水火土都用；不要求每个字都匹配五行
  const allWuxing = ["金", "木", "水", "火", "土"];
  const compatibleWuxing = new Set<string>();
  for (const wx of intent.wuxing) {
    compatibleWuxing.add(wx); // 自身
    if (wx === "金") { compatibleWuxing.add("土"); compatibleWuxing.add("水"); } // 土生金，水生金
    if (wx === "木") { compatibleWuxing.add("水"); compatibleWuxing.add("火"); } // 水生木，木生火
    if (wx === "水") { compatibleWuxing.add("金"); compatibleWuxing.add("木"); } // 金生水，水生木
    if (wx === "火") { compatibleWuxing.add("木"); compatibleWuxing.add("土"); } // 木生火，火生土
    if (wx === "土") { compatibleWuxing.add("火"); compatibleWuxing.add("金"); } // 火生土，土生金
  }

  const sortedChars = [...characters]
    .filter(char => {
      // 接受：没有五行 / 五行在兼容列表 / 五行为空或"吉"
      const isCompatible = intent.wuxing.length === 0 ||
                           compatibleWuxing.has(char.wuxing) ||
                           !char.wuxing ||
                           char.wuxing === "" ||
                           char.wuxing === "吉" ||
                           char.wuxing === "None" ||
                           !allWuxing.includes(char.wuxing); // 非标准五行也接受
      return isCompatible;
    })
    .sort((a, b) => (b.frequency || 0) - (a.frequency || 0))
    .slice(0, 30);
  
  console.log(`AI组合层: 筛选后 ${sortedChars.length} 个字符`);
  
  if (sortedChars.length < 2) {
    console.log(`AI组合层: 字符不足，无法生成名字`);
    return candidates;
  }
  
  // 3. 生成名字组合
  if (nameLength === 2) {
    console.log(`AI组合层: 生成双字名`);
    // 双字名：姓 + 字1 + 字2
    for (let i = 0; i < Math.min(10, sortedChars.length - 1); i++) {
      for (let j = i + 1; j < Math.min(15, sortedChars.length); j++) {
        const char1 = sortedChars[i];
        const char2 = sortedChars[j];
        
        // 检查音律和谐度
        const isHarmonious = checkHarmony(char1, char2);
        console.log(`AI组合层: 尝试组合 ${char1.character} + ${char2.character}, 音律和谐: ${isHarmonious}`);
        
        if (isHarmonious) {
          const candidate = createNameCandidate(
            surname,
            [char1, char2],
            intent
          );
          candidates.push(candidate);
          console.log(`AI组合层: 生成名字 ${candidate.fullName}`);
          
          if (candidates.length >= 10) break;
        }
      }
      if (candidates.length >= 10) break;
    }
  } else {
    console.log(`AI组合层: 生成三字名`);
    // 三字名：姓 + 字1 + 字2 + 字3
    for (let i = 0; i < Math.min(8, sortedChars.length - 2); i++) {
      for (let j = i + 1; j < Math.min(12, sortedChars.length - 1); j++) {
        for (let k = j + 1; k < Math.min(15, sortedChars.length); k++) {
          const char1 = sortedChars[i];
          const char2 = sortedChars[j];
          const char3 = sortedChars[k];
          
          // 检查音律和谐度
          const harmony1 = checkHarmony(char1, char2);
          const harmony2 = checkHarmony(char2, char3);
          console.log(`AI组合层: 尝试组合 ${char1.character} + ${char2.character} + ${char3.character}, 音律和谐: ${harmony1 && harmony2}`);
          
          if (harmony1 && harmony2) {
            const candidate = createNameCandidate(
              surname,
              [char1, char2, char3],
              intent
            );
            candidates.push(candidate);
            console.log(`AI组合层: 生成名字 ${candidate.fullName}`);
            
            if (candidates.length >= 10) break;
          }
        }
        if (candidates.length >= 10) break;
      }
      if (candidates.length >= 10) break;
    }
  }
  
  console.log(`AI组合层: 生成 ${candidates.length} 个候选名字`);
  
  // 4. 评分和排序
  const scoredCandidates = candidates.map(candidate => {
    return scoreNameCandidate(candidate, intent);
  });
  
  // 按综合分排序
  const finalCandidates = scoredCandidates.sort((a, b) => b.score - a.score).slice(0, 8);
  console.log(`AI组合层: 最终返回 ${finalCandidates.length} 个名字`);
  
  return finalCandidates;
}

/**
 * 主函数：完整的起名流程
 */
export async function generateNames(request: NamingRequest): Promise<NamingResult> {
  const startTime = Date.now();
  
  try {
    // 1. 意图解析
    const intent = await parseIntent(request);
    
    // 2. 典籍匹配
    const matchedChars = await matchClassics(intent);
    
    // 3. 真实人名合规过滤
    const compliantChars = await applyNameCompliance(matchedChars, intent);
    
    // 4. 安全过滤
    const safeChars = await applySafetyFilter(compliantChars, intent.surname, intent.gender);
    
    // 5. AI组合与润色
    const candidates = await generateAndPolishNames(safeChars, intent);
    
    const endTime = Date.now();
    
    return {
      success: true,
      structuredIntent: intent,
      candidates,
      statistics: {
        totalCharactersConsidered: matchedChars.length,
        totalClassicsEntriesMatched: 0, // 实际应该从matchClassics返回
        totalNameSamplesAnalyzed: 0, // 实际应该从applyNameCompliance返回
        safetyChecksPerformed: safeChars.length,
        generationTime: endTime - startTime,
      },
    };
    
  } catch (error) {
    console.error("起名引擎错误:", error);
    return {
      success: false,
      structuredIntent: {} as StructuredIntent,
      candidates: [],
      statistics: {
        totalCharactersConsidered: 0,
        totalClassicsEntriesMatched: 0,
        totalNameSamplesAnalyzed: 0,
        safetyChecksPerformed: 0,
        generationTime: 0,
      },
      warnings: ["起名过程中发生错误"],
    };
  }
}

// 辅助函数
function extractKeywords(text: string): string[] {
  // 简单关键词提取
  const commonKeywords = ["温柔", "诗意", "大气", "文雅", "古典", "现代", "清新", "阳光", "智慧", "勇敢"];
  const foundKeywords = commonKeywords.filter(keyword => 
    text.includes(keyword)
  );
  
  // 提取单字意象
  const chars = text.split('').filter(isChineseCharacter);
  return [...foundKeywords, ...chars.slice(0, 5)];
}

function isChineseCharacter(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 0x4E00 && code <= 0x9FFF;
}

function checkHarmony(char1: CharacterInfo, char2: CharacterInfo): boolean {
  // 使用音律优化模块进行更专业的检查
  
  const pinyin1 = char1.pinyin || '';
  const pinyin2 = char2.pinyin || '';
  
  // 避免完全相同的拼音
  if (pinyin1.toLowerCase() === pinyin2.toLowerCase()) return false;
  
  // 提取音调
  const tone1 = PhoneticOptimizer.extractTone(pinyin1);
  const tone2 = PhoneticOptimizer.extractTone(pinyin2);
  
  // 检查平仄搭配
  const pingzeResult = PhoneticOptimizer.checkPingze(tone1, tone2);
  if (!pingzeResult.isHarmonious) {
    return false;
  }
  
  // 提取声母
  const initial1 = PhoneticOptimizer.extractInitial(pinyin1);
  const initial2 = PhoneticOptimizer.extractInitial(pinyin2);
  
  // 检查声母和谐度
  const initialResult = PhoneticOptimizer.checkInitialHarmony(initial1, initial2);
  if (!initialResult.isHarmonious) {
    return false;
  }
  
  // 提取韵母
  const final1 = PhoneticOptimizer.extractFinal(pinyin1);
  const final2 = PhoneticOptimizer.extractFinal(pinyin2);
  
  // 检查韵母和谐度
  const finalResult = PhoneticOptimizer.checkFinalHarmony(final1, final2);
  if (!finalResult.isHarmonious) {
    return false;
  }
  
  return true;
}

// 创建名字候选
function createNameCandidate(
  surname: string,
  characters: CharacterInfo[],
  intent: StructuredIntent
): NameCandidate {
  const givenName = characters.map(c => c.character).join('');
  const fullName = surname + givenName;
  
  // 计算拼音
  const pinyin = characters.map(c => {
    const p = c.pinyin || "";
    return p.split(',')[0] || p.split(' ')[0] || "";
  }).join(' ');
  
  // 计算五行
  const wuxing = characters.map(c => c.wuxing || "").join('');
  
  // 计算笔画
  const strokeCount = characters.reduce((sum, c) => sum + (c.strokeCount || 0), 0);
  
  // 生成含义
  const meaning = characters.map(c => c.meaning || "").filter(m => m).join('；');
  
  // 收集来源
  const sources: Array<{book: string, text: string, chapter?: string}> = [];
  for (const char of characters) {
    if (char.source && char.sourceText) {
      sources.push({
        book: char.source,
        text: char.sourceText,
      });
    }
  }
  
  // 去重来源
  const uniqueSources = sources.filter((source, index, self) =>
    index === self.findIndex(s => s.book === source.book && s.text === source.text)
  );
  
  return {
    fullName,
    givenName,
    pinyin,
    wuxing,
    meaning: meaning || "寓意美好，音律和谐",
    strokeCount,
    score: 0,
    scoreBreakdown: {
      cultural: 0,
      popularity: 0,
      harmony: 0,
      safety: 0,
      overall: 0,
    },
    sources: uniqueSources,
    warnings: [],
    uniqueness: "medium",
  };
}

// 评分名字候选
function scoreNameCandidate(
  candidate: NameCandidate,
  intent: StructuredIntent
): NameCandidate {
  let culturalScore = 0;
  let popularityScore = 0;
  let harmonyScore = 0;
  let safetyScore = 0;
  
  // 1. 文化底蕴分（根据来源数量和质量）
  culturalScore = Math.min(candidate.sources.length * 20, 100);
  
  // 2. 常用度分（简化版）
  popularityScore = 70; // 默认中等
  
  // 3. 音律和谐分
  harmonyScore = 80; // 默认良好
  
  // 4. 安全分
  safetyScore = 95; // 默认安全
  
  // 计算综合分
  const overallScore = Math.round(
    culturalScore * 0.3 +
    popularityScore * 0.25 +
    harmonyScore * 0.25 +
    safetyScore * 0.2
  );
  
  // 确定独特性
  let uniqueness: "high" | "medium" | "low" = "medium";
  if (overallScore > 85) uniqueness = "high";
  else if (overallScore < 60) uniqueness = "low";
  
  // 添加警告
  const warnings: string[] = [];
  if (candidate.strokeCount > 25) {
    warnings.push("笔画较多，书写稍复杂");
  }
  if (culturalScore < 30) {
    warnings.push("文化出处较少");
  }
  
  return {
    ...candidate,
    score: overallScore,
    scoreBreakdown: {
      cultural: culturalScore,
      popularity: popularityScore,
      harmony: harmonyScore,
      safety: safetyScore,
      overall: overallScore,
    },
    uniqueness,
    warnings,
  };
}
