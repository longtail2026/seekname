"use client";

import { useState } from "react";
import { Menu, X, Search, ChevronDown, Sparkles } from "lucide-react";
import Link from "next/link";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

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
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-primary-100 shadow-lg">
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
          <nav className="hidden lg:flex items-center space-x-2">
            {navItems.map((item) => (
              <div
                key={item.name}
                className="relative"
                onMouseEnter={() => item.dropdown && setActiveDropdown(item.name)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <Link
                  href={item.href}
                  className="flex items-center px-5 py-3 text-sm font-medium text-black hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200 border border-transparent hover:border-primary-200"
                >
                  {item.name}
                  {item.dropdown && (
                    <ChevronDown className="ml-1 w-4 h-4" />
                  )}
                </Link>
                
                {/* Dropdown Menu - 悬停显示 */}
                {item.dropdown && (
                  <div 
                    className={`absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-primary-100 py-3 transition-all duration-200 ${
                      activeDropdown === item.name 
                        ? 'opacity-100 visible translate-y-0' 
                        : 'opacity-0 invisible -translate-y-2'
                    }`}
                  >
                    {item.dropdown.map((subItem) => (
                      <Link
                        key={subItem.name}
                        href={subItem.href}
                        className="block px-4 py-2.5 text-sm text-black hover:text-primary-600 hover:bg-primary-50 transition-all duration-200"
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
          <div className="flex items-center space-x-4">
            {/* Search Button */}
            <button
              className="p-2.5 text-black/70 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200 border border-transparent hover:border-primary-200"
              aria-label="搜索"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Login Button */}
            <Link
              href="/login"
              className="hidden md:inline-flex px-5 py-2.5 text-sm font-medium text-black hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200 border border-transparent hover:border-primary-200"
            >
              登录
            </Link>

            {/* CTA Button */}
            <Link
              href="/personal"
              className="hidden sm:inline-flex px-6 py-3 text-sm font-medium text-white transition-all duration-200 items-center"
              style={{ 
                background: '#C84A2A', 
                border: '1px solid #A63A1E',
                fontFamily: "'Noto Serif SC', serif"
              }}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              免费起名
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2.5 text-black/70 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200 border border-transparent hover:border-primary-200"
              aria-label="菜单"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden py-6 border-t border-primary-100 animate-fadeIn bg-white/95 backdrop-blur-md">
            <nav className="flex flex-col space-y-3">
              {navItems.map((item) => (
                <div key={item.name}>
                  <Link
                    href={item.href}
                    className="block px-5 py-3.5 text-base font-medium text-black hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200"
                    onClick={() => !item.dropdown && setIsMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                  {item.dropdown && (
                    <div className="ml-6 mt-2 space-y-2">
                      {item.dropdown.map((subItem) => (
                        <Link
                          key={subItem.name}
                          href={subItem.href}
                          className="block px-5 py-2.5 text-sm text-black/70 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          {subItem.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="pt-6 border-t border-primary-100 space-y-3">
                <Link
                  href="/login"
                  className="block px-5 py-3.5 text-base font-medium text-black hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  登录
                </Link>
                <Link
                  href="/personal"
                  className="block px-5 py-3.5 text-base font-medium text-center text-white transition-all duration-200"
                  style={{ 
                    background: '#C84A2A', 
                    border: '1px solid #A63A1E',
                    fontFamily: "'Noto Serif SC', serif"
                  }}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Sparkles className="w-5 h-5 inline mr-2" />
                  免费起名
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
