"use client";

import { useState } from "react";
import { Menu, X, Search, ChevronDown } from "lucide-react";
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
        { name: "起名", href: "/personal" },
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
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 py-2">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="flex items-center">
              {/* Logo图标 */}
              <div className="w-10 h-10 rounded-lg gradient-brand flex items-center justify-center mr-2">
                <span className="text-white text-xl font-bold">名</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-gray-900">寻名网</span>
                <span className="text-xs text-gray-500">www.seekname.cn</span>
              </div>
            </div>
            <div className="hidden md:block ml-4 pl-4 border-l border-gray-200">
              <span className="text-sm text-gray-600">寻一个好名，许一个未来</span>
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
                  className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors duration-200"
                >
                  {item.name}
                  {item.dropdown && (
                    <ChevronDown className="ml-1 w-4 h-4" />
                  )}
                </Link>
                
                {/* Dropdown Menu */}
                {item.dropdown && activeDropdown === item.name && (
                  <div className="absolute top-full left-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-2 animate-fadeIn">
                    {item.dropdown.map((subItem) => (
                      <Link
                        key={subItem.name}
                        href={subItem.href}
                        className="block px-4 py-2 text-sm text-gray-700 hover:text-orange-600 hover:bg-orange-50 transition-colors duration-200"
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
              className="p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors duration-200"
              aria-label="搜索"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Login Button */}
            <Link
              href="/login"
              className="hidden md:inline-flex px-4 py-2 text-sm font-medium text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors duration-200"
            >
              登录
            </Link>

            {/* CTA Button */}
            <Link
              href="/personal"
              className="hidden sm:inline-flex px-5 py-2 text-sm font-medium text-white gradient-brand rounded-lg hover:shadow-md transition-all duration-200"
            >
              免费起名
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors duration-200"
              aria-label="菜单"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 border-t border-gray-100 animate-fadeIn">
            <nav className="flex flex-col space-y-2">
              {navItems.map((item) => (
                <div key={item.name}>
                  <Link
                    href={item.href}
                    className="block px-4 py-3 text-base font-medium text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors duration-200"
                    onClick={() => !item.dropdown && setIsMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                  {item.dropdown && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.dropdown.map((subItem) => (
                        <Link
                          key={subItem.name}
                          href={subItem.href}
                          className="block px-4 py-2 text-sm text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors duration-200"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          {subItem.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="pt-4 border-t border-gray-200 space-y-2">
                <Link
                  href="/login"
                  className="block px-4 py-3 text-base font-medium text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  登录
                </Link>
                <Link
                  href="/personal"
                  className="block px-4 py-3 text-base font-medium text-center text-white gradient-brand rounded-lg transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
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
