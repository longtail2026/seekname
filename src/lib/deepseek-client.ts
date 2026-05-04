/**
 * DeepSeek API 客户端
 * 
 * 用于英文起名的降级场景：
 * 当数据库搜索不到发音匹配的英文名时，
 * 调用 DeepSeek AI 根据中文名发音生成英文名。
 */

const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1/chat/completions";

export interface DeepSeekResponse {
  success: boolean;
  name?: string;
  meaning?: string;
  raw?: string;
  error?: string;
}

/**
 * 获取 DeepSeek API Key
 * 优先级：环境变量 DEEPSEEK_API_KEY > process.env
 */
function getApiKey(): string {
  // Next.js 服务端环境变量
  return process.env.DEEPSEEK_API_KEY || "";
}

/**
 * 调用 DeepSeek AI 为中文名生成发音接近的英文名
 * 
 * @param gender 性别：male / female
 * @param givenName 中文名字（不含姓氏）
 * @param fullName 中文全名
 * @returns DeepSeekResponse
 */
export async function generateEnglishNameByDeepSeek(
  gender: "male" | "female",
  givenName: string,
  fullName: string
): Promise<DeepSeekResponse> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("[deepseek] DEEPSEEK_API_KEY 未配置");
    return { success: false, error: "API key not configured" };
  }

  const genderLabel = gender === "male" ? "男生" : "女生";
  const prompt = `您是为熟悉中美文化的姓名学大师，请为${genderLabel},姓名"${fullName}"，起一个发音接近的英文名。

要求：
1. 英文名的发音必须接近"${fullName}"的中文发音
2. 单字名直接匹配英文发音；二字名整体双音节匹配
3. 名字要地道、自然，是真正在英语国家使用的名字
4. 男女名不要混淆（${genderLabel}名）

请返回 JSON 格式：
{
  "name": "建议的英文名",
  "meaning": "这个英文名的含义（中文，30-80字）"
}

注意：只返回合法 JSON，不要 markdown 代码块包裹。`;

  try {
    console.log(`[deepseek] 请求生成: gender=${gender}, givenName=${givenName}, fullName=${fullName}`);

    const response = await fetch(DEEPSEEK_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "你是精通中美文化的姓名学专家。根据中文名发音推荐发音接近的英文名。只返回纯 JSON，不要任何其他文字或 markdown 格式。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[deepseek] API 请求失败: ${response.status} ${errText}`);
      return { success: false, error: `API error: ${response.status}` };
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    if (!data.choices?.[0]?.message?.content) {
      console.error("[deepseek] API 返回空内容:", JSON.stringify(data));
      return { success: false, error: "Empty response from DeepSeek" };
    }

    const content = data.choices[0].message.content.trim();

    // 尝试解析 JSON（可能被 markdown 代码块包裹）
    let jsonStr = content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    let parsed: { name?: string; meaning?: string };
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.warn("[deepseek] JSON 解析失败，返回原始内容:", content);
      return { success: true, raw: content, error: "JSON parse failed" };
    }

    if (!parsed.name) {
      return { success: false, error: "DeepSeek 未返回名字" };
    }

    console.log(`[deepseek] 生成成功: ${parsed.name} - ${parsed.meaning?.substring(0, 50)}`);
    return {
      success: true,
      name: parsed.name.trim(),
      meaning: parsed.meaning?.trim() || "",
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[deepseek] 调用失败: ${msg}`);
    return { success: false, error: msg };
  }
}

/**
 * AI 生成的英文名结果（含分析和推荐理由）
 */
export interface AiNameResult {
  name: string;
  meaning: string;
  /** AI 深入分析（发音接近度、文化适配等） */
  analysis?: string;
  /** 针对该用户的个性化推荐理由 */
  recommendationReason?: string;
}

/**
 * 通用DeepSeek提示词接口 — 接受自定义提示词，用于英文起名引擎v5.0 (AI Only)
 * 
 * 由 ename-generator.ts 内部构造提示词，传入DeepSeek生成候选名。
 * 提示词模板结构化的优点是可以在不修改客户端的条件下灵活调整提示内容。
 * 
 * @param customPrompt  完整的自定义提示词（由ename-generator构造）
 * @param count         期望返回的候选名数量
 * @returns             候选名列表 { name, meaning, analysis, recommendationReason }
 */
export async function generateEnglishNamesByPrompt(
  customPrompt: string,
  count: number = 10
): Promise<AiNameResult[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return [];
  }

  try {
    const response = await fetch(DEEPSEEK_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "你是精通中美文化的姓名学专家。根据中文名发音推荐发音接近的英文名。只返回纯 JSON 数组，不要任何其他文字。",
          },
          {
            role: "user",
            content: customPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[deepseek] API 请求失败: ${response.status} ${errText.substring(0, 200)}`);
      return [];
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content || "";
    if (!content) {
      console.warn("[deepseek] API 返回了空内容, data:", JSON.stringify(data).substring(0, 200));
      return [];
    }

    console.log(`[deepseek] API 返回内容前200字符: ${content.substring(0, 200)}`);

    let jsonStr = content;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    const parsed = JSON.parse(jsonStr) as Array<{ name: string; meaning?: string; analysis?: string; recommendationReason?: string }>;
    if (!Array.isArray(parsed)) {
      console.warn("[deepseek] 解析结果不是数组:", typeof parsed);
      return [];
    }

    const result = parsed
      .filter((item) => item.name)
      .map((item) => ({
        name: item.name.trim(),
        meaning: item.meaning?.trim() || "",
        analysis: item.analysis?.trim() || undefined,
        recommendationReason: item.recommendationReason?.trim() || undefined,
      }));

    console.log(`[deepseek] 成功解析 ${result.length} 个候选名`);
    return result;

  } catch (error) {
    console.error("[deepseek] 自定义提示词生成失败:", error);
    return [];
  }
}

/**
 * 原有批量生成函数（保留兼容，仍可用）
 */
export async function generateEnglishNameBatchByDeepSeek(
  gender: "male" | "female",
  givenName: string,
  fullName: string,
  count: number = 3
): Promise<{ name: string; meaning: string }[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return [];
  }

  const genderLabel = gender === "male" ? "男生" : "女生";
  const prompt = `您是为熟悉中美文化的姓名学大师，请为${genderLabel},姓名"${fullName}"，起${count}个发音接近的英文名。

要求：
1. 英文名的发音必须接近"${fullName}"的中文发音
2. 单字名直接匹配英文发音；二字名整体双音节匹配
3. 名字要地道、自然，是真正在英语国家使用的名字
4. 男女名不要混淆（${genderLabel}名）
5. 请给出 ${count} 个不同的选择

请返回 JSON 数组格式：
[
  {"name": "建议的英文名1", "meaning": "含义（30-80字）"},
  {"name": "建议的英文名2", "meaning": "含义（30-80字）"},
  {"name": "建议的英文名3", "meaning": "含义（30-80字）"}
]

注意：只返回合法 JSON 数组，不要 markdown 代码块。`;

  try {
    const response = await fetch(DEEPSEEK_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "你是精通中美文化的姓名学专家。根据中文名发音推荐发音接近的英文名。只返回纯 JSON 数组，不要任何其他文字。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content || "";
    let jsonStr = content;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    const parsed = JSON.parse(jsonStr) as Array<{ name: string; meaning?: string }>;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item.name)
      .map((item) => ({
        name: item.name.trim(),
        meaning: item.meaning?.trim() || "",
      }));

  } catch (error) {
    console.error("[deepseek] 批量生成失败:", error);
    return [];
  }
}