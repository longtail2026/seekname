import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI艺名/笔名/主播名生成器 - 好听好记的艺名 | SeekName",
  description: "AI智能生成艺名、笔名、主播名、网文作者名。根据你的风格定位、行业特点，生成有辨识度、好记、容易涨粉的专业艺名。",
  keywords: ["艺名生成", "笔名生成", "主播名", "网名", "作者笔名", "艺术名", "AI起艺名", "主播怎么取名字"],
  alternates: {
    canonical: "https://www.seekname.cn/work-name",
  },
  openGraph: {
    title: "AI艺名/笔名/主播名生成器 | SeekName",
    description: "AI智能生成有辨识度的艺名笔名，帮你快速涨粉。",
    url: "https://www.seekname.cn/work-name",
    siteName: "SeekName",
    type: "website",
    locale: "zh_CN",
  },
};

export default function WorkNameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}