import { Metadata } from "next";
import { SITE_CONFIG } from "@/lib/config";

type Props = {
  searchParams: Promise<{ surname?: string; gender?: string; category?: string }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const surname = params.surname || "";
  const categoryLabels: Record<string, string> = {
    personal: "个人",
    company: "公司",
    brand: "品牌",
    shop: "店铺",
    pet: "宠物",
    evaluate: "名字测评",
  };
  const category = params.category || "personal";
  const label = categoryLabels[category] || "个人";
  const title = surname ? `${surname}姓${label}起名结果 - 寻名网` : `${label}起名结果 - 寻名网`;

  return {
    title,
    description: `${label}起名推荐，结合${SITE_CONFIG.stats.classicBooks}部典籍文化与现代AI分析，深度解读名字的五行、音律、寓意。`,
    openGraph: {
      title,
      description: `${label}起名推荐，AI智能分析八字五行、典籍出处，30秒生成吉祥好名。`,
    },
  };
}
