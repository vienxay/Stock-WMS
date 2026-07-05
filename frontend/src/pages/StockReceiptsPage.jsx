import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { listReceipts, createReceipt } from "../api/stockReceipts";
import { listWarehouses } from "../api/organization";
import { listProducts } from "../api/products";
import { apiErrorMessage } from "../api/client";
import { toastSuccess, toastError } from "../lib/toast";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Spinner from "../components/ui/Spinner";
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
      toastSuccess("บันทึกการรับสินค้าแล้ว");
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
        <h2 className="text-xl font-bold text-gray-800">รับสินค้าเข้า</h2>
        {canCreate && (
          <Button onClick={() => setModalOpen(true)}>+ รับสินค้าเข้า</Button>
        )}
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <table className="w-full text-sm bg-white rounded-lg overflow-hidden shadow-sm border">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2">เลขที่</th>
              <th className="px-4 py-2">คลัง</th>
              <th className="px-4 py-2">หมายเหตุ</th>
              <th className="px-4 py-2">สกุลเงิน</th>
              <th className="px-4 py-2">วันที่รับ</th>
              <th className="px-4 py-2">ผู้บันทึก</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data?.map((r) => (
              <tr
                key={r.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => navigate(`/stock-receipts/${r.id}`)}
              >
                <td className="px-4 py-2 font-medium text-gray-800">#{r.id}</td>
                <td className="px-4 py-2">{r.warehouse_name}</td>
                <td className="px-4 py-2 text-gray-500">
                  {r.source_note || "-"}
                </td>
                <td className="px-4 py-2">{r.currency_code}</td>
                <td className="px-4 py-2">{r.received_date?.slice(0, 10)}</td>
                <td className="px-4 py-2">{r.created_by_username}</td>
              </tr>
            ))}
            {!data?.length && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  ยังไม่มีการรับสินค้าเข้า
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <Modal
        open={modalOpen}
        title="รับสินค้าเข้า"
        onClose={() => setModalOpen(false)}
        wide
      >
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-3 gap-x-4">
            <FormField label="คลังส่วนกลาง (HQ)">
              <select
                className={selectClass}
                value={form.warehouseId}
                onChange={(e) =>
                  setForm({ ...form, warehouseId: e.target.value })
                }
                required
              >
                <option value="">-- เลือกคลัง --</option>
                {centralWarehouses?.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="สกุลเงิน">
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
            <FormField label="วันที่รับ">
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
          <FormField label="หมายเหตุ">
            <input
              className={inputClass}
              value={form.sourceNote}
              onChange={(e) => setForm({ ...form, sourceNote: e.target.value })}
              placeholder="เช่น จัดซื้อรอบ ก.ค. 69"
            />
          </FormField>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm text-gray-700">
                รายการสินค้า
              </h4>
              <Button type="button" variant="secondary" onClick={addItem}>
                + เพิ่มรายการ
              </Button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <select
                    className={`${selectClass} col-span-6`}
                    value={item.productId}
                    onChange={(e) =>
                      updateItem(idx, { productId: e.target.value })
                    }
                    required
                  >
                    <option value="">-- เลือกสินค้า --</option>
                    {products?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} — {p.name_lo}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    className={`${inputClass} col-span-2`}
                    placeholder="จำนวน"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(idx, { quantity: e.target.value })
                    }
                    required
                  />
                  <input
                    type="number"
                    step="0.0001"
                    className={`${inputClass} col-span-3`}
                    placeholder="ราคา/หน่วย"
                    value={item.unitPriceOriginal}
                    onChange={(e) =>
                      updateItem(idx, { unitPriceOriginal: e.target.value })
                    }
                    required
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="col-span-1 text-red-500 hover:text-red-700"
                    disabled={form.items.length === 1}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              บันทึกการรับสินค้า
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
