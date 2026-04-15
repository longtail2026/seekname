/**
 * 评论 API
 * GET  /api/blog/comments?postId=  - 获取评论列表
 * POST /api/blog/comments           - 发表评论
 * DELETE /api/blog/comments?id=     - 删除评论（仅作者）
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const postId = parseInt(searchParams.get("postId") || "0");
  if (!postId) return NextResponse.json({ error: "参数错误" }, { status: 400 });

  try {
    const comments = await prisma.$queryRaw<any[]>`
      SELECT bc.id, bc.content, bc.parent_id, bc.like_count, bc.created_at,
             u.name as author_name, u.avatar as author_avatar, u.id as author_id
      FROM blog_comments bc
      JOIN users u ON u.id = bc.user_id
      WHERE bc.post_id = ${postId}
      ORDER BY bc.created_at ASC
    `;

    // 组织成树形结构
    const map: Record<number, any> = {};
    const roots: any[] = [];
    comments.forEach((c) => {
      map[c.id] = { ...c, replies: [] };
    });
    comments.forEach((c) => {
      if (c.parent_id && map[c.parent_id]) {
        map[c.parent_id].replies.push(map[c.id]);
      } else {
        roots.push(map[c.id]);
      }
    });

    return NextResponse.json({ comments: roots });
  } catch (error) {
    console.error("[Blog Comments GET]", error);
    return NextResponse.json({ error: "获取评论失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { post_id, content, parent_id } = await req.json();
  if (!post_id || !content?.trim()) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  try {
    const result = await prisma.$queryRaw<{ id: number }[]>`
      INSERT INTO blog_comments (post_id, user_id, parent_id, content)
      VALUES (${post_id}, ${userId}, ${parent_id || null}, ${content.trim()})
      RETURNING id
    `;
    await prisma.$executeRaw`
      UPDATE blog_posts SET comment_count = comment_count + 1 WHERE id = ${post_id}
    `;
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
  const id = parseInt(searchParams.get("id") || "0");
  if (!id) return NextResponse.json({ error: "参数错误" }, { status: 400 });

  try {
    const comment = await prisma.$queryRaw<{ post_id: number }[]>`
      SELECT post_id FROM blog_comments WHERE id = ${id} AND user_id = ${userId}
    `;
    if (!comment.length) return NextResponse.json({ error: "无权删除" }, { status: 403 });

    await prisma.$executeRaw`DELETE FROM blog_comments WHERE id = ${id}`;
    await prisma.$executeRaw`
      UPDATE blog_posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = ${comment[0].post_id}
    `;
    return NextResponse.json({ message: "删除成功" });
  } catch (error) {
    console.error("[Blog Comments DELETE]", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
