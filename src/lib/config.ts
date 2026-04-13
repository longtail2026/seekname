// 寻名网全局配置
// 修改此文件后需要重新部署才能生效

export const SITE_CONFIG = {
  // 站点信息
  name: "寻名网",
  slogan: "寻一个好名，许一个未来",
  
  // 付费模式开关
  paywall: {
    // 是否启用付费墙（true = 前3个名字锁定，false = 全部免费）
    enabled: false,
    
    // 付费解锁价格（元）
    price: 9.9,
    
    // 原价（用于显示划线价）
    originalPrice: 29.9,
    
    // 免费显示的名字数量（从排名后往前数）
    freeCount: 3, // 显示排名 4、5、6
    
    // 付费解锁的名字数量
    premiumCount: 3, // 解锁排名 1、2、3
  },
  
  // 起名配置
  naming: {
    // 生成的名字总数
    totalNames: 6,
    
    // 免费显示的名字数量（从排名后往前数）
    freeCount: 3,
    
    // 是否显示八字分析
    showBaziAnalysis: true,
    
    // 是否显示典籍出处
    showClassicSource: true,
    
    // 是否显示五行标签
    showWuxing: true,
  },
  
  // 数据统计（可定期更新）
  stats: {
    totalUsers: 128392,
    satisfactionRate: "99.2%",
    classicsCount: "12万+",
    generateTime: "30秒",
  },
};

// 根据配置计算哪些名字是免费的
export function getFreeNameRanks(): number[] {
  const { totalNames, freeCount } = SITE_CONFIG.naming;
  // 返回排名后 freeCount 个（如 6个总数，3个免费，返回 [4,5,6]）
  return Array.from({ length: freeCount }, (_, i) => totalNames - freeCount + i + 1);
}

// 检查某个排名是否需要付费
export function isPremiumRank(rank: number): boolean {
  const freeRanks = getFreeNameRanks();
  return !freeRanks.includes(rank);
}
