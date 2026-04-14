"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar?: string | null;
  vipLevel: number;
  points: number;
}

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 检查登录状态
    let token: string | null = null;
    try {
      token =
        typeof window !== "undefined"
          ? localStorage.getItem("seekname_token")
          : null;
    } catch {}

    if (token) {
      // 尝试从缓存读取用户信息
      try {
        const cached = localStorage.getItem("seekname_user");
        if (cached) {
          setUser(JSON.parse(cached));
        }
      } catch {}

      // 验证 session（带 credentials 以发送 cookie）
      fetch("/api/auth/session", {
        credentials: "same-origin",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.user) {
            setUser(data.user);
            localStorage.setItem("seekname_user", JSON.stringify(data.user));
          } else {
            localStorage.removeItem("seekname_token");
            localStorage.removeItem("seekname_user");
            setUser(null);
          }
        })
        .catch(() => {});
    }
  }, []);

  // 点击外部关闭下拉菜单（只在 dropdown 区域外触发）
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const handleLogout = async () => {
    if (typeof window === "undefined") return;
    try {
      await fetch("/api/auth/session", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch {}
    localStorage.removeItem("seekname_token");
    localStorage.removeItem("seekname_user");
    setUser(null);
    setDropdownOpen(false);
    router.push("/");
    router.refresh();
  };

  return (
    <header
      style={{
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(232,106,23,0.12)",
        padding: "12px 0",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: "#4A3428",
            textDecoration: "none",
            fontFamily: "'Noto Serif SC', serif",
            letterSpacing: 3,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          寻名
        </Link>

        {/* 桌面导航 —— 只保留核心入口，账号相关放入头像下拉 */}
        <nav
          style={{ display: "flex", gap: 32, alignItems: "center" }}
          className="desktop-nav"
        >
          <Link
            href="/"
            style={{
              fontSize: 15,
              color: "#6B5A4E",
              textDecoration: "none",
              fontFamily: "'Noto Sans SC', sans-serif",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.color = "#E86A17")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.color = "#6B5A4E")
            }
          >
            首页
          </Link>

          {/* 用户区域 */}
          {!user ? (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Link href="/login">
                <button
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "#E86A17";
                    (e.currentTarget as HTMLElement).style.color = "#E86A17";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "#DDD0C0";
                    (e.currentTarget as HTMLElement).style.color = "#6B5A4E";
                  }}
                  style={{
                    padding: "7px 18px",
                    borderRadius: 8,
                    border: "1px solid #DDD0C0",
                    background: "transparent",
                    cursor: "pointer",
                    fontFamily: "'Noto Sans SC', sans-serif",
                    fontSize: 14,
                    transition: "all 0.2s",
                  }}
                >
                  登录
                </button>
              </Link>
              <Link href="/register">
                <button
                  onMouseEnter={(e) =>
                    ((
                      e.currentTarget as HTMLElement
                    ).style.background = "#D55A0B")
                  }
                  onMouseLeave={(e) =>
                    ((
                      e.currentTarget as HTMLElement
                    ).style.background = "#E86A17")
                  }
                  style={{
                    padding: "7px 18px",
                    borderRadius: 8,
                    border: "none",
                    background: "#E86A17",
                    color: "#FFF",
                    cursor: "pointer",
                    fontFamily: "'Noto Sans SC', sans-serif",
                    fontSize: 14,
                    fontWeight: 500,
                    transition: "background 0.2s",
                  }}
                >
                  注册
                </button>
              </Link>
            </div>
          ) : (
            /* 已登录 - 头像 + 下拉菜单 */
            <div ref={dropdownRef} style={{ position: "relative" }}>
              {/* 头像/昵称触发区 */}
              <div
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: 20,
                  transition: "background 0.2s",
                  border: dropdownOpen
                    ? "1px solid #E86A17"
                    : "1px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (!dropdownOpen)
                    (e.currentTarget as HTMLElement).style.background =
                      "rgba(232,106,23,0.06)";
                }}
                onMouseLeave={(e) => {
                  if (!dropdownOpen)
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                }}
              >
                {/* 头像 */}
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt=""
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "2px solid #E86A17",
                    }}
                  />
                ) : (
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background: "#E86A17",
                      color: "#FFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: "'Noto Sans SC', sans-serif",
                    }}
                  >
                    {(user.name || user.email || user.phone || "?")
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                )}
                <span
                  style={{
                    fontSize: 14,
                    color: "#4A3428",
                    maxWidth: 80,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontFamily: "'Noto Sans SC', sans-serif",
                  }}
                >
                  {user.name || user.email || user.phone || "用户"}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: "#999",
                    transform: dropdownOpen
                      ? "rotate(180deg)"
                      : "rotate(0)",
                    transition: "transform 0.2s",
                    display: "inline-block",
                  }}
                >
                  ▼
                </span>
              </div>

              {/* 下拉菜单 */}
              {dropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    width: 200,
                    background: "rgba(255,255,255,0.97)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    borderRadius: 12,
                    boxShadow:
                      "0 8px 32px rgba(74,52,40,0.18), 0 2px 8px rgba(74,52,40,0.08)",
                    border: "1px solid rgba(232,106,23,0.12)",
                    padding: "8px 0",
                    zIndex: 200,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* 用户信息 */}
                  <div
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid #EEE8DD",
                      marginBottom: 4,
                    }}
                  >
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#4A3428",
                        margin: 0,
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
                          fontFamily: "'Noto Sans SC', sans-serif",
                          marginTop: 2,
                          display: "block",
                        }}
                      >
                        VIP {user.vipLevel}
                      </span>
                    )}
                  </div>

                  {/* 菜单项：我的订单 + 账号设置 + 退出 */}
                  {[
                    {
                      label: "📋 我的订单",
                      href: "/orders",
                      desc: "查看起名历史记录",
                    },
                    {
                      label: "⚙️ 账号设置",
                      href: "/settings",
                      desc: "头像/个人信息管理",
                    },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setDropdownOpen(false)}
                      style={{
                        display: "block",
                        padding: "10px 16px",
                        textDecoration: "none",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        ((
                          e.currentTarget as HTMLElement
                        ).style.background = "rgba(232,106,23,0.06)")
                      }
                      onMouseLeave={(e) =>
                        ((
                          e.currentTarget as HTMLElement
                        ).style.background = "transparent")
                      }
                    >
                      <div
                        style={{
                          fontSize: 14,
                          color: "#4A3428",
                          fontFamily: "'Noto Sans SC', sans-serif",
                        }}
                      >
                        {item.label}
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

                  {/* 分割线 */}
                  <hr
                    style={{
                      border: "none",
                      borderTop: "1px solid #EEE8DD",
                      margin: "6px 0",
                    }}
                  />

                  {/* 退出登录 */}
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
                      ((
                        e.currentTarget as HTMLElement
                      ).style.background = "rgba(192,57,43,0.05)")
                    }
                    onMouseLeave={(e) =>
                      ((
                        e.currentTarget as HTMLElement
                      ).style.background = "transparent")
                    }
                  >
                    退出登录
                  </button>
                </div>
              )}
            </div>
          )}
        </nav>

        {/* 移动端菜单按钮 */}
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
          <span
            style={{
              width: 22,
              height: 2,
              background: "#4A3428",
              borderRadius: 1,
              transform: mobileMenuOpen
                ? "rotate(45deg) translate(5px,5px)"
                : "none",
              transition: "transform 0.2s",
            }}
          />
          <span
            style={{
              width: 22,
              height: 2,
              background: "#4A3428",
              borderRadius: 1,
              opacity: mobileMenuOpen ? 0 : 1,
              transition: "opacity 0.2s",
            }}
          />
          <span
            style={{
              width: 22,
              height: 2,
              background: "#4A3428",
              borderRadius: 1,
              transform: mobileMenuOpen
                ? "rotate(-45deg) translate(5px,-5px)"
                : "none",
              transition: "transform 0.2s",
            }}
          />
        </button>
      </div>

      {/* 移动端下拉菜单 */}
      {mobileMenuOpen && (
        <div
          className="mobile-menu"
          style={{
            borderTop: "1px solid rgba(232,106,23,0.1)",
            padding: "16px 24px",
            background: "rgba(255,255,255,0.95)",
          }}
        >
          <nav
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontSize: 15,
                color: "#4A3428",
                textDecoration: "none",
                fontFamily: "'Noto Sans SC', sans-serif",
                padding: "6px 0",
              }}
            >
              首页
            </Link>
            <Link
              href="/personal"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontSize: 15,
                color: "#4A3428",
                textDecoration: "none",
                fontFamily: "'Noto Sans SC', sans-serif",
                padding: "6px 0",
              }}
            >
              起名服务
            </Link>

            {user ? (
              <>
                <Link
                  href="/orders"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    fontSize: 15,
                    color: "#4A3428",
                    textDecoration: "none",
                    fontFamily: "'Noto Sans SC', sans-serif",
                    padding: "6px 0",
                  }}
                >
                  📋 我的订单
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    fontSize: 15,
                    color: "#4A3428",
                    textDecoration: "none",
                    fontFamily: "'Noto Sans SC', sans-serif",
                    padding: "6px 0",
                  }}
                >
                  ⚙️ 账号设置
                </Link>
                <div
                  style={{ borderTop: "1px solid #EEE8DD", paddingTop: 10 }}
                >
                  <p
                    style={{
                      fontSize: 13,
                      color: "#888",
                      margin: "0 0 4px 0",
                      fontFamily: "'Noto Sans SC', sans-serif",
                    }}
                  >
                    当前用户：
                  </p>
                  <p
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: "#4A3428",
                      margin: "0",
                      fontFamily: "'Noto Sans SC', sans-serif",
                    }}
                  >
                    {user.name || user.email || user.phone || "用户"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #CCC",
                    background: "none",
                    borderRadius: 8,
                    color: "#666",
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
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: "block",
                    marginTop: 8,
                    textAlign: "center",
                    padding: "10px",
                    border: "1px solid #E86A17",
                    borderRadius: 8,
                    color: "#E86A17",
                    textDecoration: "none",
                    fontSize: 15,
                    fontFamily: "'Noto Sans SC', sans-serif",
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
                  }}
                >
                  注册
                </Link>
              </>
            )}
          </nav>
        </div>
      )}

      {/* 用 Tailwind class 控制响应式，避免 styled-jsx 在 App Router 的兼容性问题 */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
        @media (min-width: 769px) {
          .mobile-menu { display: none !important; }
        }
      `}} />
    </header>
  );
}
