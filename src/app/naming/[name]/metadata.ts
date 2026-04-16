/**
 * 名字详情页 metadata（含 hreflang alternate）
 */

import type { Metadata } from "next";

type Props = { params: { name: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const name = decodeURIComponent(String(params.name || ""));
  const title = name ? `${name} - 名字分析报告 | 寻名网` : "名字详情 | 寻名网";
  const description = name
    ? `查看「${name}」的完整名字分析报告，包含五行、音韵、典籍出处、重名风险等深度解读，由寻名网 AI 起名引擎生成。`
    : "查看名字的完整分析报告，由寻名网 AI 起名引擎生成。";

  return {
    title,
    description,
    keywords: ["起名", "名字分析", name || "", "五行", "八字", "典籍出处"],
    alternates: {
      canonical: "https://www.seekname.cn",
      languages: {
        "zh-CN": "https://www.seekname.cn",
        "en-US": "https://www.seekname.cn",
        "x-default": "https://www.seekname.cn",
      },
    },
    openGraph: {
      type: "website",
      locale: "zh_CN",
      alternateLocale: "en_US",
      title,
      description,
      siteName: "寻名网 SeekName",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}
