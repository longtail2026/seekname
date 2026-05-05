import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI宝宝起名 - 新生儿男孩女孩名字生成 | SeekName",
  description: "AI智能宝宝起名，根据生辰八字、寓意、音律生成好听、吉利、不易重名的男孩女孩名字，免费使用。支持按性别、期望寓意、风格筛选，智能匹配最佳名字。",
  keywords: ["宝宝起名", "新生儿起名", "男孩名字", "女孩名字", "生辰八字起名", "免费起名", "AI起名"],
  alternates: {
    canonical: "https://seekname.cn/personal",
  },
  openGraph: {
    title: "AI宝宝起名 - 新生儿男孩女孩名字生成 | SeekName",
    description: "AI智能宝宝起名，根据生辰八字、寓意、音律生成好听吉利的好名字。",
    url: "https://seekname.cn/personal",
    siteName: "SeekName",
    type: "website",
    locale: "zh_CN",
  },
};

export default function PersonalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}