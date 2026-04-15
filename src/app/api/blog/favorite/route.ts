/**
 * 收藏 API
 * POST /api/blog/favorite  - 收藏/取消收藏文章
 * Body: { post_id: number }
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "seekname_default_secret_change_in_production"
);

async function getUserId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get("token")?.value || req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.userId as string;
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { post_id } = await req.json();
  if (!post_id) return NextResponse.json({ error: "参数错误" }, { status: 400 });

  try {
    const existing = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM blog_favorites WHERE user_id = ${userId} AND post_id = ${post_id}
    `;

    if (existing.length > 0) {
      await prisma.$executeRaw`
        DELETE FROM blog_favorites WHERE user_id = ${userId} AND post_id = ${post_id}
      `;
      await prisma.$executeRaw`
        UPDATE blog_posts SET favorite_count = GREATEST(0, favorite_count - 1) WHERE id = ${post_id}
      `;
      return NextResponse.json({ favorited: false });
    } else {
      await prisma.$executeRaw`
        INSERT INTO blog_favorites (user_id, post_id) VALUES (${userId}, ${post_id})
        ON CONFLICT DO NOTHING
      `;
      await prisma.$executeRaw`
        UPDATE blog_posts SET favorite_count = favorite_count + 1 WHERE id = ${post_id}
      `;
      return NextResponse.json({ favorited: true });
    }
  } catch (error) {
    console.error("[Blog Favorite]", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
