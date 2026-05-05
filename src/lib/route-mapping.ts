/**
 * 中英文路由映射工具
 * 用于在中英文页面之间进行导航
 */

// 中文路由 → 英文路由
const zhToEn: Record<string, string> = {
  "/": "/en",
  "/personal": "/en/personal",
  "/foreigner-name": "/en/choose-name",
  "/vip": "/en/vip",
};

// 英文路由 → 中文路由
const enToZh: Record<string, string> = {
  "/en": "/",
  "/en/personal": "/personal",
  "/en/choose-name": "/foreigner-name",
  "/en/vip": "/vip",
};

/**
 * 根据当前路径获取对应的英文路径
 */
export function getEnPath(currentPath: string): string {
  // 精确匹配
  if (zhToEn[currentPath] !== undefined) return zhToEn[currentPath];

  // 尝试匹配前缀（处理 /naming?xxx 等带参数的路径）
  const parts = currentPath.split("/").filter(Boolean);
  for (let i = parts.length; i > 0; i--) {
    const prefix = "/" + parts.slice(0, i).join("/");
    if (zhToEn[prefix] !== undefined) {
      const suffix = parts.slice(i).join("/");
      return suffix ? zhToEn[prefix] + "/" + suffix : zhToEn[prefix];
    }
  }

  // 如果路径已在 /en 下，不做修改
  if (currentPath.startsWith("/en")) return currentPath;

  // 没有匹配的英文页面，跳转到英文首页
  return "/en";
}

/**
 * 根据当前路径获取对应的中文路径
 */
export function getZhPath(currentPath: string): string {
  // 精确匹配
  if (enToZh[currentPath] !== undefined) return enToZh[currentPath];

  // 移除 /en 前缀
  if (currentPath.startsWith("/en")) {
    const withoutEn = currentPath.replace(/^\/en/, "") || "/";
    return withoutEn;
  }

  // 如果路径不在 /en 下，不做修改
  return currentPath;
}