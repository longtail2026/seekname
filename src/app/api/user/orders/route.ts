/**
 * 历史订单查询 API
 * GET /api/user/orders
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // ── 鉴权 ──
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "登录已过期" }, { status: 401 });
    }

    // ── 查询用户订单（按创建时间倒序） ──
    const orders = await prisma.order.findMany({
      where: { userId: payload.userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderNo: true,
        amount: true,
        status: true,
        payMethod: true,
        payTime: true,
        createdAt: true,
        // 订单包含的起名记录摘要
        nameRecord: {
          select: {
            id: true,
            surname: true,
            gender: true,
            results: true,
          },
        },
      },
    });

    return NextResponse.json({
      orders,
      total: orders.length,
    });
  } catch (error) {
    console.error("[Orders Query Error]", error);
    return NextResponse.json(
      { error: "服务器内部错误，请稍后重试" },
      { status: 500 }
    );
  }
}
