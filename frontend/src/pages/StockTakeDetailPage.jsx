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

  const canCount = hasRole(
    "SYSTEM_ADMIN",
    "HQ_STORE_KEEPER",
    "BRANCH_STORE_KEEPER",
  );

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
      toastSuccess("ปิดรอบตรวจนับแล้ว ปรับสต็อกตามผลต่างเรียบร้อย");
      invalidate();
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const handleComplete = async () => {
    const result = await confirmAction({
      title: "ปิดรอบตรวจนับ?",
      text: "ระบบจะปรับยอดสต็อกตามผลต่างที่นับได้ทันที แก้ไขย้อนหลังไม่ได้",
    });
    if (result.isConfirmed) completeMutation.mutate();
  };

  if (isLoading || !stockTake) return <Spinner />;

  const canEdit = canCount && stockTake.status === "IN_PROGRESS";

  return (
    <div>
      <Link to="/stock-takes" className="text-sm text-blue-600 hover:underline">
        &larr; กลับไปรายการตรวจนับ
      </Link>

      <div className="flex items-center justify-between mt-2 mb-4">
        <h2 className="text-xl font-bold text-gray-800">
          รอบตรวจนับ #{stockTake.id}
        </h2>
        <StatusBadge status={stockTake.status} />
      </div>

      <div className="bg-white rounded-lg border shadow-sm p-5 mb-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-gray-500">คลัง</div>
          <div className="font-medium">{stockTake.warehouse_name}</div>
        </div>
        <div>
          <div className="text-gray-500">วันที่นับ</div>
          <div className="font-medium">
            {stockTake.count_date?.slice(0, 10)}
          </div>
        </div>
      </div>

      <table className="w-full text-sm bg-white rounded-lg overflow-hidden shadow-sm border mb-4">
        <thead className="bg-gray-50 text-gray-500 text-left">
          <tr>
            <th className="px-4 py-2">SKU</th>
            <th className="px-4 py-2">สินค้า</th>
            <th className="px-4 py-2">ยอดระบบ</th>
            <th className="px-4 py-2">นับได้จริง</th>
            <th className="px-4 py-2">ผลต่าง</th>
          </tr>
        </thead>
        <tbody className="divide-y">
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
                ไม่มีสินค้าในคลังนี้ ณ วันที่เปิดรอบ
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
          ปิดรอบตรวจนับ
        </Button>
      )}
    </div>
  );
}

function StockTakeItemRow({ item, editable, onSave, saving }) {
  const [value, setValue] = useState(item.counted_qty);

  return (
    <tr>
      <td className="px-4 py-2">{item.sku}</td>
      <td className="px-4 py-2 font-medium text-gray-800">
        {item.product_name}
      </td>
      <td className="px-4 py-2">{item.system_qty}</td>
      <td className="px-4 py-2">
        {editable ? (
          <input
            type="number"
            step="0.01"
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
        className={`px-4 py-2 font-medium ${Number(item.variance) < 0 ? "text-red-600" : Number(item.variance) > 0 ? "text-emerald-600" : ""}`}
      >
        {item.variance}
      </td>
    </tr>
  );
}
