import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

/**
 * PayPal Create Order API
 * POST /api/paypal/create-order
 * Body: { tier: 1 | 2 }
 *
 * Returns: { orderId, approveUrl }
 */
export async function POST(req: NextRequest) {
  try {
    // 1. 鉴权
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    const payload = verifyToken(token || "");
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    // 2. 解析参数
    const { tier } = await req.json();
    if (![1, 2].includes(tier)) {
      return NextResponse.json({ error: "无效的会员等级" }, { status: 400 });
    }

    // 3. PayPal 定价（USD）
    const tierConfig: Record<number, { amount: string; description: string }> = {
      1: {
        amount: "7.99",
        description: "寻名网 VIP 月卡 (1个月)",
      },
      2: {
        amount: "54.99",
        description: "寻名网 SVIP 年卡 (12个月)",
      },
    };

    const config = tierConfig[tier];

    // 4. 获取 PayPal Access Token
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "支付服务暂不可用，请稍后重试" },
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
      console.error("[PayPal] Token error:", await tokenRes.text());
      return NextResponse.json({ error: "支付服务异常" }, { status: 502 });
    }

    const { access_token } = await tokenRes.json();

    // 5. 创建 PayPal Order
    const isLive = process.env.PAYPAL_MODE === "live";
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const orderRes = await fetch(
      `https://api-m.${isLive ? "paypal.com" : "sandbox.paypal.com"}/v2/checkout/orders`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${access_token}`,
          "Content-Type": "application/json",
          "PayPal-Request-Id": `SEEKNAME-${tier}-${Date.now()}`,
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [
            {
              reference_id: `vip_tier_${tier}_user_${payload.userId}`,
              description: config.description,
              amount: {
                currency_code: "USD",
                value: config.amount,
              },
              custom_id: JSON.stringify({ userId: payload.userId, tier }),
            },
          ],
          application_context: {
            brand_name: "寻名网",
            landing_page: "BILLING",
            user_action: "PAY_NOW",
            return_url: `${baseUrl}/vip?payment=success`,
            cancel_url: `${baseUrl}/vip?payment=cancelled`,
          },
        }),
      }
    );

    if (!orderRes.ok) {
      const errText = await orderRes.text();
      console.error("[PayPal] Create order error:", errText);
      return NextResponse.json({ error: "创建订单失败" }, { status: 502 });
    }

    const order = await orderRes.json();

    // 找到 APPROVAL 链接
    const approveLink = order.links?.find((l: any) => l.rel === "approve");
    if (!approveLink) {
      return NextResponse.json({ error: "无法获取支付链接" }, { status: 500 });
    }

    return NextResponse.json({
      orderId: order.id,
      approveUrl: approveLink.href,
    });
  } catch (err) {
    console.error("[PayPal create-order]", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
