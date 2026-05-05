import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI跨境电商英文品牌名生成器 - 美国商标起名 | SeekName",
  description: "AI智能生成跨境电商英文品牌名，适用于亚马逊、Shopify、TikTok Shop等平台。兼顾商标可用性、域名注册、文化寓意，打造国际化品牌名。",
  keywords: ["跨境电商起名", "英文品牌名", "亚马逊起名", "美国商标起名", "跨境品牌名生成", "Shopify起名", "TikTok起名"],
  alternates: {
    canonical: "https://www.seekname.cn/business-name/cross-border-en-name",
  },
  openGraph: {
    title: "AI跨境电商英文品牌名生成器 | SeekName",
    description: "AI智能生成适用于亚马逊、Shopify等平台的英文品牌名，支持商标核名。",
    url: "https://www.seekname.cn/business-name/cross-border-en-name",
    siteName: "SeekName",
    type: "website",
    locale: "zh_CN",
  },
};

export default function CrossBorderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}