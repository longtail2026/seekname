/**
 * 博客收藏 API
 * POST /api/blog/favorite  - 切换收藏状态（需登录）
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "seekname_default_secret_change_in_production"
);

async function getUserId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get("token")?.value
    || req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.userId as string;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  try {
    const body = await req.json();
    const { post_id } = body;

    if (!post_id) return NextResponse.json({ error: "缺少 post_id" }, { status: 400 });

    // 检查是否已收藏
    const existing = await prisma.$queryRaw<any[]>`
      SELECT id FROM blog_favorites WHERE user_id = ${userId} AND post_id = ${parseInt(post_id)}
    `;

    const favorited = existing.length > 0;

    if (favorited) {
      // 取消收藏
      await prisma.$executeRaw`
        DELETE FROM blog_favorites WHERE user_id = ${userId} AND post_id = ${parseInt(post_id)}
      `;
      await prisma.$executeRaw`
        UPDATE blog_posts SET favorite_count = GREATEST(0, favorite_count - 1) WHERE id = ${parseInt(post_id)}
      `;
    } else {
      // 添加收藏
      await prisma.$executeRaw`
        INSERT INTO blog_favorites (user_id, post_id)
        VALUES (${userId}, ${parseInt(post_id)})
        ON CONFLICT DO NOTHING
      `;
      await prisma.$executeRaw`
        UPDATE blog_posts SET favorite_count = favorite_count + 1 WHERE id = ${parseInt(post_id)}
      `;
    }

    return NextResponse.json({ favorited: !favorited });
  } catch (error) {
    console.error("[Blog Favorite POST]", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
