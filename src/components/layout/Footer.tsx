"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";

const Footer = () => {
  const { locale, t } = useLocale();
  const isEn = locale === "en";

  const quickLinks = [
    { name: isEn ? "Home" : "首页", href: "/" },
    { name: isEn ? "AI Naming" : "个人起名", href: "/personal" },
    { name: isEn ? "Business Naming" : "公司起名", href: "/company" },
    { name: isEn ? "Pet Naming" : "宠物起名", href: "/pet" },
    { name: isEn ? "Name Evaluation" : "名字测评", href: "/evaluate" },
    { name: isEn ? "About Us" : "关于我们", href: "/about" },
    { name: isEn ? "Blog" : "博客", href: "/blog" },
    { name: isEn ? "Contact Us" : "联系客服", href: "/contact" },
  ];

  return (
    <footer className="bg-black text-white border-t border-white/10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3 mb-6 md:mb-0">
            <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center">
              <span className="text-white text-xl font-bold">名</span>
            </div>
            <div>
              <span className="text-lg font-bold">{isEn ? "SeekName" : "寻名网"}</span>
              <span className="block text-xs text-gray-400">seekname.cn</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap justify-center gap-4 mb-6 md:mb-0">
            {quickLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm text-gray-300 hover:text-primary-300 transition-colors duration-200"
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Social/CTA */}
          <div className="flex items-center space-x-4">
            <Link
              href="/personal"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white gradient-brand rounded-lg hover:shadow-lg transition-all duration-200"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isEn ? "Free Naming" : "免费起名"}
            </Link>
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center mt-6 pt-6 border-t border-white/10">
          <p className="text-xs text-gray-500">
            © 2026 SeekName. {isEn ? "All rights reserved." : "保留所有权利。寻一个好名，许一个未来。"}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;