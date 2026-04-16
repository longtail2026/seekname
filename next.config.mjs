/** @type {import('next').NextConfig} */
const nextConfig = {
  // 图片域名白名单（允许 Next.js Image 组件跨域加载）
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**.seekname.cn" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },

  // 生产环境压缩
  compress: true,

  // 生产环境严格模式
  reactStrictMode: true,

  // 导出行为
  output: "standalone",
};

export default nextConfig;
