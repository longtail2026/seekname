import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setDate(todayEnd.getDate() + 1);

    // 并行查询统计数据
    const [
      todayUsers,
      todayNameRecords,
      todayBlogViews,
      pendingComments,
      totalUsers,
      totalPosts,
      autoBlogConfig,
    ] = await Promise.all([
      // 今日注册用户
      prisma.user.count({
        where: {
          createdAt: { gte: today, lt: todayEnd },
        },
      }),
      // 今日起名次数
      prisma.nameRecord.count({
        where: {
          createdAt: { gte: today, lt: todayEnd },
        },
      }),
      // 今日博客访问量（通过创建时间估算）
      prisma.blogPost.aggregate({
        _sum: { viewCount: true },
        where: {
          createdAt: { gte: today, lt: todayEnd },
        },
      }),
      // 待审核评论
      prisma.blogComment.count({
        where: { status: "pending" },
      }),
      // 总用户数
      prisma.user.count(),
      // 总文章数
      prisma.blogPost.count({
        where: { status: "published" },
      }),
      // 自动发文配置
      prisma.autoBlogConfig.findFirst(),
    ]);

    // 最近5篇评论
    const recentComments = await prisma.blogComment.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        content: true,
        status: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
        post: { select: { title: true } },
      },
    });

    // 最近5次发文日志
    const recentLogs = await prisma.autoBlogLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return NextResponse.json({
      todayUsers,
      todayNameRecords,
      todayBlogViews: todayBlogViews._sum.viewCount || 0,
      pendingComments,
      totalUsers,
      totalPosts,
      autoBlogLastRun: autoBlogConfig?.lastRunTime || null,
      autoBlogEnabled: autoBlogConfig?.isEnabled ?? false,
      recentComments,
      recentLogs,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "获取数据失败" }, { status: 500 });
  }
}