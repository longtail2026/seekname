"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { useTheme } from "@/contexts/ThemeContext";

/* ═══════════ 导航数据（模块级常量） ═══════════ */
const PERSONAL_SUBMENU = [
  { label: "宝宝起名", href: "/personal?type=baby", desc: "新生儿起名" },
  { label: "成人改名", href: "/personal?type=adult", desc: "成年改名" },
  { label: "英文起名", href: "/personal?type=english", desc: "英文名字" },
  { label: "社交网名", href: "/personal?type=nickname", desc: "网名昵称" },
];
const BUSINESS_SUBMENU = [
  { label: "公司起名", href: "/company?type=company", desc: "企业名称" },
  { label: "品牌起名", href: "/company?type=brand", desc: "品牌命名" },
  { label: "项目起名", href: "/company?type=project", desc: "项目代号" },
  { label: "店铺起名", href: "/company?type=shop", desc: "店面招牌" },
  { label: "跨境电商英文起名", href: "/company?type=ecommerce", desc: "跨境英文" },
];

export default function Header() {
  const { user, logout } = useAuth();
  const { locale, setLocale, t } = useLocale();
  const { isDark, toggleTheme } = useTheme();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [openSubmenuKey, setOpenSubmenuKey] = useState<string | null>(null);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const router = useRouter();
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);

  // 语言菜单外部点击关闭
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langMenuOpen && langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [langMenuOpen]);

  // 用户下拉菜单外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userDropdownOpen && userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
      const target = e.target as HTMLElement;
      if (!target.closest(".nav-submenu-trigger") && !target.closest(".nav-submenu-panel")) {
        setOpenSubmenuKey(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userDropdownOpen]);

  const handleLogout = async () => {
    setUserDropdownOpen(false);
    await logout();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  const isEn = locale === "en";

  const navItemStyle: React.CSSProperties = {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 14px",
    fontSize: 14,
    color: "#4A3428",
    textDecoration: "none",
    fontFamily: "'Noto Sans SC', sans-serif",
    transition: "color 0.2s, border-color 0.2s",
    background: "transparent",
    cursor: "pointer",
    border: "0.5px solid transparent",
    borderRadius: 6,
    outline: "none",
  };

  // 导航项（双语）
  const navItems = [
    {
      label: isEn ? "AI Naming" : "人名起名",
      labelKey: "personal",
      href: "/personal",
      submenu: PERSONAL_SUBMENU,
    },
    {
      label: isEn ? "Business Naming" : "商业起名",
      labelKey: "company",
      href: "/company",
      submenu: BUSINESS_SUBMENU,
    },
    { label: isEn ? "Pet Naming" : "宠物起名", labelKey: "pet", href: "/pet" },
    { label: isEn ? "Name Evaluation" : "好名测评", labelKey: "evaluate", href: "/evaluate" },
    { label: isEn ? "Blog" : "起名杂谈", labelKey: "blog", href: "/blog" },
    { label: isEn ? "Write" : "写文章", labelKey: "write", href: "/blog/write" },
    { label: isEn ? "Collection" : "典藏本", labelKey: "collection", href: "/collection" },
  ];

  return (
    <header
      style={{
        background: "rgba(255,252,247,0.85)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        borderBottom: "1px solid rgba(212,148,26,0.18)",
        position: "fixed",
        top: 0, left: 0, right: 0,
        zIndex: 1000,
        boxShadow: "0 1px 8px rgba(45,27,14,0.06)",
        height: 60,
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
      }}
    >
      <div
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: "0 32px",
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 0,
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", flexShrink: 0 }}>
          <img src="/images/banner.png" alt="SeekName" style={{ width: 220, height: 48, objectFit: "contain", display: "block", borderRadius: 10 }} />
        </Link>

        {/* Right: Nav + Search + Lang + User */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, flex: "1 1 auto", justifyContent: "flex-end" }}>

          {/* 主导航 */}
          <nav className="desktop-nav" style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 2, padding: "0 8px" }}>
            {/* 首页 */}
            <Link href="/" className="nav-item" style={{ ...navItemStyle, color: openSubmenuKey === null ? "#E86A17" : "#4A3428" }}
              onMouseEnter={(e) => { setOpenSubmenuKey(null); (e.currentTarget as HTMLElement).style.color = "#E86A17"; }}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = "#4A3428"}>
              {isEn ? "Home" : "首页"}
            </Link>

            {navItems.map((item) => (
              <div key={item.labelKey} className="nav-submenu-trigger" style={{ position: "relative" }}
                onMouseEnter={() => setOpenSubmenuKey(item.labelKey)}>
                {item.submenu ? (
                  /* 有子菜单的主项：使用span禁止直接跳转 */
                  <span 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    style={{ ...navItemStyle, color: openSubmenuKey === item.labelKey ? "#E86A17" : "#4A3428", gap: 4, cursor: "default" }}
                  >
                    {item.label}
                    <span style={{ fontSize: 9, marginLeft: 2, transition: "transform 0.2s", display: "inline-block", transform: openSubmenuKey === item.labelKey ? "rotate(180deg)" : "rotate(0)" }}>▼</span>
                  </span>
                ) : (
                  /* 无子菜单的项：保持可点击 */
                  <Link href={item.href} style={{ ...navItemStyle, color: openSubmenuKey === item.labelKey ? "#E86A17" : "#4A3428", gap: 4 }}>
                    {item.label}
                  </Link>
                )}
                {item.submenu && openSubmenuKey === item.labelKey && (
                  <div className="nav-submenu-panel" style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, width: "100%", background: "rgba(255,255,255,0.98)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderRadius: 10, boxShadow: "0 6px 24px rgba(74,52,40,0.12), 0 2px 6px rgba(74,52,40,0.06)", border: "1px solid rgba(212,148,26,0.18)", padding: "6px 0", zIndex: 2000, textAlign: "center" }}
                    onMouseEnter={(e) => e.stopPropagation()} onMouseLeave={() => setOpenSubmenuKey(null)}>
                    {item.submenu.map((sub) => (
                      <Link key={sub.label} href={sub.href} onClick={() => setOpenSubmenuKey(null)}
                        style={{ display: "block", padding: "9px 16px", textDecoration: "none", transition: "background 0.15s" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(232,106,23,0.05)")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}>
                        <div style={{ fontSize: 13, color: "#4A3428", fontFamily: "'Noto Sans SC', sans-serif" }}>{sub.label}</div>
                        <div style={{ fontSize: 11, color: "#BBB", fontFamily: "'Noto Sans SC', sans-serif", marginTop: 1 }}>{sub.desc}</div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* 搜索框 */}
          <form onSubmit={handleSearchSubmit} className="desktop-nav" style={{ marginLeft: 8 }}>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isEn ? "Search names, classics..." : "搜索名字、典籍..."}
                style={{ width: 180, height: 32, padding: "0 36px 0 14px", fontSize: 13, borderRadius: 20, border: "1px solid #DDD0C0", background: "rgba(255,255,255,0.9)", color: "#4A3428", fontFamily: "'Noto Sans SC', sans-serif", outline: "none", transition: "border-color 0.25s, box-shadow 0.25s" }}
                onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "#D4941A"; (e.target as HTMLInputElement).style.boxShadow = "0 0 0 3px rgba(212,148,26,0.1)"; }}
                onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "#DDD0C0"; (e.target as HTMLInputElement).style.boxShadow = "none"; }} />
              <button type="submit" style={{ position: "absolute", right: 2, top: 2, width: 28, height: 28, borderRadius: "50%", border: "none", background: "#E86A17", color: "#FFF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, padding: 0 }} title={isEn ? "Search" : "搜索"}>🔍</button>
            </div>
          </form>

          {/* 主题切换 */}
          <button
            onClick={toggleTheme}
            title={isDark ? (isEn ? "Switch to Light Mode" : "切换浅色模式") : (isEn ? "Switch to Dark Mode" : "切换深色模式")}
            style={{ ...navItemStyle, fontSize: 12, padding: "5px 9px", borderRadius: 6, display: "flex", alignItems: "center", gap: 4, border: "1px solid #DDD0C0", background: "#FFF", marginLeft: 6, cursor: "pointer", transition: "all 0.2s" }}
            className="desktop-nav"
          >
            <span style={{ fontSize: 14 }}>{isDark ? "☀️" : "🌙"}</span>
          </button>

          {/* 语言切换器 */}
          <div ref={langMenuRef} style={{ marginLeft: 6, position: "relative" }} className="desktop-nav">
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              style={{ ...navItemStyle, fontSize: 12, padding: "5px 10px", borderRadius: 6, display: "flex", alignItems: "center", gap: 4, border: langMenuOpen ? "1px solid rgba(232,106,23,0.4)" : "1px solid #DDD0C0", background: langMenuOpen ? "rgba(232,106,23,0.06)" : "#FFF" }}
            >
              <span style={{ fontSize: 14 }}>🌐</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: "#4A3428" }}>{isEn ? "EN" : "中"}</span>
            </button>
            {langMenuOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "rgba(255,255,255,0.98)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderRadius: 10, boxShadow: "0 8px 32px rgba(74,52,40,0.15), 0 2px 8px rgba(74,52,40,0.08)", border: "1px solid rgba(212,148,26,0.2)", padding: "6px 0", zIndex: 2000, minWidth: 120, textAlign: "center" }}>
                <button onClick={() => { setLocale("zh"); setLangMenuOpen(false); }}
                  style={{ display: "block", width: "100%", padding: "9px 16px", border: "none", background: "none", cursor: "pointer", fontSize: 13, color: isEn ? "#4A3428" : "#E86A17", fontFamily: "'Noto Sans SC', sans-serif", fontWeight: !isEn ? 600 : 400, transition: "background 0.15s" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(232,106,23,0.05)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "none")}>
                  中文
                </button>
                <button onClick={() => { setLocale("en"); setLangMenuOpen(false); }}
                  style={{ display: "block", width: "100%", padding: "9px 16px", border: "none", background: "none", cursor: "pointer", fontSize: 13, color: isEn ? "#E86A17" : "#4A3428", fontFamily: "'Noto Sans SC', sans-serif", fontWeight: isEn ? 600 : 400, transition: "background 0.15s" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(232,106,23,0.05)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "none")}>
                  English
                </button>
              </div>
            )}
          </div>

          {/* 注册 / 登录 或 用户头像下拉 */}
          <div style={{ marginLeft: 8 }} className="desktop-nav">
          {!user ? (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <Link href="/register">
                <button className="nav-item" style={{ ...navItemStyle, borderColor: "transparent" }}
                  onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = "#E86A17"; el.style.borderColor = "rgba(232,106,23,0.3)"; }}
                  onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = "#4A3428"; el.style.borderColor = "transparent"; }}>
                  {isEn ? "Register" : "注册"}
                </button>
              </Link>
              <Link href="/login">
                <button className="nav-item" style={{ ...navItemStyle, background: "linear-gradient(135deg, #E86A17 0%, #D55A0B 100%)", color: "#FFF", borderColor: "rgba(232,106,23,0.5)", fontWeight: 500 }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(232,106,23,0.35)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
                  {isEn ? "Login" : "登录"}
                </button>
              </Link>
            </div>
          ) : (
            <div ref={userDropdownRef} style={{ position: "relative" }}>
              {/* 头像/昵称触发区 */}
              <div onClick={() => setUserDropdownOpen(!userDropdownOpen)} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", padding: "4px 10px", borderRadius: 24, transition: "all 0.2s", border: userDropdownOpen ? "1px solid rgba(232,106,23,0.4)" : "1px solid transparent", background: userDropdownOpen ? "rgba(232,106,23,0.04)" : "transparent" }}>
                {user.avatar ? (
                  <img src={user.avatar} alt="" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", border: "2px solid #D4941A" }} />
                ) : (
                  <span style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #E86A17 0%, #D4941A 100%)", color: "#FFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>
                    {(user.name || user.email || user.phone || "?").charAt(0).toUpperCase()}
                  </span>
                )}
                <span style={{ fontSize: 13, color: "#4A3428", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "'Noto Sans SC', sans-serif" }}>
                  {user.name || user.email?.split("@")[0] || (isEn ? "User" : "用户")}
                </span>
                <span style={{ fontSize: 9, color: "#AAA", transform: userDropdownOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", display: "inline-block" }}>▼</span>
              </div>

              {/* 用户下拉面板 */}
              {userDropdownOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 210, background: "rgba(255,255,255,0.98)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderRadius: 12, boxShadow: "0 8px 32px rgba(74,52,40,0.15), 0 2px 8px rgba(74,52,40,0.08)", border: "1px solid rgba(212,148,26,0.2)", padding: "8px 0", zIndex: 2000 }}
                  onClick={(e) => e.stopPropagation()}>
                  {/* 用户信息区 */}
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid #EEE8DD", marginBottom: 4 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#4A3428", margin: "0 0 2px 0", fontFamily: "'Noto Sans SC', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {user.name || (isEn ? "No nickname" : "未设置昵称")}
                    </p>
                    {user.vipLevel > 0 && (
                      <span style={{ fontSize: 11, color: "#E86A17", fontFamily: "'Noto Serif SC', serif", display: "inline-block", padding: "1px 6px", background: "rgba(232,106,23,0.08)", borderRadius: 4, letterSpacing: "0.05em" }}>
                        VIP {user.vipLevel} · {user.points} {isEn ? "pts" : "积分"}
                      </span>
                    )}
                  </div>

                  {/* 菜单项 */}
                  {[
                    { icon: "🔍", label: isEn ? "Search Names" : "搜索名字", href: "/search", desc: isEn ? "Search history · favorites" : "搜索历史 · 典藏本" },
                    { icon: "📊", label: isEn ? "Dashboard" : "用户中心", href: "/dashboard", desc: isEn ? "Overview · history · favorites" : "概览 · 起名历史 · 收藏" },
                    { icon: "📋", label: isEn ? "My Orders" : "我的订单", href: "/orders", desc: isEn ? "View naming history" : "查看起名历史记录" },
                    { icon: "📖", label: isEn ? "Name Collection" : "名字典藏本", href: "/collection", desc: isEn ? "Saved names · PDF export" : "收藏的名字 · PDF 导出" },
                    { icon: "⚖️", label: isEn ? "Compare Names" : "名字对比", href: "/compare", desc: isEn ? "Compare up to 3 names" : "最多 3 个名字横向对比" },
                    { icon: "⚙️", label: isEn ? "Settings" : "账号设置", href: "/settings", desc: isEn ? "Profile management" : "头像与个人信息管理" },
                  ].map((item) => (
                    <Link key={item.href} href={item.href} onClick={() => setUserDropdownOpen(false)}
                      style={{ display: "block", padding: "10px 16px", textDecoration: "none", transition: "background 0.15s" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(232,106,23,0.05)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}>
                      <div style={{ fontSize: 14, color: "#4A3428", fontFamily: "'Noto Sans SC', sans-serif" }}>{item.icon} {item.label}</div>
                      <div style={{ fontSize: 11, color: "#AAA", fontFamily: "'Noto Sans SC', sans-serif", marginTop: 1 }}>{item.desc}</div>
                    </Link>
                  ))}

                  <hr style={{ border: "none", borderTop: "1px solid #EEE8DD", margin: "6px 0" }} />
                  <button onClick={handleLogout} style={{ display: "block", width: "100%", padding: "10px 16px", border: "none", background: "none", textAlign: "left", fontSize: 14, color: "#C0392B", cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif", transition: "background 0.15s" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(192,57,43,0.05)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}>
                    {isEn ? "Logout" : "退出登录"}
                  </button>
                </div>
              )}
            </div>
          )}
          </div>
        </div>

        {/* 移动端汉堡按钮 */}
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="mobile-menu-btn"
          style={{ display: "none", flexDirection: "column", gap: 5, background: "none", border: "none", cursor: "pointer", padding: 4 }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ width: 22, height: 2, background: "#4A3428", borderRadius: 1, transform: mobileMenuOpen && i === 0 ? "rotate(45deg) translate(5px,5px)" : mobileMenuOpen && i === 2 ? "rotate(-45deg) translate(5px,-5px)" : "none", opacity: mobileMenuOpen && i === 1 ? 0 : 1, transition: "all 0.2s" }} />
          ))}
        </button>
      </div>

      {/* ═══ 移动端菜单 ═══ */}
      {mobileMenuOpen && (
        <div className="mobile-menu" style={{ borderTop: "1px solid rgba(212,148,26,0.15)", padding: "16px 24px", background: "rgba(255,255,255,0.93)", position: "absolute", top: 60, left: 0, right: 0, zIndex: 999 }}>
          {/* 移动端搜索 */}
          <form onSubmit={handleSearchSubmit} style={{ marginBottom: 14 }}>
            <div style={{ position: "relative" }}>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isEn ? "Search..." : "搜索名字、典籍..."}
                style={{ width: "100%", height: 38, padding: "0 42px 0 14px", fontSize: 14, borderRadius: 22, border: "1px solid #DDD0C0", boxSizing: "border-box", fontFamily: "'Noto Sans SC', sans-serif", color: "#4A3428", outline: "none" }} />
              <button type="submit" style={{ position: "absolute", right: 4, top: 4, width: 30, height: 30, borderRadius: "50%", border: "none", background: "#E86A17", color: "#FFF", cursor: "pointer", fontSize: 14 }}>🔍</button>
            </div>
          </form>

          <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <Link href="/" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: 15, color: "#4A3428", textDecoration: "none", fontFamily: "'Noto Sans SC', sans-serif", padding: "10px 0", borderBottom: "1px solid #F5EDE0", fontWeight: 600 }}>
              🏠 {isEn ? "Home" : "首页"}
            </Link>

            {/* 人名起名 */}
            <MobileSubSection title={isEn ? "AI Naming" : "人名起名"} items={PERSONAL_SUBMENU} onClose={() => setMobileMenuOpen(false)} />
            {/* 商业起名 */}
            <MobileSubSection title={isEn ? "Business Naming" : "商业起名"} items={BUSINESS_SUBMENU} onClose={() => setMobileMenuOpen(false)} />

            {navItems.slice(2).map((item) => (
              <Link key={item.labelKey} href={item.href} onClick={() => setMobileMenuOpen(false)} style={{ fontSize: 15, color: "#4A3428", textDecoration: "none", fontFamily: "'Noto Sans SC', sans-serif", padding: "10px 0", borderBottom: "1px solid #F5EDE0" }}>
                {item.label}
              </Link>
            ))}

            {/* 主题切换 */}
            <button onClick={toggleTheme}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 0", borderBottom: "1px solid #F5EDE0", background: "none", border: "none", cursor: "pointer", fontSize: 15, color: "#4A3428", fontFamily: "'Noto Sans SC', sans-serif" }}>
              {isDark ? "☀️" : "🌙"} {isDark ? (isEn ? "Light Mode" : "浅色模式") : (isEn ? "Dark Mode" : "深色模式")}
            </button>

            {/* 语言切换 */}
            <div style={{ padding: "8px 0", display: "flex", gap: 8 }}>
              <button onClick={() => { setLocale("zh"); setMobileMenuOpen(false); }}
                style={{ flex: 1, padding: "8px", borderRadius: 8, border: "1px solid", borderColor: !isEn ? "#E86A17" : "#DDD0C0", background: !isEn ? "rgba(232,106,23,0.08)" : "transparent", color: !isEn ? "#E86A17" : "#AAA", fontSize: 13, cursor: "pointer" }}>中文</button>
              <button onClick={() => { setLocale("en"); setMobileMenuOpen(false); }}
                style={{ flex: 1, padding: "8px", borderRadius: 8, border: "1px solid", borderColor: isEn ? "#E86A17" : "#DDD0C0", background: isEn ? "rgba(232,106,23,0.08)" : "transparent", color: isEn ? "#E86A17" : "#AAA", fontSize: 13, cursor: "pointer" }}>English</button>
            </div>

            {user ? (
              <>
                <hr style={{ border: "none", borderTop: "1px solid #EEE8DD", margin: "8px 0" }} />
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: 14, color: "#4A3428", textDecoration: "none", fontFamily: "'Noto Sans SC', sans-serif", padding: "8px 0" }}>📊 {isEn ? "Dashboard" : "用户中心"}</Link>
                <Link href="/orders" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: 14, color: "#4A3428", textDecoration: "none", fontFamily: "'Noto Sans SC', sans-serif", padding: "8px 0" }}>📋 {isEn ? "My Orders" : "我的订单"}</Link>
                <Link href="/settings" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: 14, color: "#4A3428", textDecoration: "none", fontFamily: "'Noto Sans SC', sans-serif", padding: "8px 0" }}>⚙️ {isEn ? "Settings" : "账号设置"}</Link>
                <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} style={{ width: "100%", padding: "10px", marginTop: 8, border: "1px solid #DDD0C0", background: "none", borderRadius: 8, color: "#C0392B", fontSize: 14, cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif" }}>
                  {isEn ? "Logout" : "退出登录"}
                </button>
              </>
            ) : (
              <>
                <hr style={{ border: "none", borderTop: "1px solid #EEE8DD", margin: "8px 0" }} />
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} style={{ display: "block", textAlign: "center", padding: "10px", border: "1px solid #E86A17", borderRadius: 8, color: "#E86A17", textDecoration: "none", fontSize: 15, fontFamily: "'Noto Sans SC', sans-serif", marginTop: 4 }}>
                  {isEn ? "Login" : "登录"}
                </Link>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)} style={{ display: "block", textAlign: "center", padding: "10px", background: "#E86A17", borderRadius: 8, color: "#FFF", textDecoration: "none", fontSize: 15, fontFamily: "'Noto Sans SC', sans-serif", marginTop: 8 }}>
                  {isEn ? "Register" : "注册"}
                </Link>
              </>
            )}
          </nav>
        </div>
      )}

      {/* 响应式控制 */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 1023px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
        @media (min-width: 1024px) {
          .mobile-menu { display: none !important; }
          .mobile-menu-btn { display: none !important; }
        }
        .nav-submenu-trigger > a { position: relative; border-image: none !important; }
        .nav-submenu-trigger > a::before, .nav-item::before {
          content: ''; position: absolute; inset: -3px; border: 0.5px solid #D4C9B0; border-radius: 6px; opacity: 0; transition: opacity 0.2s; pointer-events: none; z-index: -1;
        }
        .nav-submenu-trigger > a::after, .nav-item::after {
          content: ''; position: absolute; inset: -1px; border: 0.5px solid #D4941A; border-radius: 5px; opacity: 0; transition: opacity 0.2s; pointer-events: none; z-index: -1;
        }
        .nav-submenu-trigger:hover a::before, .nav-item:hover::before { opacity: 0.6; }
        .nav-submenu-trigger:hover a::after, .nav-item:hover::after { opacity: 0.3; }
      `}} />
    </header>
  );
}

/* ─── 移动端子菜单折叠组件 ─── */
function MobileSubSection({ title, items, onClose }: { title: string; items: { label: string; href: string; desc: string }[]; onClose: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid #F5EDE0" }}>
      <button onClick={() => setExpanded(!expanded)}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", border: "none", background: "none", fontSize: 15, color: "#4A3428", cursor: "pointer", fontFamily: "'Noto Sans SC', sans-serif", textAlign: "left" }}>
        <span>{title}</span>
        <span style={{ fontSize: 10, transition: "transform 0.2s", display: "inline-block", transform: expanded ? "rotate(180deg)" : "rotate(0)" }}>▼</span>
      </button>
      {expanded && items.map((sub) => (
        <Link key={sub.label} href={sub.href} onClick={onClose} style={{ display: "block", padding: "7px 0 7px 20px", fontSize: 13, color: "#6B5A4E", textDecoration: "none", fontFamily: "'Noto Sans SC', sans-serif" }}>
          {sub.label}
          <span style={{ fontSize: 11, color: "#BBB", marginLeft: 6 }}>{sub.desc}</span>
        </Link>
      ))}
    </div>
  );
}
