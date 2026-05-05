import { MetadataRoute } from "next";

const baseUrl = "https://www.seekname.cn";

async function fetchBlogPosts(): Promise<MetadataRoute.Sitemap> {
  try {
    const res = await fetch(`${baseUrl}/api/blog/posts?pageSize=1000`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      const posts = data.posts || [];
      return posts.map((post: any) => ({
        url: `${baseUrl}/blog/${post.id}`,
        lastModified: post.created_at ? new Date(post.created_at) : new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.85,
      }));
    }
  } catch (e) {
    console.warn("Failed to fetch blog posts for sitemap:", e);
  }
  return [];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    // 首页 - 最高优先级
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },

    // 核心工具页（高优先级）
    {
      url: `${baseUrl}/personal`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.95,
    },
    {
      url: `${baseUrl}/business-name`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.95,
    },
    {
      url: `${baseUrl}/business-name/cross-border-en-name`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/brand`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/company`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/company-name`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },

    // 英文名工具
    {
      url: `${baseUrl}/en/choose-name`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },

    // 职场/艺名/社交
    {
      url: `${baseUrl}/work-name`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/stage-name`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/social-name`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },

    // 外国人中文名
    {
      url: `${baseUrl}/foreigner-name`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },

    // 宠物起名
    {
      url: `${baseUrl}/pet`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/pet/form`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },

    // 名字测评
    {
      url: `${baseUrl}/evaluate`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/evaluate/form`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },

    // 起名改名
    {
      url: `${baseUrl}/rename`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.75,
    },

    // 博客
    {
      url: `${baseUrl}/blog`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },

    // 搜索
    {
      url: `${baseUrl}/search`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
  ];

  const blogPosts = await fetchBlogPosts();

  return [...staticPages, ...blogPosts];
}