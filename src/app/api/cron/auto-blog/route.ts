import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getConfig, pickTopic, aiRewrite } from "@/lib/auto-blog-core";

// 创建一个文章并返回
async function createPost(postData: any, requireReview: boolean) {
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

/**
 * Vercel Cron Job 入口 - 每天 16:00 (CST，即 8:00 UTC) 触发
 */
export async function GET() {
  const startTime = Date.now();
  console.log(`[Cron] Auto-blog start: ${new Date().toISOString()}`);

  try {
    // 1. 获取配置
    const config = await getConfig();
    if (!config.isEnabled) {
      console.log("[Cron] 引擎已关闭");
      return NextResponse.json({ status: "skipped", message: "引擎已关闭" });
    }

    // 2. 选话题
    const keywords = config.crawlKeywords?.length ? config.crawlKeywords : ["起名"];
    const topic = pickTopic(keywords);
    console.log(`[Cron] 话题: ${topic.title}`);

    // 3. AI 改写
    console.log("[Cron] AI 改写中...");
    const rewritten = await aiRewrite(topic.content, config.writingStyle || "formal", config.defaultCategory || "起名知识");
    console.log(`[Cron] 改写完成: ${rewritten.title}`);

    // 4. 直接 Prisma 发布（避免 HTTP 自调用）
    console.log("[Cron] 发布中...");
    const post = await createPost({
      title: rewritten.title,
      content: rewritten.content,
      category: config.defaultCategory || "起名知识",
      keywords: rewritten.keywords || [],
      sourceUrl: `cron:${encodeURIComponent(topic.category)}`,
    }, config.requireReview !== false);

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`[Cron] 发布成功! ID: ${post.id}, 耗时: ${duration}s`);

    // 5. 直接写日志
    await prisma.autoBlogLog.create({
      data: {
        sourceUrl: `cron:${encodeURIComponent(topic.category)}`,
        sourceTitle: topic.title,
        status: "success",
        duration,
        postId: post.id,
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, postId: post.id, duration });
  } catch (error: any) {
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.error(`[Cron] 失败: ${error.message}`);

    await prisma.autoBlogLog.create({
      data: {
        sourceUrl: "", sourceTitle: "", status: "failed", duration, errorMsg: error.message,
      },
    }).catch(() => {});

    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
