import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 朱砂色系 - 主色调
        primary: {
          DEFAULT: "#C84A2A",
          dark: "#A63A1E",
          light: "#E0603A",
          50: "#FDF2EF",
          100: "#F9E5DE",
          200: "#F0C9BC",
          300: "#E6A699",
          400: "#D97A6B",
          500: "#C84A2A",
          600: "#B04024",
          700: "#A63A1E",
          800: "#8A3018",
          900: "#6E2613",
        },
        // 古铜金色系
        gold: {
          DEFAULT: "#C9A84C",
          light: "#D4BC6E",
          dark: "#A68A3C",
          50: "#FCFAF5",
          100: "#F8F3EA",
          200: "#F0E7D4",
          300: "#E5D7B8",
          400: "#D9C89C",
          500: "#C9A84C",
          600: "#B89844",
          700: "#A68A3C",
          800: "#8A7232",
          900: "#6E5A28",
        },
        // 宣纸色系
        paper: {
          DEFAULT: "#FDFAF4",
          warm: "#F8F3EA",
          dark: "#F0EBE3",
        },
        // 墨色
        ink: {
          DEFAULT: "#2C1810",
          light: "#4A3A32",
          muted: "#5C4A42",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
        serif: ["Noto Serif SC", "serif"],
      },
      backgroundImage: {
        'ancient-pattern': "url('/images/ancient-pattern.svg')",
        'cloud-pattern': "url('/images/cloud-pattern.svg')",
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'fade-in-down': 'fadeInDown 0.6s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-in-up': 'slideInUp 0.5s ease-out',
        'slide-in-down': 'slideInDown 0.5s ease-out',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        slideInDown: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
