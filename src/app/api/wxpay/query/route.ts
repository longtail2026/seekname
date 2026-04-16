/**
 * 微信支付订单查询
 * 用于前端轮询检查支付结果
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // 验证用户认证
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderNo = searchParams.get("orderNo");

    if (!orderNo) {
      return NextResponse.json({ success: false, error: "Order number required" }, { status: 400 });
    }

    // 查询订单
    const order = await prisma.order.findUnique({
      where: { orderNo },
      select: {
        id: true,
        orderNo: true,
        payStatus: true,
        status: true,
        payMethod: true,
        amount: true,
        userId: true,
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    // 验证订单属于当前用户
    if (order.userId !== payload.userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    // 查询用户 VIP 状态
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { vipLevel: true, vipExpire: true },
    });

    return NextResponse.json({
      success: true,
      order: {
        orderNo: order.orderNo,
        payStatus: order.payStatus,
        status: order.status,
        amount: order.amount,
      },
      vip: user
        ? {
            level: user.vipLevel,
            expire: user.vipExpire,
            active: user.vipExpire && user.vipExpire > new Date(),
          }
        : null,
    });
  } catch (error) {
    console.error("[Wxpay Query Error]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
