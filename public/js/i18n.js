/**
 * 纯前端 i18n 解决方案
 * 无路由切换，仅替换 data-i18n 属性文本
 * 语言存储在 localStorage 中永久记住
 * 
 * 使用方式：在需要翻译的元素上添加 data-i18n="key.name" 属性
 * 支持 data-i18n-placeholder / data-i18n-title / data-i18n-value / data-i18n-html
 */

(function () {
  'use strict';

  // ---- 配置 ----
  const STORAGE_KEY = 'seekname_lang';
  const DEFAULT_LANG = 'zh';

  // ---- 获取当前语言（优先 cookie → localStorage → 默认） ----
  function getCurrentLang() {
    // 与 React LocaleContext 同步：读取 cookie
    var cookieMatch = document.cookie.match(/(?:^|;\s*)locale=(\w+)/);
    if (cookieMatch && cookieMatch[1]) return cookieMatch[1];
    // 降级到 localStorage
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
  }

  // ---- 加载语言包 ----
  let translationsCache = {};

  async function loadLang(lang) {
    try {
      const res = await fetch('/lang/' + lang + '.json?_t=' + Date.now());
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      translationsCache = data;
      return data;
    } catch (e) {
      console.warn('[i18n] Failed to load language:', lang, e);
      // 降级：尝试加载中文
      if (lang !== 'zh') {
        try {
          const res = await fetch('/lang/zh.json?_t=' + Date.now());
          if (res.ok) {
            const data = await res.json();
            translationsCache = data;
            return data;
          }
        } catch (e2) {}
      }
      translationsCache = {};
      return {};
    }
  }

  // ---- 替换页面文本 ----
  function translatePage(translations) {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var text = translations[key];
      if (text !== undefined) {
        // 处理占位符 {count}
        var count = el.getAttribute('data-i18n-count');
        if (count !== null) {
          text = text.replace('{count}', count);
        }
        el.innerText = text;
      } else {
        // 保留原标题不变（降级策略）
        if (!el.hasAttribute('data-i18n-original')) {
          el.setAttribute('data-i18n-original', el.innerText);
        }
      }
    });

    // 处理 data-i18n-placeholder（input 占位符）
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      var text = translations[key];
      if (text !== undefined) {
        el.placeholder = text;
      }
    });

    // 处理 data-i18n-title（title 属性）
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-title');
      var text = translations[key];
      if (text !== undefined) {
        el.title = text;
      }
    });

    // 处理 data-i18n-value（表单选项文本，如 select option）
    document.querySelectorAll('[data-i18n-value]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-value');
      var text = translations[key];
      if (text !== undefined) {
        el.value = text;
      }
    });

    // 处理 data-i18n-html（含 HTML 的内容）
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-html');
      var text = translations[key];
      if (text !== undefined) {
        el.innerHTML = text;
      }
    });

    // 更新<html> lang 属性
    var lang = getCurrentLang();
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  }

  // ---- 纯前端切换语言（React 外部使用） ----
  window.switchLang = async function (newLang) {
    localStorage.setItem(STORAGE_KEY, newLang);
    // 同时写入 cookie（与 React LocaleContext 同步）
    document.cookie = 'locale=' + newLang + '; path=/; max-age=31536000; SameSite=Lax';
    var data = await loadLang(newLang);
    translatePage(data);
    // 触发自定义事件，供 React 组件监听
    window.dispatchEvent(new CustomEvent('i18n:change', { detail: { lang: newLang, translations: data } }));
    // 更新语言切换按钮状态
    updateLangToggleUI(newLang);
    return data;
  };

  // ---- 获取翻译文本（供程序使用） ----
  window.__ = function (key, fallback) {
    if (translationsCache[key] !== undefined) return translationsCache[key];
    return fallback !== undefined ? fallback : key;
  };

  // ---- 更新语言切换按钮 UI ----
  function updateLangToggleUI(lang) {
    document.querySelectorAll('[data-i18n-toggle]').forEach(function (btn) {
      var targetLang = btn.getAttribute('data-i18n-toggle');
      if (targetLang === lang) {
        btn.classList.add('i18n-active');
        btn.style.borderColor = '#E86A17';
        btn.style.color = '#E86A17';
        btn.style.background = 'rgba(232,106,23,0.08)';
      } else {
        btn.classList.remove('i18n-active');
        btn.style.borderColor = '#DDD0C0';
        btn.style.color = '#AAA';
        btn.style.background = 'transparent';
      }
    });
  }

  // ---- 初始化 ----
  window.initI18n = async function () {
    var lang = getCurrentLang();
    var data = await loadLang(lang);
    translatePage(data);
    updateLangToggleUI(lang);
    return data;
  };

  // ---- 监听 React LocaleContext 触发的 locale-change 事件 ----
  // React 的 setLocale() 在写入 cookie 后 dispatch Event('locale-change')
  // 此监听器确保 i18n.js 的 DOM 翻译与 React 状态同步
  window.addEventListener('locale-change', async function (e) {
    var newLang = e.detail;
    if (newLang && newLang !== getCurrentLang()) {
      // React 已经写入了 cookie，但 i18n.js 的 localStorage 可能尚未同步
      localStorage.setItem(STORAGE_KEY, newLang);
    }
    var data = await loadLang(newLang);
    translatePage(data);
    updateLangToggleUI(newLang);
  });

  // 页面加载完成后自动初始化
  if (document.readyState === 'complete') {
    window.initI18n();
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      window.initI18n();
    });
  }

  // 对于 Next.js 动态渲染，支持 MutationObserver 监听新加入的 data-i18n 元素
  if (typeof MutationObserver !== 'undefined') {
    var observer = new MutationObserver(function (mutations) {
      var needsTranslate = false;
      mutations.forEach(function (mutation) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach(function (node) {
            if (node.nodeType === 1) {
              if (node.querySelectorAll || node.hasAttribute && node.hasAttribute('data-i18n')) {
                needsTranslate = true;
              }
            }
          });
        }
      });
      if (needsTranslate && Object.keys(translationsCache).length > 0) {
        translatePage(translationsCache);
      }
    });
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    } else {
      document.addEventListener('DOMContentLoaded', function () {
        observer.observe(document.body, { childList: true, subtree: true });
      });
    }
  }

})();