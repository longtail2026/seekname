/**
 * 支付宝当面付回调通知处理
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const ALIPAY_CONFIG = {
  alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY || "",
};

// 验证支付宝签名
function verifySign(params: Record<string, string>): boolean {
  const { sign, sign_type, ...rest } = params;
  if (!sign || !ALIPAY_CONFIG.alipayPublicKey) return false;

  // 构建待签名字符串（按字母顺序排列）
  const sortedKeys = Object.keys(rest).sort();
  const signStr = sortedKeys
    .filter((k) => rest[k])
    .map((k) => `${k}=${decodeURIComponent(rest[k])}`)
    .join("&");

  try {
    const verify = crypto.createVerify("RSA-SHA256");
    verify.update(signStr);
    return verify.verify(ALIPAY_CONFIG.alipayPublicKey, sign, "base64");
  } catch {
    return false;
  }
}

// 解析 URL Encoded Form Data
async function parseFormData(request: NextRequest): Promise<Record<string, string>> {
  const text = await request.text();
  const params: Record<string, string> = {};
  const searchParams = new URLSearchParams(text);
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

export async function POST(request: NextRequest) {
  try {
    const params = await parseFormData(request);

    console.log("[Alipay Notify] Received:", params);

    // 如果没有配置公钥，跳过签名验证（开发模式）
    if (!ALIPAY_CONFIG.alipayPublicKey) {
      console.log("[Alipay Notify] Skip signature verification in mock mode");
    } else {
      // 验证签名
      if (!verifySign(params as Record<string, string>)) {
        console.error("[Alipay Notify] Signature verification failed");
        return new NextResponse("fail", { status: 400 });
      }
    }

    // 验证响应状态
    const code = params.notify_type;
    if (code !== "trade_status_sync") {
      return new NextResponse("fail", { status: 400 });
    }

    const { out_trade_no, trade_status, total_amount, trade_no } = params;

    // 交易状态处理
    if (trade_status === "TRADE_SUCCESS" || trade_status === "TRADE_FINISHED") {
      // 查询订单
      const order = await prisma.order.findUnique({
        where: { orderNo: out_trade_no as string },
        include: { user: true },
      });

      if (!order) {
        console.error("[Alipay Notify] Order not found:", out_trade_no);
        return new NextResponse("fail", { status: 404 });
      }

      // 检查订单状态
      if (order.payStatus === "paid") {
        return new NextResponse("success", { status: 200 });
      }

      // 解析 tier 从订单号
      const tierMatch = (out_trade_no as string).match(/^ALI(\d)/);
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

      // 更新用户 VIP 状态（仅当用户已登录时）
      if (order.userId) {
        await prisma.user.update({
          where: { id: order.userId },
          data: {
            vipLevel: tier,
            vipExpire: expiresAt,
          },
        });
      }

      console.log("[Alipay Notify] Payment processed successfully:", out_trade_no);
    }

    return new NextResponse("success", { status: 200 });
  } catch (error) {
    console.error("[Alipay Notify Error]", error);
    return new NextResponse("fail", { status: 500 });
  }
}

// 允许 GET 请求用于测试
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "支付宝回调服务正常运行",
  });
}
