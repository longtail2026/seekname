/**
 * 博客文章 API
 * GET  /api/blog/posts  - 文章列表（支持分页、标签筛选、搜索）
 * POST /api/blog/posts  - 发表新文章（需登录）
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

// 生成 slug
function makeSlug(title: string): string {
  const pinyin = title.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").toLowerCase();
  return `${pinyin}-${Date.now()}`.slice(0, 200);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "10");
  const tag = searchParams.get("tag") || "";
  const keyword = searchParams.get("keyword") || "";
  const userId = searchParams.get("userId") || "";

  const offset = (page - 1) * pageSize;

  try {
    let whereClause = `WHERE bp.status = 'published'`;
    const params: (string | number)[] = [];
    let paramIdx = 1;

    if (keyword) {
      whereClause += ` AND (bp.title ILIKE $${paramIdx} OR bp.summary ILIKE $${paramIdx})`;
      params.push(`%${keyword}%`);
      paramIdx++;
    }
    if (userId) {
      whereClause += ` AND bp.user_id = $${paramIdx}`;
      params.push(userId);
      paramIdx++;
    }
    if (tag) {
      whereClause += ` AND EXISTS (
        SELECT 1 FROM blog_post_tags bpt
        JOIN blog_tags bt ON bt.id = bpt.tag_id
        WHERE bpt.post_id = bp.id AND bt.name = $${paramIdx}
      )`;
      params.push(tag);
      paramIdx++;
    }

    const countResult = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*) as count FROM blog_posts bp ${whereClause}`,
      ...params
    );
    const total = Number(countResult[0]?.count || 0);

    const posts = await prisma.$queryRawUnsafe<any[]>(
      `SELECT bp.id, bp.title, bp.slug, bp.summary, bp.cover_image,
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
       ${whereClause}
       ORDER BY bp.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      ...params, pageSize, offset
    );

    return NextResponse.json({ posts, total, page, pageSize });
  } catch (error) {
    console.error("[Blog Posts GET]", error);
    return NextResponse.json({ error: "获取文章列表失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, content, summary, cover_image, tags = [], status = "published" } = body;

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "标题和内容不能为空" }, { status: 400 });
    }

    const slug = makeSlug(title);

    // 创建文章
    const result = await prisma.$queryRaw<{ id: number }[]>`
      INSERT INTO blog_posts (user_id, title, slug, summary, content, cover_image, status)
      VALUES (${userId}, ${title.trim()}, ${slug}, ${summary || null}, ${content}, ${cover_image || null}, ${status})
      RETURNING id
    `;
    const postId = result[0].id;

    // 处理标签
    if (tags.length > 0) {
      for (const tagName of tags) {
        const tagResult = await prisma.$queryRaw<{ id: number }[]>`
          INSERT INTO blog_tags (name, count) VALUES (${tagName}, 1)
          ON CONFLICT (name) DO UPDATE SET count = blog_tags.count + 1
          RETURNING id
        `;
        await prisma.$executeRaw`
          INSERT INTO blog_post_tags (post_id, tag_id) VALUES (${postId}, ${tagResult[0].id})
          ON CONFLICT DO NOTHING
        `;
      }
    }

    return NextResponse.json({ id: postId, slug, message: "发布成功" });
  } catch (error) {
    console.error("[Blog Posts POST]", error);
    return NextResponse.json({ error: "发布失败" }, { status: 500 });
  }
}
