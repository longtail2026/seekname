/**
 * 单篇文章详情 API
 * GET /api/blog/posts/[id]
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // 尝试从数据库查询
    const postId = parseInt(id);
    if (isNaN(postId)) {
      return NextResponse.json({ error: "无效的文章ID" }, { status: 400 });
    }

    const post = await prisma.$queryRaw<any[]>`
      SELECT bp.id, bp.title, bp.slug, bp.summary, bp.content, bp.cover_image,
             bp.view_count, bp.like_count, bp.comment_count, bp.favorite_count,
             bp.created_at, bp.updated_at,
             u.name as author_name, u.avatar as author_avatar, u.id as author_id,
             COALESCE(
               (SELECT json_agg(bt.name) FROM blog_post_tags bpt
                JOIN blog_tags bt ON bt.id = bpt.tag_id
                WHERE bpt.post_id = bp.id), '[]'
             ) as tags
       FROM blog_posts bp
       JOIN users u ON u.id = bp.user_id
       WHERE bp.id = ${postId}
    `;

    if (!post || post.length === 0) {
      return NextResponse.json({ error: "文章不存在" }, { status: 404 });
    }

    // 增加阅读量
    try {
      await prisma.$executeRaw`
        UPDATE blog_posts SET view_count = view_count + 1 WHERE id = ${postId}
      `;
    } catch { /* 忽略阅读量更新失败 */ }

    return NextResponse.json(post[0]);
  } catch (error) {
    console.warn("[Blog Post GET] 数据库不可用:", error);
    // 种子数据兜底（不含 content，在 SEED_POSTS_FULL 中提供）
    return NextResponse.json({ error: "文章不存在" }, { status: 404 });
  }
}
