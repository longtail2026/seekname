"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface MenuItem {
  label: string;
  key: string;
  icon: string;
  href?: string;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  { label: "控制台", key: "dashboard", icon: "📊", href: "/admin" },
  { label: "用户管理", key: "users", icon: "👥", href: "/admin/users" },
  { label: "起名记录", key: "naming-records", icon: "📝", href: "/admin/naming-records" },
  { label: "博客管理", key: "blog", icon: "📰", href: "/admin/blog" },
  { label: "评论管理", key: "comments", icon: "💬", href: "/admin/comments" },
  {
    label: "网站设置",
    key: "settings",
    icon: "⚙️",
    children: [
      { label: "导航栏管理", key: "nav", icon: "🧭", href: "/admin/nav" },
    ],
  },
  { label: "自动发文系统", key: "auto-blog", icon: "🤖", href: "/admin/auto-blog" },
  { label: "权限管理", key: "rbac", icon: "🔐", href: "/admin/rbac" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<string[]>(["settings"]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminUser, setAdminUser] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("seekname_admin");
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setIsLoggedIn(true);
        setAdminUser(data);
      } catch { /* ignore */ }
    }
    // 如果不在登录页又没登录，跳转
    if (!stored && !pathname.includes("/admin/login")) {
      router.push("/admin/login");
    }
  }, [pathname, router]);

  // 登录页不显示布局
  if (pathname === "/admin/login") return <>{children}</>;

  if (!isLoggedIn) return null;

  const toggleSubmenu = (key: string) => {
    setExpandedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const isActive = (href?: string) => href && pathname === href;

  const handleLogout = () => {
    localStorage.removeItem("seekname_admin");
    router.push("/admin/login");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* 侧边栏 */}
      <aside
        style={{
          width: collapsed ? 60 : 240,
          background: "#001529",
          color: "#fff",
          transition: "width 0.3s",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 100,
          overflow: "auto",
        }}
      >
        {/* Logo */}
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            fontSize: collapsed ? 16 : 18,
            fontWeight: "bold",
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          {collapsed ? "🔍" : "SeekName 管理中心"}
        </div>

        {/* 菜单 */}
        <nav style={{ flex: 1, padding: "8px 0" }}>
          {menuItems.map((item) => {
            if (item.children) {
              const isExpanded = expandedKeys.includes(item.key);
              return (
                <div key={item.key}>
                  <div
                    onClick={() => toggleSubmenu(item.key)}
                    style={{
                      padding: "10px 16px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      color: "#fff",
                      fontSize: 14,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span>
                      <span style={{ marginRight: 8 }}>{item.icon}</span>
                      {!collapsed && item.label}
                    </span>
                    {!collapsed && (
                      <span style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0)", transition: "0.2s" }}>
                        ▶
                      </span>
                    )}
                  </div>
                  {isExpanded && !collapsed && (
                    <div style={{ background: "rgba(0,0,0,0.2)" }}>
                      {item.children.map((child) => (
                        <Link
                          key={child.key}
                          href={child.href || "#"}
                          style={{
                            display: "block",
                            padding: "8px 16px 8px 44px",
                            color: isActive(child.href) ? "#1890ff" : "rgba(255,255,255,0.65)",
                            textDecoration: "none",
                            fontSize: 13,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {child.icon} {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            return (
              <Link
                key={item.key}
                href={item.href || "#"}
                style={{
                  display: "block",
                  padding: "10px 16px",
                  color: isActive(item.href) ? "#1890ff" : "#fff",
                  textDecoration: "none",
                  fontSize: 14,
                  whiteSpace: "nowrap",
                  background: isActive(item.href) ? "rgba(24,144,255,0.1)" : "transparent",
                  borderRight: isActive(item.href) ? "3px solid #1890ff" : "3px solid transparent",
                }}
              >
                <span style={{ marginRight: 8 }}>{item.icon}</span>
                {!collapsed && item.label}
              </Link>
            );
          })}
        </nav>

        {/* 折叠按钮 */}
        <div
          onClick={() => setCollapsed(!collapsed)}
          style={{
            padding: "12px 16px",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            cursor: "pointer",
            textAlign: "center",
            fontSize: 14,
            color: "rgba(255,255,255,0.65)",
          }}
        >
          {collapsed ? "▶" : "◀ 折叠"}
        </div>
      </aside>

      {/* 主区域 */}
      <div style={{ marginLeft: collapsed ? 60 : 240, flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        {/* 顶栏 */}
        <header
          style={{
            height: 64,
            background: "#fff",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: "0 24px",
            gap: 16,
            position: "sticky",
            top: 0,
            zIndex: 50,
          }}
        >
          <span style={{ fontSize: 14, color: "#666" }}>
            {adminUser?.name || "管理员"}
            <span style={{ marginLeft: 8, padding: "2px 8px", background: "#e6f7ff", borderRadius: 4, fontSize: 12, color: "#1890ff" }}>
              {adminUser?.role === "admin" ? "超级管理员" : "运营管理员"}
            </span>
          </span>
          <button
            onClick={handleLogout}
            style={{
              padding: "6px 16px",
              background: "#fff",
              border: "1px solid #d9d9d9",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            退出登录
          </button>
        </header>

        {/* 内容区 */}
        <main style={{ flex: 1, background: "#f5f5f5", padding: 24 }}>
          {children}
        </main>
      </div>
    </div>
  );
}