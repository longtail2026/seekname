/**
 * 认证工具函数
 * - JWT token 生成/验证
 * - 密码哈希/比对
 */

import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "seekname_default_secret_change_in_production"
);

// Token 有效期：7 天
const TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 秒

export interface TokenPayload {
  userId: string;
  email?: string;
  phone?: string;
}

/**
 * 生成 JWT Token
 */
export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_MAX_AGE}s`)
    .sign(JWT_SECRET);
}

/**
 * 验证 JWT Token，返回 payload 或 null
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      email: (payload.email as string) ?? undefined,
      phone: (payload.phone as string) ?? undefined,
    };
  } catch {
    return null;
  }
}

/**
 * 哈希密码
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * 比对密码
 */
export async function comparePassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}
