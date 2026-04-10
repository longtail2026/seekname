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
                  className="flex items-center px-4 py-2 text-sm font-medium transition-all duration-200"
                  style={{ 
                    color: '#2C1810',
                    fontFamily: "'Noto Serif SC', serif",
                    border: '1px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#C9A84C';
                    e.currentTarget.style.background = '#F8F3EA';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.background = 'transparent';
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
                    className={`absolute top-full left-0 mt-1 w-48 py-2 transition-all duration-200 ${
                      activeDropdown === item.name 
                        ? 'opacity-100 visible translate-y-0' 
                        : 'opacity-0 invisible -translate-y-2'
                    }`}
                    style={{ 
                      background: '#FDFAF4',
                      border: '1px solid #E5DDD3',
                      boxShadow: '0 4px 12px rgba(44, 24, 16, 0.08)'
                    }}
                  >
                    {item.dropdown.map((subItem) => (
                      <Link
                        key={subItem.name}
                        href={subItem.href}
                        className="block px-4 py-2 text-sm transition-all duration-200"
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
            {/* Search Button */}
            <button
              className="p-2.5 transition-all duration-200"
              style={{ color: '#5C4A42', border: '1px solid transparent' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#C9A84C';
                e.currentTarget.style.background = '#F8F3EA';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.background = 'transparent';
              }}
              aria-label="搜索"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Login Button */}
            <Link
              href="/login"
              className="hidden md:inline-flex px-4 py-2 text-sm font-medium transition-all duration-200"
              style={{ 
                color: '#2C1810',
                fontFamily: "'Noto Serif SC', serif",
                border: '1px solid #C9A84C',
                background: 'transparent'
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
              登录
            </Link>

            {/* CTA Button */}
            <Link
              href="/personal"
              className="hidden sm:inline-flex px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 items-center"
              style={{ 
                background: '#C84A2A', 
                border: '1px solid #A63A1E',
                fontFamily: "'Noto Serif SC', serif'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#A63A1E';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#C84A2A';
              }}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              免费起名
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2.5 transition-all duration-200"
              style={{ color: '#5C4A42', border: '1px solid transparent' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#C9A84C';
                e.currentTarget.style.background = '#F8F3EA';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.background = 'transparent';
              }}
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
                    className="block px-5 py-3 text-base font-medium transition-all duration-200"
                    style={{ 
                      color: '#2C1810',
                      fontFamily: "'Noto Serif SC', serif",
                      border: '1px solid transparent'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#C9A84C';
                      e.currentTarget.style.background = '#F8F3EA';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'transparent';
                      e.currentTarget.style.background = 'transparent';
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
                <Link
                  href="/login"
                  className="block px-5 py-3 text-base font-medium text-center transition-all duration-200"
                  style={{ 
                    color: '#2C1810',
                    fontFamily: "'Noto Serif SC', serif",
                    border: '1px solid #C9A84C'
                  }}
                  onClick={() => setIsMenuOpen(false)}
                >
                  登录
                </Link>
                <Link
                  href="/personal"
                  className="block px-5 py-3 text-base font-medium text-center text-white transition-all duration-200"
                  style={{ 
                    background: '#C84A2A', 
                    border: '1px solid #A63A1E',
                    fontFamily: "'Noto Serif SC', serif'
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
