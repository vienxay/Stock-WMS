import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { listReceipts, createReceipt } from "../api/stockReceipts";
import { listWarehouses } from "../api/organization";
import { listProducts } from "../api/products";
import { apiErrorMessage } from "../api/client";
import { toastSuccess, toastError } from "../lib/toast";
import { useAuth } from "../context/AuthContext";
import { PackagePlus } from "lucide-react";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Spinner from "../components/ui/Spinner";
import ItemRowsEditor from "../components/ui/ItemRowsEditor";
import FormField, { inputClass, selectClass } from "../components/ui/FormField";

const EMPTY_ITEM = { productId: "", quantity: "", unitPriceOriginal: "" };
const EMPTY_FORM = {
  warehouseId: "",
  sourceNote: "",
  currencyCode: "LAK",
  receivedDate: new Date().toISOString().slice(0, 10),
  items: [{ ...EMPTY_ITEM }],
};

export default function StockReceiptsPage() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const canCreate = hasRole("SYSTEM_ADMIN", "HQ_STORE_KEEPER");

  const { data, isLoading } = useQuery({
    queryKey: ["stock-receipts"],
    queryFn: () => listReceipts(),
  });
  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => listWarehouses(),
  });
  const { data: products } = useQuery({
    queryKey: ["products", { limit: 200 }],
    queryFn: () => listProducts({ limit: 200 }),
  });

  const centralWarehouses = warehouses?.filter((w) => w.is_central);

  const createMutation = useMutation({
    mutationFn: createReceipt,
    onSuccess: (receipt) => {
      toastSuccess("ບັນທຶກການຮັບສິນຄ້າແລ້ວ");
      queryClient.invalidateQueries({ queryKey: ["stock-receipts"] });
      setModalOpen(false);
      setForm(EMPTY_FORM);
      navigate(`/stock-receipts/${receipt.id}`);
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const updateItem = (idx, patch) => {
    const items = form.items.map((it, i) =>
      i === idx ? { ...it, ...patch } : it,
    );
    setForm({ ...form, items });
  };

  const addItem = () =>
    setForm({ ...form, items: [...form.items, { ...EMPTY_ITEM }] });
  const removeItem = (idx) =>
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      warehouseId: Number(form.warehouseId),
      items: form.items.map((it) => ({
        productId: Number(it.productId),
        quantity: Number(it.quantity),
        unitPriceOriginal: Number(it.unitPriceOriginal),
      })),
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">ຮັບສິນຄ້າເຂົ້າ</h2>
        {canCreate && (
          <Button onClick={() => setModalOpen(true)}>+ ຮັບສິນຄ້າເຂົ້າ</Button>
        )}
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <table className="w-full text-sm bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
          <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wide text-left">
            <tr>
              <th className="px-4 py-3">ເລກທີ</th>
              <th className="px-4 py-3">ຄັງ</th>
              <th className="px-4 py-3">ໝາຍເຫດ</th>
              <th className="px-4 py-3">ສະກຸນເງິນ</th>
              <th className="px-4 py-3">ວັນທີຮັບ</th>
              <th className="px-4 py-3">ຜູ້ບັນທຶກ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data?.map((r) => (
              <tr
                key={r.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => navigate(`/stock-receipts/${r.id}`)}
              >
                <td className="px-4 py-3 font-medium text-gray-800">#{r.id}</td>
                <td className="px-4 py-3">{r.warehouse_name}</td>
                <td className="px-4 py-3 text-gray-500">
                  {r.source_note || "-"}
                </td>
                <td className="px-4 py-3">{r.currency_code}</td>
                <td className="px-4 py-3">{r.received_date?.slice(0, 10)}</td>
                <td className="px-4 py-3">{r.created_by_username}</td>
              </tr>
            ))}
            {!data?.length && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  ຍັງບໍ່ມີການຮັບສິນຄ້າເຂົ້າ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <Modal
        open={modalOpen}
        title="ຮັບສິນຄ້າເຂົ້າ"
        icon={PackagePlus}
        onClose={() => setModalOpen(false)}
        wide
      >
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-3 gap-x-4">
            <FormField label="ຄັງສ່ວນກາງ (HQ)">
              <select
                className={selectClass}
                value={form.warehouseId}
                onChange={(e) =>
                  setForm({ ...form, warehouseId: e.target.value })
                }
                required
              >
                <option value="">-- ເລືອກຄັງ --</option>
                {centralWarehouses?.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </FormField>
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
              onChange={(e) => setForm({ ...form, sourceNote: e.target.value })}
              placeholder="ຕົວຢ່າງ: ຈັດຊື້ຮອບ ກ.ລ 69"
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
              onClick={() => setModalOpen(false)}
            >
              ຍົກເລີກ
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              ບັນທຶກການຮັບສິນຄ້າ
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
