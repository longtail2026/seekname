import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// 收费配置的key列表（简化版：仅保留必要字段）
const PAYWALL_KEYS = [
  "paywall_enabled",
  "paywall_price",
  "paywall_hidden_count",
];

// 默认值
const DEFAULTS: Record<string, string> = {
  paywall_enabled: "false",
  paywall_price: "9.9",
  paywall_hidden_count: "3",
};

/**
 * GET /api/admin/site-config
 * 读取所有收费配置
 */
export async function GET() {
  try {
    const rows = await prisma.siteConfig.findMany({
      where: { key: { in: PAYWALL_KEYS } },
    });

    const config: Record<string, string> = { ...DEFAULTS };
    rows.forEach((r: any) => {
      config[r.key] = r.value;
    });

    return NextResponse.json({
      paywallEnabled: config.paywall_enabled === "true",
      paywallPrice: parseFloat(config.paywall_price),
      hiddenCount: parseInt(config.paywall_hidden_count, 10),
    });
  } catch (error) {
    console.error("Failed to fetch site config:", error);
    return NextResponse.json({ error: "获取配置失败" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/site-config
 * 更新收费配置
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const updates: Record<string, string> = {};

    if (typeof body.paywallEnabled === "boolean") {
      updates.paywall_enabled = String(body.paywallEnabled);
    }
    if (body.paywallPrice !== undefined) {
      updates.paywall_price = String(body.paywallPrice);
    }
    if (body.hiddenCount !== undefined) {
      updates.paywall_hidden_count = String(body.hiddenCount);
    }

    // 逐条 upsert
    for (const [key, value] of Object.entries(updates)) {
      await prisma.siteConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }

    // 返回更新后的完整配置
    const rows = await prisma.siteConfig.findMany({
      where: { key: { in: PAYWALL_KEYS } },
    });
    const config: Record<string, string> = { ...DEFAULTS };
    rows.forEach((r: any) => {
      config[r.key] = r.value;
    });

    return NextResponse.json({
      paywallEnabled: config.paywall_enabled === "true",
      paywallPrice: parseFloat(config.paywall_price),
      hiddenCount: parseInt(config.paywall_hidden_count, 10),
    });
  } catch (error) {
    console.error("Failed to update site config:", error);
    return NextResponse.json({ error: "更新配置失败" }, { status: 500 });
  }
}
