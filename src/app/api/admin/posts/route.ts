 import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // 如果传了 id，返回单条完整记录（含 content）
    const idParam = searchParams.get("id");
    if (idParam) {
      const id = parseInt(idParam, 10);
      if (!id) return NextResponse.json({ error: "无效ID" }, { status: 400 });

      const post = await prisma.blogPost.findUnique({
        where: { id },
      });
      if (!post) return NextResponse.json({ error: "文章不存在" }, { status: 404 });

      return NextResponse.json({ post });
    }

    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const category = searchParams.get("category") || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { summary: { contains: search } },
      ];
    }
    if (status) where.status = status;
    if (category) where.category = category;

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          content: true,           // ← 也返回 content，前端编辑时需要
          category: true,
          status: true,
          isPinned: true,
          coverImage: true,
          viewCount: true,
          source: true,
          sourceUrl: true,
          createdAt: true,
          user: { select: { id: true, name: true } },
          _count: { select: { comments: true } },
        },
      }),
      prisma.blogPost.count({ where }),
    ]);

    return NextResponse.json({ posts, total, page, pageSize });
  } catch (error) {
    console.error("Posts list error:", error);
    return NextResponse.json({ error: "获取文章列表失败" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title, summary, content, category, status, isPinned, coverImage } = body;

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (summary !== undefined) data.summary = summary;
    if (content !== undefined) data.content = content;
    if (category !== undefined) data.category = category;
    if (status !== undefined) data.status = status;
    if (isPinned !== undefined) data.isPinned = isPinned;
    if (coverImage !== undefined) data.coverImage = coverImage;

    // 更新slug如果标题变了
    if (title) {
      data.slug = title
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }

    const post = await prisma.blogPost.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, post });
  } catch (error) {
    console.error("Post update error:", error);
    return NextResponse.json({ error: "更新文章失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, summary, content, category, status = "draft", coverImage, userId, source, sourceUrl, tags } = body;

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
      .replace(/(^-|-$)/g, "") + "-" + Date.now();

    // 如果没有传 userId，从数据库查第一个用户作为作者
    let realUserId = userId;
    if (!realUserId) {
      const firstUser = await prisma.user.findFirst({
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      realUserId = firstUser?.id || "unknown";
    }

    const postData: any = {
      title,
      slug,
      summary,
      content,
      category,
      status,
      coverImage,
      userId: realUserId,
    };
    if (source !== undefined) postData.source = source;
    if (sourceUrl !== undefined) postData.sourceUrl = sourceUrl;

    const post = await prisma.blogPost.create({ data: postData });

    // 如果传了 tags，创建标签关联
    if (tags && Array.isArray(tags) && tags.length > 0) {
      for (const tagName of tags) {
        const tag = await prisma.blogTag.upsert({
          where: { name: tagName },
          update: { count: { increment: 1 } },
          create: {
            name: tagName,
            slug: tagName.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-"),
          },
        });
        await prisma.blogPostTag.create({
          data: { postId: post.id, tagId: tag.id },
        }).catch(() => {}); // 忽略重复
      }
    }

    return NextResponse.json({ success: true, post });
  } catch (error) {
    console.error("Post create error:", error);
    return NextResponse.json({ error: "创建文章失败" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get("id") || "0");
    if (!id) return NextResponse.json({ error: "缺少ID" }, { status: 400 });

    await prisma.blogPost.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Post delete error:", error);
    return NextResponse.json({ error: "删除文章失败" }, { status: 500 });
  }
}