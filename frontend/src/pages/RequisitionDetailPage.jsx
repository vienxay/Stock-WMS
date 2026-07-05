import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRequisition,
  approveRequisition,
  rejectRequisition,
  issueRequisition,
} from "../api/requisitions";
import { apiErrorMessage } from "../api/client";
import { toastSuccess, toastError, confirmAction } from "../lib/toast";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Spinner from "../components/ui/Spinner";
import StatusBadge from "../components/ui/StatusBadge";
import { inputClass } from "../components/ui/FormField";

export default function RequisitionDetailPage() {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueQtys, setIssueQtys] = useState({});

  const canApprove = hasRole("SYSTEM_ADMIN", "DEPT_APPROVER");
  const canIssue = hasRole("SYSTEM_ADMIN", "BRANCH_STORE_KEEPER");

  const { data: requisition, isLoading } = useQuery({
    queryKey: ["requisition", id],
    queryFn: () => getRequisition(id),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["requisition", id] });
    queryClient.invalidateQueries({ queryKey: ["requisitions"] });
  };

  const approveMutation = useMutation({
    mutationFn: () => approveRequisition(id),
    onSuccess: () => {
      toastSuccess("อนุมัติใบเบิกแล้ว");
      invalidate();
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectRequisition(id),
    onSuccess: () => {
      toastSuccess("ปฏิเสธใบเบิกแล้ว");
      invalidate();
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const issueMutation = useMutation({
    mutationFn: (items) => issueRequisition(id, { items }),
    onSuccess: () => {
      toastSuccess("จ่ายของแล้ว");
      invalidate();
      setIssueModalOpen(false);
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const handleApprove = async () => {
    const result = await confirmAction({
      title: "อนุมัติใบเบิกนี้?",
      icon: "question",
      confirmButtonColor: "#2563eb",
    });
    if (result.isConfirmed) approveMutation.mutate();
  };

  const handleReject = async () => {
    const result = await confirmAction({ title: "ปฏิเสธใบเบิกนี้?" });
    if (result.isConfirmed) rejectMutation.mutate();
  };

  const openIssue = () => {
    const defaults = {};
    requisition.items.forEach((it) => {
      defaults[it.id] = it.quantity_requested;
    });
    setIssueQtys(defaults);
    setIssueModalOpen(true);
  };

  const handleIssueSubmit = (e) => {
    e.preventDefault();
    issueMutation.mutate(
      Object.entries(issueQtys).map(([itemId, quantityIssued]) => ({
        itemId: Number(itemId),
        quantityIssued: Number(quantityIssued),
      })),
    );
  };

  if (isLoading || !requisition) return <Spinner />;

  return (
    <div>
      <Link
        to="/requisitions"
        className="text-sm text-blue-600 hover:underline"
      >
        &larr; กลับไปรายการใบเบิก
      </Link>

      <div className="flex items-center justify-between mt-2 mb-4">
        <h2 className="text-xl font-bold text-gray-800">
          ใบเบิก #{requisition.id}
        </h2>
        <StatusBadge status={requisition.status} />
      </div>

      <div className="bg-white rounded-lg border shadow-sm p-5 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-gray-500">คลัง</div>
          <div className="font-medium">{requisition.warehouse_name}</div>
        </div>
        <div>
          <div className="text-gray-500">ผู้ขอเบิก</div>
          <div className="font-medium">{requisition.employee_name}</div>
        </div>
        <div>
          <div className="text-gray-500">แผนก</div>
          <div className="font-medium">
            {requisition.department_name || "-"}
          </div>
        </div>
        <div>
          <div className="text-gray-500">วัตถุประสงค์</div>
          <div className="font-medium">{requisition.purpose || "-"}</div>
        </div>
      </div>

      <table className="w-full text-sm bg-white rounded-lg overflow-hidden shadow-sm border mb-6">
        <thead className="bg-gray-50 text-gray-500 text-left">
          <tr>
            <th className="px-4 py-2">SKU</th>
            <th className="px-4 py-2">สินค้า</th>
            <th className="px-4 py-2">จำนวนที่ขอ</th>
            <th className="px-4 py-2">จำนวนที่จ่ายจริง</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {requisition.items.map((it) => (
            <tr key={it.id}>
              <td className="px-4 py-2">{it.sku}</td>
              <td className="px-4 py-2 font-medium text-gray-800">
                {it.product_name}
              </td>
              <td className="px-4 py-2">{it.quantity_requested}</td>
              <td className="px-4 py-2">{it.quantity_issued ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex gap-2">
        {requisition.status === "PENDING" && canApprove && (
          <>
            <Button onClick={handleApprove}>อนุมัติ</Button>
            <Button variant="danger" onClick={handleReject}>
              ปฏิเสธ
            </Button>
          </>
        )}
        {requisition.status === "APPROVED" && canIssue && (
          <Button onClick={openIssue}>จ่ายของ</Button>
        )}
      </div>

      <Modal
        open={issueModalOpen}
        title="จ่ายของ"
        onClose={() => setIssueModalOpen(false)}
      >
        <form onSubmit={handleIssueSubmit}>
          <div className="space-y-3 mb-4">
            {requisition.items.map((it) => (
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
                  value={issueQtys[it.id] ?? ""}
                  onChange={(e) =>
                    setIssueQtys({ ...issueQtys, [it.id]: e.target.value })
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
              onClick={() => setIssueModalOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={issueMutation.isPending}>
              ยืนยันจ่ายของ
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
