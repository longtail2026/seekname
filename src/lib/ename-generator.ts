/**
 * 英文起名引擎 v5.0 — AI Only
 * 
 * === 架构变更 ===
 * ★ v5.0 重大重构：去掉所有语音发音匹配逻辑
 * ★ 不再使用 ename-phonetic.ts 的拼音匹配引擎
 * ★ 不再使用 ename-dict.ts 的英文名数据库
 * ★ 所有用户输入组织成 AI 提示词，直接交给 DeepSeek 生成
 * ★ 按 AI 返回的优先顺序排序，给出名字分析（analysis）和推荐理由（recommendationReason）
 * ★ 保留姓氏英文映射（surnameEnglish/surnameChina/surnameOverseas）用于推荐全名
 */

import { getSurnameEnglishExpressions, getRecommendedSurnameSpellings, getSurnameChinaOverseas } from "./ename-surname-map";
import { generateEnglishNamesByPrompt, type AiNameResult } from "./deepseek-client";

// ===== 类型定义 =====

export interface EnameGenerateRequest {
  gender: "male" | "female";
  surname: string;
  fullName?: string;
  needs?: string[];
  avoidFlags?: string[];
  lengthPreference?: "short" | "medium" | "long";
  count?: number;
}

export interface EnameScoredResult {
  name: string;
  gender: string;
  phonetic: string;
  chinese: string;
  origin: string;
  popularity: string;
  meaning: string;
  firstLetter: string;
  score: number;
  phoneticScore: number;
  meaningScore: number;
  styleScore: number;
  popularityScore: number;
  lengthScore: number;
  tags: string[];
  adaptationNote: string;
  recommendedFullName?: string;
  surnameEnglish?: string;
  surnameChina?: string;
  surnameOverseas?: string;
  /** 来源：始终为 'ai'（v5.0 起全部由 AI 生成） */
  source: "ai";
  /** AI 深入分析（发音接近度、文化适配等） */
  analysis?: string;
  /** 针对该用户的个性化推荐理由 */
  recommendationReason?: string;
}

// ===== 姓氏英文表达工具 =====

/**
 * 获取姓氏的推荐英文表达（优先使用SURNAME_ENGLISH_MAP中的海外表达）
 */
function getSurnameEnglish(surname: string): string {
  const expressions = getSurnameEnglishExpressions(surname);
  if (expressions.length > 0) {
    return expressions[0];
  }
  const spellings = getRecommendedSurnameSpellings(surname);
  if (spellings.length > 0) {
    return spellings[0];
  }
  return surname.charAt(0).toUpperCase();
}

/**
 * 获取姓氏的大陆/海外拼写（海外优先使用SURNAME_ENGLISH_MAP）
 */
function getEnhancedSurnameChinaOverseas(surname: string): { china: string; overseas: string } {
  const base = getSurnameChinaOverseas(surname);
  const expressions = getSurnameEnglishExpressions(surname);
  if (expressions.length > 0) {
    return {
      china: base.china,
      overseas: expressions[0],
    };
  }
  return base;
}

// ===== AI 提示词构造（v5.0 — 完整全覆盖）=====

/**
 * 构建 DeepSeek AI 提示词（v5.0 全量版本）
 * 
 * 包含所有用户输入：性别、姓氏、全名、核心需求、避坑要求、长度偏好
 * 要求 AI 按推荐优先级排序，并为每个候选名提供深入分析和推荐理由
 */
function buildAIPrompt(
  fullName: string,
  gender: "male" | "female",
  surname: string,
  needs: string[],
  avoidFlags: string[],
  lengthPreference?: "short" | "medium" | "long"
): string {
  const genderLabel = gender === "male" ? "男" : "女";
  const genderEn = gender === "male" ? "男性" : "女性";
  const needsText = needs.length > 0 ? needs.join("、") : "无特殊要求";
  const avoidText = avoidFlags.length > 0 ? avoidFlags.join("、") : "无";
  const lengthText = lengthPreference
    ? { short: "短名（3-4字母以内）", medium: "适中（5-6字母）", long: "长名（7字母以上）" }[lengthPreference]
    : "无偏好";

  // 避坑规则的中文描述
  const avoidDescriptions: string[] = [];
  for (const flag of avoidFlags) {
    switch (flag) {
      case "不要太常见的爆款名":
        avoidDescriptions.push("避免过于流行的常见英文名");
        break;
      case "不要生僻难读的":
        avoidDescriptions.push("避免拼写复杂、生僻难读的名字");
        break;
      case "不要有负面谐音/含义":
        avoidDescriptions.push("确保在英语中没有任何负面含义或不好的谐音");
        break;
      case "不要和姓氏冲突的":
        avoidDescriptions.push("确保英文名与姓氏组合后发音顺畅，没有冲突");
        break;
      case "不要多音字":
        avoidDescriptions.push("避免有多种发音方式的名字");
        break;
    }
  }

  // 需求项的中文详细描述
  const needDescriptions: string[] = [];
  for (const need of needs) {
    switch (need) {
      case "谐音贴近中文名":
        needDescriptions.push(`- "谐音贴近中文名"：英文名的发音要尽量接近中文名「${fullName}」的发音，让人听起来有亲切感`);
        break;
      case "含义美好":
        needDescriptions.push(`- "含义美好"：名字的英文含义要正面积极，如：光明、希望、和平、智慧、勇敢等`);
        break;
      case "商务正式":
        needDescriptions.push(`- "商务正式"：适合职场和商务场合，听起来成熟稳重、有专业感`);
        break;
      case "简约好记":
        needDescriptions.push(`- "简约好记"：字母数少，拼写简单，容易记忆和书写`);
        break;
      case "文艺小众":
        needDescriptions.push(`- "文艺小众"：不太常见、有文艺气息的独特名字，避免撞名`);
        break;
      case "可爱灵动":
        needDescriptions.push(`- "可爱灵动"：名字听起来活泼可爱、有亲和力，适合性格开朗的人`);
        break;
    }
  }

  return `您是一位精通中英文化的姓名学大师，请为我起英文名。

【客户信息】
- 中文全名：${fullName}
- 姓氏：${surname}
- 性别：${genderLabel}（${genderEn}）

【核心需求】
${needsText}

${
  needDescriptions.length > 0
    ? "【需求详细说明】\n" + needDescriptions.join("\n") + "\n"
    : ""
}
${
  avoidDescriptions.length > 0
    ? "【避坑要求】\n" + avoidDescriptions.join("\n") + "\n"
    : ""
}
【名字长度偏好】
${lengthText}

【注意事项】
1. 请返回10个候选英文名，按推荐优先级从高到低排序（第一个是最推荐的名字）
2. 名字要地道、自然，是真正在英语国家使用的名字
3. ${genderLabel}性要明确，不要混淆性别
4. 每个名字必须是合法、真实的英文名

请返回 JSON 数组格式，每个元素包含以下字段：
- name: 建议的英文名（必填）
- meaning: 名字的含义和背景说明（30-80字中文，必填）
- analysis: 深入分析，包括发音接近度评价、文化适配性、使用场景建议等（50-120字中文）
- recommendationReason: 针对该用户的具体推荐理由，说明为什么这个名适合TA（30-80字中文）

示例格式：
[
  {"name": "候选名1", "meaning": "含义说明", "analysis": "深度分析", "recommendationReason": "推荐理由"},
  {"name": "候选名2", "meaning": "含义说明", "analysis": "深度分析", "recommendationReason": "推荐理由"}
]

注意：只返回合法 JSON 数组，不要 markdown 代码块包裹。按推荐优先级降序排列。`;
}

// ===== 综合起名引擎（v5.0 AI Only）=====

export async function generateEnglishNames(
  request: EnameGenerateRequest
): Promise<{ success: boolean; data: EnameScoredResult[]; totalCandidates: number; message?: string }> {
  const { gender, surname, fullName, needs = [], avoidFlags = [], lengthPreference, count = 10 } = request;

  try {
    // ===== 1. 获取姓氏的英文表达 =====
    const surnameEnglish = getSurnameEnglish(surname);
    const { china: surnameChina, overseas: surnameOverseas } = getEnhancedSurnameChinaOverseas(surname);
    const surnameBonus = (surnameOverseas !== surnameChina) ? 10 : 0;

    // ===== 2. 构造全名字符串 =====
    const fullNameStr = fullName || `${surname}`;

    // ===== 3. 调用 DeepSeek AI 生成 =====
    let aiResults: EnameScoredResult[] = [];

    try {
      console.log(`[ename-generator v5.0] 调用 DeepSeek AI 生成英文名（AI Only 模式）`);
      console.log(`[ename-generator v5.0] 输入参数: gender=${gender}, surname=${surname}, fullName=${fullNameStr}, needs=[${needs.join(",")}], avoid=[${avoidFlags.join(",")}], length=${lengthPreference}`);

      const aiPrompt = buildAIPrompt(
        fullNameStr,
        gender,
        surname,
        needs,
        avoidFlags,
        lengthPreference
      );

      const aiNames = await generateEnglishNamesByPrompt(aiPrompt, count);

      // ===== 4. 将 AI 结果转换为前端格式 =====
      // ★★★ AI 已按推荐优先级排序，保持原顺序 ★★★
      aiResults = aiNames.map((item: AiNameResult, index: number) => {
        // 评分：按 AI 优先级降序（第1名100分，之后递减）
        const priorityScore = Math.max(60, 100 - index * 8 + surnameBonus);

        // 基础标签
        const tags: string[] = ["🤖 AI 智能推荐"];

        // 生成推荐全名
        const recommendedFullName = `${item.name} ${surnameEnglish}`;
        let adaptationNote = `中文名「${fullNameStr}」`;
        if (item.recommendationReason) {
          adaptationNote += `，推荐理由：${item.recommendationReason}`;
        } else {
          adaptationNote += `，AI 推荐「${item.name}」`;
        }

        return {
          name: item.name,
          gender: gender === "male" ? "男性" : "女性",
          phonetic: "",
          chinese: item.name,
          origin: "AI生成",
          popularity: "无",
          meaning: item.meaning || `发音接近中文名「${fullNameStr}」`,
          firstLetter: item.name[0]?.toUpperCase() || "",
          score: priorityScore,
          phoneticScore: 0,
          meaningScore: 0,
          styleScore: 0,
          popularityScore: 0,
          lengthScore: 0,
          tags,
          adaptationNote,
          recommendedFullName,
          surnameEnglish,
          surnameChina,
          surnameOverseas,
          source: "ai" as const,
          analysis: item.analysis || undefined,
          recommendationReason: item.recommendationReason || undefined,
        };
      });

      console.log(`[ename-generator v5.0] DeepSeek AI 生成了 ${aiResults.length} 个候选名`);
    } catch (error) {
      console.error("[ename-generator v5.0] DeepSeek AI 生成失败:", error);
    }

    // ===== 5. 如果 AI 生成失败，返回空结果 =====
    if (aiResults.length === 0) {
      return {
        success: false,
        data: [],
        totalCandidates: 0,
        message: "AI 生成失败，请稍后重试或检查 API 配置",
      };
    }

    // ===== 6. 返回前6个结果 =====
    // ★★★ 保持 AI 返回的优先级顺序（已由 AI 排序）★★★
    const FINAL_COUNT = 6;
    const topResults = aiResults.slice(0, FINAL_COUNT);

    // 按 AI 优先级顺序更新评分（确保前端按 score 排序时保持正确顺序）
    topResults.forEach((item, i) => {
      item.score = Math.max(60, 100 - i * 8 + surnameBonus);
    });

    return {
      success: true,
      data: topResults,
      totalCandidates: aiResults.length,
    };
  } catch (error) {
    console.error("[ename-generator v5.0] 生成英文名失败:", error);
    return {
      success: false,
      data: [],
      totalCandidates: 0,
      message: `生成失败: ${error instanceof Error ? error.message : "未知错误"}`,
    };
  }
}
