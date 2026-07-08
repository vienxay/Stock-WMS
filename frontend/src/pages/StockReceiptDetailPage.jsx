import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getReceipt,
  updateReceipt,
  approveReceipt,
  rejectReceipt,
} from "../api/stockReceipts";
import { listProducts } from "../api/products";
import { apiErrorMessage } from "../api/client";
import { toastSuccess, toastError, confirmAction } from "../lib/toast";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Spinner from "../components/ui/Spinner";
import StatusBadge from "../components/ui/StatusBadge";
import ItemRowsEditor from "../components/ui/ItemRowsEditor";
import FormField, { inputClass, selectClass } from "../components/ui/FormField";

export default function StockReceiptDetailPage() {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();

  const canApprove = hasRole("BRANCH_ADMIN");
  const canEdit = hasRole("BRANCH_ADMIN");

  const { data: receipt, isLoading } = useQuery({
    queryKey: ["stock-receipt", id],
    queryFn: () => getReceipt(id),
  });
  const { data: products } = useQuery({
    queryKey: ["products", { limit: 200 }],
    queryFn: () => listProducts({ limit: 200 }),
  });

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [form, setForm] = useState(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["stock-receipt", id] });
    queryClient.invalidateQueries({ queryKey: ["stock-receipts"] });
  };

  const updateMutation = useMutation({
    mutationFn: (body) => updateReceipt(id, body),
    onSuccess: () => {
      toastSuccess("ບັນທຶກແລ້ວ");
      invalidate();
      setEditModalOpen(false);
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const approveMutation = useMutation({
    mutationFn: () => approveReceipt(id),
    onSuccess: () => {
      toastSuccess("ອະນຸມັດ ແລະ ອັບເດດສະຕັອກແລ້ວ");
      invalidate();
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectReceipt(id),
    onSuccess: () => {
      toastSuccess("ປະຕິເສດໃບຮັບແລ້ວ");
      invalidate();
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const openEdit = () => {
    setForm({
      sourceNote: receipt.source_note || "",
      currencyCode: receipt.currency_code,
      receivedDate: receipt.received_date?.slice(0, 10),
      items: receipt.items.map((it) => ({
        productId: it.product_id,
        quantity: it.quantity,
        unitPriceOriginal: it.unit_price_original,
      })),
    });
    setEditModalOpen(true);
  };

  const updateItem = (idx, patch) => {
    const items = form.items.map((it, i) =>
      i === idx ? { ...it, ...patch } : it,
    );
    setForm({ ...form, items });
  };
  const addItem = () =>
    setForm({
      ...form,
      items: [...form.items, { productId: "", quantity: "", unitPriceOriginal: "" }],
    });
  const removeItem = (idx) =>
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });

  const handleEditSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      ...form,
      items: form.items.map((it) => ({
        productId: Number(it.productId),
        quantity: Number(it.quantity),
        unitPriceOriginal: Number(it.unitPriceOriginal),
      })),
    });
  };

  const handleApprove = async () => {
    const result = await confirmAction({
      title: "ອະນຸມັດໃບຮັບສິນຄ້ານີ້?",
      text: "ລະບົບຈະບັນທຶກສະຕັອກເຂົ້າຄັງທັນທີ ຫຼັງຈາກນີ້ຈະແກ້ໄຂຫຼືປະຕິເສດບໍ່ໄດ້ອີກ",
      icon: "question",
      confirmButtonColor: "#2563eb",
    });
    if (result.isConfirmed) approveMutation.mutate();
  };

  const handleReject = async () => {
    const result = await confirmAction({ title: "ປະຕິເສດໃບຮັບສິນຄ້ານີ້?" });
    if (result.isConfirmed) rejectMutation.mutate();
  };

  if (isLoading || !receipt) return <Spinner />;

  const totalValue = receipt.items.reduce(
    (sum, it) => sum + Number(it.total_value_lak),
    0,
  );

  return (
    <div>
      <Link
        to="/stock-receipts"
        className="text-sm text-blue-600 hover:underline"
      >
        &larr; ກັບໄປລາຍການຮັບສິນຄ້າເຂົ້າ
      </Link>

      <div className="flex items-center justify-between mt-2 mb-4">
        <h2 className="text-xl font-bold text-gray-800">
          ໃບຮັບສິນຄ້າເຂົ້າ #{receipt.id}
        </h2>
        <StatusBadge status={receipt.status} />
      </div>

      <div className="bg-white rounded-lg shadow-sm p-5 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-gray-500">ວັນທີຮັບ</div>
          <div className="font-medium">
            {receipt.received_date?.slice(0, 10)}
          </div>
        </div>
        <div>
          <div className="text-gray-500">ສະກຸນເງິນ</div>
          <div className="font-medium">{receipt.currency_code}</div>
        </div>
        <div>
          <div className="text-gray-500">ອັດຕາແລກປ່ຽນທີ່ໃຊ້</div>
          <div className="font-medium">
            {Number(receipt.exchange_rate_used).toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-gray-500">ໝາຍເຫດ</div>
          <div className="font-medium">{receipt.source_note || "-"}</div>
        </div>
      </div>

      <table className="w-full text-sm bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
        <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wide text-left">
          <tr>
            <th className="px-4 py-3">SKU</th>
            <th className="px-4 py-3">ສິນຄ້າ</th>
            <th className="px-4 py-3">ຈຳນວນ</th>
            <th className="px-4 py-3">ລາຄາ/ໜ່ວຍ (ເດີມ)</th>
            <th className="px-4 py-3">ລາຄາ/ໜ່ວຍ (LAK)</th>
            <th className="px-4 py-3">ມູນຄ່າລວມ (LAK)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {receipt.items.map((it) => (
            <tr key={it.id}>
              <td className="px-4 py-3">{it.sku}</td>
              <td className="px-4 py-3 font-medium text-gray-800">
                {it.product_name}
              </td>
              <td className="px-4 py-3">{it.quantity}</td>
              <td className="px-4 py-3">
                {Number(it.unit_price_original).toLocaleString()}
              </td>
              <td className="px-4 py-3">
                {Number(it.unit_price_lak).toLocaleString()}
              </td>
              <td className="px-4 py-3">
                {Number(it.total_value_lak).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t font-semibold">
            <td colSpan={5} className="px-4 py-3 text-right">
              ລວມມູນຄ່າ (LAK)
            </td>
            <td className="px-4 py-3">{totalValue.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>

      {receipt.status === "PENDING" && (
        <div className="flex gap-2 mt-6">
          {canEdit && <Button variant="secondary" onClick={openEdit}>ແກ້ໄຂ</Button>}
          {canApprove && (
            <>
              <Button
                onClick={handleApprove}
                disabled={approveMutation.isPending}
              >
                ອະນຸມັດ
              </Button>
              <Button
                variant="danger"
                onClick={handleReject}
                disabled={rejectMutation.isPending}
              >
                ປະຕິເສດ
              </Button>
            </>
          )}
        </div>
      )}

      <Modal
        open={editModalOpen}
        title={`ແກ້ໄຂໃບຮັບສິນຄ້າ #${receipt.id}`}
        onClose={() => setEditModalOpen(false)}
        wide
      >
        {form && (
          <form onSubmit={handleEditSubmit}>
            <div className="grid grid-cols-2 gap-x-4">
              <FormField label="ສະກຸນເງິນ">
                <select
                  className={selectClass}
                  value={form.currencyCode}
                  onChange={(e) =>
                    setForm({ ...form, currencyCode: e.target.value })
                  }
                >
                  <option value="LAK">LAK</option>
                  <option value="THB">THB</option>
                  <option value="CNY">CNY</option>
                </select>
              </FormField>
              <FormField label="ວັນທີຮັບ">
                <input
                  type="date"
                  className={inputClass}
                  value={form.receivedDate}
                  onChange={(e) =>
                    setForm({ ...form, receivedDate: e.target.value })
                  }
                  required
                />
              </FormField>
            </div>
            <FormField label="ໝາຍເຫດ">
              <input
                className={inputClass}
                value={form.sourceNote}
                onChange={(e) =>
                  setForm({ ...form, sourceNote: e.target.value })
                }
              />
            </FormField>

            <div className="mt-4">
              <ItemRowsEditor
                items={form.items}
                products={products}
                onUpdate={updateItem}
                onAdd={addItem}
                onRemove={removeItem}
                quantityField="quantity"
                quantityLabel="ຈຳນວນ"
                priceField={{ key: "unitPriceOriginal", label: "ລາຄາ/ໜ່ວຍ" }}
              />
            </div>

            <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditModalOpen(false)}
              >
                ຍົກເລີກ
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                ບັນທຶກ
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
