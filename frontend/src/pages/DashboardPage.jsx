import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Boxes,
  Package,
  PackagePlus,
  PackageMinus,
  ArrowLeftRight,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { listProducts } from "../api/products";
import { getStockBalanceReport, getMovementsReport } from "../api/reports";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/ui/Spinner";

const LAO_MONTHS = [
  "ມ.ກ",
  "ກ.ພ",
  "ມີ.ນ",
  "ເມ.ສ",
  "ພ.ພ",
  "ມິ.ຖ",
  "ກ.ລ",
  "ສ.ຫ",
  "ກ.ຍ",
  "ຕ.ລ",
  "ພ.ຈ",
  "ທ.ວ",
];
const CATEGORY_COLORS = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#6b7280",
];
const MOVEMENT_META = {
  RECEIPT: {
    label: "ຮັບເຂົ້າສິນຄ້າ",
    icon: PackagePlus,
    badge: "bg-emerald-100 text-emerald-700",
  },
  ISSUE: {
    label: "ເບີກຈ່າຍສິນຄ້າ",
    icon: PackageMinus,
    badge: "bg-amber-100 text-amber-700",
  },
  TRANSFER_IN: {
    label: "ໂອນເຂົ້າ",
    icon: ArrowLeftRight,
    badge: "bg-blue-100 text-blue-700",
  },
  TRANSFER_OUT: {
    label: "ໂອນອອກ",
    icon: ArrowLeftRight,
    badge: "bg-blue-100 text-blue-700",
  },
  ADJUSTMENT: {
    label: "ປັບປຸງສະຕັອກ",
    icon: AlertTriangle,
    badge: "bg-gray-100 text-gray-700",
  },
};

function monthKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

function trendOf(curr, prev) {
  if (!prev) return null;
  return ((curr - prev) / prev) * 100;
}

function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  trend,
  loading,
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="flex items-start gap-3">
        <div
          className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}
        >
          <Icon size={20} className={iconColor} />
        </div>
        <div className="min-w-0">
          <div className="text-sm text-gray-500">{label}</div>
          <div className="text-2xl font-bold text-gray-800 mt-0.5">
            {loading ? "..." : value.toLocaleString()}
          </div>
          {trend !== null && trend !== undefined && !loading && (
            <div
              className={`flex items-center gap-1 text-xs mt-1 ${trend >= 0 ? "text-emerald-600" : "text-red-600"}`}
            >
              {trend >= 0 ? (
                <TrendingUp size={14} />
              ) : (
                <TrendingDown size={14} />
              )}
              {Math.abs(trend).toFixed(0)}% ຈາກເດືອນແລ້ວ
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const productsQuery = useQuery({
    queryKey: ["products", { limit: 200 }],
    queryFn: () => listProducts({ limit: 200 }),
  });
  const stockBalanceQuery = useQuery({
    queryKey: ["report-stock-balance-all"],
    queryFn: () => getStockBalanceReport({}),
  });
  const movementsQuery = useQuery({
    queryKey: ["dashboard-movements", sixMonthsAgo.toISOString().slice(0, 10)],
    queryFn: () =>
      getMovementsReport({
        dateFrom: sixMonthsAgo.toISOString().slice(0, 10),
        limit: 500,
      }),
  });
  const recentQuery = useQuery({
    queryKey: ["dashboard-recent"],
    queryFn: () => getMovementsReport({ limit: 5 }),
  });

  const loading =
    productsQuery.isLoading ||
    stockBalanceQuery.isLoading ||
    movementsQuery.isLoading;

  const totalStockQty = useMemo(
    () =>
      stockBalanceQuery.data?.reduce((sum, r) => sum + Number(r.quantity), 0) ??
      0,
    [stockBalanceQuery.data],
  );

  const stockByCategory = useMemo(() => {
    if (!stockBalanceQuery.data || !productsQuery.data) return [];
    const categoryBySku = new Map(
      productsQuery.data.map((p) => [
        p.sku,
        p.category_name || "ບໍ່ລະບຸໝວດໝູ່",
      ]),
    );
    const totals = new Map();
    for (const row of stockBalanceQuery.data) {
      const cat = categoryBySku.get(row.sku) || "ບໍ່ລະບຸໝວດໝູ່";
      totals.set(cat, (totals.get(cat) || 0) + Number(row.quantity));
    }
    return [...totals.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [stockBalanceQuery.data, productsQuery.data]);

  const monthlyChart = useMemo(() => {
    const buckets = new Map();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      buckets.set(monthKey(d), {
        label: LAO_MONTHS[d.getMonth()],
        ຮັບເຂົ້າ: 0,
        ເບີກຈ່າຍ: 0,
      });
    }
    for (const m of movementsQuery.data || []) {
      const bucket = buckets.get(monthKey(new Date(m.created_at)));
      if (!bucket) continue;
      if (m.movement_type === "RECEIPT")
        bucket["ຮັບເຂົ້າ"] += Number(m.quantity);
      if (m.movement_type === "ISSUE")
        bucket["ເບີກຈ່າຍ"] += Math.abs(Number(m.quantity));
    }
    return [...buckets.values()];
  }, [movementsQuery.data]);

  const monthCounts = useMemo(() => {
    const counts = {
      thisReceived: 0,
      thisIssued: 0,
      lastReceived: 0,
      lastIssued: 0,
    };
    for (const m of movementsQuery.data || []) {
      const d = new Date(m.created_at);
      if (d >= thisMonthStart) {
        if (m.movement_type === "RECEIPT") counts.thisReceived++;
        if (m.movement_type === "ISSUE") counts.thisIssued++;
      } else if (d >= lastMonthStart) {
        if (m.movement_type === "RECEIPT") counts.lastReceived++;
        if (m.movement_type === "ISSUE") counts.lastIssued++;
      }
    }
    return counts;
  }, [movementsQuery.data]);

  const lowStockItems = useMemo(() => {
    if (!stockBalanceQuery.data || !productsQuery.data) return [];
    const qtyBySku = new Map();
    for (const row of stockBalanceQuery.data) {
      qtyBySku.set(
        row.sku,
        (qtyBySku.get(row.sku) || 0) + Number(row.quantity),
      );
    }
    return productsQuery.data
      .filter(
        (p) =>
          Number(p.reorder_point) > 0 &&
          (qtyBySku.get(p.sku) || 0) <= Number(p.reorder_point),
      )
      .map((p) => ({ ...p, totalQty: qtyBySku.get(p.sku) || 0 }))
      .sort((a, b) => a.totalQty - b.totalQty)
      .slice(0, 5);
  }, [stockBalanceQuery.data, productsQuery.data]);

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-1">
        ສະບາຍດີ, {user?.fullName}
      </h2>
      <p className="text-gray-500 text-sm mb-6">ພາບລວມລະບົບຄັງສິນຄ້າ</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Boxes}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          label="ຈຳນວນສິນຄ້າ"
          value={productsQuery.data?.length ?? 0}
          loading={productsQuery.isLoading}
        />
        <StatCard
          icon={Package}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
          label="ສິນຄ້າຄົງຄັງລວມ"
          value={totalStockQty}
          loading={stockBalanceQuery.isLoading}
        />
        <StatCard
          icon={PackagePlus}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          label="ຮັບເຂົ້າສິນຄ້າ (ເດືອນນີ້)"
          value={monthCounts.thisReceived}
          trend={trendOf(monthCounts.thisReceived, monthCounts.lastReceived)}
          loading={movementsQuery.isLoading}
        />
        <StatCard
          icon={PackageMinus}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
          label="ເບີກຈ່າຍສິນຄ້າ (ເດືອນນີ້)"
          value={monthCounts.thisIssued}
          trend={trendOf(monthCounts.thisIssued, monthCounts.lastIssued)}
          loading={movementsQuery.isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-4">
            ພາບລວມການເຄື່ອນໄຫວສິນຄ້າ (6 ເດືອນຫຼ້າສຸດ)
          </h3>
          {loading ? (
            <Spinner />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="ຮັບເຂົ້າ"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="ເບີກຈ່າຍ"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-4">
            ສິນຄ້າຄົງຄັງແຍກຕາມໝວດໝູ່
          </h3>
          {loading ? (
            <Spinner />
          ) : stockByCategory.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={stockByCategory}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={68}
                  outerRadius={82}
                  paddingAngle={stockByCategory.length > 1 ? 3 : 0}
                  cornerRadius={6}
                  stroke="none"
                >
                  {stockByCategory.map((_, idx) => (
                    <Cell
                      key={idx}
                      fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-gray-400 text-sm text-center py-10">
              ບໍ່ມີຂໍ້ມູນ
            </div>
          )}
          <div className="space-y-1.5 mt-2">
            {stockByCategory.slice(0, 6).map((c, idx) => (
              <div
                key={c.name}
                className="flex items-center justify-between text-xs"
              >
                <span className="flex items-center gap-1.5 text-gray-600">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{
                      backgroundColor:
                        CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                    }}
                  />
                  {c.name}
                </span>
                <span className="text-gray-500">
                  {c.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-4">
            ສິນຄ້າໃກ້ໝົດສະຕັອກ
          </h3>
          {loading ? (
            <Spinner />
          ) : (
            <table className="w-full text-sm">
              <thead className="text-gray-500 text-left border-b">
                <tr>
                  <th className="pb-2">ລະຫັດສິນຄ້າ</th>
                  <th className="pb-2">ຊື່ສິນຄ້າ</th>
                  <th className="pb-2">ຄົງເຫຼືອ</th>
                  <th className="pb-2">ຂັ້ນຕ່ຳ</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {lowStockItems.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2">{p.sku}</td>
                    <td className="py-2 font-medium text-gray-800">
                      {p.name_lo}
                    </td>
                    <td className="py-2 text-red-600 font-medium">
                      {p.totalQty}
                    </td>
                    <td className="py-2">{p.reorder_point}</td>
                  </tr>
                ))}
                {!lowStockItems.length && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-400">
                      ບໍ່ມີສິນຄ້າໃກ້ໝົດສະຕັອກ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-4">
            ລາຍການເຄື່ອນໄຫວຫຼ້າສຸດ
          </h3>
          {recentQuery.isLoading ? (
            <Spinner />
          ) : (
            <div className="space-y-3">
              {recentQuery.data?.map((m) => {
                const meta =
                  MOVEMENT_META[m.movement_type] || MOVEMENT_META.ADJUSTMENT;
                const Icon = meta.icon;
                return (
                  <div key={m.id} className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${meta.badge}`}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-800 truncate">
                        {meta.label} — {m.sku}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {m.warehouse_name}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 shrink-0">
                      {new Date(m.created_at).toLocaleDateString("lo-LA")}
                    </div>
                  </div>
                );
              })}
              {!recentQuery.data?.length && (
                <div className="text-gray-400 text-sm text-center py-6">
                  ບໍ່ມີຂໍ້ມູນ
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
