/**
 * 寻名网 Service Worker
 * 提供离线缓存、推送通知支持
 */

const CACHE_NAME = "seekname-v1";
const STATIC_CACHE = "seekname-static-v1";
const DYNAMIC_CACHE = "seekname-dynamic-v1";

// 需要预缓存的静态资源
const PRECACHE_URLS = [
  "/",
  "/personal",
  "/collection",
  "/vip",
  "/manifest.json",
];

// 安装事件
self.addEventListener("install", (event) => {
  console.log("[SW] Installing...");
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log("[SW] Precaching static resources");
      return cache.addAll(PRECACHE_URLS);
    })
  );
  // 立即激活
  self.skipWaiting();
});

// 激活事件
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => {
            console.log("[SW] Removing old cache:", key);
            return caches.delete(key);
          })
      );
    })
  );
  // 立即控制所有页面
  self.clients.claim();
});

// 请求拦截
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非 GET 请求
  if (request.method !== "GET") return;

  // 跳过跨域请求
  if (url.origin !== location.origin) return;

  // API 请求：网络优先，失败时使用缓存
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 静态资源：缓存优先
  if (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "image" ||
    request.destination === "font"
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 页面导航：网络优先
  event.respondWith(networkFirst(request));
});

// 缓存优先策略
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // 返回离线页面
    return caches.match("/");
  }
}

// 网络优先策略
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // API 请求返回错误 JSON
    if (request.url.includes("/api/")) {
      return new Response(
        JSON.stringify({ success: false, error: "Offline" }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return caches.match("/");
  }
}

// 推送通知处理
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body || "您有一条新消息",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge.png",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/",
    },
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "寻名网", options)
  );
});

// 通知点击处理
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // 如果有已打开的窗口，跳转到 URL
      for (const client of clients) {
        if (client.url === url && "focus" in client) {
          return client.focus();
        }
      }
      // 否则打开新窗口
      return self.clients.openWindow(url);
    })
  );
});

// 后台同步
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-data") {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  // 同步离线期间的数据
  console.log("[SW] Syncing data...");
}

// 消息处理
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }

  if (event.data === "getVersion") {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});
