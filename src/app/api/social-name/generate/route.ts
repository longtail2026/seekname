/**
 * 社交网名生成 API
 * POST /api/social-name/generate
 */
import { NextRequest, NextResponse } from "next/server";

// 导入DeepSeek集成模块
import { DeepSeekIntegration } from "@/lib/deepseek-integration";

// 场景映射，用于生成更精准的 prompt
const SCENE_MAP: Record<string, { label: string; promptHint: string; toneHints: string }> = {
  social: {
    label: "社交平台",
    promptHint: "适合在社交平台展示个人形象",
    toneHints: "干净好记、有个性、不撞款、有记忆点",
  },
  game: {
    label: "游戏ID",
    promptHint: "适合在游戏中使用，有辨识度、符合游戏氛围",
    toneHints: "帅气霸气、有辨识度、适合游戏场景、不易重名",
  },
  relationship: {
    label: "关系ID",
    promptHint: "成对出现或团队使用的ID，有配合感、统一感",
    toneHints: "情侣间甜蜜默契、闺蜜间可爱有趣、战队名统一霸气",
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { genderStyle, sceneCategory, sceneSub, keywords, contains, length: lengthPref, avoid } = body;

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

    const sceneInfo = SCENE_MAP[sceneCategory || "social"] || SCENE_MAP.social;
    const sceneDesc = sceneSub || sceneInfo.label;

    // 按场景细化 prompt
    let sceneSpecificRules = "";
    if (sceneCategory === "game") {
      sceneSpecificRules = `
- 游戏ID要有气势、有辨识度，不要过于文艺或可爱（除非用户关键词要求）
- 建议包含特殊符号（如下划线、点）或英文/数字组合更显酷
- 避免过长，2-5字为佳
- 如果是 Steam/原神/王者/吃鸡 等具体游戏，风格可以更贴合该游戏社区习惯`;
    } else if (sceneCategory === "relationship") {
      sceneSpecificRules = `
- 情侣ID：成对出现，有呼应关系，比如"草莓味"和"薄荷味"
- 闺蜜ID：姐妹感强，可共用词汇前缀/后缀，如"糖糖"和"果果"
- 战队名：统一霸气，有团队感
- 如果是成对ID，每个名字都要单独列出，并标注匹配关系`;
    } else {
      sceneSpecificRules = `
- 适合小红书/抖音/B站/微信/INS等社交平台
- 干净、简约、好记
- 避免过于复杂或难以拼写的字符组合`;
    }

    // 构建固定 prompt
    const systemPrompt = `你是专业社交网名设计师。请根据用户需求，生成符合使用场景的网名，风格统一、好听、不撞款、有记忆点、不俗气。`;

    const userPrompt = `用户需求：
性别/风格倾向：${genderStyle}
使用场景：${sceneDesc}（${sceneInfo.promptHint}）
风格关键词：${keywords.join("、")}
${contains ? `希望包含的字：${contains}` : ""}
字数：${lengthPref || "不限"}
${avoid ? `禁忌：${avoid}` : ""}

场景特定要求：${sceneSpecificRules}

通用规则：
1. 生成10个网名
2. 符合场景调性（${sceneInfo.toneHints}）
3. 不要非主流、不要低俗
4. 不要重复、不要烂大街
5. 每个网名附带一句话风格解释

请以 JSON 数组格式输出，不要加 markdown 代码块包裹：
[
  {
    "name": "网名",
    "explanation": "风格说明（一句话解释这个网名的特点、适合什么场景和风格的人）"
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