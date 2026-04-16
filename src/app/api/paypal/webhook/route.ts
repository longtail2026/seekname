/**
 * PayPal Webhook 处理
 * POST /api/paypal/webhook
 *
 * Webhook 比前端回调更安全，因为：
 * 1. 不依赖客户端重定向
 * 2. PayPal 签名验证防止伪造
 * 3. 可以处理异步事件（如退款、撤销）
 *
 * 支持的事件类型：
 * - CHECKOUT.ORDER.APPROVED
 * - PAYMENT.CAPTURE.COMPLETED
 * - PAYMENT.CAPTURE.DENIED
 * - PAYMENT.CAPTURE.REFUNDED
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";

// PayPal Webhook 签名验证
async function verifyPayPalWebhook(
  body: string,
  headers: Headers
): Promise<boolean> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("[PayPal Webhook] Missing credentials");
    return false;
  }

  // 提取必要的 header
  const transmissionId = headers.get("paypal-transmission-id");
  const transmissionTime = headers.get("paypal-transmission-time");
  const certUrl = headers.get("paypal-cert-url");
  const authAlgo = headers.get("paypal-auth-algo");
  const transmissionSig = headers.get("paypal-transmission-sig");

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    console.error("[PayPal Webhook] Missing required headers");
    return false;
  }

  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.error("[PayPal Webhook] Missing WEBHOOK_ID");
    return false;
  }

  // 构建校验码
  const crc = crc32(body).toString();
  const expectedSignature = `${transmissionId}|${transmissionTime}|${webhookId}|${crc}`;

  // 获取 PayPal 公钥并验证
  // 注意：生产环境应缓存公钥
  try {
    const certRes = await fetch(certUrl);
    if (!certRes.ok) {
      console.error("[PayPal Webhook] Failed to fetch cert");
      return false;
    }
    const cert = await certRes.text();

    // 验证签名
    const verify = crypto.createVerify("SHA256");
    verify.update(expectedSignature);
    const isValid = verify.verify(cert, transmissionSig, "base64");

    if (!isValid) {
      console.error("[PayPal Webhook] Signature verification failed");
    }

    return isValid;
  } catch (err) {
    console.error("[PayPal Webhook] Verification error:", err);
    return false;
  }
}

// CRC32 计算
function crc32(str: string): number {
  let crc = 0xffffffff;
  const table = getCrc32Table();

  for (let i = 0; i < str.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ str.charCodeAt(i)) & 0xff];
  }

  return (crc ^ 0xffffffff) >>> 0;
}

let crc32Table: number[] | null = null;
function getCrc32Table(): number[] {
  if (crc32Table) return crc32Table;

  crc32Table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crc32Table.push(c);
  }
  return crc32Table;
}

// VIP 到期时间计算
function calculateVipExpire(tier: number): Date {
  const now = new Date();
  if (tier === 1) {
    // 月卡：+1个月
    return new Date(now.setMonth(now.getMonth() + 1));
  } else if (tier === 2) {
    // 年卡：+1年
    return new Date(now.setFullYear(now.getFullYear() + 1));
  }
  return now;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const headers = req.headers;

    // 1. 验证 Webhook 签名（可选，生产环境强烈建议启用）
    const isWebhookVerifyDisabled = process.env.PAYPAL_WEBHOOK_VERIFY === "disabled";

    if (!isWebhookVerifyDisabled) {
      const isValid = await verifyPayPalWebhook(body, headers);
      if (!isValid) {
        // 签名验证失败，但不返回 400 以免 PayPal 重试
        console.warn("[PayPal Webhook] Invalid signature, ignoring");
        return NextResponse.json({ received: true, status: "invalid_signature" });
      }
    }

    // 2. 解析事件
    const event = JSON.parse(body);
    const eventType = event.event_type;
    const resource = event.resource;

    console.log(`[PayPal Webhook] Received event: ${eventType}`);
    console.log(`[PayPal Webhook] Event ID: ${event.id}`);
    console.log(`[PayPal Webhook] Resource ID: ${resource?.id}`);

    // 3. 处理不同事件类型
    switch (eventType) {
      case "CHECKOUT.ORDER.APPROVED":
        // 订单已批准（用户点击了 PayPal 按钮）
        // 通常不需要处理，主要关注 capture 完成
        console.log("[PayPal Webhook] Order approved, waiting for capture");
        break;

      case "PAYMENT.CAPTURE.COMPLETED": {
        // 支付完成 - 核心处理逻辑
        console.log("[PayPal Webhook] Payment completed!");

        // 从 custom_id 解析用户信息
        const customId = resource?.custom_id;
        if (!customId) {
          console.error("[PayPal Webhook] Missing custom_id");
          break;
        }

        let userId: string;
        let tier: number;

        try {
          const parsed = JSON.parse(customId);
          userId = parsed.userId;
          tier = parsed.tier;
        } catch {
          console.error("[PayPal Webhook] Failed to parse custom_id:", customId);
          break;
        }

        // 验证幂等性 - 防止重复处理
        const existingOrder = await prisma.order.findFirst({
          where: {
            orderNo: resource.id,
          },
        });

        if (existingOrder) {
          console.log("[PayPal Webhook] Order already processed:", resource.id);
          break;
        }

        // 升级 VIP
        try {
          await prisma.$transaction(async (tx) => {
            // 创建订单记录
            const order = await tx.order.create({
              data: {
                orderNo: resource.id,
                userId: userId,
                type: "vip",
                amount: resource.amount?.value || "0",
                payStatus: "paid",
                payMethod: "paypal",
                payTime: new Date(),
                status: "completed",
              },
            });

            // 获取用户当前 VIP 等级
            const user = await tx.user.findUnique({
              where: { id: userId },
              select: { vipLevel: true, vipExpire: true },
            });

            // 计算新 VIP 等级和到期时间
            let newVipLevel = tier;
            let newVipExpire = calculateVipExpire(tier);

            // 如果用户已有 VIP 且新等级更高，或者到期时间更晚，合并
            if (user?.vipLevel && user.vipLevel >= tier) {
              // 已是同等或更高等级，只更新到期时间
              newVipLevel = user.vipLevel;
            }

            if (user?.vipExpire && user.vipExpire > new Date()) {
              // VIP 尚未到期，叠加时间
              const currentExpire = new Date(user.vipExpire);
              if (tier === 1) {
                currentExpire.setMonth(currentExpire.getMonth() + 1);
              } else {
                currentExpire.setFullYear(currentExpire.getFullYear() + 1);
              }
              newVipExpire = currentExpire;
            }

            // 更新用户 VIP 状态
            await tx.user.update({
              where: { id: userId },
              data: {
                vipLevel: Math.max(user?.vipLevel || 0, tier),
                vipExpire: newVipExpire,
                // 赠送积分
                points: {
                  increment: tier === 1 ? 100 : 500,
                },
              },
            });

            console.log(`[PayPal Webhook] VIP upgraded for user ${userId}: tier=${tier}, expire=${newVipExpire}`);
          });
        } catch (dbErr) {
          console.error("[PayPal Webhook] Database error:", dbErr);
          // 返回错误让 PayPal 重试
          return NextResponse.json(
            { received: true, status: "db_error", retry: true },
            { status: 500 }
          );
        }
        break;
      }

      case "PAYMENT.CAPTURE.DENIED": {
        // 支付被拒绝
        console.log("[PayPal Webhook] Payment denied:", resource?.id);
        // 可以记录到日志或发送通知
        break;
      }

      case "PAYMENT.CAPTURE.REFUNDED": {
        // 退款处理
        console.log("[PayPal Webhook] Payment refunded:", resource?.id);

        const customId = resource?.custom_id;
        if (customId) {
          try {
            const parsed = JSON.parse(customId);
            const userId = parsed.userId;

            // 降低 VIP 等级或设置到期时间
            await prisma.user.update({
              where: { id: userId },
              data: {
                vipLevel: 0,
                vipExpire: new Date(), // 立即过期
              },
            });

            console.log(`[PayPal Webhook] VIP revoked for user ${userId} due to refund`);
          } catch (err) {
            console.error("[PayPal Webhook] Error handling refund:", err);
          }
        }
        break;
      }

      default:
        console.log(`[PayPal Webhook] Unhandled event type: ${eventType}`);
    }

    // 4. 返回成功
    return NextResponse.json({ received: true, status: "processed" });
  } catch (err) {
    console.error("[PayPal Webhook] Error:", err);
    // 返回 200 避免 PayPal 无限重试
    // 错误应该被记录和监控
    return NextResponse.json(
      { received: true, status: "error", message: "Internal error" },
      { status: 200 }
    );
  }
}

// 允许 GET 用于健康检查
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "PayPal Webhook endpoint is active",
  });
}
