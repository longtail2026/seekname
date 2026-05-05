import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "起名知识博客 - 起名技巧/名字大全/命名文化 | SeekName",
  description: "SeekName起名知识博客，分享宝宝起名技巧、好听名字大全、英文名推荐、公司店铺起名攻略、命名文化典故等丰富内容，帮你轻松取个好名字。",
  keywords: ["起名博客", "起名技巧", "名字大全", "宝宝起名攻略", "好名字推荐", "起名知识", "命名文化", "取名经验"],
  alternates: {
    canonical: "https://www.seekname.cn/blog",
  },
  openGraph: {
    title: "起名知识博客 - 起名技巧/名字大全/命名文化 | SeekName",
    description: "分享起名技巧、名字大全、命名文化，帮你轻松取个好名字。",
    url: "https://www.seekname.cn/blog",
    siteName: "SeekName",
    type: "website",
    locale: "zh_CN",
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}