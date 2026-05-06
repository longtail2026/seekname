const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // 1. 检查自动发文配置
  const config = await prisma.autoBlogConfig.findFirst();
  console.log("===== 自动发文配置 =====");
  if (config) {
    console.log(JSON.stringify({
      id: config.id,
      isEnabled: config.isEnabled,
      frequency: config.frequency,
      crawlKeywords: config.crawlKeywords,
      requireReview: config.requireReview,
      defaultCategory: config.defaultCategory,
      writingStyle: config.writingStyle,
      lastRunTime: config.lastRunTime,
      lastRunStatus: config.lastRunStatus,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    }, null, 2));
  } else {
    console.log("❌ 未找到自动发文配置记录");
  }

  // 2. 检查博客文章总数和来源
  const totalPosts = await prisma.blogPost.count();
  const autoPosts = await prisma.blogPost.count({ where: { source: "auto_blog" } });
  const publishedPosts = await prisma.blogPost.count({ where: { status: "published" } });
  console.log(`\n===== 博客文章统计 =====`);
  console.log(`文章总数: ${totalPosts}`);
  console.log(`自动发布文章: ${autoPosts}`);
  console.log(`已发布文章: ${publishedPosts}`);

  // 3. 查看最近10篇文章
  const recentPosts = await prisma.blogPost.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      title: true,
      status: true,
      source: true,
      category: true,
      createdAt: true,
    },
  });
  console.log(`\n===== 最近10篇文章 =====`);
  recentPosts.forEach((p, i) => {
    console.log(`${i+1}. [${p.status}] ${p.title} | 来源:${p.source || "未知"} | 分类:${p.category || "-"} | ${p.createdAt}`);
  });

  // 4. 查看自动发文日志
  const logs = await prisma.autoBlogLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  console.log(`\n===== 自动发文执行日志 (最近20条) =====`);
  if (logs.length === 0) {
    console.log("❌ 没有任何执行日志");
  } else {
    logs.forEach((log, i) => {
      console.log(`${i+1}. [${log.status}] ${log.sourceTitle || log.sourceUrl} | 耗时:${log.duration || "-"}秒 | ${log.createdAt}`);
      if (log.errorMsg) console.log(`   错误: ${log.errorMsg}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());