/**
 * 博客点赞 API
 * GET  /api/blog/like?postId=123        - 获取当前用户点赞/收藏状态
 * POST /api/blog/like                   - 切换点赞状态（需登录）
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const postId = searchParams.get("postId");
  if (!postId) return NextResponse.json({ error: "缺少 postId" }, { status: 400 });

  const userId = await getUserId(req);

  try {
    if (!userId) {
      return NextResponse.json({ liked: false, favorited: false });
    }

    const [like, favorite] = await Promise.all([
      prisma.$queryRaw<any[]>`SELECT 1 FROM blog_likes WHERE user_id = ${userId} AND target_type = 'post' AND target_id = ${parseInt(postId)} LIMIT 1`,
      prisma.$queryRaw<any[]>`SELECT 1 FROM blog_favorites WHERE user_id = ${userId} AND post_id = ${parseInt(postId)} LIMIT 1`,
    ]);

    return NextResponse.json({
      liked: like.length > 0,
      favorited: favorite.length > 0,
    });
  } catch (error) {
    console.warn("[Blog Like GET]", error);
    return NextResponse.json({ liked: false, favorited: false });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  try {
    const body = await req.json();
    const { target_type, target_id } = body;

    if (!target_type || !target_id) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 });
    }

    // 检查是否已点赞
    const existing = await prisma.$queryRaw<any[]>`
      SELECT id FROM blog_likes
      WHERE user_id = ${userId} AND target_type = ${target_type} AND target_id = ${parseInt(target_id)}
    `;

    const liked = existing.length > 0;

    if (liked) {
      // 取消点赞
      await prisma.$executeRaw`
        DELETE FROM blog_likes
        WHERE user_id = ${userId} AND target_type = ${target_type} AND target_id = ${parseInt(target_id)}
      `;
      // 减少点赞数
      if (target_type === "post") {
        await prisma.$executeRaw`
          UPDATE blog_posts SET like_count = GREATEST(0, like_count - 1) WHERE id = ${parseInt(target_id)}
        `;
      }
    } else {
      // 添加点赞
      await prisma.$executeRaw`
        INSERT INTO blog_likes (user_id, target_type, target_id)
        VALUES (${userId}, ${target_type}, ${parseInt(target_id)})
        ON CONFLICT DO NOTHING
      `;
      // 增加点赞数
      if (target_type === "post") {
        await prisma.$executeRaw`
          UPDATE blog_posts SET like_count = like_count + 1 WHERE id = ${parseInt(target_id)}
        `;
      }
    }

    return NextResponse.json({ liked: !liked });
  } catch (error) {
    console.error("[Blog Like POST]", error);
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}
