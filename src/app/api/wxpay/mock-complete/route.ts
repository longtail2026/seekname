/**
 * 模拟微信支付完成（仅用于测试环境）
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  // 仅在开发环境允许
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ success: false, error: "Not available in production" }, { status: 403 });
  }

  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
    }

    const { orderNo } = await request.json();

    // 查询订单
    const order = await prisma.order.findUnique({
      where: { orderNo },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    // 解析 tier
    const tierMatch = orderNo.match(/^WX(\d)/);
    const tier = tierMatch ? parseInt(tierMatch[1]) : 1;

    // 计算 VIP 到期时间
    const expiresAt = new Date();
    if (tier === 1) {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    // 更新订单
    await prisma.order.update({
      where: { id: order.id },
      data: {
        payStatus: "paid",
        status: "completed",
        payMethod: "wechat_mock",
        payTime: new Date(),
      },
    });

    // 更新用户 VIP
    await prisma.user.update({
      where: { id: payload.userId },
      data: {
        vipLevel: tier,
        vipExpire: expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Mock payment completed",
      tier,
    });
  } catch (error) {
    console.error("[Wxpay Mock Complete Error]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
