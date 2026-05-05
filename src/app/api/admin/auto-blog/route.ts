import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// 获取自动发文配置
export async function GET() {
  try {
    let config = await prisma.autoBlogConfig.findFirst();
    if (!config) {
      config = await prisma.autoBlogConfig.create({
        data: {
          isEnabled: false,
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

// 更新自动发文配置
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { isEnabled, frequency, crawlKeywords, requireReview, defaultCategory, writingStyle } = body;

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

// 手动触发一次爬取+改写
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { keyword } = body;

    // 记录开始
    const log = await prisma.autoBlogLog.create({
      data: {
        sourceUrl: `manual:${keyword || "起名"}`,
        sourceTitle: `手动触发-${keyword || "起名"}`,
        status: "pending",
      },
    });

    // 这里调用 DeepSeek 或外部爬虫进行抓取 + 改写
    // TODO: 实际接入爬虫 + AI 改写逻辑
    // 现在先模拟成功
    await prisma.autoBlogLog.update({
      where: { id: log.id },
      data: {
        status: "success",
        duration: 0,
      },
    });

    return NextResponse.json({ success: true, logId: log.id, message: "任务已提交，正在后台执行（需接入爬虫+AI逻辑）" });
  } catch (error) {
    console.error("Auto blog trigger error:", error);
    return NextResponse.json({ error: "触发失败" }, { status: 500 });
  }
}