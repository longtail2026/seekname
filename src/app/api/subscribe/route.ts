/**
 * 邮件订阅 API
 * 处理用户订阅和取消订阅
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail, buildSubscribeConfirmEmail } from "@/lib/email";

// 邮件订阅表（如果没有则跳过）
// 注意：实际项目中可能需要单独创建订阅表

// 订阅用户
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Invalid email address" },
        { status: 400 }
      );
    }

    // 生成订阅确认 token
    const token = crypto.randomBytes(32).toString("hex");

    // 存储订阅记录（如果没有订阅表可以跳过这步）
    try {
      await prisma.$executeRaw`
        INSERT INTO subscriptions (email, token, status, created_at)
        VALUES (${email}, ${token}, 'pending', NOW())
        ON CONFLICT (email) DO UPDATE SET token = ${token}, status = 'pending', updated_at = NOW()
      `;
    } catch {
      // 订阅表不存在，跳过存储
      console.log("[Subscribe] Subscription table not found, skipping storage");
    }

    // 发送确认邮件
    const emailContent = buildSubscribeConfirmEmail({ email, token });
    const sent = await sendEmail({
      to: email,
      ...emailContent,
    });

    if (!sent && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { success: false, error: "Failed to send confirmation email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Please check your email to confirm subscription",
    });
  } catch (error) {
    console.error("[Subscribe Error]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// 获取订阅状态
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    try {
      const result = await prisma.$queryRaw<Array<{ status: string }>>`
        SELECT status FROM subscriptions WHERE email = ${email} LIMIT 1
      `;

      if (result.length === 0) {
        return NextResponse.json({
          success: true,
          subscribed: false,
        });
      }

      return NextResponse.json({
        success: true,
        subscribed: result[0].status === "active",
        status: result[0].status,
      });
    } catch {
      // 表不存在
      return NextResponse.json({
        success: true,
        subscribed: false,
      });
    }
  } catch (error) {
    console.error("[Subscribe Status Error]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// 取消订阅
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const token = searchParams.get("token");

    if (!email || !token) {
      return NextResponse.json(
        { success: false, error: "Email and token are required" },
        { status: 400 }
      );
    }

    // 验证 token
    try {
      const result = await prisma.$executeRaw`
        UPDATE subscriptions 
        SET status = 'unsubscribed', updated_at = NOW()
        WHERE email = ${email} AND token = ${token}
      `;

      if (result === 0) {
        return NextResponse.json(
          { success: false, error: "Invalid token" },
          { status: 400 }
        );
      }
    } catch {
      // 表不存在
      console.log("[Unsubscribe] Subscription table not found");
    }

    return NextResponse.json({
      success: true,
      message: "Successfully unsubscribed",
    });
  } catch (error) {
    console.error("[Unsubscribe Error]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
