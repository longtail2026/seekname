/**
 * 统一商业起名生成 API
 * POST /api/business-name/generate
 *
 * 支持四种起名类型：
 * - company: 公司起名
 * - brand: 品牌起名
 * - shop: 店铺起名
 * - project: 项目起名
 */
import { NextRequest, NextResponse } from "next/server";
import { DeepSeekIntegration } from "@/lib/deepseek-integration";
import { PROMPT_TEMPLATES, CROSS_BORDER_EN_PROMPT } from "@/lib/business-name-data";
import type { BusinessNameType } from "@/lib/business-name-data";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, style } = body;

    // 类型校验
    const validTypes: BusinessNameType[] = ["company", "brand", "shop", "project"];
    const nameType: BusinessNameType = validTypes.includes(type) ? type : "company";

    /* ── 跨境电商英文名 特殊处理 ── */
    if (type === "cross-border-en") {
      if (!body.category || !body.market || !body.style || !Array.isArray(body.style) || body.style.length === 0) {
        return NextResponse.json(
          { success: false, message: "请填写必填信息（主营品类、目标市场、风格倾向）" },
          { status: 400 }
        );
      }

      if (!DeepSeekIntegration.isAvailable()) {
        return NextResponse.json(
          { success: false, message: "AI 服务未配置，请稍后重试" },
          { status: 503 }
        );
      }

      const systemPrompt = CROSS_BORDER_EN_PROMPT.system;
      const userPrompt = CROSS_BORDER_EN_PROMPT.user(body);

      const rawResult = await DeepSeekIntegration.callRaw(systemPrompt, userPrompt, 0.7, 4096);

      // 解析 JSON
      let trimmed = rawResult.trim();
      const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) trimmed = match[1].trim();

      let names: Array<{
        name: string;
        pronunciation: string;
        meaning: string;
        ecommerceFit: string;
        safety: string;
        recommendScore: string;
      }> = [];
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          names = parsed
            .filter((item: any) => item.name)
            .map((item: any) => ({
              name: item.name.trim(),
              pronunciation: item.pronunciation?.trim() || "",
              meaning: item.meaning?.trim() || "",
              ecommerceFit: item.ecommerceFit?.trim() || "高",
              safety: item.safety?.trim() || "✅安全无歧义",
              recommendScore: item.recommendScore?.trim() || "★★★★★",
            }));
        }
      } catch {
        console.warn(`[cross-border-en] JSON 解析失败:`, rawResult.slice(0, 200));
        return NextResponse.json(
          { success: false, message: "AI 返回结果格式异常，请重试" },
          { status: 500 }
        );
      }

      if (names.length === 0) {
        return NextResponse.json(
          { success: false, message: "AI 返回结果为空，请重试" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, data: names });
    }

    /* ── 原有商业起名流程 ── */
    const template = PROMPT_TEMPLATES[nameType];

    // 参数校验
    if (!body.industry || !body.business || !style || !Array.isArray(style) || style.length === 0) {
      return NextResponse.json(
        { success: false, message: "请填写必填信息（行业、主营业务、风格）" },
        { status: 400 }
      );
    }

    if (!DeepSeekIntegration.isAvailable()) {
      return NextResponse.json(
        { success: false, message: "AI 服务未配置，请稍后重试" },
        { status: 503 }
      );
    }

    const systemPrompt = template.system;
    const userPrompt = template.user(body);

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
      console.warn(`[business-name] JSON 解析失败，尝试文本行解析`);
      const lines = trimmed.split("\n").filter((l: string) => l.trim());
      for (const line of lines) {
        const parts = line.split(/[\s\-—–]+\s*/).filter(Boolean);
        if (parts.length >= 2) {
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
      console.error(`[business-name] 解析结果为空, raw:`, rawResult.slice(0, 200));
      return NextResponse.json(
        { success: false, message: "AI 返回结果格式异常", data: [] },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: names, type: nameType });
  } catch (error) {
    console.error("[API business-name/generate] 错误:", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误", data: [] },
      { status: 500 }
    );
  }
}