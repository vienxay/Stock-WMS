import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/", label: "แดชบอร์ด", end: true },
  { to: "/products", label: "สินค้า" },
  { to: "/stock-receipts", label: "รับสินค้าเข้า" },
  { to: "/branch-requests", label: "คำขอเบิกระหว่างคลัง" },
  { to: "/requisitions", label: "ใบเบิกพนักงาน" },
  { to: "/stock-takes", label: "ตรวจนับสต็อก" },
  { to: "/reports", label: "รายงาน" },
];

const ADMIN_NAV_ITEMS = [
  { to: "/organization", label: "องค์กร/ผู้ใช้งาน" },
  { to: "/catalog", label: "หมวดหมู่สินค้า" },
  { to: "/currency", label: "สกุลเงิน" },
];

function navLinkClass({ isActive }) {
  return `block px-3 py-2 rounded-md text-sm ${
    isActive ? "bg-blue-600 text-white" : "text-gray-700 hover:bg-gray-100"
  }`;
}

export default function Layout() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-64 bg-white border-r flex flex-col">
        <div className="px-4 py-4 border-b">
          <h1 className="font-bold text-lg text-blue-700">Stock WMS</h1>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={navLinkClass}
            >
              {item.label}
            </NavLink>
          ))}
          {hasRole("SYSTEM_ADMIN") && (
            <>
              <div className="pt-4 pb-1 px-3 text-xs font-semibold text-gray-400 uppercase">
                ตั้งค่าระบบ
              </div>
              {ADMIN_NAV_ITEMS.map((item) => (
                <NavLink key={item.to} to={item.to} className={navLinkClass}>
                  {item.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>
        <div className="px-4 py-3 border-t text-sm">
          <div className="font-medium text-gray-800">{user?.fullName}</div>
          <div className="text-gray-400 text-xs mb-2">
            {user?.roles?.map((r) => r.code).join(", ")}
          </div>
          <button
            onClick={handleLogout}
            className="text-red-600 hover:underline text-sm"
          >
            ออกจากระบบ
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
