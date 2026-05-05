import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI艺名/花名/舞台名生成器 - 打造你的专属艺名 | SeekName",
  description: "AI智能生成艺名、花名、主播名、演员名。根据你的个人风格、行业特点，生成有辨识度、易传播的专业名字，助你快速出圈。",
  keywords: ["艺名", "花名", "舞台名", "主播名", "演员名", "AI艺名生成", "艺术名", "个人品牌"],
  alternates: {
    canonical: "https://www.seekname.cn/stage-name",
  },
  openGraph: {
    title: "AI艺名/花名/舞台名生成器 | SeekName",
    description: "AI智能生成有辨识度的艺名花名，助你快速出圈。",
    url: "https://www.seekname.cn/stage-name",
    siteName: "SeekName",
    type: "website",
    locale: "zh_CN",
  },
};

export default function StageNameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}