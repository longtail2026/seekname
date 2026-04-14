"use client";

/**
 * Auth Context
 * 管理全局用户登录状态
 * - 登录/登出
 * - 用户信息缓存
 * - 回跳路由管理（callbackUrl）
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";

export interface User {
  id: string;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  avatar?: string | null;      // 头像 URL
  gender?: string | null;
  occupation?: string | null;
  hobbies?: string[] | null;
  vipLevel: number;
  points: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (account: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  email?: string;
  phone?: string;
  password: string;
  name?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 初始化时获取当前登录状态
  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error("[Auth] Failed to fetch session:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // 登录
  const login = useCallback(
    async (
      account: string,
      password: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ account, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          return { success: false, error: data.error || "登录失败" };
        }

        setUser(data.user);

        // 同时存 localStorage（供客户端 API 调用时使用）
        if (data.token) {
          localStorage.setItem("auth_token", data.token);
        }

        return { success: true };
      } catch (error) {
        console.error("[Login Error]", error);
        return { success: false, error: "网络错误，请重试" };
      }
    },
    []
  );

  // 注册
  const register = useCallback(
    async (
      registerData: RegisterData
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(registerData),
        });

        const data = await res.json();

        if (!res.ok) {
          return { success: false, error: data.error || "注册失败" };
        }

        return { success: true };
      } catch (error) {
        console.error("[Register Error]", error);
        return { success: false, error: "网络错误，请重试" };
      }
    },
    []
  );

  // 登出
  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/session", { method: "POST" });
    } catch (error) {
      console.error("[Logout Error]", error);
    }
    setUser(null);
    localStorage.removeItem("auth_token");
    router.push("/");
  }, [router]);

  // 刷新用户信息
  const refreshUser = useCallback(async () => {
    await fetchSession();
  }, [fetchSession]);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
