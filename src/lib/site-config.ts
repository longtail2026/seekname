/**
 * 站点配置工具
 * 支持全局收费开关 + 按项目类别的差异化定价
 */

/**
 * 所有可定价的项目分类（与起名页面的 category 映射）
 *
 * key 说明：
 *   personal        - 宝宝起名 / 成人改名
 *   rename          - 改名（复用 personal 价格）
 *   company_name    - 公司・品牌・店铺起名
 *   brand           - 品牌起名（复用 company_name 价格）
 *   shop            - 店铺起名（复用 company_name 价格）
 *   cross_border_en - 跨境电商品牌英文名
 *   foreigner_name  - 外国人起中文名
 *   chinese_en_name - 中国人起英文名
 *   social_name     - 社交网名 / 游戏ID
 *   work_name       - 艺名・笔名・主播名
 *   stage_name      - 艺名（复用 work_name 价格）
 *   pet             - 宠物起名
 *   literary_work   - 文艺作品起名
 *   evaluate        - 好名测试（打分）
 */
export const CATEGORY_PRICING: Record<string, { label: string; defaultPrice: number; range?: string }> = {
  personal:         { label: "宝宝起名・成人改名",    defaultPrice: 39 },
  company_name:     { label: "公司・品牌・店铺起名",  defaultPrice: 59,  range: "59–99" },
  brand:            { label: "品牌起名",               defaultPrice: 59,  range: "59–99" },
  shop:             { label: "店铺起名",               defaultPrice: 59,  range: "59–99" },
  cross_border_en:  { label: "跨境电商品牌英文名",     defaultPrice: 69,  range: "69–99" },
  foreigner_name:   { label: "外国人起中文名",         defaultPrice: 29 },
  chinese_en_name:  { label: "中国人起英文名",         defaultPrice: 19 },
  social_name:      { label: "社交网名・游戏ID",       defaultPrice: 9.9 },
  work_name:        { label: "艺名・笔名・主播名",     defaultPrice: 39 },
  stage_name:       { label: "艺名",                   defaultPrice: 39 },
  pet:              { label: "宠物起名",               defaultPrice: 9.9 },
  literary_work:    { label: "文艺作品起名",            defaultPrice: 39 },
  evaluate:         { label: "好名测试（打分）",        defaultPrice: 9.9 },
};

// 从 category 获取对应的 pricing key（有些类别共享定价）
const CATEGORY_TO_PRICING_KEY: Record<string, string> = {
  personal:        "personal",
  rename:          "personal",       // 改名复用个人起名价格
  company:         "company_name",   // 旧版 company → company_name
  brand:           "company_name",
  shop:            "company_name",
  cross_border_en: "cross_border_en",
  foreigner_name:  "foreigner_name",
  chinese_en_name: "chinese_en_name",
  social_name:     "social_name",
  work_name:       "work_name",
  stage_name:      "work_name",      // 艺名复用 work_name 价格
  pet:             "pet",
  literary_work:   "literary_work",
  evaluate:        "evaluate",
};

/** 数据库 site_config 表中存储价格的 key 前缀 */
const PRICE_KEY_PREFIX = "price_";

/** 获取指定定价 key 对应的数据库配置 key */
export function getPriceConfigKey(pricingKey: string): string {
  return `${PRICE_KEY_PREFIX}${pricingKey}`;
}

/**
 * 根据 category 获取该项目的定价 key（用于数据库查找）
 */
export function getPricingKeyByCategory(category: string): string {
  return CATEGORY_TO_PRICING_KEY[category] || "personal";
}

/**
 * 获取站点配置数据类型
 */
export interface SiteConfigData {
  paywallEnabled: boolean;
  paywallPrice: number; // 兼容旧版：默认后备价格
  categoryPrices: Record<string, number>; // key 为 pricing key, value 为价格
}

/**
 * 设置所有定价 keys 列表（用于统一查询数据库）
 */
export function getAllPriceConfigKeys(): string[] {
  const pricingKeys = new Set(Object.values(CATEGORY_TO_PRICING_KEY));
  return [...pricingKeys].map(getPriceConfigKey);
}

/**
 * 从站点配置获取指定 category 的价格
 */
export function getCategoryPrice(config: SiteConfigData, category: string): number {
  const pricingKey = getPricingKeyByCategory(category);
  const price = config.categoryPrices[pricingKey];
  if (price !== undefined && price > 0) return price;
  // 兜底：使用该定价 key 的默认价格
  return CATEGORY_PRICING[pricingKey]?.defaultPrice ?? config.paywallPrice;
}

/**
 * 检查某个排名是否在收费隐藏范围内
 * 当前逻辑：前 3 个名字隐藏（rank 1-3）
 */
export function isHiddenRank(rank: number, _config?: SiteConfigData): boolean {
  return rank <= 3;
}

/**
 * 从后端 API 获取站点配置
 */
export async function fetchSiteConfig(): Promise<SiteConfigData> {
  try {
    const res = await fetch("/api/admin/site-config");
    if (res.ok) {
      const data = await res.json();
      return {
        paywallEnabled: data.paywallEnabled ?? false,
        paywallPrice: data.paywallPrice ?? 9.9,
        categoryPrices: data.categoryPrices ?? {},
      };
    }
  } catch {
    // 静默失败
  }
  return {
    paywallEnabled: false,
    paywallPrice: 9.9,
    categoryPrices: {},
  };
}