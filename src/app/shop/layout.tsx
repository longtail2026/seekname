import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI店铺起名 - 店铺名称生成器 旺财好听 | SeekName",
  description: "AI智能店铺起名，根据店铺类型（餐饮、服装、美妆、便利店等）和风格定位，生成旺财、好听、易记的店铺名。支持线下门店和电商店铺起名，免费使用。",
  keywords: ["店铺起名", "店铺名称生成", "开店起名", "旺财店名", "餐饮店名", "服装店名", "超市起名", "门店命名"],
  alternates: {
    canonical: "https://seekname.cn/shop",
  },
  openGraph: {
    title: "AI店铺起名 - 店铺名称生成器 | SeekName",
    description: "AI智能生成旺财好听易记的店铺名，助力生意兴隆。",
    url: "https://seekname.cn/shop",
    siteName: "SeekName",
    type: "website",
    locale: "zh_CN",
  },
};

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}