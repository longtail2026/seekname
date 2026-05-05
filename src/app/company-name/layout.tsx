import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI公司起名 - 公司名称生成器 工商核名友好 | SeekName",
  description: "AI智能公司起名，结合行业特点、工商核名规则、商标注册可行性，生成大气好记、寓意深远的公司名。支持科技、商贸、文化、建筑等多行业，免费使用。",
  keywords: ["公司起名", "公司名称生成", "企业命名", "工商核名", "商标起名", "AI公司起名", "行业起名", "公司注册取名"],
  alternates: {
    canonical: "https://www.seekname.cn/company-name",
  },
  openGraph: {
    title: "AI公司起名 - 公司名称生成器 | SeekName",
    description: "AI智能公司起名，工商核名友好，生成大气好记的公司名。",
    url: "https://www.seekname.cn/company-name",
    siteName: "SeekName",
    type: "website",
    locale: "zh_CN",
  },
};

export default function CompanyNameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}