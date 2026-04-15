/**
 * 单篇文章 API
 * GET    /api/blog/posts/[id]  - 文章详情
 * PUT    /api/blog/posts/[id]  - 编辑文章（仅作者）
 * DELETE /api/blog/posts/[id]  - 删除文章（仅作者）
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
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "无效的文章ID" }, { status: 400 });

  try {
    // 增加阅读量
    await prisma.$executeRaw`UPDATE blog_posts SET view_count = view_count + 1 WHERE id = ${id}`;

    const posts = await prisma.$queryRaw<any[]>`
      SELECT bp.id, bp.title, bp.slug, bp.summary, bp.content, bp.cover_image,
             bp.view_count, bp.like_count, bp.comment_count, bp.favorite_count,
             bp.created_at, bp.updated_at, bp.status,
             u.name as author_name, u.avatar as author_avatar, u.id as author_id,
             COALESCE(
               (SELECT json_agg(bt.name) FROM blog_post_tags bpt
                JOIN blog_tags bt ON bt.id = bpt.tag_id
                WHERE bpt.post_id = bp.id), '[]'
             ) as tags
      FROM blog_posts bp
      JOIN users u ON u.id = bp.user_id
      WHERE bp.id = ${id}
    `;

    if (!posts.length) return NextResponse.json({ error: "文章不存在" }, { status: 404 });

    return NextResponse.json(posts[0]);
  } catch (error) {
    console.error("[Blog Post GET]", error);
    return NextResponse.json({ error: "获取文章失败" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const id = parseInt(params.id);
  try {
    const body = await req.json();
    const { title, content, summary, cover_image, status } = body;

    await prisma.$executeRaw`
      UPDATE blog_posts
      SET title = COALESCE(${title || null}, title),
          content = COALESCE(${content || null}, content),
          summary = COALESCE(${summary || null}, summary),
          cover_image = COALESCE(${cover_image || null}, cover_image),
          status = COALESCE(${status || null}, status),
          updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
    `;

    return NextResponse.json({ message: "更新成功" });
  } catch (error) {
    console.error("[Blog Post PUT]", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const id = parseInt(params.id);
  try {
    await prisma.$executeRaw`
      DELETE FROM blog_posts WHERE id = ${id} AND user_id = ${userId}
    `;
    return NextResponse.json({ message: "删除成功" });
  } catch (error) {
    console.error("[Blog Post DELETE]", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
