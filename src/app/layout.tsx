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
  title: "寻名网 | SeekName - 寻一个好名，许一个未来",
  description: "专业起名服务平台，为个人、公司、宠物提供文化典籍、唐诗宋词、四书五经等传统文化与现代命理相结合的起名服务",
  keywords: "起名, 姓名, 公司起名, 宠物起名, 文化典籍, 唐诗宋词, 四书五经, 命理, 易经, 五行",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={inter.variable}>
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <AuthProvider>
          <Header />
          <main className="pt-16">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
