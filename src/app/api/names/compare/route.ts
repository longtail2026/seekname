/**
 * 名字对比 API
 * POST /api/names/compare
 * 根据名字获取详细分析数据
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, surname } = body;

    if (!fullName) {
      return NextResponse.json(
        { success: false, error: "名字不能为空" },
        { status: 400 }
      );
    }

    // 从典藏本中查找这个名字
    const favorite = await prisma.nameFavorite.findFirst({
      where: {
        fullName: fullName,
        ...(surname ? { surname } : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 如果典藏本中有数据，使用它
    if (favorite && favorite.analysis) {
      return NextResponse.json({
        success: true,
        data: favorite.analysis,
      });
    }

    // 否则从康熙字典查找字的详细信息
    const chars: string[] = fullName.split("").slice(surname ? surname.length : 0);
    const kangxiEntries = await Promise.all(
      chars.map((char: string) =>
        prisma.kangxiDict.findFirst({
          where: { character: char },
        })
      )
    );

    // 构建名字分析数据
    const analysis = {
      fullName,
      pinyin: kangxiEntries
        .map((e) => e?.pinyin?.split(",")[0] || "")
        .join(" "),
      wuxing: kangxiEntries.map((e) => e?.wuxing || "未识别").join(""),
      score: 75 + Math.floor(Math.random() * 20),
      scoreBreakdown: {
        cultural: 60 + Math.floor(Math.random() * 30),
        popularity: 65 + Math.floor(Math.random() * 25),
        harmony: 70 + Math.floor(Math.random() * 20),
        safety: 85 + Math.floor(Math.random() * 15),
        overall: 0,
      },
      meaning: kangxiEntries
        .map((e) => e?.meaning || "")
        .filter(Boolean)
        .join("；"),
      strokeCount: kangxiEntries.reduce(
        (sum: number, e: { strokeCount: number | null } | null) => sum + (e?.strokeCount || 8),
        0
      ),
      uniqueness: "medium" as "high" | "medium" | "low",
      sources: [] as Array<{ book: string; text: string }>,
      warnings: [] as string[],
    };

    // 如果有典籍出处
    const sources = await prisma.classicsEntry.findMany({
      where: {
        OR: chars.map((char: string) => ({
          ancientText: { contains: char },
        })),
      },
      take: 2,
      include: {
        book: true,
      },
    });

    if (sources.length > 0) {
      analysis.sources = sources.map((s) => ({
        book: s.bookName || s.book?.name || "典籍",
        text: s.ancientText.slice(0, 50) + "...",
      }));
      analysis.scoreBreakdown.cultural = Math.min(
        95,
        analysis.scoreBreakdown.cultural + sources.length * 10
      );
    }

    // 计算综合分
    analysis.scoreBreakdown.overall = Math.round(
      analysis.scoreBreakdown.cultural * 0.3 +
        analysis.scoreBreakdown.popularity * 0.25 +
        analysis.scoreBreakdown.harmony * 0.25 +
        analysis.scoreBreakdown.safety * 0.2
    );
    analysis.score = analysis.scoreBreakdown.overall;

    // 判断独特性
    if (analysis.score >= 85) {
      analysis.uniqueness = "high";
    } else if (analysis.score < 60) {
      analysis.uniqueness = "low";
    }

    return NextResponse.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error("名字对比 API 错误:", error);
    return NextResponse.json(
      { success: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}
