/**
 * 点赞 API
 * POST   /api/blog/like  - 点赞/取消点赞
 * Body: { target_type: 'post'|'comment', target_id: number }
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

  const { target_type, target_id } = await req.json();
  if (!["post", "comment"].includes(target_type) || !target_id) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  try {
    // 检查是否已点赞
    const existing = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM blog_likes
      WHERE user_id = ${userId} AND target_type = ${target_type} AND target_id = ${target_id}
    `;

    if (existing.length > 0) {
      // 取消点赞
      await prisma.$executeRaw`
        DELETE FROM blog_likes
        WHERE user_id = ${userId} AND target_type = ${target_type} AND target_id = ${target_id}
      `;
      if (target_type === "post") {
        await prisma.$executeRaw`
          UPDATE blog_posts SET like_count = GREATEST(0, like_count - 1) WHERE id = ${target_id}
        `;
      } else {
        await prisma.$executeRaw`
          UPDATE blog_comments SET like_count = GREATEST(0, like_count - 1) WHERE id = ${target_id}
        `;
      }
      return NextResponse.json({ liked: false });
    } else {
      // 点赞
      await prisma.$executeRaw`
        INSERT INTO blog_likes (user_id, target_type, target_id) VALUES (${userId}, ${target_type}, ${target_id})
        ON CONFLICT DO NOTHING
      `;
      if (target_type === "post") {
        await prisma.$executeRaw`UPDATE blog_posts SET like_count = like_count + 1 WHERE id = ${target_id}`;
      } else {
        await prisma.$executeRaw`UPDATE blog_comments SET like_count = like_count + 1 WHERE id = ${target_id}`;
      }
      return NextResponse.json({ liked: true });
    }
  } catch (error) {
    console.error("[Blog Like]", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}

// 查询当前用户对某文章的点赞/收藏状态
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  const { searchParams } = new URL(req.url);
  const postId = parseInt(searchParams.get("postId") || "0");

  if (!postId) return NextResponse.json({ liked: false, favorited: false });

  if (!userId) return NextResponse.json({ liked: false, favorited: false });

  const liked = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id FROM blog_likes WHERE user_id = ${userId} AND target_type = 'post' AND target_id = ${postId}
  `;
  const favorited = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id FROM blog_favorites WHERE user_id = ${userId} AND post_id = ${postId}
  `;

  return NextResponse.json({ liked: liked.length > 0, favorited: favorited.length > 0 });
}
