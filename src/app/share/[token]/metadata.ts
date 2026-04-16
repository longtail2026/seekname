/**
 * 名字分享落地页 - 动态 metadata
 * 生成个性化的 OG 标签和 SEO 信息
 */

import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;

  // 尝试从 token 中解析名字（避免服务端调用自身 API）
  // token 格式支持: id 或 id:name 或 base64
  let name = "一个好名字";
  let gender = "中性";

  try {
    // 简单处理：如果 token 包含下划线或横线，可能是 pinyin
    if (token.includes("_") || token.includes("-")) {
      const parts = token.split(/[_-]/);
      if (parts.length >= 2) {
        // 尝试构建名字
        name = decodeURIComponent(parts[0] || "名字");
        if (parts.length > 1) {
          gender = parts[1] === "M" ? "男孩" : "女孩";
        }
      }
    }
  } catch {
    // ignore
  }

  const shareTitle = `${name} | 寻名网分享`;
  const shareDescription = `朋友为您分享了一个寓意美好的名字「${name}」，来自寻名网 AI 起名平台，融合八字五行与典籍文化，快来看看吧！`;

  return {
    title: shareTitle,
    description: shareDescription,
    openGraph: {
      title: shareTitle,
      description: shareDescription,
      type: "website",
      locale: "zh_CN",
      siteName: "寻名网 SeekName",
      images: [
        {
          url: `/api/og?name=${encodeURIComponent(name)}&gender=${encodeURIComponent(gender)}`,
          width: 1200,
          height: 630,
          alt: `${name} - 寻名网分享`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description: shareDescription,
      images: [`/api/og?name=${encodeURIComponent(name)}`],
    },
    alternates: {
      canonical: `https://www.seekname.cn/share/${token}`,
    },
  };
}
