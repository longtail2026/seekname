import { NextResponse } from "next/server";
import { execSync } from "child_process";
import path from "path";

/**
 * Vercel Cron Job 入口
 * 每天 8:00 (北京时间) 触发自动爬取+发文
 * 配置在 vercel.json crons 中
 */
export async function GET() {
  try {
    console.log("[Cron] Auto-blog cron job triggered");

    // 执行爬虫脚本
    const scriptPath = path.join(process.cwd(), "scripts", "auto_blog_cron.mjs");
    const output = execSync(`node ${scriptPath}`, {
      encoding: "utf-8",
      timeout: 120_000, // 2分钟超时
    });

    console.log("[Cron] Script output:", output);

    // 从输出中提取结果
    const resultMatch = output.match(/执行结果:\s*(\{.*\})/s);
    let result = null;
    if (resultMatch) {
      try {
        result = JSON.parse(resultMatch[1]);
      } catch {}
    }

    return NextResponse.json({
      success: true,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Cron] Auto-blog failed:", error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}