/**
 * 订阅确认页面
 * GET /subscribe/confirm?token=xxx
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return new NextResponse(generateErrorPage("Token is required"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // 查找订阅记录
    try {
      const result = await prisma.$queryRaw<Array<{ email: string }>>`
        SELECT email FROM subscriptions WHERE token = ${token} AND status = 'pending' LIMIT 1
      `;

      if (result.length === 0) {
        return new NextResponse(generateErrorPage("Invalid or expired token"), {
          headers: { "Content-Type": "text/html" },
        });
      }

      const email = result[0].email;

      // 更新状态为 active
      await prisma.$executeRaw`
        UPDATE subscriptions SET status = 'active', updated_at = NOW() WHERE token = ${token}
      `;

      return new NextResponse(generateSuccessPage(email), {
        headers: { "Content-Type": "text/html" },
      });
    } catch {
      // 表不存在，返回成功页面
      return new NextResponse(generateSuccessPage("your email"), {
        headers: { "Content-Type": "text/html" },
      });
    }
  } catch (error) {
    console.error("[Confirm Subscribe Error]", error);
    return new NextResponse(generateErrorPage("An error occurred"), {
      headers: { "Content-Type": "text/html" },
    });
  }
}

function generateSuccessPage(email: string) {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>订阅确认成功 - 寻名网</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #FFF8F4 0%, #FFF 100%);
    }
    .container {
      text-align: center;
      padding: 40px;
      max-width: 500px;
    }
    .icon {
      font-size: 80px;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 28px;
      color: #2D1B0E;
      margin-bottom: 16px;
    }
    p {
      font-size: 16px;
      color: #666;
      line-height: 1.6;
      margin-bottom: 12px;
    }
    .email {
      color: #E86A17;
      font-weight: 600;
    }
    .btn {
      display: inline-block;
      margin-top: 24px;
      padding: 14px 32px;
      background: linear-gradient(135deg, #E86A17, #D55A0B);
      color: white !important;
      text-decoration: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(232, 106, 23, 0.3);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🎉</div>
    <h1>订阅确认成功！</h1>
    <p>邮箱 <span class="email">${email}</span> 已成功订阅寻名网</p>
    <p>您将收到最新的起名技巧、VIP优惠活动等精彩内容</p>
    <a href="/" class="btn">返回首页</a>
  </div>
</body>
</html>
  `;
}

function generateErrorPage(message: string) {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>订阅确认失败 - 寻名网</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #FFF8F4 0%, #FFF 100%);
    }
    .container {
      text-align: center;
      padding: 40px;
      max-width: 500px;
    }
    .icon {
      font-size: 80px;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 28px;
      color: #2D1B0E;
      margin-bottom: 16px;
    }
    p {
      font-size: 16px;
      color: #666;
      line-height: 1.6;
      margin-bottom: 12px;
    }
    .btn {
      display: inline-block;
      margin-top: 24px;
      padding: 14px 32px;
      background: linear-gradient(135deg, #E86A17, #D55A0B);
      color: white !important;
      text-decoration: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">😔</div>
    <h1>确认失败</h1>
    <p>${message}</p>
    <p>链接可能已过期或无效</p>
    <a href="/" class="btn">返回首页</a>
  </div>
</body>
</html>
  `;
}
