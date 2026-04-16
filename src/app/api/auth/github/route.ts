/**
 * GitHub OAuth 授权发起
 * GET /api/auth/github
 */
import { NextResponse } from "next/server";

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const REDIRECT_URI = process.env.GITHUB_REDIRECT_URI ||
  "http://localhost:3000/api/auth/github/callback";

export function GET() {
  if (!GITHUB_CLIENT_ID) {
    return NextResponse.json(
      { error: "GitHub OAuth 未配置（GITHUB_CLIENT_ID 缺失）" },
      { status: 503 }
    );
  }

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: "read:user user:email",
  });

  return NextResponse.redirect(
    new URL(`https://github.com/login/oauth/authorize?${params}`)
  );
}
