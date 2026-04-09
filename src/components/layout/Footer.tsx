import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  const footerLinks = {
    services: [
      { name: "宝宝起名", href: "/baby" },
      { name: "成人改名", href: "/rename" },
      { name: "公司起名", href: "/company" },
      { name: "品牌起名", href: "/brand" },
      { name: "宠物起名", href: "/pet" },
      { name: "名字测评", href: "/evaluate" },
    ],
    about: [
      { name: "关于我们", href: "/about" },
      { name: "文化典籍", href: "/classics" },
      { name: "起名知识", href: "/blog" },
      { name: "常见问题", href: "/faq" },
    ],
    support: [
      { name: "联系客服", href: "/contact" },
      { name: "用户协议", href: "/terms" },
      { name: "隐私政策", href: "/privacy" },
    ],
  };

  return (
    <footer className="bg-gray-900 text-white">
      {/* 回纹装饰线 */}
      <div className="pattern-divider opacity-50" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 rounded-lg gradient-brand flex items-center justify-center">
                <span className="text-white text-xl font-bold">名</span>
              </div>
              <div>
                <span className="text-xl font-bold">寻名网</span>
                <span className="block text-xs text-gray-400">www.seekname.cn</span>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              寻一个好名，许一个未来。专业起名服务平台，融合传统文化与现代科技。
            </p>
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span>contact@seekname.cn</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4" />
                <span>400-XXX-XXXX</span>
              </div>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-lg font-semibold mb-4">起名服务</h3>
            <ul className="space-y-2">
              {footerLinks.services.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-orange-400 transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* About */}
          <div>
            <h3 className="text-lg font-semibold mb-4">关于我们</h3>
            <ul className="space-y-2">
              {footerLinks.about.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-orange-400 transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-lg font-semibold mb-4">帮助支持</h3>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-orange-400 transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
          <p>© 2026 寻名网 SeekName. All rights reserved. 寻一个好名，许一个未来。</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
