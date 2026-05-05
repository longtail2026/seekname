import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import Header from "@/components/layout/Header";
import { AuthProvider } from "@/contexts/AuthContext";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import PWAProvider from "@/components/PWAProvider";
import JsonLd from "@/components/JsonLd";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.seekname.cn"),
  title: {
    default: "AI起名网站 - 免费宝宝起名/英文名/公司名/店铺名生成 | SeekName",
    template: "%s | SeekName",
  },
  description: "AI智能起名，提供宝宝起名、英文名、公司起名、店铺起名、艺名笔名、跨境电商名、外国人中文名、网名等一站式名字生成服务，好听、好记、无负面歧义。",
  keywords: ["AI起名", "起名网站", "免费起名", "名字生成器", "宝宝起名", "英文名生成", "公司起名", "店铺起名", "艺名笔名", "跨境电商品牌名", "外国人中文名", "社交网名", "宠物起名", "作品起名", "美国商标起名"],
  authors: [{ name: "SeekName" }],
  creator: "SeekName",
  publisher: "SeekName",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: "https://www.seekname.cn",
    siteName: "SeekName AI起名网",
    title: "AI起名网站 - 免费宝宝起名/英文名/公司名/店铺名生成 | SeekName",
    description: "AI智能起名，提供宝宝起名、英文名、公司起名、店铺起名、艺名笔名、跨境电商名、外国人中文名、网名等一站式名字生成服务，好听、好记、无负面歧义。",
    images: [
      {
        url: "/images/icon-512.png",
        width: 512,
        height: 512,
        alt: "SeekName - AI起名平台",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI起名网站 - 免费宝宝起名/英文名/公司名/店铺名生成 | SeekName",
    description: "AI智能起名，提供宝宝起名、英文名、公司起名、店铺起名、艺名笔名、跨境电商名、外国人中文名、网名等一站式名字生成服务。",
    images: ["/images/icon-512.png"],
    creator: "@seekname",
  },
  icons: {
    icon: "/images/favicon.ico",
    apple: "/images/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "msapplication-TileColor": "#E86A17",
  },
  alternates: {
    canonical: "https://www.seekname.cn",
    languages: {
      "zh-CN": "https://www.seekname.cn",
      "en-US": "https://www.seekname.cn",
      "x-default": "https://www.seekname.cn",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={inter.variable}>
      <body className="min-h-screen tiled-bg text-gray-900 antialiased">
        <ThemeProvider>
          <AuthProvider>
            <LocaleProvider>
              <PWAProvider />
              <Header />
              {children}
              <JsonLd />
            </LocaleProvider>
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}