import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/orders", "/settings", "/blog/write"],
      },
    ],
    sitemap: "https://seekname.cn/sitemap.xml",
  };
}
