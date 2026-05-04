/**
 * 社交网名生成 API
 * POST /api/social-name/generate
 */
import { NextRequest, NextResponse } from "next/server";

// 导入DeepSeek集成模块
import { DeepSeekIntegration } from "@/lib/deepseek-integration";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { genderStyle, keywords, contains, length: lengthPref, avoid } = body;

    // 参数校验
    if (!genderStyle || !keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { success: false, message: "请选择风格倾向和风格关键词" },
        { status: 400 }
      );
    }

    // 检查AI是否可用
    if (!DeepSeekIntegration.isAvailable()) {
      return NextResponse.json(
        { success: false, message: "AI 服务未配置，请稍后重试" },
        { status: 503 }
      );
    }

    // 构建固定 prompt
    const systemPrompt = `你是专业社交网名设计师。请根据用户需求，生成适合抖音、小红书、微信、INS的网名，风格统一、好听、不撞款、有记忆点、不俗气。`;

    const userPrompt = `用户需求：
性别/风格倾向：${genderStyle}
风格关键词：${keywords.join("、")}
${contains ? `希望包含的字：${contains}` : ""}
字数：${lengthPref || "不限"}
${avoid ? `禁忌：${avoid}` : ""}

规则：
1. 生成10个网名
2. 活泼、年轻化、适合社交平台
3. 不要非主流、不要低俗
4. 不要重复、不要烂大街
5. 每个网名附带一句话风格解释

请以 JSON 数组格式输出，不要加 markdown 代码块包裹：
[
  {
    "name": "网名",
    "explanation": "风格说明（一句话解释这个网名的特点、适合什么风格的人）"
  }
]`;

    const rawResult = await DeepSeekIntegration.callRaw(systemPrompt, userPrompt, 0.7, 4096);

    // 解析 JSON
    // 先尝试直接 parse
    let trimmed = rawResult.trim();
    // 去掉可能的 ```json ``` 包裹
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) trimmed = match[1].trim();

    let names: Array<{ name: string; explanation: string }> = [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        names = parsed
          .filter((item: any) => item.name)
          .map((item: any) => ({
            name: item.name.trim(),
            explanation: item.explanation?.trim() || "",
          }));
      }
    } catch {
      // JSON 解析失败，尝试按行解析 "序号. 网名 - 说明" 格式
      console.warn("[social-name] JSON 解析失败，尝试文本行解析");
      const lines = trimmed.split("\n").filter((l) => l.trim());
      for (const line of lines) {
        // 匹配 "1. 网名 - 说明" 或 "1. 网名 — 说明" 或 "1. 网名 说明"
        const lineMatch = line.match(/^\d+[\.\、]\s*(.+?)[\s\-—–]+(.+)$/);
        if (lineMatch) {
          names.push({
            name: lineMatch[1].trim(),
            explanation: lineMatch[2].trim(),
          });
        }
      }
    }

    if (names.length === 0) {
      console.error("[social-name] 解析结果为空, raw:", rawResult.slice(0, 200));
      return NextResponse.json(
        { success: false, message: "AI 返回结果格式异常", data: [] },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: names });
  } catch (error) {
    console.error("[API social-name/generate] 错误:", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误", data: [] },
      { status: 500 }
    );
  }
}
