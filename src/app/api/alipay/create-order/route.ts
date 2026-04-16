/**
 * 支付宝当面付（扫码）API
 * 为 VIP 订阅创建支付宝二维码
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// 支付宝配置（需要替换为实际配置）
const ALIPAY_CONFIG = {
  appId: process.env.ALIPAY_APP_ID || "",
  privateKey: process.env.ALIPAY_PRIVATE_KEY || "",
  alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY || "",
  notifyUrl: process.env.ALIPAY_NOTIFY_URL || "",
};

// VIP 定价映射（人民币）
const TIER_PRICES: Record<number, { amount: number; name: string }> = {
  1: { amount: 29, name: "VIP 月卡" },      // ¥29/月
  2: { amount: 199, name: "SVIP 年卡" },     // ¥199/年
};

// RSA2 签名生成
function generateRSA2Sign(params: Record<string, string>): string {
  const signStr = Object.keys(params)
    .sort()
    .filter((k) => params[k])
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  const sign = crypto
    .createSign("RSA-SHA256")
    .update(signStr)
    .sign(ALIPAY_CONFIG.privateKey, "base64");

  return sign;
}

// 生成支付宝请求
async function createAlipayOrder(params: {
  orderNo: string;
  amount: number;
  description: string;
  userId: string;
  tier: number;
}) {
  const { orderNo, amount, description, tier } = params;

  // 如果没有配置支付宝，返回模拟数据
  if (!ALIPAY_CONFIG.appId || !ALIPAY_CONFIG.privateKey) {
    console.log("[Alipay] Mock mode - no credentials configured");
    return {
      success: true,
      qrCode: "",
      orderNo,
      isMock: true,
    };
  }

  try {
    const outTradeNo = orderNo;
    const totalAmount = amount.toString();
    const subject = description;

    // 构造请求参数
    const bizContent = {
      out_trade_no: outTradeNo,
      total_amount: totalAmount,
      subject: subject,
      product_code: "FAST_INSTANT_TRADE_PAY",
    };

    const paramsMap: Record<string, string> = {
      app_id: ALIPAY_CONFIG.appId,
      method: "alipay.trade.precreate",
      charset: "utf-8",
      sign_type: "RSA2",
      timestamp: new Date().format("yyyy-MM-dd HH:mm:ss"),
      version: "1.0",
      notify_url: ALIPAY_CONFIG.notifyUrl,
      biz_content: JSON.stringify(bizContent),
    };

    // 生成签名
    const sign = generateRSA2Sign(paramsMap);
    const encodedSign = encodeURIComponent(sign);

    // 构建请求 URL
    const queryString = Object.keys(paramsMap)
      .map((k) => {
        const v = k === "biz_content"
          ? encodeURIComponent(paramsMap[k])
          : encodeURIComponent(paramsMap[k]);
        return `${k}=${v}`;
      })
      .join("&") + `&sign=${encodedSign}`;

    const alipayUrl = `https://openapi.alipay.com/gateway.do?${queryString}`;

    // 调用支付宝 API
    const response = await fetch(alipayUrl, {
      method: "GET",
    });

    const data = await response.json();

    // 解析响应
    const responseNode = data.alipay_trade_precreate_response;

    if (responseNode && responseNode.code === "10000") {
      return {
        success: true,
        qrCode: responseNode.qr_code,
        orderNo,
        isMock: false,
      };
    } else {
      return {
        success: false,
        error: responseNode?.sub_msg || responseNode?.msg || "下单失败",
        isMock: false,
      };
    }
  } catch (error) {
    console.error("[Alipay Order Error]", error);
    return {
      success: false,
      error: "支付服务异常",
      isMock: false,
    };
  }
}

// Date format helper
declare global {
  interface Date {
    format(format: string): string;
  }
}
if (!Date.prototype.format) {
  Date.prototype.format = function(fmt: string): string {
    const o: Record<string, number> = {
      "M+": this.getMonth() + 1,
      "d+": this.getDate(),
      "H+": this.getHours(),
      "m+": this.getMinutes(),
      "s+": this.getSeconds(),
      "q+": Math.floor((this.getMonth() + 3) / 3),
      "S": this.getMilliseconds(),
    };
    if (/(y+)/.test(fmt)) {
      fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    }
    for (const k in o) {
      if (new RegExp("(" + k + ")").test(fmt)) {
        fmt = fmt.replace(
          RegExp.$1,
          RegExp.$1.length === 1 ? String(o[k]) : ("00" + o[k]).substr(("" + o[k]).length)
        );
      }
    }
    return fmt;
  };
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
    const orderNo = `ALI${tier}${Date.now()}`;

    // 创建支付宝订单
    const result = await createAlipayOrder({
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
        amount: priceInfo.amount,
        type: "vip",
        status: "pending",
        payStatus: "pending",
        payMethod: "alipay",
      },
    });

    return NextResponse.json({
      success: true,
      orderNo,
      qrCode: result.qrCode,
      amount: priceInfo.amount,
      tier,
      isMock: result.isMock,
    });
  } catch (error) {
    console.error("[Alipay Create Order Error]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
