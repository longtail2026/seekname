/**
 * 用户头像生成 API
 * GET /api/user/avatar - 生成动漫风格头像 URL（基于用户名/ID）
 *
 * 使用 DiceBear 的 adventurer 风格（动漫卡通风格）
 * 不存储图片，只生成 URL，由客户端保存到数据库
 */

import { NextRequest, NextResponse } from "next/server";

// 使用 DiceBear 免费头像服务（adventure 风格接近动漫卡通）
const AVATAR_BASE = "https://api.dicebear.com/7.x/adventure/svg";
const AVATAR_SEED_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

/**
 * 根据字符串生成稳定的种子值
 */
function generateSeed(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // 用 hash 值从字符池中取 8 个字符作为种子
  let seed = "";
  const absHash = Math.abs(hash);
  for (let i = 0; i < 8; i++) {
    seed += AVATAR_SEED_CHARS[absHash % AVATAR_SEED_CHARS.length];
    // eslint-disable-next-line no-bitwise
    seed += AVATAR_SEED_CHARS[(absHash >> (i + 3)) % AVATAR_SEED_CHARS.length];
  }
  return seed;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name") || "user";
    const userId = searchParams.get("userId") || "";

    // 基于用户名+ID生成稳定种子（同一用户每次返回相同头像）
    const baseInput = `${name}${userId}`;
    const seed = generateSeed(baseInput);

    // 构建头像 URL
    const avatarUrl = `${AVATAR_BASE}?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&hair=variant01,variant02,variant03,variant04,variant05,variant06,variant07`;

    return NextResponse.json({
      avatarUrl,
      seed,
    });
  } catch (error) {
    console.error("[Avatar API Error]", error);
    return NextResponse.json(
      { error: "生成头像失败" },
      { status: 500 }
    );
  }
}
