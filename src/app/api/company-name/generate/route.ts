/**
 * 公司起名生成 API
 * POST /api/company-name/generate
 */
import { NextRequest, NextResponse } from "next/server";
import { DeepSeekIntegration } from "@/lib/deepseek-integration";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyType, region, industry, business, style, keywords, length: lengthPref, avoid } = body;

    // 参数校验
    if (!companyType || !region || !industry || !business || !style || !Array.isArray(style) || style.length === 0) {
      return NextResponse.json(
        { success: false, message: "请填写必填信息" },
        { status: 400 }
      );
    }

    if (!DeepSeekIntegration.isAvailable()) {
      return NextResponse.json(
        { success: false, message: "AI 服务未配置，请稍后重试" },
        { status: 503 }
      );
    }

    // 字数映射
    const lengthMap: Record<string, string> = {
      "2": "2个字",
      "3": "3个字",
      "4": "4个字（推荐，工商通过率最高）",
      "不限": "不限字数",
    };

    const systemPrompt = "你是专业工商起名顾问，擅长起【易通过核名、好听、大气、贴合行业、无侵权风险】的公司名字。";

    const userPrompt = `用户信息：
企业类型：${companyType}
注册地区：${region}
行业：${industry}
主营业务：${business}
风格：${style.join("、")}
${keywords ? `希望包含：${keywords}` : ""}
字数：${lengthMap[lengthPref] || "不限"}
${avoid ? `禁忌：${avoid}` : ""}

生成规则（必须严格遵守）：
1. 生成10个符合工商核名规则的公司名字
2. 不使用禁用词、敏感词、夸大词
3. 同地区同行业避免常见撞名
4. 2字通过率低，尽量多提供3-4字
5. 名字要现代、大气、有商业价值
6. 每个名字附带：寓意说明、行业匹配度、注册难度（低/中/高）

请以 JSON 数组格式输出，不要加 markdown 代码块包裹：
[
  {
    "name": "公司字号",
    "meaning": "寓意说明（一句话解释名字的含义和出处）",
    "industryMatch": "行业匹配度（高/中/低，判断与主营业的贴合程度）",
    "risk": "注册难度（低=4字不常见/中=3字/高=2字或含通用词）"
  }
]`;

    const rawResult = await DeepSeekIntegration.callRaw(systemPrompt, userPrompt, 0.7, 4096);

    // 解析 JSON
    let trimmed = rawResult.trim();
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) trimmed = match[1].trim();

    let names: Array<{ name: string; meaning: string; industryMatch: string; risk: string }> = [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        names = parsed
          .filter((item: any) => item.name)
          .map((item: any) => ({
            name: item.name.trim(),
            meaning: item.meaning?.trim() || "",
            industryMatch: item.industryMatch?.trim() || "中",
            risk: item.risk?.trim() || "中",
          }));
      }
    } catch {
      // JSON 解析失败，尝试 "序号. 字号 - 寓意 - 匹配度 - 难度" 格式
      console.warn("[company-name] JSON 解析失败，尝试文本行解析");
      const lines = trimmed.split("\n").filter((l) => l.trim());
      for (const line of lines) {
        const parts = line.split(/[\s\-—–]+\s*/).filter(Boolean);
        if (parts.length >= 2) {
          // 去掉序号前缀
          const namePart = parts[0].replace(/^\d+[\.\、]/, "").trim();
          if (namePart && namePart.length >= 2) {
            names.push({
              name: namePart,
              meaning: parts.slice(1).join(" ") || "",
              industryMatch: "中",
              risk: "中",
            });
          }
        }
      }
    }

    if (names.length === 0) {
      console.error("[company-name] 解析结果为空, raw:", rawResult.slice(0, 200));
      return NextResponse.json(
        { success: false, message: "AI 返回结果格式异常", data: [] },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: names });
  } catch (error) {
    console.error("[API company-name/generate] 错误:", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误", data: [] },
      { status: 500 }
    );
  }
}
