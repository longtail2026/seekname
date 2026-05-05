import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI外国人中文名生成器 - 取一个好听的中国人名 | SeekName",
  description: "AI智能为外国人生成地道中文名，根据原名发音、寓意匹配最佳汉字。适合外籍人士、留学生、在华工作外国人取中文名。",
  keywords: ["外国人中文名", "外国人起名", "外籍人士中文名", "英文名翻译中文", "AI起中文名", "留学生中文名"],
  alternates: {
    canonical: "https://www.seekname.cn/foreigner-name",
  },
  openGraph: {
    title: "AI外国人中文名生成器 | SeekName",
    description: "AI智能为外籍人士生成地道、寓意美好的中文名字。",
    url: "https://www.seekname.cn/foreigner-name",
    siteName: "SeekName",
    type: "website",
    locale: "zh_CN",
  },
};

export default function ForeignerNameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}