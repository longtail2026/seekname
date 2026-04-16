/**
 * Stripe Payment Intent API
 * 创建支付意图并返回客户端密钥
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Stripe 定价映射（美元）
const TIER_PRICES: Record<number, { amount: number; name: string }> = {
  1: { amount: 400, name: "VIP Monthly" },      // $4/month
  2: { amount: 2800, name: "SVIP Yearly" },     // $28/year
};

export async function POST(request: NextRequest) {
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

    const { tier } = await request.json();

    // 验证会员等级
    if (!TIER_PRICES[tier]) {
      return NextResponse.json({ success: false, error: "Invalid tier" }, { status: 400 });
    }

    // 检查用户当前 VIP 等级
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { vipLevel: true },
    });

    if (user && user.vipLevel >= tier) {
      return NextResponse.json({ success: false, error: "Already subscribed to this tier or higher" }, { status: 400 });
    }

    const priceInfo = TIER_PRICES[tier];

    // 在生产环境中，这里会：
    // 1. 使用 Stripe SDK 创建 PaymentIntent
    // 2. 返回 clientSecret 给前端
    //
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount: priceInfo.amount,
    //   currency: 'usd',
    //   metadata: { userId: payload.userId, tier: String(tier) },
    // });
    //
    // return NextResponse.json({ success: true, clientSecret: paymentIntent.client_secret });

    // 开发模式：模拟成功响应
    // 模拟支付成功后直接升级 VIP
    const expiresAt = new Date();
    if (tier === 1) {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    await prisma.user.update({
      where: { id: payload.userId },
      data: {
        vipLevel: tier,
        vipExpire: expiresAt,
      },
    });

    // 创建订单记录
    await prisma.order.create({
      data: {
        userId: payload.userId,
        orderNo: `VIP${tier}${Date.now()}`,
        amount: priceInfo.amount / 100,
        type: "vip",
        status: "completed",
        payStatus: "paid",
        payMethod: "stripe",
        payTime: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Payment successful",
      orderId: `VIP${tier}${Date.now()}`,
      tier,
    });
  } catch (error) {
    console.error("[Stripe Payment Intent Error]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
