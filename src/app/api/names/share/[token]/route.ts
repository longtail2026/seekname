/**
 * GET /api/names/share/[token]
 * 通过分享 token 获取名字数据
 * Token 格式：nameId + 随机字符串，服务端无需验证签名
 * 接收人无需登录即可访问
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // 从典藏本查询（token 即 id）
    const favorite = await prisma.nameFavorite.findFirst({
      where: {
        OR: [
          { id: token },
        ],
      },
      select: {
        id: true,
        fullName: true,
        surname: true,
        gender: true,
        score: true,
        wuxing: true,
        analysis: true,
        createdAt: true,
      },
    });

    if (!favorite) {
      return NextResponse.json(
        { error: "分享链接已失效或名字不存在" },
        { status: 404 }
      );
    }

    // 从 analysis 中提取更多信息
    const analysis = favorite.analysis as any || {};

    return NextResponse.json({
      name: {
        id: favorite.id,
        fullName: favorite.fullName,
        surname: favorite.surname,
        gender: favorite.gender,
        score: favorite.score || analysis.score,
        wuxing: analysis.wuxing || favorite.wuxing || "未知",
        pinyin: analysis.pinyin || "",
        meaning: analysis.meaning || "",
        sources: analysis.sources || [],
        uniqueness: analysis.uniqueness || "medium",
        createdAt: favorite.createdAt,
      }
    });
  } catch (error) {
    console.error("[Share API Error]", error);
    return NextResponse.json(
      { error: "服务器错误，请稍后重试" },
      { status: 500 }
    );
  }
}
