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

    // Token 格式: base64(nameId:randomKey) 简化处理
    // 这里直接用 token 字段查询（假设 shareToken 存在 names 表）
    // 实际项目中可以设计更复杂的 token 体系

    // 暂时通过 nameId 查询（token 即 nameId），后续扩展为独立 shareToken
    const name = await prisma.names.findFirst({
      where: {
        OR: [
          { id: token },
          { shareToken: token },
        ],
      },
      select: {
        id: true,
        name: true,
        pinyin: true,
        gender: true,
        surname: true,
        score: true,
        wuxing: true,
        strokes: true,
        meaning: true,
        classicSource: true,
        classicQuote: true,
        uniqueness: true,
        popularity: true,
        category: true,
        createdAt: true,
        // 不暴露 userId
      },
    });

    if (!name) {
      return NextResponse.json(
        { error: "分享链接已失效或名字不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ name });
  } catch (error) {
    console.error("[Share API Error]", error);
    return NextResponse.json(
      { error: "服务器错误，请稍后重试" },
      { status: 500 }
    );
  }
}
