import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// การซ่อน/แสดง route เป็นแค่ UX เท่านั้น สิทธิ์จริงต้องตรวจที่ backend เสมอ (requireRole/requireWarehouseAccess)
export default function ProtectedRoute({ roles }) {
  const { isAuthenticated, hasRole } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !hasRole(...roles)) return <Navigate to="/" replace />;

  return <Outlet />;
}
