import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI English Name Generator - Find Your Perfect English Name | SeekName",
  description: "Get an AI-powered English name that matches your Chinese name phonetically and culturally. Generate meaningful English names with personalized recommendations based on your personality and preferences.",
  keywords: ["English name generator", "Chinese to English name", "English name meaning", "AI name generator", "western name", "English name for Chinese"],
  alternates: {
    canonical: "https://seekname.cn/en/choose-name",
    languages: {
      "zh-CN": "https://seekname.cn/foreigner-name",
      "en-US": "https://seekname.cn/en/choose-name",
    },
  },
  openGraph: {
    title: "AI English Name Generator - Find Your Perfect Name | SeekName",
    description: "Get a meaningful English name that matches your Chinese name phonetically and culturally.",
    url: "https://seekname.cn/en/choose-name",
    siteName: "SeekName",
    type: "website",
    locale: "en_US",
    alternateLocale: "zh_CN",
  },
};

export default function ChooseNameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}