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

// ─── 种子文章（数据库不可用时的兜底数据） ───────────────────────────────
const SEED_POSTS = [
  {
    id: 1,
    title: "五行取名：如何根据宝宝生辰八字选好字",
    slug: "wuxing-bazi-naming-guide",
    summary: "八字起名是中华传统文化的精髓，本文详解如何根据五行缺失来选择吉祥好字。",
    cover_image: "",
    view_count: 3842,
    like_count: 267,
    comment_count: 43,
    favorite_count: 189,
    created_at: "2026-04-10T08:00:00Z",
    author_name: "寻名君",
    author_avatar: "",
    author_id: "seed-user",
    tags: ["五行取名", "八字起名", "宝宝起名"],
  },
  {
    id: 2,
    title: "诗经女孩名字大全：300个出自诗经的好名字",
    slug: "shijing-girl-names-collection",
    summary: "蒹葭苍苍，白露为霜。诗经里的美名，为女孩取一个有诗意的名字。",
    cover_image: "",
    view_count: 5217,
    like_count: 412,
    comment_count: 88,
    favorite_count: 341,
    created_at: "2026-04-08T10:30:00Z",
    author_name: "寻名君",
    author_avatar: "",
    author_id: "seed-user",
    tags: ["诗词起名", "诗经", "女孩起名"],
  },
  {
    id: 3,
    title: "唐诗男孩名字：100个大气稳重的男孩名推荐",
    slug: "tangshi-boy-names-100",
    summary: "春风得意马蹄疾，一日看尽长安花。唐诗中藏着最适合男孩的名字。",
    cover_image: "",
    view_count: 4531,
    like_count: 328,
    comment_count: 56,
    favorite_count: 271,
    created_at: "2026-04-06T09:00:00Z",
    author_name: "寻名君",
    author_avatar: "",
    author_id: "seed-user",
    tags: ["诗词起名", "唐诗", "男孩起名"],
  },
  {
    id: 4,
    title: "2026年最火的宝宝名字TOP20趋势分析",
    slug: "2026-baby-name-trends-top20",
    summary: "从寻名网数据库分析2026年最受欢迎的宝宝名字趋势与文化解读。",
    cover_image: "",
    view_count: 7823,
    like_count: 591,
    comment_count: 134,
    favorite_count: 467,
    created_at: "2026-04-04T11:00:00Z",
    author_name: "寻名君",
    author_avatar: "",
    author_id: "seed-user",
    tags: ["名字测评", "起名趋势", "2026起名"],
  },
  {
    id: 5,
    title: "楚辞起名指南：如何用屈原的诗意给宝宝取名",
    slug: "chuci-poetry-naming-guide",
    summary: "路漫漫其修远兮，吾将上下而求索。楚辞中的豪情与浪漫，适合有抱负的宝宝。",
    cover_image: "",
    view_count: 2987,
    like_count: 223,
    comment_count: 37,
    favorite_count: 198,
    created_at: "2026-04-02T08:30:00Z",
    author_name: "寻名君",
    author_avatar: "",
    author_id: "seed-user",
    tags: ["诗词起名", "楚辞", "典故解析"],
  },
  {
    id: 6,
    title: "公司起名：如何取一个能注册的吉祥商号",
    slug: "company-naming-registration-guide",
    summary: "公司起名不仅是文化事，更涉及商标注册与品牌传播。本文教你避坑取好名。",
    cover_image: "",
    view_count: 6124,
    like_count: 487,
    comment_count: 72,
    favorite_count: 389,
    created_at: "2026-03-28T14:00:00Z",
    author_name: "寻名君",
    author_avatar: "",
    author_id: "seed-user",
    tags: ["起名心得", "公司起名", "商标注册"],
  },
];

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
      `SELECT COUNT(*) as count FROM blog_posts bp ${whereClause}` as string
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
       LIMIT ${pageSize} OFFSET ${offset}` as string
    );

    return NextResponse.json({ posts, total, page, pageSize });
  } catch (error) {
    console.warn("[Blog Posts GET] 数据库不可用，使用种子数据:", error);
    // 数据库不可用 → 使用种子文章兜底
    let posts = SEED_POSTS;
    if (keyword) {
      posts = posts.filter(
        (p) => p.title.includes(keyword) || p.summary.includes(keyword)
      );
    }
    if (tag) {
      posts = posts.filter((p) => p.tags.includes(tag));
    }
    const total = posts.length;
    const paginated = posts.slice(offset, offset + pageSize);
    return NextResponse.json({ posts: paginated, total, page, pageSize });
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
