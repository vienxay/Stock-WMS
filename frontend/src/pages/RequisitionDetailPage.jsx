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

  const canApprove = hasRole("SUPER_ADMIN", "BRANCH_ADMIN");
  const canIssue = hasRole("BRANCH_ADMIN", "WAREHOUSE_STAFF");

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
      toastSuccess("ອະນຸມັດໃບເບີກແລ້ວ");
      invalidate();
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectRequisition(id),
    onSuccess: () => {
      toastSuccess("ປະຕິເສດໃບເບີກແລ້ວ");
      invalidate();
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const issueMutation = useMutation({
    mutationFn: (items) => issueRequisition(id, { items }),
    onSuccess: () => {
      toastSuccess("ຈ່າຍເຄື່ອງແລ້ວ");
      invalidate();
      setIssueModalOpen(false);
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const handleApprove = async () => {
    const result = await confirmAction({
      title: "ອະນຸມັດໃບເບີກນີ້?",
      icon: "question",
      confirmButtonColor: "#2563eb",
    });
    if (result.isConfirmed) approveMutation.mutate();
  };

  const handleReject = async () => {
    const result = await confirmAction({ title: "ປະຕິເສດໃບເບີກນີ້?" });
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
        &larr; ກັບໄປລາຍການໃບເບີກ
      </Link>

      <div className="flex items-center justify-between mt-2 mb-4">
        <h2 className="text-xl font-bold text-gray-800">
          ໃບເບີກ #{requisition.id}
        </h2>
        <StatusBadge status={requisition.status} />
      </div>

      <div className="bg-white rounded-lg shadow-sm p-5 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-gray-500">ຄັງ</div>
          <div className="font-medium">{requisition.warehouse_name}</div>
        </div>
        <div>
          <div className="text-gray-500">ຜູ້ຂໍເບີກ</div>
          <div className="font-medium">{requisition.employee_name}</div>
        </div>
        <div>
          <div className="text-gray-500">ພະແນກ</div>
          <div className="font-medium">
            {requisition.department_name || "-"}
          </div>
        </div>
        <div>
          <div className="text-gray-500">ຈຸດປະສົງ</div>
          <div className="font-medium">{requisition.purpose || "-"}</div>
        </div>
      </div>

      <table className="w-full text-sm bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 mb-6">
        <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wide text-left">
          <tr>
            <th className="px-4 py-3">SKU</th>
            <th className="px-4 py-3">ສິນຄ້າ</th>
            <th className="px-4 py-3">ຈຳນວນທີ່ຂໍ</th>
            <th className="px-4 py-3">ຈຳນວນທີ່ຈ່າຍຈິງ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {requisition.items.map((it) => (
            <tr key={it.id}>
              <td className="px-4 py-3">{it.sku}</td>
              <td className="px-4 py-3 font-medium text-gray-800">
                {it.product_name}
              </td>
              <td className="px-4 py-3">{it.quantity_requested}</td>
              <td className="px-4 py-3">{it.quantity_issued ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex gap-2">
        {requisition.status === "PENDING" && canApprove && (
          <>
            <Button onClick={handleApprove}>ອະນຸມັດ</Button>
            <Button variant="danger" onClick={handleReject}>
              ປະຕິເສດ
            </Button>
          </>
        )}
        {requisition.status === "APPROVED" && canIssue && (
          <Button onClick={openIssue}>ຮັບເຄື່ອງ</Button>
        )}
      </div>

      <Modal
        open={issueModalOpen}
        title="ຈ່າຍເຄື່ອງ"
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
                  {it.sku} — {it.product_name} (ຂໍ {it.quantity_requested})
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
              ຍົກເລີກ
            </Button>
            <Button type="submit" disabled={issueMutation.isPending}>
              ຢືນຢັນຮັບເຄື່ອງ
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
