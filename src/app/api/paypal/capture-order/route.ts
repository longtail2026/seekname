import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * PayPal Capture Order API
 * POST /api/paypal/capture-order
 * Body: { orderId: string }
 *
 * 1. 向 PayPal 验证订单并 capture
 * 2. 将 capture 结果以 custom_id 解析 userId/tier
 * 3. 升级用户 VIP 等级
 */
export async function POST(req: NextRequest) {
  try {
    // 1. 鉴权
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    const payload = await verifyToken(token || "");
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { orderId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: "缺少订单号" }, { status: 400 });
    }

    // 2. 获取 PayPal Access Token
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "支付服务暂不可用" },
        { status: 503 }
      );
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const tokenRes = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!tokenRes.ok) {
      return NextResponse.json({ error: "支付服务认证失败" }, { status: 502 });
    }

    const { access_token } = await tokenRes.json();

    // 3. Capture PayPal Order
    const isLive = process.env.PAYPAL_MODE === "live";
    const captureRes = await fetch(
      `https://api-m.${isLive ? "paypal.com" : "sandbox.paypal.com"}/v2/checkout/orders/${orderId}/capture`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!captureRes.ok) {
      const errText = await captureRes.text();
      console.error("[PayPal] Capture error:", errText);
      return NextResponse.json({ error: "支付确认失败" }, { status: 502 });
    }

    const capture = await captureRes.json();

    // 4. 验证支付状态
    if (capture.status !== "COMPLETED") {
      return NextResponse.json(
        { error: `支付未完成，当前状态：${capture.status}` },
        { status: 400 }
      );
    }

    // 5. 从 purchase_unit 的 custom_id 解析用户信息
    const purchaseUnit = capture.purchase_units?.[0];
    let userId = payload.userId;
    let tier = 0;

    if (purchaseUnit?.custom_id) {
      try {
        const parsed = JSON.parse(purchaseUnit.custom_id);
        userId = parsed.userId;
        tier = parsed.tier;
      } catch {
        // 解析失败，使用 URL 参数中的用户
      }
    }

    // 6. 鉴权：只能给自己升级
    if (userId !== payload.userId) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    if (![1, 2].includes(tier)) {
      return NextResponse.json({ error: "无效的会员等级" }, { status: 400 });
    }

    // 7. 数据库升级 VIP
    let updatedUser;
    try {
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { vipLevel: true },
      });

      if (!currentUser) {
        return NextResponse.json({ error: "用户不存在" }, { status: 404 });
      }

      if (tier <= (currentUser.vipLevel ?? 0)) {
        return NextResponse.json({ error: "已是更高会员" }, { status: 400 });
      }

      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { vipLevel: tier },
        select: { vipLevel: true, id: true },
      });
    } catch (dbErr: any) {
      // 数据库不可用时：记录支付信息但返回友好提示
      if (dbErr.code === "P2025" || dbErr.message?.includes("Can't reach database")) {
        return NextResponse.json(
          { error: "服务暂时不可用，请联系客服人工开通：support@seekname.com" },
          { status: 503 }
        );
      }
      throw dbErr;
    }

    // 8. 返回成功
    const orderId_pp = capture.id;
    const tierNames = { 1: "VIP 月卡", 2: "SVIP 年卡" };

    return NextResponse.json({
      success: true,
      orderId: orderId_pp,
      vipLevel: updatedUser?.vipLevel ?? tier,
      tierName: tierNames[tier as 1 | 2],
      message: `恭喜！您已成功开通 ${tierNames[tier as 1 | 2]}`,
    });
  } catch (err) {
    console.error("[PayPal capture-order]", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
