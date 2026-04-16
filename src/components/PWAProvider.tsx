"use client";

import { useEffect } from "react";

/**
 * PWA Service Worker 注册组件
 */
export default function PWAProvider() {
  useEffect(() => {
    // 只在生产环境和浏览器中注册
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // 注册 Service Worker
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[PWA] Service Worker registered:", registration.scope);

          // 检查更新
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  // 有新版本可用
                  console.log("[PWA] New version available");
                  // 可以通知用户刷新页面
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error("[PWA] Service Worker registration failed:", error);
        });

      // 处理更新提示
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.location.reload();
      });
    }

    // 检测是否作为 PWA 运行
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const isFullScreen = window.matchMedia("(display-mode: fullscreen)").matches;
    const isMinimalUI = window.matchMedia("(display-mode: minimal-ui)").matches;

    if (isStandalone || isFullScreen || isMinimalUI) {
      console.log("[PWA] Running as standalone app");
      document.documentElement.classList.add("pwa-standalone");
    }

    // 监听显示模式变化
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        document.documentElement.classList.add("pwa-standalone");
      } else {
        document.documentElement.classList.remove("pwa-standalone");
      }
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return null;
}
