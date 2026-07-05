import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getBranchRequest,
  approveBranchRequest,
  rejectBranchRequest,
  transferBranchRequest,
} from "../api/branchRequests";
import { apiErrorMessage } from "../api/client";
import { toastSuccess, toastError, confirmAction } from "../lib/toast";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Spinner from "../components/ui/Spinner";
import StatusBadge from "../components/ui/StatusBadge";
import { inputClass } from "../components/ui/FormField";

export default function BranchRequestDetailPage() {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approveQtys, setApproveQtys] = useState({});

  const canApprove = hasRole("SYSTEM_ADMIN", "HQ_APPROVER");
  const canTransfer = hasRole("SYSTEM_ADMIN", "HQ_STORE_KEEPER");

  const { data: request, isLoading } = useQuery({
    queryKey: ["branch-request", id],
    queryFn: () => getBranchRequest(id),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["branch-request", id] });
    queryClient.invalidateQueries({ queryKey: ["branch-requests"] });
  };

  const approveMutation = useMutation({
    mutationFn: (items) => approveBranchRequest(id, { items }),
    onSuccess: () => {
      toastSuccess("อนุมัติคำขอแล้ว");
      invalidate();
      setApproveModalOpen(false);
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectBranchRequest(id, {}),
    onSuccess: () => {
      toastSuccess("ปฏิเสธคำขอแล้ว");
      invalidate();
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const transferMutation = useMutation({
    mutationFn: () => transferBranchRequest(id),
    onSuccess: () => {
      toastSuccess("โอนสต็อกแล้ว");
      invalidate();
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const openApprove = () => {
    const defaults = {};
    request.items.forEach((it) => {
      defaults[it.id] = it.quantity_requested;
    });
    setApproveQtys(defaults);
    setApproveModalOpen(true);
  };

  const handleApproveSubmit = (e) => {
    e.preventDefault();
    approveMutation.mutate(
      Object.entries(approveQtys).map(([itemId, quantityApproved]) => ({
        itemId: Number(itemId),
        quantityApproved: Number(quantityApproved),
      })),
    );
  };

  const handleReject = async () => {
    const result = await confirmAction({ title: "ปฏิเสธคำขอนี้?" });
    if (result.isConfirmed) rejectMutation.mutate();
  };

  const handleTransfer = async () => {
    const result = await confirmAction({
      title: "ยืนยันโอนสต็อก?",
      text: "ระบบจะตัดสต็อกจาก HQ และเพิ่มให้สาขาทันที",
    });
    if (result.isConfirmed) transferMutation.mutate();
  };

  if (isLoading || !request) return <Spinner />;

  return (
    <div>
      <Link
        to="/branch-requests"
        className="text-sm text-blue-600 hover:underline"
      >
        &larr; กลับไปรายการคำขอเบิก
      </Link>

      <div className="flex items-center justify-between mt-2 mb-4">
        <h2 className="text-xl font-bold text-gray-800">
          คำขอเบิก #{request.id}
        </h2>
        <StatusBadge status={request.status} />
      </div>

      <div className="bg-white rounded-lg border shadow-sm p-5 mb-6 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-gray-500">จากคลัง (HQ)</div>
          <div className="font-medium">{request.from_warehouse_name}</div>
        </div>
        <div>
          <div className="text-gray-500">ไปคลัง (สาขา)</div>
          <div className="font-medium">{request.to_warehouse_name}</div>
        </div>
        <div>
          <div className="text-gray-500">หมายเหตุ</div>
          <div className="font-medium">{request.note || "-"}</div>
        </div>
      </div>

      <table className="w-full text-sm bg-white rounded-lg overflow-hidden shadow-sm border mb-6">
        <thead className="bg-gray-50 text-gray-500 text-left">
          <tr>
            <th className="px-4 py-2">SKU</th>
            <th className="px-4 py-2">สินค้า</th>
            <th className="px-4 py-2">จำนวนที่ขอ</th>
            <th className="px-4 py-2">จำนวนที่อนุมัติ</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {request.items.map((it) => (
            <tr key={it.id}>
              <td className="px-4 py-2">{it.sku}</td>
              <td className="px-4 py-2 font-medium text-gray-800">
                {it.product_name}
              </td>
              <td className="px-4 py-2">{it.quantity_requested}</td>
              <td className="px-4 py-2">{it.quantity_approved ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex gap-2">
        {request.status === "PENDING" && canApprove && (
          <>
            <Button onClick={openApprove}>อนุมัติ</Button>
            <Button variant="danger" onClick={handleReject}>
              ปฏิเสธ
            </Button>
          </>
        )}
        {request.status === "APPROVED" && canTransfer && (
          <Button
            variant="success"
            onClick={handleTransfer}
            disabled={transferMutation.isPending}
          >
            โอนสต็อกไปยังสาขา
          </Button>
        )}
      </div>

      <Modal
        open={approveModalOpen}
        title="อนุมัติคำขอเบิก"
        onClose={() => setApproveModalOpen(false)}
      >
        <form onSubmit={handleApproveSubmit}>
          <div className="space-y-3 mb-4">
            {request.items.map((it) => (
              <div
                key={it.id}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-sm">
                  {it.sku} — {it.product_name} (ขอ {it.quantity_requested})
                </span>
                <input
                  type="number"
                  step="0.01"
                  className={`${inputClass} w-28`}
                  value={approveQtys[it.id] ?? ""}
                  onChange={(e) =>
                    setApproveQtys({ ...approveQtys, [it.id]: e.target.value })
                  }
                  required
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setApproveModalOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={approveMutation.isPending}>
              ยืนยันอนุมัติ
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
