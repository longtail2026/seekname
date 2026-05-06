import { NextResponse } from "next/server";
import { getConfig, pickTopic, aiRewrite, publishPost, saveLog } from "@/lib/auto-blog-core";

/**
 * Vercel Cron Job 入口 - 每天 8:00 (UTC) 触发
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

    // 2. 爬取文章（从话题池）
    const keywords = config.crawlKeywords?.length ? config.crawlKeywords : ["起名"];
    const topic = pickTopic(keywords);
    console.log(`[Cron] 话题: ${topic.title}`);

    // 3. AI 改写
    console.log("[Cron] AI 改写中...");
    const rewritten = await aiRewrite(topic.content, config.writingStyle || "formal", config.defaultCategory || "起名知识");
    console.log(`[Cron] 改写完成: ${rewritten.title}`);

    // 4. 发布
    console.log("[Cron] 发布中...");
    const post = await publishPost({
      title: rewritten.title,
      content: rewritten.content,
      category: config.defaultCategory || "起名知识",
      keywords: rewritten.keywords || [],
      sourceUrl: `https://example.com/${encodeURIComponent(topic.category)}`,
    }, config.requireReview !== false);

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`[Cron] 发布成功! ID: ${post.post?.id || post.id}, 耗时: ${duration}s`);

    // 5. 记录日志
    await saveLog({
      sourceUrl: `https://example.com/${encodeURIComponent(topic.category)}`,
      sourceTitle: topic.title,
      status: "success",
      duration,
      postId: post.post?.id || post.id,
    }).catch(() => {});

    return NextResponse.json({ success: true, postId: post.post?.id || post.id, duration });
  } catch (error: any) {
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.error(`[Cron] 失败: ${error.message}`);

    await saveLog({
      sourceUrl: "", sourceTitle: "", status: "failed", duration, errorMsg: error.message,
    }).catch(() => {});

    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}