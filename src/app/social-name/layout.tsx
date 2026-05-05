import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI社交网名生成器 - 微信/抖音/小红书昵称 | SeekName",
  description: "AI智能生成社交网名，适用于微信、抖音、小红书、Instagram等平台。根据你的个性、风格生成独特好记的网名，让你的账号更具辨识度。",
  keywords: ["网名生成", "社交网名", "微信昵称", "抖音昵称", "小红书昵称", "好听的网名", "个性网名", "AI网名"],
  alternates: {
    canonical: "https://seekname.cn/social-name",
  },
  openGraph: {
    title: "AI社交网名生成器 - 微信/抖音/小红书昵称 | SeekName",
    description: "AI智能生成独特好记的社交网名，让你的账号更具辨识度。",
    url: "https://seekname.cn/social-name",
    siteName: "SeekName",
    type: "website",
    locale: "zh_CN",
  },
};

export default function SocialNameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}