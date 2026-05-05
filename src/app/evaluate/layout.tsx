import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI名字评分评测 - 名字好坏测试打分 | SeekName",
  description: "免费测试你的名字好不好，AI从寓意、音律、字形、五行、文化出处、独特性六大维度综合评分，给出专业的名字分析和改进建议。",
  keywords: ["名字评分", "名字测试", "名字评测", "AI评名字", "名字打分", "测名字", "姓名测试"],
  alternates: {
    canonical: "https://seekname.cn/evaluate",
  },
  openGraph: {
    title: "AI名字评分评测 - 名字好坏测试打分 | SeekName",
    description: "AI从六大维度专业评测你的名字，免费测试评分。",
    url: "https://seekname.cn/evaluate",
    siteName: "SeekName",
    type: "website",
    locale: "zh_CN",
  },
};

export default function EvaluateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}