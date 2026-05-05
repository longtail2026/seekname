import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI起名改名 - 在线智能取名生成器 | SeekName",
  description: "AI智能起名改名，根据生辰八字、寓意期望、音律美感生成好听、好记、无负面含义的名字。支持宝宝起名、成人改名，免费使用。",
  keywords: ["AI起名", "起名改名", "智能取名", "在线起名", "名字生成器", "免费起名", "AI取名"],
  alternates: {
    canonical: "https://www.seekname.cn/rename",
  },
  openGraph: {
    title: "AI起名改名 - 在线智能取名生成器 | SeekName",
    description: "AI智能起名改名，根据寓意、音律、八字生成好听好记的好名字。",
    url: "https://www.seekname.cn/rename",
    siteName: "SeekName",
    type: "website",
    locale: "zh_CN",
  },
};

export default function RenameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}