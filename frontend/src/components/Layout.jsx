import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Boxes,
  LayoutDashboard,
  Package,
  PackagePlus,
  ArrowLeftRight,
  PackageMinus,
  ClipboardCheck,
  BarChart3,
  Building2,
  Tags,
  Coins,
  Menu,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getSettings } from "../api/settings";

const NAV_ITEMS = [
  { to: "/", label: "ໜ້າຫຼັກ", end: true, icon: LayoutDashboard },
  { to: "/products", label: "ສິນຄ້າ", icon: Package },
  { to: "/stock-receipts", label: "ຮັບເຂົ້າສິນຄ້າ", icon: PackagePlus },
  { to: "/branch-requests", label: "ໂອນຍ້າຍສິນຄ້າ", icon: ArrowLeftRight },
  { to: "/requisitions", label: "ເບີກຈ່າຍສິນຄ້າ", icon: PackageMinus },
  { to: "/stock-takes", label: "ກວດນັບສະຕັອກ", icon: ClipboardCheck },
  { to: "/reports", label: "ບົດລາຍງານ", icon: BarChart3 },
];

const ADMIN_NAV_ITEMS = [
  { to: "/organization", label: "ອົງກອນ/ຜູ້ໃຊ້ງານ", icon: Building2 },
  { to: "/catalog", label: "ໝວດໝູ່ສິນຄ້າ", icon: Tags },
  { to: "/currency", label: "ສະກຸນເງິນ", icon: Coins },
];

function navLinkClass({ isActive }) {
  return `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
    isActive
      ? "bg-blue-600 text-white shadow-sm"
      : "text-slate-300 hover:bg-slate-800 hover:text-white"
  }`;
}

export default function Layout() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside
        className={`bg-slate-900 flex flex-col transition-all ${collapsed ? "w-20" : "w-64"}`}
      >
        <div className="flex items-center gap-2 px-4 py-5 border-b border-slate-800">
          <div className="w-9 h-9 rounded-lg  flex items-center justify-center shrink-0 overflow-hidden">
            {settings?.logo_url ? (
              <img
                src={settings.logo_url}
                alt=""
                className="w-full h-full object-contain"
              />
            ) : (
              <Boxes size={20} className="text-white" />
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-bold text-white text-sm leading-tight truncate">
                ລະບົບສາງສິນຄ້າ
              </div>
              <div className="text-slate-400 text-xs truncate">
                {settings?.company_name_lo || settings?.company_name || "Stock WMS"}
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={navLinkClass}
              title={item.label}
            >
              <item.icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
          {hasRole("SYSTEM_ADMIN") && (
            <>
              {!collapsed && (
                <div className="pt-4 pb-1 px-3 text-xs font-semibold text-slate-500 uppercase">
                  ຕັ້ງຄ່າລະບົບ
                </div>
              )}
              {ADMIN_NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={navLinkClass}
                  title={item.label}
                >
                  <item.icon size={18} className="shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="border-t border-slate-800 p-3 relative">
          <button
            onClick={() => setProfileOpen((o) => !o)}
            className="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold shrink-0">
              {user?.fullName?.charAt(0) || "?"}
            </div>
            {!collapsed && (
              <>
                <div className="min-w-0 text-left flex-1">
                  <div className="text-sm font-medium text-white truncate">
                    {user?.fullName}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {user?.roles?.map((r) => r.code).join(", ")}
                  </div>
                </div>
                <ChevronDown size={16} className="text-slate-400 shrink-0" />
              </>
            )}
          </button>
          {profileOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-1 bg-white rounded-lg shadow-lg border overflow-hidden">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut size={16} />
                ອອກຈາກລະບົບ
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <Menu size={20} />
          </button>
        </header>
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
