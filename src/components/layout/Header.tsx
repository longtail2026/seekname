"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, X, Search, ChevronDown, User, LogOut, Settings, Crown } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

const Header = () => {
  const router = useRouter();
  const { user, logout, loading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  // 获取显示名称
  const displayName = user?.name || user?.email?.split("@")[0] || user?.phone || "用户";

  // 处理登出
  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
  };

  const navItems = [
    { name: "首页", href: "/" },
    {
      name: "个人起名",
      href: "#",
      dropdown: [
        { name: "宝宝起名", href: "/baby" },
        { name: "成人改名", href: "/rename" },
      ],
    },
    {
      name: "公司起名",
      href: "#",
      dropdown: [
        { name: "公司起名", href: "/company" },
        { name: "品牌起名", href: "/brand" },
        { name: "项目起名", href: "/project" },
      ],
    },
    { name: "宠物起名", href: "/pet" },
    { name: "名字测评", href: "/evaluate" },
    { name: "博客", href: "/blog" },
  ];

  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50 border-b shadow-sm"
      style={{ 
        background: 'rgba(253, 250, 244, 0.95)', 
        backdropFilter: 'blur(8px)',
        borderColor: '#E5DDD3'
      }}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 py-2">
          {/* Logo - 印章风格 */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="flex items-center">
              {/* 印章Logo */}
              <div 
                className="w-12 h-12 flex items-center justify-center mr-3 transition-all duration-300 group-hover:scale-105"
                style={{ 
                  background: '#C84A2A',
                  border: '2px solid #A63A1E',
                  boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.1)'
                }}
              >
                <span 
                  className="text-white text-xl font-bold tracking-wider"
                  style={{ fontFamily: "'Noto Serif SC', serif" }}
                >
                  名
                </span>
              </div>
              <div className="flex flex-col">
                <span 
                  className="text-2xl font-bold text-[#2C1810]"
                  style={{ fontFamily: "'Noto Serif SC', serif" }}
                >
                  寻名网
                </span>
                <span className="text-xs text-[#5C4A42]">www.seekname.cn</span>
              </div>
            </div>
            <div className="hidden md:block ml-4 pl-4 border-l border-[#C9A84C]/30">
              <span 
                className="text-sm text-[#5C4A42]"
                style={{ fontFamily: "'Noto Serif SC', serif" }}
              >
                寻一个好名，许一个未来
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => (
              <div
                key={item.name}
                className="relative"
                onMouseEnter={() => item.dropdown && setActiveDropdown(item.name)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <Link
                  href={item.href}
                  className="flex items-center px-4 py-2 text-sm font-medium transition-all duration-200 nav-menu-item"
                  style={{ 
                    color: '#2C1810',
                    fontFamily: "'Noto Serif SC', serif"
                  }}
                >
                  {item.name}
                  {item.dropdown && (
                    <ChevronDown className="ml-1 w-4 h-4" />
                  )}
                </Link>
                
                {/* Dropdown Menu - 悬停显示 */}
                {item.dropdown && (
                  <div 
                    className={`absolute top-full mt-[12px] py-1.5 transition-all duration-200 ${
                      activeDropdown === item.name 
                        ? 'opacity-100 visible translate-y-0' 
                        : 'opacity-0 invisible -translate-y-2'
                    }`}
                    style={{ 
                      background: '#FDFAF4',
                      border: '1px solid #E5DDD3',
                      boxShadow: '0 4px 12px rgba(44, 24, 16, 0.08)',
                      left: '-6px',
                      right: '-6px'
                    }}
                  >
                    {item.dropdown.map((subItem) => (
                      <Link
                        key={subItem.name}
                        href={subItem.href}
                        className="block px-4 py-1.5 text-sm text-center transition-all duration-200"
                        style={{ 
                          color: '#2C1810',
                          fontFamily: "'Noto Serif SC', serif"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#F8F3EA';
                          e.currentTarget.style.color = '#C84A2A';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = '#2C1810';
                        }}
                      >
                        {subItem.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-3">
            {/* Search Input */}
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="搜索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className="w-40 lg:w-48 pl-4 pr-10 py-2 text-sm transition-all duration-200 outline-none"
                style={{
                  fontFamily: "'Noto Serif SC', serif",
                  color: '#2C1810',
                  background: isSearchFocused ? '#F8F3EA' : 'transparent',
                  border: isSearchFocused ? '1px solid #C9A84C' : '1px solid #E5DDD3',
                }}
              />
              <button
                type="submit"
                className="absolute right-0 top-0 h-full px-3 flex items-center justify-center transition-colors duration-200"
                style={{ color: isSearchFocused ? '#C84A2A' : '#5C4A42' }}
                aria-label="搜索"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {/* 用户状态：已登录 → 头像+下拉菜单；未登录 → 登录/注册按钮 */}
            {user ? (
              <div
                className="relative hidden md:block"
                onMouseEnter={() => setUserMenuOpen(true)}
                onMouseLeave={() => setUserMenuOpen(false)}
              >
                {/* 用户头像/名称 */}
                <button
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-xl transition-all duration-200"
                  style={{
                    background: userMenuOpen ? "rgba(248,243,234,0.9)" : "transparent",
                    border: `1px solid ${userMenuOpen ? "#DDD0C0" : "transparent"}`,
                  }}
                  aria-label="用户菜单"
                >
                  {/* 头像占位 - 姓名首字或印章风格 */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                    style={{
                      background: "linear-gradient(135deg, #C84A2A, #E86A17)",
                      fontFamily: "'Noto Serif SC', serif",
                    }}
                  >
                    {(displayName.charAt(0) || "用").toUpperCase()}
                  </div>
                  <span
                    className="text-sm font-medium max-w-[80px] truncate"
                    style={{ fontFamily: "'Noto Sans SC', sans-serif", color: "#2C1810" }}
                  >
                    {displayName}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`} style={{ color: "#B0AAA0" }} />
                </button>

                {/* 用户下拉菜单 */}
                <div
                  className={`absolute right-0 mt-2 w-52 py-2 rounded-xl transition-all duration-200 ${
                    userMenuOpen
                      ? "opacity-100 visible translate-y-0"
                      : "opacity-0 invisible -translate-y-2"
                  }`}
                  style={{
                    background: "#FDFAF4",
                    border: "1px solid #E5DDD3",
                    boxShadow: "0 6px 20px rgba(44,24,16,0.10)",
                  }}
                >
                  {/* 用户信息头部 */}
                  <div
                    className="px-4 py-3 mb-1 mx-[-0.5rem] rounded-lg"
                    style={{ background: "rgba(232,106,23,0.04)" }}
                  >
                    <p
                      className="text-sm font-medium truncate"
                      style={{ fontFamily: "'Noto Sans SC', sans-serif", color: "#2D1B0E" }}
                    >
                      {displayName}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#999" }}>
                      {user.email || user.phone}
                    </p>
                    {user.vipLevel > 0 && (
                      <span
                        className="inline-flex items-center gap-1 text-xs font-medium mt-1.5 px-2 py-0.5 rounded-full"
                        style={{
                          background: "linear-gradient(135deg, #D4941A, #E8B02E)",
                          color: "#fff",
                          fontFamily: "'Noto Serif SC', serif",
                        }}
                      >
                        <Crown className="w-3 h-3" /> VIP {user.vipLevel}
                      </span>
                    )}
                  </div>

                  {/* 菜单项 */}
                  <Link
                    href="/personal"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-200"
                    style={{ color: "#2C1810", fontFamily: "'Noto Sans SC', sans-serif" }}
                    onClick={() => setUserMenuOpen(false)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#F8F3EA";
                      e.currentTarget.style.color = "#E86A17";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#2C1810";
                    }}
                  >
                    <User className="w-4 h-4" />
                    个人中心
                  </Link>

                  <Link
                    href="/personal/settings"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-200"
                    style={{ color: "#2C1810", fontFamily: "'Noto Sans SC', sans-serif" }}
                    onClick={() => setUserMenuOpen(false)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#F8F3EA";
                      e.currentTarget.style.color = "#E86A17";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#2C1810";
                    }}
                  >
                    <Settings className="w-4 h-4" />
                    账号设置
                  </Link>

                  <div className="my-1 mx-4" style={{ borderTop: "1px solid #EEE5DA" }} />

                  {/* 登出按钮 */}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-all duration-200"
                    style={{ color: "#E85A3A", fontFamily: "'Noto Sans SC', sans-serif" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(232,90,58,0.06)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <LogOut className="w-4 h-4" />
                    退出登录
                  </button>
                </div>
              </div>
            ) : (
              /* 未登录：显示 登录 + 注册 按钮 */
              <>
                {!loading && (
                  <>
                    <Link
                      href={`/login?callbackUrl=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`}
                      className="hidden md:inline-flex px-4 py-2 text-sm font-medium transition-all duration-200 nav-menu-item"
                      style={{
                        color: "#2C1810",
                        fontFamily: "'Noto Serif SC', serif",
                      }}
                    >
                      登录
                    </Link>
                    <Link
                      href={`/register?callbackUrl=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`}
                      className="hidden md:inline-flex px-4 py-2 text-sm font-medium transition-all duration-200 nav-menu-item"
                      style={{
                        color: "#2C1810",
                        fontFamily: "'Noto Serif SC', serif",
                      }}
                    >
                      注册
                    </Link>
                  </>
                )}
              </>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2.5 transition-all duration-200 nav-menu-item"
              style={{ color: '#5C4A42' }}
              aria-label="菜单"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div 
            className="lg:hidden py-6 border-t animate-fadeIn"
            style={{ 
              background: 'rgba(253, 250, 244, 0.98)',
              borderColor: '#E5DDD3'
            }}
          >
            <nav className="flex flex-col space-y-2">
              {navItems.map((item) => (
                <div key={item.name}>
                  <Link
                    href={item.href}
                    className="block px-5 py-3 text-base font-medium transition-all duration-200 nav-menu-item"
                    style={{ 
                      color: '#2C1810',
                      fontFamily: "'Noto Serif SC', serif"
                    }}
                    onClick={() => !item.dropdown && setIsMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                  {item.dropdown && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.dropdown.map((subItem) => (
                        <Link
                          key={subItem.name}
                          href={subItem.href}
                          className="block px-5 py-2 text-sm transition-all duration-200"
                          style={{ 
                            color: '#5C4A42',
                            fontFamily: "'Noto Serif SC', serif"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#C84A2A';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#5C4A42';
                          }}
                          onClick={() => setIsMenuOpen(false)}
                        >
                          {subItem.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="pt-4 border-t mt-4 space-y-2" style={{ borderColor: '#E5DDD3' }}>
                {user ? (
                  <>
                    {/* 已登录：显示用户信息和退出按钮 */}
                    <div
                      className="px-5 py-3 rounded-lg mx-auto"
                      style={{
                        background: "rgba(232,106,23,0.04)",
                        border: "1px solid rgba(232,106,23,0.12)",
                        maxWidth: "240px",
                      }}
                    >
                      <p
                        className="text-base font-medium text-center truncate"
                        style={{ fontFamily: "'Noto Sans SC', sans-serif", color: "#2D1B0E" }}
                      >
                        {displayName}
                      </p>
                      <p className="text-xs text-center mt-0.5" style={{ color: "#999" }}>
                        {user.email || user.phone}
                      </p>
                    </div>
                    <Link
                      href="/personal"
                      className="block px-5 py-3 text-base font-medium text-center transition-all duration-200"
                      style={{
                        color: "#2C1810",
                        fontFamily: "'Noto Serif SC', serif",
                        border: "1px solid #DDD0C0",
                      }}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      个人中心
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full px-5 py-3 text-base font-medium text-center transition-all duration-200"
                      style={{
                        color: "#E85A3A",
                        fontFamily: "'Noto Serif SC', serif",
                        border: "1px solid rgba(232,90,58,0.25)",
                        background: "transparent",
                      }}
                    >
                      退出登录
                    </button>
                  </>
                ) : (
                  !loading && (
                    <>
                      <Link
                        href={`/login?callbackUrl=${encodeURIComponent("/")}`}
                        className="block px-5 py-3 text-base font-medium text-center transition-all duration-200"
                        style={{
                          color: "#2C1810",
                          fontFamily: "'Noto Serif SC', serif",
                          border: "1px solid #C9A84C",
                        }}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        登录
                      </Link>
                      <Link
                        href={`/register?callbackUrl=${encodeURIComponent("/")}`}
                        className="block px-5 py-3 text-base font-medium text-center transition-all duration-200"
                        style={{
                          color: "#2C1810",
                          fontFamily: "'Noto Serif SC', serif",
                          border: "1px solid #C9A84C",
                        }}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        注册
                      </Link>
                    </>
                  )
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
