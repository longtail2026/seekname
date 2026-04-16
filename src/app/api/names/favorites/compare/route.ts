/**
 * 获取典藏名字的对比数据
 * 用于名字对比页面的详细分析
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
    }

    const { fullName } = await request.json();

    if (!fullName) {
      return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 });
    }

    // 从典藏本获取名字数据
    const favorite = await prisma.nameFavorite.findFirst({
      where: {
        userId: payload.userId,
        fullName,
      },
    });

    if (!favorite) {
      return NextResponse.json({
        success: false,
        error: "名字不在典藏本中",
      }, { status: 404 });
    }

    // 构建对比数据
    const analysis = favorite.analysis as Record<string, unknown> | null;

    const compareData = {
      fullName: favorite.fullName,
      surname: favorite.surname,
      gender: favorite.gender,
      score: favorite.score || 0,
      wuxing: favorite.wuxing || [],
      meaning: (analysis?.meaning as string) || "",
      sources: (analysis?.sources as Array<{ book: string; text: string }>) || [],
      warnings: (analysis?.warnings as string[]) || [],
      strokeCount: (analysis?.strokeCount as number) || 0,
      uniqueness: (analysis?.uniqueness as "high" | "medium" | "low") || "medium",
      scoreBreakdown: {
        cultural: (analysis?.culturalScore as number) || 80,
        popularity: (analysis?.popularityScore as number) || 80,
        harmony: (analysis?.harmonyScore as number) || 80,
        safety: (analysis?.safetyScore as number) || 80,
        overall: favorite.score || 80,
      },
      pinyin: (analysis?.pinyin as string) || "",
      classicSource: (analysis?.classicSource as string) || "",
    };

    return NextResponse.json({
      success: true,
      data: compareData,
    });
  } catch (error) {
    console.error("[Compare API Error]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
