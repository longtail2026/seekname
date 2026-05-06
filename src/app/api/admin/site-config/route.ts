import { NextRequest, NextResponse } from "next/server";
import prisma, { executeRaw } from "@/lib/prisma";
import { CATEGORY_PRICING, getAllPriceConfigKeys, getPriceConfigKey } from "@/lib/site-config";

// 💡 强制动态渲染，避免 Vercel Edge Network 将 PUT 请求缓为静态资源并拒绝非 GET 方法
export const dynamic = "force-dynamic";

// 所有配置 key（收费开关 + 所有项目定价）
const CONFIG_KEYS = [
  "paywall_enabled",
  ...getAllPriceConfigKeys(),
];

// 默认值
const DEFAULTS: Record<string, string> = {
  paywall_enabled: "false",
  ...Object.fromEntries(
    Object.entries(CATEGORY_PRICING).map(([key, val]) => [
      getPriceConfigKey(key),
      String(val.defaultPrice),
    ])
  ),
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
 * 从原始配置构建响应数据
 */
function buildResponse(config: Record<string, string>) {
  // 收集所有 categoryPrices
  const categoryPrices: Record<string, number> = {};
  for (const key of Object.keys(CATEGORY_PRICING)) {
    const configKey = getPriceConfigKey(key);
    const val = parseFloat(config[configKey]);
    if (!isNaN(val) && val > 0) {
      categoryPrices[key] = val;
    }
  }

  return {
    paywallEnabled: config.paywall_enabled === "true",
    paywallPrice: parseFloat(config[getPriceConfigKey("personal")]) || 9.9, // 兼容旧版
    categoryPrices,
  };
}

/**
 * GET /api/admin/site-config
 * 读取收费配置（含分类定价）
 */
export async function GET() {
  try {
    const config = await getConfigRaw(CONFIG_KEYS);
    return NextResponse.json(buildResponse(config));
  } catch (error: any) {
    console.error("Failed to fetch site config:", error);
    return NextResponse.json({ error: "获取配置失败" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/site-config
 * 更新收费配置（含分类定价）
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

    // 分类定价：传入 categoryPrices 对象 { "personal": 39, "company_name": 59, ... }
    if (body.categoryPrices && typeof body.categoryPrices === "object") {
      for (const [key, price] of Object.entries(body.categoryPrices)) {
        const configKey = getPriceConfigKey(key);
        updates[configKey] = String(price);
      }
    }

    // 兼容旧版：单独传入 paywallPrice 时更新 personal 价格
    if (body.paywallPrice !== undefined && !body.categoryPrices) {
      updates[getPriceConfigKey("personal")] = String(body.paywallPrice);
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
    const config = await getConfigRaw(CONFIG_KEYS);
    return NextResponse.json(buildResponse(config));
  } catch (error) {
    console.error("Failed to update site config:", error);
    return NextResponse.json({ error: "更新配置失败" }, { status: 500 });
  }
}