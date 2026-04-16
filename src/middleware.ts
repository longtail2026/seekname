import { NextRequest, NextResponse } from "next/server";
import { locales, defaultLocale, isValidLocale, parseAcceptLanguage } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

const PUBLIC_FILE = /\.(.*)$/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 静态资源和 API 跳过
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 已有语言前缀，放行
  const pathnameLocale = locales.find(
    (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`
  );
  if (pathnameLocale) return NextResponse.next();

  // 从 cookie 优先读取语言
  const cookieLocale = request.cookies.get("locale")?.value as Locale | undefined;

  let detectedLocale: Locale;
  if (cookieLocale && isValidLocale(cookieLocale)) {
    detectedLocale = cookieLocale;
  } else {
    // 降级：解析 Accept-Language
    const acceptLanguage = request.headers.get("accept-language") || "";
    detectedLocale = parseAcceptLanguage(acceptLanguage);
  }

  // 默认语言不重定向（SEO 友好）
  if (detectedLocale !== defaultLocale) {
    const url = request.nextUrl.clone();
    url.pathname = `/${detectedLocale}${pathname}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|static|favicon.ico|images|manifest.json).*)"],
};
