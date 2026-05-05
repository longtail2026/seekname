/**
 * SEO metadata helpers
 * 为各页面生成包含 hreflang 的 metadata
 */

import type { Metadata } from "next";

const BASE_URL = "https://seekname.cn";

/**
 * 生成带 hreflang alternate 的通用 metadata
 * 适用于所有主路由页面（URL 不随语言变化，cookie 控制语言）
 */
export function makePageMetadata(params: {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  noindex?: boolean;
}): Metadata {
  return {
    title: params.title,
    description: params.description,
    keywords: params.keywords,
    robots: params.noindex ? { index: false, follow: false } : undefined,
    alternates: {
      canonical: BASE_URL,
      languages: {
        "zh-CN": BASE_URL,
        "en-US": BASE_URL,
        "x-default": BASE_URL,
      },
    },
    openGraph: {
      type: "website",
      locale: "zh_CN",
      alternateLocale: "en_US",
      url: BASE_URL,
      siteName: "寻名网 SeekName",
      title: params.title,
      description: params.description,
      images: params.ogImage ? [{ url: params.ogImage, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: params.title,
      description: params.description,
      images: params.ogImage ? [params.ogImage] : undefined,
    },
  };
}

/**
 * 为博客文章生成 metadata（含 hreflang）
 */
export function makeBlogPostMetadata(params: {
  title: string;
  description: string;
  slug: string;
  author?: string;
  publishedAt?: string;
  tags?: string[];
}): Metadata {
  const url = `${BASE_URL}/blog/${params.slug}`;
  return {
    title: params.title,
    description: params.description,
    keywords: params.tags,
    authors: params.author ? [{ name: params.author }] : undefined,
    openGraph: {
      type: "article",
      locale: "zh_CN",
      alternateLocale: "en_US",
      url,
      title: params.title,
      description: params.description,
      publishedTime: params.publishedAt,
      authors: params.author ? [params.author] : undefined,
      tags: params.tags,
      images: [{ url: `${BASE_URL}/images/og-cover.png`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: params.title,
      description: params.description,
    },
    alternates: {
      canonical: url,
      languages: {
        "zh-CN": url,
        "en-US": url,
        "x-default": url,
      },
    },
  };
}
