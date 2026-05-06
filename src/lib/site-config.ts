/**
 * 站点配置工具
 * 最终收费模式：
 * - 默认关闭（免费模式）：所有名字全部显示
 * - 开启收费：前3个名字隐藏，第4个及以后免费展示
 * - 点击隐藏的名字弹出付费弹窗，提供付费(微信/支付宝/PayPal)或分享解锁
 * 
 * 注意：hiddenCount 固定为 3，不允许修改。
 */

export interface SiteConfigData {
  /** 收费开关 (默认false=免费模式) */
  paywallEnabled: boolean;
  /** 单次付费价格 (元) */
  paywallPrice: number;
  /** 前N个名字隐藏 (固定为3) */
  hiddenCount: number;
}

// 默认配置
const DEFAULT_CONFIG: SiteConfigData = {
  paywallEnabled: false,
  paywallPrice: 9.9,
  hiddenCount: 3,
};

/**
 * 从服务器获取收费配置（客户端用）
 */
export async function fetchSiteConfig(): Promise<SiteConfigData> {
  try {
    const res = await fetch('/api/admin/site-config', {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to fetch config');
    const data = await res.json();
    if (data.paywallEnabled !== undefined) {
      return {
        paywallEnabled: data.paywallEnabled,
        paywallPrice: data.paywallPrice ?? DEFAULT_CONFIG.paywallPrice,
        hiddenCount: 3, // 固定为3
      };
    }
    // 兼容旧格式
    const paywallKey = data.find?.((d: any) => d.key === 'paywall_enabled');
    return {
      ...DEFAULT_CONFIG,
      paywallEnabled: paywallKey?.value === 'true',
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

/**
 * 服务端获取配置（直接读数据库）
 */
export async function getServerSiteConfig(prisma: any): Promise<SiteConfigData> {
  try {
    const keys = ['paywall_enabled', 'paywall_price'];
    const rows = await prisma.siteConfig.findMany({
      where: { key: { in: keys } },
    });
    const map: Record<string, string> = {};
    rows.forEach((r: any) => { map[r.key] = r.value; });

    return {
      paywallEnabled: map['paywall_enabled'] === 'true',
      paywallPrice: parseFloat(map['paywall_price'] || String(DEFAULT_CONFIG.paywallPrice)),
      hiddenCount: 3, // 固定为3
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

/**
 * 判断指定排名的名字是否隐藏
 * 规则：开启收费时，排名 <= 3 的隐藏；未开启时全部显示
 */
export function isHiddenRank(rank: number, config: SiteConfigData): boolean {
  if (!config.paywallEnabled) return false;
  return rank <= 3; // 固定前3个隐藏
}