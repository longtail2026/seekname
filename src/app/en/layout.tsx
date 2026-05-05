import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import { LocaleProvider } from "@/contexts/LocaleContext";
import "../globals.css";

export const metadata: Metadata = {
  title: "SeekName - AI Chinese Name Generator | Traditional Wisdom Meets Modern AI",
  description: "Generate meaningful Chinese names with AI. Combine BaZi, Five Elements (Wuxing), and classic references from Shijing, Chuci, and Tang poetry. Perfect for newborns, businesses, and pets.",
  keywords: "Chinese name generator, Chinese naming, AI naming, BaZi, Five Elements, Wuxing, Chinese culture, name meaning",
  alternates: {
    canonical: "https://seekname.cn/en",
    languages: {
      "zh-CN": "https://seekname.cn/",
      "en-US": "https://seekname.cn/en",
    },
  },
  openGraph: {
    title: "SeekName - AI Chinese Name Generator",
    description: "Traditional Chinese naming wisdom meets modern AI. Generate meaningful names in 30 seconds.",
    type: "website",
    locale: "en_US",
    alternateLocale: "zh_CN",
  },
};

export default function ENLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LocaleProvider initialLocale="en">
      <Header />
      {children}
    </LocaleProvider>
  );
}
