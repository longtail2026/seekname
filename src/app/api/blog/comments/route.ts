/**
 * 博客评论 API
 * GET  /api/blog/comments?postId=123       - 获取评论列表
 * POST /api/blog/comments                  - 发布评论（需登录）
 * DELETE /api/blog/comments?id=123         - 删除评论（仅作者）
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

  try {
    // 查询一级评论
    const comments = await prisma.$queryRawUnsafe<any[]>`
      SELECT c.id, c.content, c.like_count, c.created_at,
             u.name as author_name, u.avatar as author_avatar, u.id as author_id,
             c.parent_id
       FROM blog_comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.post_id = ${parseInt(postId)} AND c.parent_id IS NULL
       ORDER BY c.created_at DESC
    `;

    // 查询所有子评论
    const replies = await prisma.$queryRawUnsafe<any[]>`
      SELECT c.id, c.content, c.like_count, c.created_at,
             u.name as author_name, u.avatar as author_avatar, u.id as author_id,
             c.parent_id
       FROM blog_comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.post_id = ${parseInt(postId)} AND c.parent_id IS NOT NULL
       ORDER BY c.created_at ASC
    `;

    // 构建树形结构
    const replyMap = new Map<number, any[]>();
    for (const r of replies) {
      if (!replyMap.has(r.parent_id)) replyMap.set(r.parent_id, []);
      replyMap.get(r.parent_id)!.push({ ...r, replies: [] });
    }

    const tree = comments.map((c) => ({
      ...c,
      replies: replyMap.get(c.id) || [],
    }));

    return NextResponse.json({ comments: tree });
  } catch (error) {
    console.warn("[Blog Comments GET]", error);
    return NextResponse.json({ comments: [] });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  try {
    const body = await req.json();
    const { post_id, content, parent_id } = body;

    if (!post_id || !content?.trim()) {
      return NextResponse.json({ error: "评论内容不能为空" }, { status: 400 });
    }

    const result = await prisma.$queryRaw<{ id: number }[]>`
      INSERT INTO blog_comments (post_id, user_id, content, parent_id)
      VALUES (${parseInt(post_id)}, ${userId}, ${content.trim()}, ${parent_id || null})
      RETURNING id
    `;

    // 更新文章评论数
    try {
      await prisma.$executeRaw`
        UPDATE blog_posts SET comment_count = comment_count + 1 WHERE id = ${parseInt(post_id)}
      `;
    } catch { /* 忽略 */ }

    return NextResponse.json({ id: result[0].id, message: "评论成功" });
  } catch (error) {
    console.error("[Blog Comments POST]", error);
    return NextResponse.json({ error: "评论失败" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺少评论ID" }, { status: 400 });

  try {
    // 验证是否为评论作者
    const comment = await prisma.$queryRawUnsafe<any[]>`
      SELECT id, post_id, user_id FROM blog_comments WHERE id = ${parseInt(id)}
    `;
    if (!comment || comment.length === 0) {
      return NextResponse.json({ error: "评论不存在" }, { status: 404 });
    }
    if (comment[0].user_id !== userId) {
      return NextResponse.json({ error: "无权限删除" }, { status: 403 });
    }

    await prisma.$executeRaw`
      DELETE FROM blog_comments WHERE id = ${parseInt(id)}
    `;

    // 更新文章评论数
    try {
      await prisma.$executeRaw`
        UPDATE blog_posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = ${comment[0].post_id}
      `;
    } catch { /* 忽略 */ }

    return NextResponse.json({ message: "删除成功" });
  } catch (error) {
    console.error("[Blog Comments DELETE]", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
