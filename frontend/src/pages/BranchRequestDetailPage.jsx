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
      toastSuccess("ອະນຸມັດຄຳຂໍແລ້ວ");
      invalidate();
      setApproveModalOpen(false);
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectBranchRequest(id, {}),
    onSuccess: () => {
      toastSuccess("ປະຕິເສດຄຳຂໍແລ້ວ");
      invalidate();
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const transferMutation = useMutation({
    mutationFn: () => transferBranchRequest(id),
    onSuccess: () => {
      toastSuccess("ໂອນສະຕັອກແລ້ວ");
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
    const result = await confirmAction({ title: "ປະຕິເສດຄຳຂໍນີ້?" });
    if (result.isConfirmed) rejectMutation.mutate();
  };

  const handleTransfer = async () => {
    const result = await confirmAction({
      title: "ຢືນຢັນໂອນສະຕັອກ?",
      text: "ລະບົບຈະຕັດສະຕັອກຈາກ HQ ແລະເພີ່ມໃຫ້ສາຂາທັນທີ",
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
        &larr; ກັບໄປລາຍການຄຳຂໍເບີກ
      </Link>

      <div className="flex items-center justify-between mt-2 mb-4">
        <h2 className="text-xl font-bold text-gray-800">
          ຄຳຂໍເບີກ #{request.id}
        </h2>
        <StatusBadge status={request.status} />
      </div>

      <div className="bg-white rounded-lg shadow-sm p-5 mb-6 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-gray-500">ຈາກຄັງ (HQ)</div>
          <div className="font-medium">{request.from_warehouse_name}</div>
        </div>
        <div>
          <div className="text-gray-500">ໄປຄັງ (ສາຂາ)</div>
          <div className="font-medium">{request.to_warehouse_name}</div>
        </div>
        <div>
          <div className="text-gray-500">ໝາຍເຫດ</div>
          <div className="font-medium">{request.note || "-"}</div>
        </div>
      </div>

      <table className="w-full text-sm bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 mb-6">
        <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wide text-left">
          <tr>
            <th className="px-4 py-3">SKU</th>
            <th className="px-4 py-3">ສິນຄ້າ</th>
            <th className="px-4 py-3">ຈຳນວນທີ່ຂໍ</th>
            <th className="px-4 py-3">ຈຳນວນທີ່ອະນຸມັດ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {request.items.map((it) => (
            <tr key={it.id}>
              <td className="px-4 py-3">{it.sku}</td>
              <td className="px-4 py-3 font-medium text-gray-800">
                {it.product_name}
              </td>
              <td className="px-4 py-3">{it.quantity_requested}</td>
              <td className="px-4 py-3">{it.quantity_approved ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex gap-2">
        {request.status === "PENDING" && canApprove && (
          <>
            <Button onClick={openApprove}>ອະນຸມັດ</Button>
            <Button variant="danger" onClick={handleReject}>
              ປະຕິເສດ
            </Button>
          </>
        )}
        {request.status === "APPROVED" && canTransfer && (
          <Button
            variant="success"
            onClick={handleTransfer}
            disabled={transferMutation.isPending}
          >
            ໂອນສະຕັອກໄປຍັງສາຂາ
          </Button>
        )}
      </div>

      <Modal
        open={approveModalOpen}
        title="ອະນຸມັດຄຳຂໍເບີກ"
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
                  {it.sku} — {it.product_name} (ຂໍ {it.quantity_requested})
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
              ຍົກເລີກ
            </Button>
            <Button type="submit" disabled={approveMutation.isPending}>
              ຢືນຢັນອະນຸມັດ
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
