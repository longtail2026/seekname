"use client";

import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BlogBreadcrumbProps {
  items: BreadcrumbItem[];
}

/**
 * 博客页面面包屑导航（SEO结构化+用户体验）
 * 自动注入 BreadcrumbList JSON-LD
 */
export default function BlogBreadcrumb({ items }: BlogBreadcrumbProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: `https://seekname.cn${item.href}` } : {}),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav
        aria-label="面包屑导航"
        style={{
          fontSize: 12,
          color: "#999",
          marginBottom: 16,
          fontFamily: "'Noto Sans SC', sans-serif",
        }}
      >
        {items.map((item, index) => (
          <span key={index}>
            {index > 0 && (
              <span style={{ margin: "0 6px", color: "#CCC" }}>/</span>
            )}
            {item.href ? (
              <Link
                href={item.href}
                style={{
                  color: index === items.length - 1 ? "#E86A17" : "#888",
                  textDecoration: "none",
                }}
              >
                {item.label}
              </Link>
            ) : (
              <span style={{ color: "#E86A17", fontWeight: 500 }}>
                {item.label}
              </span>
            )}
          </span>
        ))}
      </nav>
    </>
  );
}