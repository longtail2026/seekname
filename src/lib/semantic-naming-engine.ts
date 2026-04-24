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
 * 数据库表：naming_classics（典籍词句表，已做 BGE-M3 向量化）
 * 向量列：combined_text_embedding (vector(1024))
 * 索引：idx_naming_classics_embedding (HNSW, cosine_ops)
 */

import { DeepSeekIntegration } from "./deepseek-integration";
import { searchNamingClassics } from "./semantic-search-naming-classics";

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
  reason: string;       // 选字理由（详细说明每个字取自哪篇哪句）
  source: string;       // 典籍出处原文（含篇章名和原句）
  modernText?: string;  // 白话译文
  score?: number;
}

// 过滤结果
export interface FilterResult {
  passed: GeneratedName[];
  removed: Array<{ name: string; reason: string }>;
}

/**
 * 1. 语义匹配层
 * 
 * 策略（OVHcloud BGE-M3 向量搜索优先，关键词搜索兜底）：
 * - 先通过 OVHcloud BGE-M3 API 生成用户输入的语义向量
 * - 在 naming_classics 表用 pgvector 余弦距离做语义搜索
 * - 如果搜索结果不足（＜minResults），自动用关键词搜索补充
 * - 合并去重后返回
 */
export async function findSemanticMatches(
  userInput: string,
  limit: number = 10,
  gender: "M" | "F" = "M"
): Promise<ClassicsMatch[]> {
  try {
    console.log(`[语义匹配-OVHcloud] 开始查找相似典籍: "${userInput}"`);

    // 使用 BGE-M3 语义搜索（向量优先，关键词兜底）
    const matches = await searchNamingClassics(userInput, gender, limit);

    console.log(`[语义匹配] 最终返回 ${matches.length} 个相似典籍`);
    return matches;
  } catch (error) {
    console.error("[语义匹配] 搜索失败:", error);
    return [];
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
4. 选字理由（说明取用哪个字的含义，以及为什么这个字符合客户需求）
5. 典籍出处（标明该字出自哪部典籍的哪篇哪句原文，如"字"出自《诗经·小雅·鹿鸣》"鼓瑟吹笙"）

客户需求：
- 性别：【${genderText}】
- 姓氏：【${surname}】
- 期望寓意：【${expectations}】
- 风格偏好：【${styleText}】

输出格式：用Markdown表格，列包括：序号、名字、拼音、寓意说明、选字理由、典籍出处

注意：
1. 名字要优美、有文化内涵，符合客户性别和风格偏好
2. 拼音要准确，带声调标注
3. 寓意说明要具体、有诗意
4. 【关键】选字理由必须具体指出名字中每个字取自哪部典籍的哪篇哪段原文，例如："'熙'字取自《诗经·大雅·文王》'穆穆文王，于缉熙敬止'，意为光明和乐"；
5. 典籍出处必须精确到篇章名和原句，不能只说"出自《诗经》"这种笼统表述；
6. 名字要体现性别特点：男名宜用刚健、宏大、英武类字，女名宜用柔美、温婉、秀丽类字。
7. 【重要】每个名字的出处不能重复：请确保50个名字的出处覆盖不同的典籍篇章，不要反复引用同一段原文。例如用了《尚书》的一句话作为出处，下一个名字就应该换用《诗经》《庄子》《楚辞》等其他典籍的其他篇章。`;
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
4. 选字理由（说明取用哪个字的含义，以及为什么这个字符合客户需求）
5. 典籍出处（标明该字出自哪部典籍的哪篇哪句原文，如"熙"出自《诗经·大雅·文王》"于缉熙敬止"）

客户需求：
- 性别：【${genderText}】
- 姓氏（可选）：【${surname}】
- 期望寓意：【${expectations}】
- 风格偏好：【${styleText}】
- 补充说明：【基于以下典籍进行创意起名】

参考典籍：
${classicsInfo}

输出格式：用Markdown表格，列包括：序号、名字、拼音、寓意说明、选字理由、典籍出处

注意：
1. 名字要优美、有文化内涵，符合客户性别和风格偏好
2. 拼音要准确，带声调标注
3. 寓意说明要具体、有诗意
4. 【关键】选字理由必须具体指出名字中每个字取自哪部典籍的哪篇哪段原文，例如："'熙'字取自《诗经·大雅·文王》'于缉熙敬止'，意为光明和乐"；
5. 典籍出处必须精确到篇章名和原句，不能只说"出自《诗经》"这种笼统表述；
6. 名字要体现性别特点：男名宜用刚健、宏大、英武类字，女名宜用柔美、温婉、秀丽类字。
7. 【重要】每个名字的出处不能重复：请确保50个名字的出处覆盖不同的典籍篇章，不要反复引用同一段原文。例如用了《尚书》的一句话作为出处，下一个名字就应该换用《诗经》《庄子》《楚辞》等其他典籍的其他篇章。`;


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
输出必须是Markdown表格格式，包含以下列：序号、名字、拼音、寓意说明、选字理由、典籍出处。
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

    // 1. 语义匹配（传递性别参数）
    const gender = request.gender || "M";
    const matches = await findSemanticMatches(
      request.rawInput || request.expectations || "",
      10,
      gender
    );

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

        // 列数：6列（序号、名字、拼音、寓意说明、选字理由、典籍出处）
        // 兼容旧版5列（序号、名字、拼音、寓意说明、选字理由）
        if (cells.length >= 5) {
          // DeepSeek 返回的名字列可能为以下两种情况之一：
          // - 仅名（如"丽敏"）— 2个汉字，正常
          // - 全名（如"张丽敏"）— 3个汉字，含姓氏
          // 我们需要检测并处理这两种情况
          const rawName = cells[1];
          let givenName = rawName;
          
          // 常见姓氏列表（用于检测 DeepSeek 是否返回了全名）
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
            "墨","哈","谯","笪","年","爱","阳","佟","第五","言","福"
          ]);
          
          // 如果名字是3个或更多汉字，且前1-2个字是常见姓氏，则去掉姓氏部分
          // 注意：部分复姓（如"欧阳"）也是2个字，全名可能是3字（欧阳雪）或4字（欧阳明月）
          if (/^[\u4e00-\u9fff]{3,}$/.test(rawName)) {
            // 检查前2个字符是否是复姓
            const potentialDoubleSurname = rawName.slice(0, 2);
            if (commonSurnames.has(potentialDoubleSurname)) {
              givenName = rawName.slice(2); // 去掉复姓
            } else {
              // 检查第1个字符是否是单姓
              const potentialSingleSurname = rawName.slice(0, 1);
              if (commonSurnames.has(potentialSingleSurname) && rawName.length >= 3) {
                givenName = rawName.slice(1); // 去掉单姓
              }
            }
          }

          const pinyin = cells[2];
          const meaning = cells[3];
          const reason = cells[4];
          const source = cells.length >= 6 ? cells[5] : "";
          const name = givenName;

          names.push({
            name,
            givenName,
            pinyin,
            meaning,
            reason,
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
