/**
 * 自动博客诊断脚本 v2 - 使用项目的 Prisma 实例方式
 * 直接调用 API 路由来检查状态（需要开发服务器运行中）
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

async function diagnose() {
  console.log(`[诊断] API_BASE = ${API_BASE}`);
  console.log("");

  try {
    // 1. 检查自动发文配置
    console.log("===== 1. 自动发文配置 =====");
    const configRes = await fetch(`${API_BASE}/api/admin/auto-blog`);
    if (!configRes.ok) {
      console.log(`❌ 获取配置失败: HTTP ${configRes.status}`);
      // 尝试看看服务器是否在运行
      const homeRes = await fetch(API_BASE);
      console.log(`   首页响应: ${homeRes.status} ${homeRes.statusText}`);
      throw new Error(`无法获取配置: ${configRes.status}`);
    }
    const configData = await configRes.json();
    const config = configData.config;
    console.log(JSON.stringify({
      isEnabled: config.isEnabled,
      frequency: config.frequency,
      requireReview: config.requireReview,
      lastRunTime: config.lastRunTime,
      lastRunStatus: config.lastRunStatus,
      crawlKeywordsCount: (config.crawlKeywords || []).length,
      crawlKeywords: config.crawlKeywords?.slice(0, 3)?.join(", ") + (config.crawlKeywords?.length > 3 ? "..." : ""),
    }, null, 2));

    // 2. 博客统计
    console.log("\n===== 2. 博客文章统计 =====");
    const postsRes = await fetch(`${API_BASE}/api/admin/posts`);
    if (postsRes.ok) {
      const postsData = await postsRes.json();
      console.log(`总数: ${postsData.total || postsData.posts?.length || '?'}`);
      // 统计来源
      if (postsData.posts) {
        const autoCount = postsData.posts.filter(p => p.source === 'auto_blog').length;
        console.log(`自动来源: ${autoCount}`);
      }
    } else {
      console.log(`获取文章列表失败: HTTP ${postsRes.status}`);
    }

    // 3. 最近5篇文章
    console.log("\n===== 3. 最近5篇文章 =====");
    try {
      const recentRes = await fetch(`${API_BASE}/api/admin/posts?take=5`);
      if (recentRes.ok) {
        const recentData = await recentRes.json();
        const posts = recentData.posts || [];
        posts.forEach((p, i) => {
          console.log(`  ${i+1}. [${p.status}] ${p.title} | 来源:${p.source||'-'} | ${p.createdAt ? new Date(p.createdAt).toLocaleString() : '-'}`);
        });
      }
    } catch (e) {
      console.log(`  ❌ 获取最近文章失败: ${e.message}`);
    }

    // 4. 自动发文日志（从配置返回的日志中取）
    console.log("\n===== 4. 自动发文日志 =====");
    const logs = configData.logs || [];
    if (logs.length === 0) {
      console.log("  ❌ 无日志记录");
    } else {
      logs.slice(0, 20).forEach((l, i) => {
        console.log(`  ${i+1}. [${l.status}] ${l.sourceTitle||l.sourceUrl} | ${l.duration||'-'}秒 | ${l.createdAt ? new Date(l.createdAt).toLocaleString() : '-'}`);
        if (l.errorMsg) console.log(`     错误: ${l.errorMsg}`);
      });
    }

    // 5. 分析问题
    console.log("\n===== 5. 问题分析 =====");
    if (!config.isEnabled) {
      console.log("🔴【关键问题】自动发文引擎处于【关闭】状态 (isEnabled=false)");
      console.log("   需要在后台管理页面打开开关，或通过 API 启用");
    } else {
      console.log("✅ 自动发文引擎已开启");
    }

    if (logs.length === 0) {
      console.log("🔴【关键问题】没有任何执行日志");
      console.log("   即使引擎关闭，手动触发也应该留下日志");
      console.log("   可能原因：从未触发过执行脚本");
    } else {
      const lastLog = logs[0];
      if (lastLog.status === "failed") {
        console.log(`🔴【关键问题】最近一次执行失败: ${lastLog.errorMsg || '未知错误'}`);
      } else if (lastLog.status === "success") {
        console.log(`✅ 最近一次执行成功 (${lastLog.createdAt})`);
      }
    }

    // 检查 cron 任务
    console.log("\n===== 6. 定时任务检查 =====");
    console.log("爬虫脚本路径: scripts/auto_blog_cron.mjs");
    console.log("该脚本需要通过 Vercel Cron Job 或系统定时任务触发");
    console.log("本地开发时需手动运行: node scripts/auto_blog_cron.mjs");
    console.log("注意: 脚本依赖 Next.js 开发服务器在 http://localhost:3000 运行");

    return config;
  } catch (error) {
    console.error(`\n❌ 诊断失败: ${error.message}`);
    console.log("");
    console.log("⚠️  请确保 Next.js 开发服务器正在运行 (npm run dev)");
    return null;
  }
}

diagnose().then(() => process.exit(0)).catch(() => process.exit(1));