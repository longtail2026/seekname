"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { Locale, locales, defaultLocale } from "@/lib/i18n";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(
    () => (initialLocale as Locale) || defaultLocale
  );

  // 从 cookie 或浏览器语言初始化
  useEffect(() => {
    const saved = document.cookie
      .split("; ")
      .find((row) => row.startsWith("locale="))
      ?.split("=")[1] as Locale | undefined;

    if (saved && locales.includes(saved)) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    document.cookie = `locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    // 通知页面语言变化（触发软刷新）
    window.dispatchEvent(new CustomEvent("locale-change", { detail: newLocale }));
  }, []);

  // 同步翻译函数（所有 messages 已 bundle，直接 import）
  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const { getTranslations } = require("@/lib/i18n") as {
        getTranslations: (l: Locale) => (k: string, p?: Record<string, string | number>) => string;
      };
      return getTranslations(locale)(key, params);
    },
    [locale]
  );

  const value: LocaleContextValue = { locale, setLocale, t };

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
