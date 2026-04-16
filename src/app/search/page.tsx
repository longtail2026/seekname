/**
 * 名字搜索页面
 * /search?q=xxx
 */

"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search, Package, Heart, Clock, ArrowRight,
  Loader2, X, Sparkles, ThumbsUp
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import Header from "@/components/layout/Header";

interface SearchResult {
  orders: Array<{
    id: string;
    orderNo: string;
    type: string;
    createdAt: string;
    nameRecord: {
      surname: string;
      gender: string;
      results: string[];
    } | null;
  }>;
  favorites: Array<{
    id: string;
    fullName: string;
    surname: string;
    gender: string;
    score: number | null;
    createdAt: string;
  }>;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { locale } = useLocale();
  const isEn = locale === "en";

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [inputValue, setInputValue] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // 如果已登录，自动搜索
  useEffect(() => {
    if (user && query) {
      performSearch(query);
    }
  }, [user]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim() || !user) return;

    setLoading(true);
    setSearched(true);

    try {
      const token = localStorage.getItem("seekname_token");
      const res = await fetch(`/api/names/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();

      if (data.success) {
        setResults(data);
      } else {
        setResults({ orders: [], favorites: [] });
      }
    } catch (error) {
      console.error("[Search Error]", error);
      setResults({ orders: [], favorites: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    setQuery(inputValue);
    router.push(`/search?q=${encodeURIComponent(inputValue.trim())}`);
    if (user) {
      performSearch(inputValue.trim());
    }
  };

  const clearSearch = () => {
    setInputValue("");
    setQuery("");
    setResults(null);
    setSearched(false);
    router.push("/search");
  };

  const hasResults = results && (results.orders.length > 0 || results.favorites.length > 0);

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)" }}>
      <Header />

      <div style={{ paddingTop: 60 }}>
        {/* ── 搜索 Header ── */}
        <div style={{
          background: "linear-gradient(180deg, #2C1810 0%, #4A3428 100%)",
          padding: "32px 24px",
        }}>
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <h1 style={{
              margin: "0 0 20px",
              fontSize: 24,
              fontWeight: 700,
              color: "#fff",
              textAlign: "center",
              fontFamily: "'Noto Serif SC', serif",
            }}>
              {isEn ? "Search Names" : "搜索名字"}
            </h1>

            {/* 搜索框 */}
            <form onSubmit={handleSubmit} style={{ position: "relative" }}>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={isEn ? "Search by name, surname..." : "输入名字或姓氏搜索"}
                style={{
                  width: "100%",
                  padding: "14px 50px 14px 20px",
                  fontSize: 16,
                  borderRadius: 12,
                  border: "none",
                  outline: "none",
                  fontFamily: "'Noto Sans SC', sans-serif",
                  background: "#fff",
                }}
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={clearSearch}
                  style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#999",
                    padding: 4,
                  }}
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              <button
                type="submit"
                disabled={!inputValue.trim() || loading}
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: inputValue.trim() ? "pointer" : "not-allowed",
                  color: "#999",
                  padding: 4,
                }}
              >
                <Search className="w-5 h-5" />
              </button>
            </form>

            {/* 搜索提示 */}
            <p style={{
              margin: "12px 0 0",
              fontSize: 13,
              color: "rgba(255,255,255,0.5)",
              textAlign: "center",
              fontFamily: "'Noto Sans SC', sans-serif",
            }}>
              {isEn
                ? "Search your naming history and favorites by name or surname"
                : "在起名历史和典藏本中搜索名字或姓氏"}
            </p>
          </div>
        </div>

        {/* ── 搜索结果 ── */}
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px" }}>
          {!user ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
              <h2 style={{ margin: "0 0 12px", fontSize: 20, color: "var(--ink)" }}>
                {isEn ? "Please Login" : "请先登录"}
              </h2>
              <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--foreground-muted)" }}>
                {isEn
                  ? "Login to search your naming history and favorites"
                  : "登录后即可搜索您的起名历史和典藏本"}
              </p>
              <Link
                href="/login?redirect=/search"
                style={{
                  display: "inline-block",
                  padding: "10px 28px",
                  background: "var(--primary)",
                  color: "#fff",
                  borderRadius: 20,
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {isEn ? "Login" : "立即登录"}
              </Link>
            </div>
          ) : loading ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: "var(--primary)" }} />
              <p style={{ margin: "16px 0 0", fontSize: 14, color: "var(--foreground-muted)" }}>
                {isEn ? "Searching..." : "搜索中..."}
              </p>
            </div>
          ) : searched && !hasResults ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
              <h2 style={{ margin: "0 0 12px", fontSize: 20, color: "var(--ink)" }}>
                {isEn ? "No Results Found" : "未找到结果"}
              </h2>
              <p style={{ margin: "0 0 24px", fontSize: 14, color: "var(--foreground-muted)" }}>
                {isEn
                  ? `No names found matching "${query}"`
                  : `未找到与"${query}"相关的名字`}
              </p>
              <button
                onClick={clearSearch}
                style={{
                  padding: "10px 28px",
                  background: "var(--background-warm)",
                  border: "1px solid var(--border)",
                  borderRadius: 20,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                {isEn ? "Clear Search" : "清除搜索"}
              </button>
            </div>
          ) : results && hasResults ? (
            <div>
              {/* 统计 */}
              <div style={{ marginBottom: 24, fontSize: 14, color: "var(--foreground-muted)" }}>
                {isEn
                  ? `Found ${results.orders.length + results.favorites.length} results for "${query}"`
                  : `找到 ${results.orders.length + results.favorites.length} 个与"${query}"相关的结果`}
              </div>

              {/* 起名历史 */}
              {results.orders.length > 0 && (
                <div style={{ marginBottom: 32 }}>
                  <h3 style={{
                    margin: "0 0 16px",
                    fontSize: 16,
                    fontWeight: 600,
                    color: "var(--ink)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}>
                    <Package className="w-5 h-5" style={{ color: "var(--primary)" }} />
                    {isEn ? "Naming History" : "起名历史"}
                    <span style={{
                      fontSize: 12,
                      padding: "2px 8px",
                      background: "var(--primary-glow)",
                      borderRadius: 10,
                      color: "var(--primary)",
                    }}>
                      {results.orders.length}
                    </span>
                  </h3>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {results.orders.map((order) => {
                      const candidates = order.nameRecord?.results || [];
                      return (
                        <div
                          key={order.id}
                          style={{
                            background: "var(--background-warm)",
                            border: "1px solid var(--border)",
                            borderRadius: 12,
                            padding: "16px",
                          }}
                        >
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px 12px",
                            flexWrap: "wrap",
                            marginBottom: candidates.length > 0 ? 12 : 0,
                          }}>
                            <span style={{
                              fontFamily: "monospace",
                              fontSize: 13,
                              color: "var(--primary)",
                              fontWeight: 600,
                            }}>
                              {order.orderNo}
                            </span>
                            <span style={{
                              padding: "2px 8px",
                              borderRadius: 8,
                              fontSize: 11,
                              background: "var(--primary-glow)",
                              color: "var(--primary)",
                            }}>
                              {order.type}
                            </span>
                            <span style={{ flex: 1 }} />
                            <span style={{
                              fontSize: 12,
                              color: "var(--foreground-muted)",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}>
                              <Clock className="w-3 h-3" />
                              {new Date(order.createdAt).toLocaleDateString("zh-CN")}
                            </span>
                          </div>

                          {order.nameRecord && (
                            <div style={{
                              fontSize: 12,
                              color: "var(--foreground-muted)",
                              marginBottom: 8,
                            }}>
                              {order.nameRecord.surname}姓 ·{" "}
                              {order.nameRecord.gender === "M" ? (isEn ? "Male" : "男") : (isEn ? "Female" : "女")}
                              <span style={{ marginLeft: 8, color: "#2EAD5A" }}>
                                <ThumbsUp className="w-3 h-3 inline" style={{ marginRight: 2 }} />
                                {candidates.length} {isEn ? "candidates" : "个候选名"}
                              </span>
                            </div>
                          )}

                          {candidates.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {candidates.slice(0, 6).map((name, i) => (
                                <Link
                                  key={i}
                                  href={`/naming/${name}`}
                                  style={{
                                    padding: "3px 10px",
                                    borderRadius: 6,
                                    background: "#fff",
                                    border: `1px solid ${i === 0 ? "var(--primary)" : "var(--border)"}`,
                                    fontSize: 14,
                                    color: i === 0 ? "var(--primary)" : "var(--foreground-muted)",
                                    textDecoration: "none",
                                    fontFamily: "'Noto Serif SC', serif",
                                    fontWeight: i === 0 ? 600 : 400,
                                  }}
                                >
                                  {name}
                                </Link>
                              ))}
                              {candidates.length > 6 && (
                                <span style={{
                                  padding: "3px 10px",
                                  fontSize: 12,
                                  color: "var(--foreground-muted)",
                                }}>
                                  +{candidates.length - 6} {isEn ? "more" : "更多"}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 典藏本 */}
              {results.favorites.length > 0 && (
                <div>
                  <h3 style={{
                    margin: "0 0 16px",
                    fontSize: 16,
                    fontWeight: 600,
                    color: "var(--ink)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}>
                    <Heart className="w-5 h-5" style={{ color: "#E870A0" }} />
                    {isEn ? "Favorites" : "名字典藏"}
                    <span style={{
                      fontSize: 12,
                      padding: "2px 8px",
                      background: "rgba(232,112,160,0.1)",
                      borderRadius: 10,
                      color: "#E870A0",
                    }}>
                      {results.favorites.length}
                    </span>
                  </h3>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {results.favorites.map((fav) => (
                      <div
                        key={fav.id}
                        style={{
                          background: "var(--background-warm)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          padding: "16px",
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <Link
                              href={`/naming/${fav.fullName}`}
                              style={{
                                fontSize: 20,
                                fontWeight: 700,
                                color: "var(--ink)",
                                textDecoration: "none",
                                fontFamily: "'Noto Serif SC', serif",
                              }}
                            >
                              {fav.fullName}
                            </Link>
                            <span style={{
                              padding: "2px 8px",
                              borderRadius: 6,
                              fontSize: 11,
                              background: fav.gender === "M" ? "rgba(74,144,217,0.1)" : "rgba(232,112,160,0.1)",
                              color: fav.gender === "M" ? "#4A90D9" : "#E870A0",
                            }}>
                              {fav.gender === "M" ? (isEn ? "Boy" : "男") : (isEn ? "Girl" : "女")}
                            </span>
                            {fav.score && (
                              <span style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: fav.score >= 85 ? "#2EAD5A" : fav.score >= 70 ? "var(--warning)" : "var(--error)",
                              }}>
                                ⭐ {fav.score}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--foreground-muted)" }}>
                            {fav.surname}姓 · {new Date(fav.createdAt).toLocaleDateString("zh-CN")}
                          </div>
                        </div>
                        <Link
                          href={`/naming/${fav.fullName}`}
                          style={{
                            padding: "6px 14px",
                            background: "var(--primary)",
                            borderRadius: 8,
                            color: "#fff",
                            textDecoration: "none",
                            fontSize: 13,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {isEn ? "View" : "查看"}
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* 默认状态 - 未搜索 */
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>
                <Sparkles className="w-12 h-12 mx-auto" style={{ color: "var(--primary)" }} />
              </div>
              <h2 style={{ margin: "0 0 12px", fontSize: 20, color: "var(--ink)" }}>
                {isEn ? "Find Your Names" : "查找您的名字"}
              </h2>
              <p style={{ margin: 0, fontSize: 14, color: "var(--foreground-muted)" }}>
                {isEn
                  ? "Search your naming history and favorites"
                  : "在起名历史和典藏本中搜索"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
