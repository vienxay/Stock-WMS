import { createContext, useContext, useState, useCallback } from "react";
import * as authApi from "../api/auth";
import { getToken, setToken } from "../api/client";

const USER_KEY = "wms_user";
const AuthContext = createContext(null);

function loadStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() =>
    getToken() ? loadStoredUser() : null,
  );

  const login = useCallback(async (username, password) => {
    const data = await authApi.login(username, password);
    setToken(data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  // SYSTEM_ADMIN ผ่านได้ทุกที่ เหมือน logic ฝั่ง backend (roleMiddleware.requireRole)
  const hasRole = useCallback(
    (...codes) => {
      const roles = user?.roles || [];
      return roles.some(
        (r) => r.code === "SYSTEM_ADMIN" || codes.includes(r.code),
      );
    },
    [user],
  );

  const value = { user, isAuthenticated: !!user, login, logout, hasRole };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth ต้องใช้ภายใน AuthProvider");
  return ctx;
}
