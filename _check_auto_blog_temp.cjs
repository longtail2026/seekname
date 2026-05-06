const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. 检查自动发文配置
  const config = await prisma.autoBlogConfig.findFirst();
  console.log('===== 自动发文配置 =====');
  if (config) {
    console.log(JSON.stringify({
      isEnabled: config.isEnabled,
      frequency: config.frequency,
      requireReview: config.requireReview,
      lastRunTime: config.lastRunTime,
      lastRunStatus: config.lastRunStatus,
      defaultCategory: config.defaultCategory,
      writingStyle: config.writingStyle
    }, null, 2));
  } else {
    console.log('未找到配置');
  }

  // 2. 博客文章统计
  const totalPosts = await prisma.blogPost.count();
  const autoPosts = await prisma.blogPost.count({ where: { source: 'auto_blog' } });
  console.log('\n===== 博客统计 =====');
  console.log(JSON.stringify({ totalPosts, autoPosts }, null, 2));

  // 3. 最近文章
  const recentPosts = await prisma.blogPost.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, title: true, status: true, source: true, createdAt: true } });
  console.log('\n===== 最近5篇文章 =====');
  recentPosts.forEach((p, i) => console.log((i+1) + '. [' + p.status + '] ' + p.title + ' | 来源:' + (p.source||'-') + ' | ' + p.createdAt));

  // 4. 自动发文日志
  const logs = await prisma.autoBlogLog.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
  console.log('\n===== 执行日志 =====');
  if (logs.length === 0) console.log('无日志记录');
  else logs.forEach((l, i) => {
    console.log((i+1) + '. [' + l.status + '] ' + (l.sourceTitle||l.sourceUrl) + ' | ' + (l.duration||'-') + '秒 | ' + l.createdAt);
    if (l.errorMsg) console.log('   错误:', l.errorMsg);
  });
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());