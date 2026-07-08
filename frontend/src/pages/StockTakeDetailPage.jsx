import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getStockTake,
  updateStockTakeCount,
  completeStockTake,
} from "../api/stockTakes";
import { apiErrorMessage } from "../api/client";
import { toastSuccess, toastError, confirmAction } from "../lib/toast";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import StatusBadge from "../components/ui/StatusBadge";
import { inputClass } from "../components/ui/FormField";

export default function StockTakeDetailPage() {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();

  const canCount = hasRole("BRANCH_ADMIN", "WAREHOUSE_STAFF");

  const { data: stockTake, isLoading } = useQuery({
    queryKey: ["stock-take", id],
    queryFn: () => getStockTake(id),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["stock-take", id] });
    queryClient.invalidateQueries({ queryKey: ["stock-takes"] });
  };

  const countMutation = useMutation({
    mutationFn: ({ itemId, countedQty }) =>
      updateStockTakeCount(id, itemId, countedQty),
    onSuccess: invalidate,
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const completeMutation = useMutation({
    mutationFn: () => completeStockTake(id),
    onSuccess: () => {
      toastSuccess("ປິດຮອບກວດນັບແລ້ວ ປັບສະຕັອກຕາມຜົນຕ່າງຮຽບຮ້ອຍ");
      invalidate();
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const handleComplete = async () => {
    const result = await confirmAction({
      title: "ປິດຮອບກວດນັບ?",
      text: "ລະບົບຈະປັບຍອດສະຕັອກຕາມຜົນຕ່າງທີ່ນັບໄດ້ທັນທີ ແກ້ໄຂຍ້ອນຫຼັງບໍ່ໄດ້",
    });
    if (result.isConfirmed) completeMutation.mutate();
  };

  if (isLoading || !stockTake) return <Spinner />;

  const canEdit = canCount && stockTake.status === "IN_PROGRESS";

  return (
    <div>
      <Link to="/stock-takes" className="text-sm text-blue-600 hover:underline">
        &larr; ກັບໄປລາຍການກວດນັບ
      </Link>

      <div className="flex items-center justify-between mt-2 mb-4">
        <h2 className="text-xl font-bold text-gray-800">
          ຮອບກວດນັບ #{stockTake.id}
        </h2>
        <StatusBadge status={stockTake.status} />
      </div>

      <div className="bg-white rounded-lg shadow-sm p-5 mb-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-gray-500">ຄັງ</div>
          <div className="font-medium">{stockTake.warehouse_name}</div>
        </div>
        <div>
          <div className="text-gray-500">ວັນທີນັບ</div>
          <div className="font-medium">
            {stockTake.count_date?.slice(0, 10)}
          </div>
        </div>
      </div>

      <table className="w-full text-sm bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 mb-4">
        <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wide text-left">
          <tr>
            <th className="px-4 py-3">SKU</th>
            <th className="px-4 py-3">ສິນຄ້າ</th>
            <th className="px-4 py-3">ຍອດລະບົບ</th>
            <th className="px-4 py-3">ນັບໄດ້ຈິງ</th>
            <th className="px-4 py-3">ຜົນຕ່າງ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {stockTake.items.map((item) => (
            <StockTakeItemRow
              key={item.id}
              item={item}
              editable={canEdit}
              onSave={(countedQty) =>
                countMutation.mutate({ itemId: item.id, countedQty })
              }
              saving={countMutation.isPending}
            />
          ))}
          {!stockTake.items.length && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                ບໍ່ມີສິນຄ້າໃນຄັງນີ້ ໃນວັນທີ່ເປີດຮອບ
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {canEdit && (
        <Button
          variant="success"
          onClick={handleComplete}
          disabled={completeMutation.isPending}
        >
          ປິດຮອບກວດນັບ
        </Button>
      )}
    </div>
  );
}

function StockTakeItemRow({ item, editable, onSave, saving }) {
  const [value, setValue] = useState(item.counted_qty);

  return (
    <tr>
      <td className="px-4 py-3">{item.sku}</td>
      <td className="px-4 py-3 font-medium text-gray-800">
        {item.product_name}
      </td>
      <td className="px-4 py-3">{item.system_qty}</td>
      <td className="px-4 py-3">
        {editable ? (
          <input
            type="number"
            step="1"
            className={`${inputClass} w-28`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => {
              if (Number(value) !== Number(item.counted_qty))
                onSave(Number(value));
            }}
            disabled={saving}
          />
        ) : (
          item.counted_qty
        )}
      </td>
      <td
        className={`px-4 py-3 font-medium ${Number(item.variance) < 0 ? "text-red-600" : Number(item.variance) > 0 ? "text-emerald-600" : ""}`}
      >
        {item.variance}
      </td>
    </tr>
  );
}
