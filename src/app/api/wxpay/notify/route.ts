/**
 * 微信支付回调通知处理
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const WXPAY_CONFIG = {
  mchId: process.env.WXPAY_MCH_ID || "",
  apiKey: process.env.WXPAY_API_KEY || "",
};

// 验证微信支付签名
function verifySign(params: Record<string, string>): boolean {
  const { sign, ...rest } = params;
  if (!sign) return false;

  const sortedKeys = Object.keys(rest).sort();
  const signStr = sortedKeys
    .filter((k) => rest[k] !== "" && rest[k] !== undefined && rest[k] !== null)
    .map((k) => `${k}=${rest[k]}`)
    .join("&");

  const calculatedSign = crypto
    .createHash("md5")
    .update(`${signStr}&key=${WXPAY_CONFIG.apiKey}`)
    .digest("hex")
    .toUpperCase();

  return calculatedSign === sign;
}

// 解析 XML
function parseXml(xml: string): Record<string, string> {
  const result: Record<string, string> = {};
  const regex = /<(\w+)>([^<]+)<\/\1>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    result[match[1]] = match[2];
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const xmlData = await request.text();
    const params = parseXml(xmlData);

    console.log("[Wxpay Notify] Received:", params);

    // 验证签名
    if (!verifySign(params)) {
      console.error("[Wxpay Notify] Signature verification failed");
      return new NextResponse(
        `<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[签名验证失败]]></return_msg></xml>`,
        { status: 400, headers: { "Content-Type": "text/xml" } }
      );
    }

    // 验证返回状态
    if (params.return_code !== "SUCCESS") {
      return new NextResponse(
        `<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[返回状态失败]]></return_msg></xml>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // 验证交易状态
    if (params.result_code !== "SUCCESS") {
      return new NextResponse(
        `<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    const { out_trade_no } = params;

    // 查询订单
    const order = await prisma.order.findUnique({
      where: { orderNo: out_trade_no },
      include: { user: true },
    });

    if (!order) {
      console.error("[Wxpay Notify] Order not found:", out_trade_no);
      return new NextResponse(
        `<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[订单不存在]]></return_msg></xml>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // 检查订单状态
    if (order.payStatus === "paid") {
      return new NextResponse(
        `<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>`,
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // 解析 tier 从订单号
    const tierMatch = out_trade_no.match(/^WX(\d)/);
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
        payMethod: "wechat",
        payTime: new Date(),
      },
    });

    // 更新用户 VIP 状态
    await prisma.user.update({
      where: { id: order.userId },
      data: {
        vipLevel: tier,
        vipExpire: expiresAt,
      },
    });

    console.log("[Wxpay Notify] Payment processed successfully:", out_trade_no);

    // 返回成功
    return new NextResponse(
      `<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>`,
      { headers: { "Content-Type": "text/xml" } }
    );
  } catch (error) {
    console.error("[Wxpay Notify Error]", error);
    return new NextResponse(
      `<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[系统错误]]></return_msg></xml>`,
      { status: 500, headers: { "Content-Type": "text/xml" } }
    );
  }
}

// 允许 GET 请求用于测试
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "微信支付回调服务正常运行",
  });
}
