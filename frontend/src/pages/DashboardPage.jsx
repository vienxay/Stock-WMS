import { useQuery } from "@tanstack/react-query";
import { listProducts } from "../api/products";
import { listBranchRequests } from "../api/branchRequests";
import { listRequisitions } from "../api/requisitions";
import Spinner from "../components/ui/Spinner";
import { useAuth } from "../context/AuthContext";

function Card({ label, value, loading }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-5">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-800 mt-1">
        {loading ? "..." : value}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  const products = useQuery({
    queryKey: ["products", { limit: 200 }],
    queryFn: () => listProducts({ limit: 200 }),
  });
  const pendingBranchRequests = useQuery({
    queryKey: ["branch-requests", { status: "PENDING" }],
    queryFn: () => listBranchRequests({ status: "PENDING" }),
  });
  const pendingRequisitions = useQuery({
    queryKey: ["requisitions", { status: "PENDING" }],
    queryFn: () => listRequisitions({ status: "PENDING" }),
  });

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-1">
        สวัสดี, {user?.fullName}
      </h2>
      <p className="text-gray-500 text-sm mb-6">ภาพรวมระบบคลังสินค้า</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          label="สินค้าทั้งหมด"
          value={products.data?.length ?? 0}
          loading={products.isLoading}
        />
        <Card
          label="คำขอเบิกระหว่างคลังที่รออนุมัติ"
          value={pendingBranchRequests.data?.length ?? 0}
          loading={pendingBranchRequests.isLoading}
        />
        <Card
          label="ใบเบิกพนักงานที่รออนุมัติ"
          value={pendingRequisitions.data?.length ?? 0}
          loading={pendingRequisitions.isLoading}
        />
      </div>

      {(products.isLoading ||
        pendingBranchRequests.isLoading ||
        pendingRequisitions.isLoading) && <Spinner />}
    </div>
  );
}
