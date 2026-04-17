/**
 * 支付宝交易查询 API
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
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
    });

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    // 验证订单属于当前用户
    if (!order.userId || order.userId !== payload.userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      order: {
        orderNo: order.orderNo,
        status: order.status,
        payStatus: order.payStatus,
        amount: order.amount,
        payMethod: order.payMethod,
      },
    });
  } catch (error) {
    console.error("[Alipay Query Error]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
