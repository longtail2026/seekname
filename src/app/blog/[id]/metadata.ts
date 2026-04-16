/**
 * 博客文章页 metadata（含 hreflang alternate）
 * Next.js App Router: 动态路由的 metadata 放在 metadata.ts（而非 page.tsx）
 */

import type { Metadata } from "next";
import { makeBlogPostMetadata } from "@/lib/metadata-helpers";

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // 从数据库获取文章元信息
  const post = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/blog/posts/${params.id}`)
    .then((r) => r.json())
    .catch(() => null);

  if (!post || !post.title) {
    return {
      title: "文章未找到 | 寻名网",
      robots: { index: false, follow: false },
    };
  }

  return makeBlogPostMetadata({
    title: post.title,
    description: post.summary || post.excerpt || post.content?.slice(0, 160) || "",
    slug: String(params.id),
    author: post.author_name,
    publishedAt: post.created_at,
    tags: post.tags,
  });
}
