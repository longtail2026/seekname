import { NextRequest, NextResponse } from "next/server";
import prisma, { executeRaw } from "@/lib/prisma";

// 收费配置的key列表（简化版：仅保留必要字段，hiddenCount固定为3不再配置）
const PAYWALL_KEYS = [
  "paywall_enabled",
  "paywall_price",
];

// 默认值
const DEFAULTS: Record<string, string> = {
  paywall_enabled: "false",
  paywall_price: "9.9",
};

/**
 * 使用原生 SQL 查询 site_config（绕过 Prisma adapter 写操作的 serverless 限制）
 */
async function getConfigRaw(keys: string[]): Promise<Record<string, string>> {
  const config: Record<string, string> = { ...DEFAULTS };
  try {
    const rows = await prisma.siteConfig.findMany({
      where: { key: { in: keys } },
    });
    rows.forEach((r: any) => {
      config[r.key] = r.value;
    });
  } catch (e: any) {
    // 表不存在时静默返回默认值
    if (!(e?.message?.includes("does not exist") || e?.code === "P2021")) {
      throw e;
    }
  }
  return config;
}

/**
 * GET /api/admin/site-config
 * 读取收费配置
 */
export async function GET() {
  try {
    const config = await getConfigRaw(PAYWALL_KEYS);
    return NextResponse.json({
      paywallEnabled: config.paywall_enabled === "true",
      paywallPrice: parseFloat(config.paywall_price),
    });
  } catch (error: any) {
    console.error("Failed to fetch site config:", error);
    return NextResponse.json({ error: "获取配置失败" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/site-config
 * 更新收费配置
 * 
 * ⚠️ 使用原生 SQL upsert 而非 Prisma model 操作，
 * 因为 @prisma/adapter-pg 在 Vercel Serverless 中对写操作支持不稳定，
 * 会导致 405 INVALID_REQUEST_METHOD 错误。
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

    // 逐条 upsert — 使用原生 SQL 避免 adapter 写操作问题
    for (const [key, value] of Object.entries(updates)) {
      await executeRaw(
        `INSERT INTO "site_config" ("key", "value", "updated_at")
         VALUES ($1, $2, NOW())
         ON CONFLICT ("key")
         DO UPDATE SET "value" = $2, "updated_at" = NOW()`,
        [key, value]
      );
    }

    // 返回更新后的完整配置
    const config = await getConfigRaw(PAYWALL_KEYS);
    return NextResponse.json({
      paywallEnabled: config.paywall_enabled === "true",
      paywallPrice: parseFloat(config.paywall_price),
    });
  } catch (error) {
    console.error("Failed to update site config:", error);
    return NextResponse.json({ error: "更新配置失败" }, { status: 500 });
  }
}
