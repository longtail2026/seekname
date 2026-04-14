"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, User } from "@/contexts/AuthContext";

/* ═══════════ 导航数据结构 ═══════════ */
const personalSubmenu = [
  { label: "宝宝起名", href: "/personal?type=baby", desc: "新生儿起名" },
  { label: "成人改名", href: "/personal?type=adult", desc: "成年改名" },
  { label: "英文起名", href: "/personal?type=english", desc: "英文名字" },
  { label: "社交网名", href: "/personal?type=nickname", desc: "网名昵称" },
];

const businessSubmenu = [
  { label: "公司起名", href: "/company?type=company", desc: "企业名称" },
  { label: "品牌起名", href: "/company?type=brand", desc: "品牌命名" },
  { label: "项目起名", href: "/company?type=project", desc: "项目代号" },
  { label: "店铺起名", href: "/company?type=shop", desc: "店面招牌" },
  { label: "跨境电商英文起名", href: "/company?type=ecommerce", desc: "跨境英文" },
];

const mainNavItems = [
  {
    label: "人名起名",
    href: "/personal",
    submenu: personalSubmenu,
  },
  {
    label: "商业起名",
    href: "/company",
    submenu: businessSubmenu,
  },
  {
    label: "宠物起名",
    href: "/pet",
  },
  {
    label: "好名测评",
    href: "/evaluate",
  },
];

export default function Header() {
  const { user, logout } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [openSubmenuKey, setOpenSubmenuKey] = useState<string | null>(null);
  const router = useRouter();
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭用户下拉菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        userDropdownOpen &&
        userDropdownRef.current &&
        !userDropdownRef.current.contains(e.target as Node)
      ) {
        setUserDropdownOpen(false);
      }
      // 点击任何导航区域外关闭子菜单
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

  /* ═══════════ 双细线回纹线框按钮样式 ═══════════ */
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
    /* 外层边框 - 金色细线 */
    border: "0.5px solid transparent",
    borderRadius: 6,
    outline: "none",
  };

  return (
    <header
      style={{
        background: "rgba(255,252,247,0.92)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        borderBottom: "1px solid rgba(212,148,26,0.18)",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        boxShadow: "0 1px 8px rgba(45,27,14,0.06)",
        height: 60,
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
      }}
    >
      {/* Single row: Banner(left) | Nav(center) | Search+User(right) */}
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 24px",
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        {/* Left: Banner image (圆角) */}
        <Link
          href="/"
          style={{ textDecoration: "none", display: "flex", alignItems: "center", flexShrink: 0 }}
        >
          <img
            src="/images/banner.png"
            alt="寻名网"
            style={{
              width: 234,
              height: 50,
              objectFit: "contain",
              display: "block",
              borderRadius: 10,
            }}
          />
        </Link>

        {/* Center: 主导航 */}
        <nav
          className="desktop-nav"
          style={{
            flex: "1 1 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            padding: "0 12px",
          }}
        >
          {/* 首页 */}
          <Link
            href="/"
            className="nav-item"
            style={{
              ...navItemStyle,
              color: openSubmenuKey === null ? "#E86A17" : "#4A3428",
            }}
            onMouseEnter={(e) => {
              setOpenSubmenuKey(null);
              (e.currentTarget as HTMLElement).style.color = "#E86A17";
            }}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = "#4A3428"}
          >
            首页
          </Link>

          {/* 带下拉的导航项 */}
          {mainNavItems.map((item) => (
            <div
              key={item.label}
              className="nav-submenu-trigger"
              style={{ position: "relative" }}
              onMouseEnter={() => setOpenSubmenuKey(item.label)}
            >
              <Link
                href={item.href}
                style={{
                  ...navItemStyle,
                  color:
                    openSubmenuKey === item.label ? "#E86A17" : "#4A3428",
                  gap: 4,
                }}
              >
                {item.label}
                {item.submenu && (
                  <span
                    style={{
                      fontSize: 9,
                      marginLeft: 2,
                      transition: "transform 0.2s",
                      display: "inline-block",
                      transform:
                        openSubmenuKey === item.label
                          ? "rotate(180deg)"
                          : "rotate(0)",
                    }}
                  >
                    ▼
                  </span>
                )}
              </Link>

              {/* 下拉子菜单 */}
              {item.submenu && openSubmenuKey === item.label && (
                <div
                  className="nav-submenu-panel"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    /* 与主菜单按钮完全等宽 */
                    width: "100%",
                    background: "rgba(255,255,255,0.98)",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    borderRadius: 10,
                    boxShadow:
                      "0 6px 24px rgba(74,52,40,0.12), 0 2px 6px rgba(74,52,40,0.06)",
                    border: "1px solid rgba(212,148,26,0.18)",
                    padding: "6px 0",
                    zIndex: 2000,
                    textAlign: "center",
                  }}
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                  }}
                  onMouseLeave={() => setOpenSubmenuKey(null)}
                >
                  {item.submenu.map((sub) => (
                    <Link
                      key={sub.label}
                      href={sub.href}
                      onClick={() => setOpenSubmenuKey(null)}
                      style={{
                        display: "block",
                        padding: "9px 16px",
                        textDecoration: "none",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLElement).style.background =
                          "rgba(232,106,23,0.05)")
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLElement).style.background =
                          "transparent")
                      }
                    >
                      <div
                        style={{
                          fontSize: 13,
                          color: "#4A3428",
                          fontFamily: "'Noto Sans SC', sans-serif",
                        }}
                      >
                        {sub.label}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#BBB",
                          fontFamily: "'Noto Sans SC', sans-serif",
                          marginTop: 1,
                        }}
                      >
                        {sub.desc}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Right: 搜索 + 注册/登录 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {/* 站内搜索框 */}
          <form onSubmit={handleSearchSubmit} className="desktop-nav">
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索名字、典籍..."
                style={{
                  width: 200,
                  height: 32,
                  padding: "0 36px 0 14px",
                  fontSize: 13,
                  borderRadius: 20,
                  border: "1px solid #DDD0C0",
                  background: "rgba(255,255,255,0.9)",
                  color: "#4A3428",
                  fontFamily: "'Noto Sans SC', sans-serif",
                  outline: "none",
                  transition: "border-color 0.25s, box-shadow 0.25s",
                }}
                onFocus={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = "#D4941A";
                  (e.target as HTMLInputElement).style.boxShadow = "0 0 0 3px rgba(212,148,26,0.1)";
                }}
                onBlur={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = "#DDD0C0";
                  (e.target as HTMLInputElement).style.boxShadow = "none";
                }}
              />
              <button
                type="submit"
                onClick={handleSearchSubmit}
                style={{
                  position: "absolute",
                  right: 2,
                  top: 2,
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  border: "none",
                  background: "#E86A17",
                  color: "#FFF",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  padding: 0,
                }}
                title="搜索"
              >
                🔍
              </button>
            </div>
          </form>

          {/* 注册 / 登录 或 用户头像下拉 */}
        {!user ? (
          <div
            style={{ display: "flex", gap: 8, alignItems: "center" }}
            className="desktop-nav"
          >
            <Link href="/register">
              <button
                className="nav-item"
                style={{
                  ...navItemStyle,
                  borderColor: "transparent",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.color = "#E86A17";
                  el.style.borderColor = "rgba(232,106,23,0.3)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.color = "#4A3428";
                  el.style.borderColor = "transparent";
                }}
              >
                注册
              </button>
            </Link>
            <Link href="/login">
              <button
                className="nav-item"
                style={{
                  ...navItemStyle,
                  background: "linear-gradient(135deg, #E86A17 0%, #D55A0B 100%)",
                  color: "#FFF",
                  borderColor: "rgba(232,106,23,0.5)",
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    "0 2px 12px rgba(232,106,23,0.35)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                }}
              >
                登录
              </button>
            </Link>
          </div>
        ) : (
          <div ref={userDropdownRef} style={{ position: "relative" }} className="desktop-nav">
            {/* 头像/昵称触发区 */}
            <div
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                cursor: "pointer",
                padding: "4px 10px",
                borderRadius: 24,
                transition: "all 0.2s",
                border: userDropdownOpen
                  ? "1px solid rgba(232,106,23,0.4)"
                  : "1px solid transparent",
                background: userDropdownOpen ? "rgba(232,106,23,0.04)" : "transparent",
              }}
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt=""
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "2px solid #D4941A",
                  }}
                />
              ) : (
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #E86A17 0%, #D4941A 100%)",
                    color: "#FFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    fontFamily: "'Noto Sans SC', sans-serif",
                  }}
                >
                  {(user.name || user.email || user.phone || "?").charAt(0).toUpperCase()}
                </span>
              )}
              <span
                style={{
                  fontSize: 13,
                  color: "#4A3428",
                  maxWidth: 80,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontFamily: "'Noto Sans SC', sans-serif",
                }}
              >
                {user.name || user.email?.split("@")[0] || "用户"}
              </span>
              <span
                style={{
                  fontSize: 9,
                  color: "#AAA",
                  transform: userDropdownOpen ? "rotate(180deg)" : "rotate(0)",
                  transition: "transform 0.2s",
                  display: "inline-block",
                }}
              >
                ▼
              </span>
            </div>

            {/* 用户下拉面板 */}
            {userDropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  width: 210,
                  background: "rgba(255,255,255,0.98)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  borderRadius: 12,
                  boxShadow:
                    "0 8px 32px rgba(74,52,40,0.15), 0 2px 8px rgba(74,52,40,0.08)",
                  border: "1px solid rgba(212,148,26,0.2)",
                  padding: "8px 0",
                  zIndex: 2000,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* 用户信息区 */}
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #EEE8DD",
                    marginBottom: 4,
                  }}
                >
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#4A3428",
                      margin: "0 0 2px 0",
                      fontFamily: "'Noto Sans SC', sans-serif",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {user.name || "未设置昵称"}
                  </p>
                  {user.vipLevel > 0 && (
                    <span
                      style={{
                        fontSize: 11,
                        color: "#E86A17",
                        fontFamily: "'Noto Serif SC', serif",
                        display: "inline-block",
                        padding: "1px 6px",
                        background: "rgba(232,106,23,0.08)",
                        borderRadius: 4,
                        letterSpacing: "0.05em",
                      }}
                    >
                      VIP {user.vipLevel} · {user.points} 积分
                    </span>
                  )}
                </div>

                {/* 菜单项 */}
                {[
                  {
                    icon: "📋",
                    label: "我的订单",
                    href: "/orders",
                    desc: "查看起名历史记录",
                  },
                  {
                    icon: "⚙️",
                    label: "账号设置",
                    href: "/settings",
                    desc: "头像与个人信息管理",
                  },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setUserDropdownOpen(false)}
                    style={{
                      display: "block",
                      padding: "10px 16px",
                      textDecoration: "none",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.background =
                        "rgba(232,106,23,0.05)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.background = "transparent")
                    }
                  >
                    <div
                      style={{
                        fontSize: 14,
                        color: "#4A3428",
                        fontFamily: "'Noto Sans SC', sans-serif",
                      }}
                    >
                      {item.icon} {item.label}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#AAA",
                        fontFamily: "'Noto Sans SC', sans-serif",
                        marginTop: 1,
                      }}
                    >
                      {item.desc}
                    </div>
                  </Link>
                ))}

                <hr style={{ border: "none", borderTop: "1px solid #EEE8DD", margin: "6px 0" }} />

                <button
                  onClick={handleLogout}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "10px 16px",
                    border: "none",
                    background: "none",
                    textAlign: "left",
                    fontSize: 14,
                    color: "#C0392B",
                    cursor: "pointer",
                    fontFamily: "'Noto Sans SC', sans-serif",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      "rgba(192,57,43,0.05)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.background = "transparent")
                  }
                >
                  退出登录
                </button>
              </div>
            )}
          </div>
        )}
        </div>{/* End Right: search + auth */}

        {/* 移动端汉堡按钮 */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="mobile-menu-btn"
          style={{
            display: "none",
            flexDirection: "column",
            gap: 5,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
          }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: 22,
                height: 2,
                background: "#4A3428",
                borderRadius: 1,
                transform:
                  mobileMenuOpen && i === 0
                    ? "rotate(45deg) translate(5px,5px)"
                    : mobileMenuOpen && i === 2
                    ? "rotate(-45deg) translate(5px,-5px)"
                    : "none",
                opacity: mobileMenuOpen && i === 1 ? 0 : 1,
                transition: "all 0.2s",
              }}
            />
          ))}
        </button>
      </div>


      {/* ═══ 移动端菜单 ═══ */}
      {mobileMenuOpen && (
        <div
          className="mobile-menu"
          style={{
            borderTop: "1px solid rgba(212,148,26,0.15)",
            padding: "16px 24px",
            background: "rgba(255,255,255,0.97)",
          }}
        >
          {/* 移动端搜索 */}
          <form
            onSubmit={handleSearchSubmit}
            style={{ marginBottom: 14 }}
          >
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索名字、典籍..."
                style={{
                  width: "100%",
                  height: 38,
                  padding: "0 42px 0 14px",
                  fontSize: 14,
                  borderRadius: 22,
                  border: "1px solid #DDD0C0",
                  boxSizing: "border-box",
                  fontFamily: "'Noto Sans SC', sans-serif",
                  color: "#4A3428",
                  outline: "none",
                }}
              />
              <button
                type="submit"
                style={{
                  position: "absolute",
                  right: 4,
                  top: 4,
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  border: "none",
                  background: "#E86A17",
                  color: "#FFF",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                🔍
              </button>
            </div>
          </form>

          <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontSize: 15,
                color: "#4A3428",
                textDecoration: "none",
                fontFamily: "'Noto Sans SC', sans-serif",
                padding: "10px 0",
                borderBottom: "1px solid #F5EDE0",
                fontWeight: 600,
              }}
            >
              🏠 首页
            </Link>

            {/* 人名起名 */}
            <MobileSubSection
              title="人名起名"
              items={personalSubmenu}
              onClose={() => setMobileMenuOpen(false)}
            />

            {/* 商业起名 */}
            <MobileSubSection
              title="商业起名"
              items={businessSubmenu}
              onClose={() => setMobileMenuOpen(false)}
            />

            <Link
              href="/pet"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontSize: 15,
                color: "#4A3428",
                textDecoration: "none",
                fontFamily: "'Noto Sans SC', sans-serif",
                padding: "10px 0",
                borderBottom: "1px solid #F5EDE0",
              }}
            >
              🐾 宠物起名
            </Link>

            <Link
              href="/evaluate"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontSize: 15,
                color: "#4A3428",
                textDecoration: "none",
                fontFamily: "'Noto Sans SC', sans-serif",
                padding: "10px 0",
                borderBottom: "1px solid #F5EDE0",
              }}
            >
              ✨ 好名测评
            </Link>

            {user ? (
              <>
                <hr style={{ border: "none", borderTop: "1px solid #EEE8DD", margin: "8px 0" }} />
                <Link
                  href="/orders"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    fontSize: 14,
                    color: "#4A3428",
                    textDecoration: "none",
                    fontFamily: "'Noto Sans SC', sans-serif",
                    padding: "8px 0",
                  }}
                >
                  📋 我的订单
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    fontSize: 14,
                    color: "#4A3428",
                    textDecoration: "none",
                    fontFamily: "'Noto Sans SC', sans-serif",
                    padding: "8px 0",
                  }}
                >
                  ⚙️ 账号设置
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "10px",
                    marginTop: 8,
                    border: "1px solid #DDD0C0",
                    background: "none",
                    borderRadius: 8,
                    color: "#C0392B",
                    fontSize: 14,
                    cursor: "pointer",
                    fontFamily: "'Noto Sans SC', sans-serif",
                  }}
                >
                  退出登录
                </button>
              </>
            ) : (
              <>
                <hr style={{ border: "none", borderTop: "1px solid #EEE8DD", margin: "8px 0" }} />
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "10px",
                    border: "1px solid #E86A17",
                    borderRadius: 8,
                    color: "#E86A17",
                    textDecoration: "none",
                    fontSize: 15,
                    fontFamily: "'Noto Sans SC', sans-serif",
                    marginTop: 4,
                  }}
                >
                  登录
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "10px",
                    background: "#E86A17",
                    borderRadius: 8,
                    color: "#FFF",
                    textDecoration: "none",
                    fontSize: 15,
                    fontFamily: "'Noto Sans SC', sans-serif",
                    marginTop: 8,
                  }}
                >
                  注册
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

        /* ═══ 双细线回纹线框效果（所有导航项 hover） ═══ */
        .nav-submenu-trigger > a {
          position: relative;
          border-image: none !important;
        }
        .nav-submenu-trigger > a::before,
        .nav-item::before {
          content: '';
          position: absolute;
          inset: -3px;
          border: 0.5px solid #D4C9B0;
          border-radius: 6px;
          opacity: 0;
          transition: opacity 0.2s;
          pointer-events: none;
          z-index: -1;
        }
        .nav-submenu-trigger > a::after,
        .nav-item::after {
          content: '';
          position: absolute;
          inset: -1px;
          border: 0.5px solid #D4941A;
          border-radius: 5px;
          opacity: 0;
          transition: opacity 0.2s;
          pointer-events: none;
          z-index: -1;
        }
        .nav-submenu-trigger:hover a::before,
        .nav-item:hover::before { opacity: 0.6; }
        .nav-submenu-trigger:hover a::after,
        .nav-item:hover::after { opacity: 0.3; }
      `}} />
    </header>
  );
}

/* ─── 移动端子菜单折叠组件 ─── */
function MobileSubSection({
  title,
  items,
  onClose,
}: {
  title: string;
  items: { label: string; href: string; desc: string }[];
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{ borderBottom: "1px solid #F5EDE0" }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 0",
          border: "none",
          background: "none",
          fontSize: 15,
          color: "#4A3428",
          cursor: "pointer",
          fontFamily: "'Noto Sans SC', sans-serif",
          textAlign: "left",
        }}
      >
        <span>{title}</span>
        <span
          style={{
            fontSize: 10,
            transition: "transform 0.2s",
            display: "inline-block",
            transform: expanded ? "rotate(180deg)" : "rotate(0)",
          }}
        >
          ▼
        </span>
      </button>
      {expanded &&
        items.map((sub) => (
          <Link
            key={sub.label}
            href={sub.href}
            onClick={onClose}
            style={{
              display: "block",
              padding: "7px 0 7px 20px",
              fontSize: 13,
              color: "#6B5A4E",
              textDecoration: "none",
              fontFamily: "'Noto Sans SC', sans-serif",
            }}
          >
            {sub.label}
            <span style={{ fontSize: 11, color: "#BBB", marginLeft: 6 }}>{sub.desc}</span>
          </Link>
        ))}
    </div>
  );
}
