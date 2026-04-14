/**
 * 订单号/业务号生成工具
 *
 * 格式：SN + 年月日 + 6位随机数字
 * 示例：SN20260414173852ABCD
 *
 * - SN = SeekName 前缀
 * - 时间戳精确到秒，保证可排序
 * - 后4位随机字符防碰撞
 */

function pad(num: number, len: number): string {
  return String(num).padStart(len, "0");
}

/**
 * 生成订单号
 * 格式：SN + YYYYMMDDHHmmss(14位) + 4位随机字母数字
 */
export function generateOrderNo(): string {
  const now = new Date();
  const datePart = `${now.getFullYear()}${pad(now.getMonth() + 1, 2)}${pad(
    now.getDate(),
    2
  )}`;
  const timePart = `${pad(now.getHours(), 2)}${pad(
    now.getMinutes(),
    2
  )}${pad(now.getSeconds(), 2)}`;

  // 4位随机字母+数字混合
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 去掉易混淆的 O0I1
  let rand = "";
  for (let i = 0; i < 4; i++) {
    rand += chars[Math.floor(Math.random() * chars.length)];
  }

  return `SN${datePart}${timePart}${rand}`;
}

/**
 * 生成匿名用户名（未登录时使用）
 * 格式：访客 + 6位随机字母数字
 */
export function generateAnonymousName(): string {
  const chars =
    "abcdefghjkmnpqrstuvwxyz23456789"; // 去掉易混淆的
  let rand = "";
  for (let i = 0; i < 6; i++) {
    rand += chars[Math.floor(Math.random() * chars.length)];
  }
  return `访客${rand}`;
}
