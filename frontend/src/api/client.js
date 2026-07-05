import axios from "axios";

const TOKEN_KEY = "wms_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export const apiClient = axios.create({
  baseURL: "/api",
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// token หมดอายุ/ไม่ถูกต้อง -> เคลียร์ session แล้วเด้งไปหน้า login ทันที ไม่ต้องรอ component ไหนจัดการเอง
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      setToken(null);
      localStorage.removeItem("wms_user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export function apiErrorMessage(error) {
  return (
    error?.response?.data?.error ||
    error?.message ||
    "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ"
  );
}
