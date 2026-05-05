import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI公司起名/品牌起名/店铺起名 - 商业起名生成器 | SeekName",
  description: "AI智能商业起名，提供公司起名、品牌起名、店铺起名、项目起名一站式服务。结合行业特点、商标核名、域名可用性，生成好记、大气、易注册商标的商业名字。",
  keywords: ["公司起名", "品牌起名", "店铺起名", "商业起名", "AI起名", "公司名称生成", "品牌名称生成", "商标起名"],
  alternates: {
    canonical: "https://seekname.cn/business-name",
  },
  openGraph: {
    title: "AI商业起名 - 公司/品牌/店铺名生成 | SeekName",
    description: "AI智能商业起名，结合行业特点和商标规则，生成好记大气的商业名字。",
    url: "https://seekname.cn/business-name",
    siteName: "SeekName",
    type: "website",
    locale: "zh_CN",
  },
};

export default function BusinessNameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}