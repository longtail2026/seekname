/**
 * 支付宝模拟支付完成（开发/测试用）
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
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

    if (!orderNo) {
      return NextResponse.json({ success: false, error: "Order number required" }, { status: 400 });
    }

    // 查询订单
    const order = await prisma.order.findUnique({
      where: { orderNo },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    // 验证订单属于当前用户
    if (!order.userId || order.userId !== payload.userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    // 解析 tier 从订单号
    const tierMatch = orderNo.match(/^ALI(\d)/);
    const tier = tierMatch ? parseInt(tierMatch[1]) : 1;

    // 计算 VIP 到期时间
    const expiresAt = new Date();
    if (tier === 1) {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    // 更新订单状态
    await prisma.order.update({
      where: { id: order.id },
      data: {
        payStatus: "paid",
        status: "completed",
        payMethod: "alipay",
        payTime: new Date(),
      },
    });

    // 更新用户 VIP 状态
    if (order.userId) {
      await prisma.user.update({
        where: { id: order.userId },
        data: {
          vipLevel: tier,
          vipExpire: expiresAt,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "模拟支付成功",
    });
  } catch (error) {
    console.error("[Alipay Mock Complete Error]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
