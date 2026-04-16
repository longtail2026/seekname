import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.seekname.cn"),
  title: {
    default: "寻名网 | SeekName - 寻一个好名，许一个未来",
    template: "%s | 寻名网",
  },
  description: "专业起名服务平台，为个人、公司、宠物提供文化典籍、唐诗宋词、四书五经等传统文化与现代命理相结合的起名服务",
  keywords: ["起名", "姓名", "公司起名", "宠物起名", "文化典籍", "唐诗宋词", "四书五经", "命理", "易经", "五行"],
  authors: [{ name: "寻名网" }],
  creator: "寻名网",
  publisher: "寻名网",
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
    siteName: "寻名网 SeekName",
    title: "寻名网 | SeekName - 寻一个好名，许一个未来",
    description: "专业起名服务平台，12万部典籍 × AI × 八字五行，30秒生成6个吉祥好名",
    images: [
      {
        url: "/images/icon-512.png",
        width: 512,
        height: 512,
        alt: "寻名网 - AI起名平台",
      },
      // TODO: 上线前替换为真实 OG 封面图 (1200x630 PNG)
      // og-cover.png 生成后更新此处
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "寻名网 | SeekName",
    description: "专业起名服务平台，12万部典籍 × AI × 八字五行，30秒生成6个吉祥好名",
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
  },
  verification: {
    baidu: "your-baidu-verification-code",
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
        <AuthProvider>
          <Header />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
