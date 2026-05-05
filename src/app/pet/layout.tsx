import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI宠物起名 - 猫狗名字生成器 | SeekName",
  description: "AI智能为你的毛孩子起名，支持猫、狗、兔子等宠物。根据宠物品种、性格、毛色生成可爱、独特、好记的宠物名字。",
  keywords: ["宠物起名", "猫名字", "狗名字", "宠物名生成", "毛孩子起名", "AI宠物名", "猫咪名字", "狗狗名字"],
  alternates: {
    canonical: "https://www.seekname.cn/pet",
  },
  openGraph: {
    title: "AI宠物起名 - 猫狗名字生成器 | SeekName",
    description: "AI智能为你的毛孩子起名，生成可爱独特的好名字。",
    url: "https://www.seekname.cn/pet",
    siteName: "SeekName",
    type: "website",
    locale: "zh_CN",
  },
};

export default function PetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}