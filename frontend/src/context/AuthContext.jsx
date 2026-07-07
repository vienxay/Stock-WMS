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

  // SUPER_ADMIN ผ่านได้ทุกที่ เหมือน logic ฝั่ง backend (roleMiddleware.requireRole)
  const hasRole = useCallback(
    (...codes) => {
      const roles = user?.roles || [];
      return roles.some(
        (r) => r.code === "SUPER_ADMIN" || codes.includes(r.code),
      );
    },
    [user],
  );

  // สิทธิ์ระดับคลัง — ล้อ logic เดียวกับ roleMiddleware.userCanAccessWarehouse ฝั่ง backend
  // เรียกใช้เพื่อซ่อน/แสดงปุ่มบนหน้าเว็บเท่านั้น (สิทธิ์จริงบังคับที่ backend เสมอ)
  const canAccessWarehouse = useCallback(
    (warehouseId, branchId) => {
      const roles = user?.roles || [];
      return roles.some((r) => {
        if (r.code === "SUPER_ADMIN") return true;
        if (r.code === "BRANCH_ADMIN") return Number(r.branchId) === Number(branchId);
        if (r.code === "WAREHOUSE_STAFF") return Number(r.warehouseId) === Number(warehouseId);
        return false;
      });
    },
    [user],
  );

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    hasRole,
    canAccessWarehouse,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth ຕ້ອງໃຊ້ພາຍໃນ AuthProvider");
  return ctx;
}
