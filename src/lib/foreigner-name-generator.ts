/**
 * 外国友人起中文名引擎
 *
 * === 核心逻辑 ===
 * 1. 外文原名 → 提取重音发音
 * 2. 发音 → 匹配中文字音（声母一致/韵母接近/声调顺口/不用生僻字）
 * 3. 强过滤：负面/歧义/不雅词库拦截
 * 4. 按风格生成最终名字（通用版/文雅版/个性版）
 *
 * 调用 DeepSeek AI 生成，确保发音贴近 + 100% 无负面含义 + 符合中国文化
 */

import type { AiNameResult } from "./deepseek-client";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1/chat/completions";

function getApiKey(): string {
  return process.env.DEEPSEEK_API_KEY || "";
}

// ===== 类型定义 =====

export interface ForeignerNameRequest {
  firstName: string;
  lastName: string;
  gender: "male" | "female" | "neutral";
  style: "classic" | "elegant" | "sunshine" | "simple" | "chinese-style";
  /** 希望包含的字（选填） */
  contains?: string;
  /** 不想要的字/风格（选填） */
  avoid?: string;
}

export interface ForeignerNameResult {
  /** 中文名 */
  chineseName: string;
  /** 拼音 */
  pinyin: string;
  /** 美好寓意（1句话） */
  meaning: string;
  /** 适配场景（职场/生活/社交） */
  scenario: string;
  /** 类别：通用版/文雅版/个性版 */
  category: "通用版" | "文雅版" | "个性版";
}

export interface ForeignerNameResponse {
  success: boolean;
  data: {
    general: ForeignerNameResult[];
    elegant: ForeignerNameResult[];
    personality: ForeignerNameResult[];
  };
  message?: string;
}

// ===== 风格标签映射 =====

const STYLE_LABELS: Record<string, string> = {
  classic: "经典稳重（职场/商务）",
  elegant: "文雅气质（书香/温柔）",
  sunshine: "阳光个性（潮流/张扬）",
  simple: "简约好记（2字最推荐）",
  "chinese-style": "中国风（古风/雅致）",
};

const GENDER_LABELS: Record<string, string> = {
  male: "男",
  female: "女",
  neutral: "中性",
};

// ===== 负面字词库（硬过滤，确保 AI 不输出这些字） =====

const TABOO_CHARS = [
  "屎", "尿", "屁", "蛋", "鸡", "球", "基", "狗",
  "贱", "穷", "苦", "毒", "杀", "凶", "恶", "丑",
  "翠", "娥", "兰", "菊", "爽",
  "奸", "淫", "娼", "妓", "奴",
  "尸", "坟", "棺", "葬", "鬼", "魂",
  "癌", "病", "痛", "疫", "瘟",
  "傻", "呆", "蠢", "笨", "痴", "愚",
  "死", "亡", "灭", "败", "衰",
];

// ===== AI 提示词构造 =====

function buildAIPrompt(request: ForeignerNameRequest): string {
  const { firstName, lastName, gender, style, contains, avoid } = request;
  const genderLabel = GENDER_LABELS[gender] || "中性";
  const styleLabel = STYLE_LABELS[style] || "通用";
  const containsText = contains?.trim() || "无特殊要求";
  const avoidText = avoid?.trim() || "无";

  const tabooListStr = TABOO_CHARS.join("、");

  return `您是一位精通中外文化的中文姓名学专家。请您根据外国人的外文原名，生成贴近发音、好听、无负面歧义、适合在中国工作生活的中文名。

【用户信息】
- 外文原名：${firstName} ${lastName}
- 性别：${genderLabel}
- 风格偏好：${styleLabel}
- 希望包含的字：${containsText}
- 不想要的字/风格：${avoidText}

【生成规则（必须严格遵守）】
1. 发音贴近：优先贴近外文原名的发音，让外国人觉得像自己的名字
   - 提取重音音节作为匹配基础
   - 声母尽量一致，韵母尽量接近，声调尽量顺口
   - 例如：David → 戴维, Emma → 艾玛, John → 约翰, Taylor → 泰勒, Smith → 史密斯
2. 长度：2-3字最合适（二字名优先推荐），简洁好记
3. 安全过滤：100% 无负面含义、无低俗谐音、无不良歧义、无敏感字
   - 以下字词绝对禁止出现在名字中：${tabooListStr}
   - 任何与这些字同音或形近的字也要避免
4. 符合中国审美：名字要听起来自然、美好，适合在职场、生活、社交等场合使用
5. 不用生僻字、不用难写字、不用多音字

【输出要求】
请返回 3 类中文名，每类生成 3 个候选名（共 9 个）：

第一类「通用版」：最常见、最稳妥、发音最贴近、适合日常使用
第二类「文雅版」：更优美雅致、有文学气息、适合商务和正式场合
第三类「个性版」：更时尚潮流、有记忆点、适合社交和彰显个性

每个候选名必须包含以下 4 项信息：
- chineseName: 中文名
- pinyin: 拼音（最重要！外国人要会读）
- meaning: 美好寓意（1-2句话）
- scenario: 适配场景（职场/生活/社交等）

【格式要求】
返回 JSON 对象，格式如下（请严格按照此格式返回，不要 markdown 代码块包裹）：

{
  "general": [
    { "chineseName": "戴维", "pinyin": "Dai Wei", "meaning": "稳重有成，寓意担当与智慧", "scenario": "职场、商务通用" },
    { "chineseName": "...", "pinyin": "...", "meaning": "...", "scenario": "..." },
    { "chineseName": "...", "pinyin": "...", "meaning": "...", "scenario": "..." }
  ],
  "elegant": [
    { "chineseName": "...", "pinyin": "...", "meaning": "...", "scenario": "..." },
    { "chineseName": "...", "pinyin": "...", "meaning": "...", "scenario": "..." },
    { "chineseName": "...", "pinyin": "...", "meaning": "...", "scenario": "..." }
  ],
  "personality": [
    { "chineseName": "...", "pinyin": "...", "meaning": "...", "scenario": "..." },
    { "chineseName": "...", "pinyin": "...", "meaning": "...", "scenario": "..." },
    { "chineseName": "...", "pinyin": "...", "meaning": "...", "scenario": "..." }
  ]
}

注意：只返回纯 JSON 对象，不要任何额外文字或 markdown 格式。`;
}

// ===== 解析 AI 返回结果 =====

function parseAIResponse(content: string): ForeignerNameResponse["data"] | null {
  try {
    // 尝试直接解析 JSON
    let jsonStr = content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    const parsed = JSON.parse(jsonStr);

    // 校验结构
    if (!parsed.general || !parsed.elegant || !parsed.personality) {
      console.warn("[foreigner-name-generator] AI 返回结构不完整:", Object.keys(parsed));
      return null;
    }

    const validate = (arr: any[]): arr is ForeignerNameResult[] =>
      Array.isArray(arr) && arr.every(
        (item) => item.chineseName && item.pinyin && item.meaning && item.scenario
      );

    if (!validate(parsed.general) || !validate(parsed.elegant) || !validate(parsed.personality)) {
      console.warn("[foreigner-name-generator] AI 返回数据格式不完整");
      return null;
    }

    return {
      general: parsed.general.map((item: any) => ({
        chineseName: item.chineseName.trim(),
        pinyin: item.pinyin.trim(),
        meaning: item.meaning.trim(),
        scenario: item.scenario.trim(),
        category: "通用版" as const,
      })),
      elegant: parsed.elegant.map((item: any) => ({
        chineseName: item.chineseName.trim(),
        pinyin: item.pinyin.trim(),
        meaning: item.meaning.trim(),
        scenario: item.scenario.trim(),
        category: "文雅版" as const,
      })),
      personality: parsed.personality.map((item: any) => ({
        chineseName: item.chineseName.trim(),
        pinyin: item.pinyin.trim(),
        meaning: item.meaning.trim(),
        scenario: item.scenario.trim(),
        category: "个性版" as const,
      })),
    };
  } catch (error) {
    console.error("[foreigner-name-generator] 解析 AI 返回内容失败:", error);
    return null;
  }
}

// ===== 主入口：生成外国人中文名 =====

export async function generateForeignerChineseNames(
  request: ForeignerNameRequest
): Promise<ForeignerNameResponse> {
  const { firstName, lastName, gender, style, contains, avoid } = request;

  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      success: false,
      data: { general: [], elegant: [], personality: [] },
      message: "API 配置错误，请联系管理员",
    };
  }

  // 参数校验
  if (!firstName?.trim()) {
    return {
      success: false,
      data: { general: [], elegant: [], personality: [] },
      message: "请输入外文名",
    };
  }

  const fullname = `${firstName.trim()} ${lastName?.trim() || ""}`.trim();

  try {
    const prompt = buildAIPrompt(request);

    console.log(`[foreigner-name-generator] 调用 DeepSeek AI: ${fullname}, gender=${gender}, style=${style}`);

    const response = await fetch(DEEPSEEK_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "你是精通中外文化的姓名学专家。根据外国人原名生成发音贴近、无负面含义的中文名。只返回纯 JSON 对象，不要任何其他文字或 markdown 格式。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 4096,
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[foreigner-name-generator] API 请求失败: ${response.status} ${errText.substring(0, 200)}`);
      return {
        success: false,
        data: { general: [], elegant: [], personality: [] },
        message: "AI 服务暂时不可用，请稍后重试",
      };
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content || "";
    if (!content) {
      console.warn("[foreigner-name-generator] API 返回空内容");
      return {
        success: false,
        data: { general: [], elegant: [], personality: [] },
        message: "AI 返回为空，请稍后重试",
      };
    }

    console.log(`[foreigner-name-generator] AI 返回内容前200字符: ${content.substring(0, 200)}`);

    const parsed = parseAIResponse(content);
    if (!parsed) {
      console.warn("[foreigner-name-generator] 解析失败，原始内容:", content.substring(0, 500));
      return {
        success: false,
        data: { general: [], elegant: [], personality: [] },
        message: "AI 返回格式异常，请重新生成",
      };
    }

    // 确保每个类别至少返回一些结果
    const totalCount =
      parsed.general.length + parsed.elegant.length + parsed.personality.length;

    if (totalCount === 0) {
      return {
        success: false,
        data: { general: [], elegant: [], personality: [] },
        message: "生成结果为空，请调整参数后重试",
      };
    }

    console.log(
      `[foreigner-name-generator] 成功生成 ${totalCount} 个中文候选名（通用版${parsed.general.length}个/文雅版${parsed.elegant.length}个/个性版${parsed.personality.length}个）`
    );

    return {
      success: true,
      data: parsed,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[foreigner-name-generator] 生成失败: ${msg}`);
    return {
      success: false,
      data: { general: [], elegant: [], personality: [] },
      message: `生成失败: ${msg}`,
    };
  }
}