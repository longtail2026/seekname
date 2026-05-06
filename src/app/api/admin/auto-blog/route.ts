import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getConfig, pickTopic, aiRewrite, publishPost } from "@/lib/auto-blog-core";

// 获取自动发文配置
export async function GET() {
  try {
    let config = await prisma.autoBlogConfig.findFirst();
    if (!config) {
      config = await prisma.autoBlogConfig.create({
        data: {
          isEnabled: true,
          frequency: "daily",
      crawlKeywords: [
        "英文名大全",
        "男生英文名",
        "女生英文名",
        "宝宝起名禁忌",
        "好听不重名的名字",
        "公司起名规则",
        "工商核名技巧",
        "跨境电商品牌名怎么取",
        "外国人中文名怎么起",
        "艺名主播名笔名技巧",
        "姓氏起源",
        "名字寓意",
        "名字文化",
        "好名字测试",
        "名字打分因素",
      ],
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
      // 即使引擎关闭，手动触发也允许执行（但记录时注明）
      console.log("[Manual] 引擎当前关闭，手动触发强制执行");
    }

    // 2. 选话题（如果传了 keyword 则优先匹配）
    const searchKeywords = keyword ? [keyword] : (config?.crawlKeywords || ["起名"]);
    const topic = pickTopic(searchKeywords);
    console.log(`[Manual] 话题: ${topic.title}`);

    // 3. AI 改写
    console.log("[Manual] AI 改写中...");
    const rewritten = await aiRewrite(
      topic.content,
      config?.writingStyle || "formal",
      config?.defaultCategory || "起名知识"
    );
    console.log(`[Manual] 改写完成: ${rewritten.title}`);

    // 4. 发布文章
    console.log("[Manual] 发布中...");
    const post = await publishPost({
      title: rewritten.title,
      content: rewritten.content,
      category: config?.defaultCategory || "起名知识",
      keywords: rewritten.keywords || [],
      sourceUrl: `manual:${topicLabel}`,
    }, config?.requireReview !== false);

    const duration = Math.round((Date.now() - startTime) / 1000);
    const postId = post.post?.id || post.id;
    console.log(`[Manual] 发布成功! ID: ${postId}, 耗时: ${duration}s`);

    // 5. 写日志（直接入库）
    await prisma.autoBlogLog.create({
      data: {
        sourceUrl: `manual:${topicLabel}`,
        sourceTitle: `手动触发-${topicLabel}`,
        status: "success",
        duration,
        postId: postId ? parseInt(String(postId), 10) : null,
      },
    });

    return NextResponse.json({
      success: true,
      postId,
      title: rewritten.title,
      message: `文章已成功发布（${config?.requireReview !== false ? "待审核" : "已发布"}）`,
    });
  } catch (error: any) {
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.error("[Manual] 触发失败:", error.message);

    // 写失败日志
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
