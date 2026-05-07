import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getConfig, pickTopic, aiRewrite, LONGTAIL_KEYWORD_POOL } from "@/lib/auto-blog-core";

// 获取自动发文配置
export async function GET() {
  try {
    let config = await prisma.autoBlogConfig.findFirst();
    if (!config) {
      const allKeywords = LONGTAIL_KEYWORD_POOL.flatMap(g => g.keywords);
      config = await prisma.autoBlogConfig.create({
        data: {
          isEnabled: true,
          frequency: "daily",
          crawlKeywords: allKeywords,
          requireReview: true,
          defaultCategory: "起名知识",
          writingStyle: "formal",
        },
      });
    }

    const logs = await prisma.autoBlogLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ config, logs });
  } catch (error) {
    console.error("Auto blog error:", error);
    return NextResponse.json({ error: "获取自动发文配置失败" }, { status: 500 });
  }
}

// 更新自动发文配置或保存日志
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { isEnabled, frequency, crawlKeywords, requireReview, defaultCategory, writingStyle, logEntry } = body;

    // 如果传的是日志条目，就保存到 auto_blog_logs 表
    if (logEntry) {
      const log = await prisma.autoBlogLog.create({
        data: {
          sourceUrl: logEntry.sourceUrl || "",
          sourceTitle: logEntry.sourceTitle || "",
          status: logEntry.status || "pending",
          duration: logEntry.duration || 0,
          errorMsg: logEntry.errorMsg || null,
          postId: logEntry.postId ? parseInt(logEntry.postId, 10) : null,
        },
      });
      return NextResponse.json({ success: true, log });
    }

    const config = await prisma.autoBlogConfig.findFirst();
    if (!config) {
      return NextResponse.json({ error: "请先初始化配置" }, { status: 400 });
    }

    const data: any = {};
    if (isEnabled !== undefined) data.isEnabled = isEnabled;
    if (frequency !== undefined) data.frequency = frequency;
    if (crawlKeywords !== undefined) data.crawlKeywords = crawlKeywords;
    if (requireReview !== undefined) data.requireReview = requireReview;
    if (defaultCategory !== undefined) data.defaultCategory = defaultCategory;
    if (writingStyle !== undefined) data.writingStyle = writingStyle;

    const updated = await prisma.autoBlogConfig.update({
      where: { id: config.id },
      data,
    });

    return NextResponse.json({ success: true, config: updated });
  } catch (error) {
    console.error("Auto blog update error:", error);
    return NextResponse.json({ error: "更新配置失败" }, { status: 500 });
  }
}

// 辅助：直接通过 Prisma 创建文章（避免 HTTP 自调用）
async function createPostDirectly(postData: any, requireReview: boolean) {
  const { title, content, category, keywords, sourceUrl } = postData;
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/(^-|-$)/g, "") + "-" + Date.now();

  const firstUser = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  const post = await prisma.blogPost.create({
    data: {
      title,
      slug,
      content,
      category,
      status: requireReview ? "draft" : "published",
      source: "auto_blog",
      sourceUrl,
      userId: firstUser?.id || "unknown",
    },
  });

  // 创建标签
  if (keywords && Array.isArray(keywords) && keywords.length > 0) {
    for (const tagName of keywords) {
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
      }).catch(() => {});
    }
  }

  return post;
}

// 手动触发一次完整的爬取+改写+发布
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const { keyword } = body;
    const topicLabel = keyword || "起名";

    // 1. 获取配置
    const config = await getConfig();
    if (!config || !config.isEnabled) {
      console.log("[Manual] 引擎当前关闭，手动触发强制执行");
    }

    // 2. 选话题
    const searchKeywords = keyword ? [keyword] : (config?.crawlKeywords || ["起名"]);
    const topic = await pickTopic(searchKeywords);
    console.log(`[Manual] 话题: ${topic.title}, 目标长尾关键词: ${topic.targetKeyword}`);

    // 3. AI 改写（传入目标长尾关键词）
    console.log("[Manual] AI 改写中...");
    const rewritten = await aiRewrite(
      topic.content,
      config?.writingStyle || "formal",
      topic.category || config?.defaultCategory || "起名知识",
      topic.targetKeyword
    );
    console.log(`[Manual] 改写完成: ${rewritten.title}`);

    // 4. 直接通过 Prisma 发布（避免 HTTP 自调用）
    console.log("[Manual] 发布中...");
    const post = await createPostDirectly({
      title: rewritten.title,
      content: rewritten.content,
      category: config?.defaultCategory || "起名知识",
      keywords: rewritten.keywords || [],
      sourceUrl: `manual:${topicLabel}`,
    }, config?.requireReview !== false);

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`[Manual] 发布成功! ID: ${post.id}, 耗时: ${duration}s`);

    // 5. 写日志
    await prisma.autoBlogLog.create({
      data: {
        sourceUrl: `manual:${topicLabel}`,
        sourceTitle: `手动触发-${topicLabel}`,
        status: "success",
        duration,
        postId: post.id,
      },
    });

    return NextResponse.json({
      success: true,
      postId: post.id,
      title: rewritten.title,
      message: `文章已成功发布（${config?.requireReview !== false ? "待审核" : "已发布"}）`,
    });
  } catch (error: any) {
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.error("[Manual] 触发失败:", error.message);

    await prisma.autoBlogLog.create({
      data: {
        sourceUrl: "manual:error",
        sourceTitle: "手动触发-失败",
        status: "failed",
        duration,
        errorMsg: error.message,
      },
    }).catch(() => {});

    return NextResponse.json({ error: `执行失败: ${error.message}` }, { status: 500 });
  }
}
