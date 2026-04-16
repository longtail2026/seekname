/**
 * i18n 工具
 * 轻量级国际化实现，支持中文(zh)和英文(en)
 * 使用方式：
 *   import { getTranslations, getLocale, setLocale } from '@/lib/i18n'
 *   const t = getTranslations(locale)
 *   t('nav.home') → "首页" 或 "Home"
 */

import zhMessages from "@/i18n/zh.json";
import enMessages from "@/i18n/en.json";

export type Locale = "zh" | "en";
export type Messages = typeof zhMessages;

const messagesMap: Record<Locale, Messages> = {
  zh: zhMessages,
  en: enMessages,
};

// 支持的语言列表
export const locales: Locale[] = ["zh", "en"];
export const defaultLocale: Locale = "zh";

const localeNames: Record<Locale, string> = {
  zh: "中文",
  en: "English",
};

export { localeNames };

/**
 * 获取翻译文本
 * @param locale 语言
 * @returns 翻译函数 t('key.subkey')
 */
export function getTranslations(locale: Locale = defaultLocale) {
  const messages = messagesMap[locale] || messagesMap[defaultLocale];

  return function t(key: string, params?: Record<string, string | number>): string {
    const keys = key.split(".");
    let value: unknown = messages;

    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key; // 未找到，返回 key 本身
      }
    }

    if (typeof value !== "string") return key;

    // 替换参数 {count} -> actual value
    if (params) {
      return value.replace(/\{(\w+)\}/g, (_, k) =>
        params[k] !== undefined ? String(params[k]) : `{${k}}`
      );
    }

    return value;
  };
}

/**
 * 验证语言代码是否有效
 */
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

/**
 * 从 Accept-Language header 提取偏好语言
 */
export function parseAcceptLanguage(header: string): Locale {
  if (!header) return defaultLocale;

  const parts = header.split(",").map((p) => {
    const [lang, q = "1"] = p.trim().split(";q=");
    return { lang: lang.trim().split("-")[0], q: parseFloat(q) };
  });

  parts.sort((a, b) => b.q - a.q);

  for (const { lang } of parts) {
    if (isValidLocale(lang)) return lang;
  }

  return defaultLocale;
}
