import type { Metadata } from "next";

// 博客文章详情页的 metadata 由 generateMetadata 动态生成
// 这里提供默认 fallback
export const metadata: Metadata = {
  title: "起名文章详情 - 起名技巧/名字大全/命名文化 | SeekName",
  description: "SeekName起名知识博客文章详情页，阅读宝宝起名技巧、好听名字大全、英文名推荐、公司店铺起名攻略等精彩内容。",
  openGraph: {
    title: "起名文章详情 - SeekName",
    description: "阅读精彩起名文章，学习起名技巧。",
    siteName: "SeekName AI起名网",
    type: "article",
    locale: "zh_CN",
  },
};

export default function BlogPostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}