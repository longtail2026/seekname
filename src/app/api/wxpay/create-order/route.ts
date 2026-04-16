/**
 * 微信支付 Native API
 * 为 VIP 订阅创建微信支付二维码
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// 微信支付配置（需要替换为实际配置）
const WXPAY_CONFIG = {
  appId: process.env.WXPAY_APP_ID || "",
  mchId: process.env.WXPAY_MCH_ID || "",
  apiKey: process.env.WXPAY_API_KEY || "",
  notifyUrl: process.env.WXPAY_NOTIFY_URL || "",
};

// VIP 定价映射（人民币）
const TIER_PRICES: Record<number, { amount: number; name: string }> = {
  1: { amount: 2900, name: "VIP 月卡" },      // ¥29/月
  2: { amount: 19900, name: "SVIP 年卡" },     // ¥199/年
};

// 生成微信支付订单
async function createWxpayOrder(params: {
  orderNo: string;
  amount: number;
  description: string;
  userId: string;
  tier: number;
}) {
  const { orderNo, amount, description, userId, tier } = params;

  // 如果没有配置微信支付，返回模拟数据
  if (!WXPAY_CONFIG.appId || !WXPAY_CONFIG.mchId) {
    return {
      success: true,
      codeUrl: "", // 模拟模式
      orderNo,
      isMock: true,
    };
  }

  try {
    // 微信支付统一下单参数
    const timeStamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = crypto.randomBytes(16).toString("hex").toUpperCase();

    // 构造签名串
    const signParams = {
      appid: WXPAY_CONFIG.appId,
      mch_id: WXPAY_CONFIG.mchId,
      nonce_str: nonceStr,
      body: description,
      out_trade_no: orderNo,
      total_fee: amount,
      spbill_create_ip: "127.0.0.1",
      notify_url: WXPAY_CONFIG.notifyUrl,
      trade_type: "NATIVE",
    };

    // 生成签名
    const sign = generateSign(signParams);

    // 调用微信支付统一下单接口
    const xmlData = `
      <xml>
        <appid>${WXPAY_CONFIG.appId}</appid>
        <mch_id>${WXPAY_CONFIG.mchId}</mch_id>
        <nonce_str>${nonceStr}</nonce_str>
        <body>${description}</body>
        <out_trade_no>${orderNo}</out_trade_no>
        <total_fee>${amount}</total_fee>
        <spbill_create_ip>127.0.0.1</spbill_create_ip>
        <notify_url>${WXPAY_CONFIG.notifyUrl}</notify_url>
        <trade_type>NATIVE</trade_type>
        <sign>${sign}</sign>
      </xml>
    `;

    const response = await fetch("https://api.mch.weixin.qq.com/pay/unifiedorder", {
      method: "POST",
      body: xmlData,
      headers: {
        "Content-Type": "text/xml",
      },
    });

    const xmlResponse = await response.text();

    // 解析 XML 响应
    const parseXml = (xml: string) => {
      const result: Record<string, string> = {};
      const regex = /<(\w+)>([^<]+)<\/\1>/g;
      let match;
      while ((match = regex.exec(xml)) !== null) {
        result[match[1]] = match[2];
      }
      return result;
    };

    const parsed = parseXml(xmlResponse);

    if (parsed.return_code === "SUCCESS" && parsed.result_code === "SUCCESS") {
      return {
        success: true,
        codeUrl: parsed.code_url,
        orderNo,
        isMock: false,
      };
    } else {
      return {
        success: false,
        error: parsed.err_code_des || parsed.return_msg || "下单失败",
        isMock: false,
      };
    }
  } catch (error) {
    console.error("[Wxpay Order Error]", error);
    return {
      success: false,
      error: "支付服务异常",
      isMock: false,
    };
  }
}

// 生成微信支付签名
function generateSign(params: Record<string, string | number>): string {
  const sortedKeys = Object.keys(params).sort();
  const signStr = sortedKeys
    .filter((k) => params[k] !== "" && params[k] !== undefined && params[k] !== null)
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  const signWithKey = `${signStr}&key=${WXPAY_CONFIG.apiKey}`;
  return crypto
    .createHash("md5")
    .update(signWithKey)
    .digest("hex")
    .toUpperCase();
}

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
      return NextResponse.json(
        { success: false, error: "Already subscribed to this tier or higher" },
        { status: 400 }
      );
    }

    const priceInfo = TIER_PRICES[tier];
    const orderNo = `WX${tier}${Date.now()}`;

    // 创建微信支付订单
    const result = await createWxpayOrder({
      orderNo,
      amount: priceInfo.amount,
      description: `寻名网 - ${priceInfo.name}`,
      userId: payload.userId,
      tier,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    // 在数据库创建待支付订单
    await prisma.order.create({
      data: {
        userId: payload.userId,
        orderNo,
        amount: priceInfo.amount / 100,
        type: "vip",
        status: "pending",
        payStatus: "pending",
        payMethod: "wechat",
      },
    });

    return NextResponse.json({
      success: true,
      orderNo,
      codeUrl: result.codeUrl,
      amount: priceInfo.amount / 100,
      tier,
      isMock: result.isMock,
    });
  } catch (error) {
    console.error("[Wxpay Create Order Error]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
