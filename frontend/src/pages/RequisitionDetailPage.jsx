import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRequisition,
  approveRequisition,
  rejectRequisition,
  confirmReceipt,
} from "../api/requisitions";
import { apiErrorMessage } from "../api/client";
import { toastSuccess, toastError, confirmAction } from "../lib/toast";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import StatusBadge from "../components/ui/StatusBadge";

export default function RequisitionDetailPage() {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();

  const canApprove = hasRole("SUPER_ADMIN", "BRANCH_ADMIN");
  const canConfirmReceipt = hasRole("WAREHOUSE_STAFF");

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
      toastSuccess("ອະນຸມັດ ແລະ ຈ່າຍເຄື່ອງແລ້ວ");
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

  const confirmReceiptMutation = useMutation({
    mutationFn: () => confirmReceipt(id),
    onSuccess: () => {
      toastSuccess("ຢືນຢັນຮັບເຄື່ອງແລ້ວ");
      invalidate();
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const handleApprove = async () => {
    const result = await confirmAction({
      title: "ອະນຸມັດໃບເບີກນີ້?",
      text: "ລະບົບຈະຈ່າຍເຄື່ອງຕາມຈຳນວນທີ່ຂໍເບີກມາ ແລະຕັດສະຕັອກທັນທີ",
      icon: "question",
      confirmButtonColor: "#2563eb",
    });
    if (result.isConfirmed) approveMutation.mutate();
  };

  const handleReject = async () => {
    const result = await confirmAction({ title: "ປະຕິເສດໃບເບີກນີ້?" });
    if (result.isConfirmed) rejectMutation.mutate();
  };

  const handleConfirmReceipt = async () => {
    const result = await confirmAction({
      title: "ຢືນຢັນວ່າໄດ້ຮັບເຄື່ອງແລ້ວ?",
    });
    if (result.isConfirmed) confirmReceiptMutation.mutate();
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
          <div className="text-gray-500">ສາງ</div>
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
        {requisition.status === "ISSUED" && canConfirmReceipt && (
          <Button onClick={handleConfirmReceipt}>ຢືນຢັນຮັບເຄື່ອງ</Button>
        )}
      </div>
    </div>
  );
}
