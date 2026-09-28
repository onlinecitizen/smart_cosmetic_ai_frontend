"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, setCsrfToken, User } from "./api";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, fullName: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await api.get<User>("/api/v1/auth/me");
      setCsrfToken(me.csrf_token ?? null);
      setUser(me);
    } catch {
      setCsrfToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const u = await api.post<User>("/api/v1/auth/login", { email, password });
    setCsrfToken(u.csrf_token ?? null);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (email: string, fullName: string, password: string) => {
    const u = await api.post<User>("/api/v1/auth/register", { email, full_name: fullName, password });
    setCsrfToken(u.csrf_token ?? null);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await api.post("/api/v1/auth/logout");
    setCsrfToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
