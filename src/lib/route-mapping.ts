/**
 * 中英文路由映射工具
 * 
 * 🔧 所有语言切换均为纯前端实现（data-i18n + LocaleContext）
 * 不再做任何 /en/ 路由跳转，避免 404
 */

/**
 * 根据当前路径获取对应的英文路径
 * 纯前端模式下，不跳转路由，直接返回当前路径
 */
export function getEnPath(currentPath: string): string {
  return currentPath;
}

/**
 * 根据当前路径获取对应的中文路径
 * 纯前端模式下，不跳转路由，直接返回当前路径
 */
export function getZhPath(currentPath: string): string {
  return currentPath;
}