import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { listRequisitions, createRequisition } from "../api/requisitions";
import { listWarehouses, listDepartments } from "../api/organization";
import { listProducts } from "../api/products";
import { apiErrorMessage } from "../api/client";
import { toastSuccess, toastError } from "../lib/toast";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Spinner from "../components/ui/Spinner";
import StatusBadge from "../components/ui/StatusBadge";
import FormField, { inputClass, selectClass } from "../components/ui/FormField";

const EMPTY_ITEM = { productId: "", quantityRequested: "" };
const EMPTY_FORM = {
  warehouseId: "",
  departmentId: "",
  purpose: "",
  items: [{ ...EMPTY_ITEM }],
};
const STATUS_OPTIONS = ["PENDING", "APPROVED", "REJECTED", "ISSUED"];

export default function RequisitionsPage() {
  const { hasRole, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const canCreate = hasRole("SYSTEM_ADMIN", "EMPLOYEE", "BRANCH_STORE_KEEPER");

  const { data, isLoading } = useQuery({
    queryKey: ["requisitions", { status }],
    queryFn: () => listRequisitions({ status: status || undefined }),
  });
  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => listWarehouses(),
  });
  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: () => listDepartments(),
  });
  const { data: products } = useQuery({
    queryKey: ["products", { limit: 200 }],
    queryFn: () => listProducts({ limit: 200 }),
  });

  const branchDepartments = departments?.filter(
    (d) => !user?.branchId || d.branch_id === user.branchId,
  );

  const createMutation = useMutation({
    mutationFn: createRequisition,
    onSuccess: (requisition) => {
      toastSuccess("สร้างใบเบิกแล้ว");
      queryClient.invalidateQueries({ queryKey: ["requisitions"] });
      setModalOpen(false);
      setForm(EMPTY_FORM);
      navigate(`/requisitions/${requisition.id}`);
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
      departmentId: form.departmentId ? Number(form.departmentId) : null,
      items: form.items.map((it) => ({
        productId: Number(it.productId),
        quantityRequested: Number(it.quantityRequested),
      })),
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">ใบเบิกพนักงาน</h2>
        {canCreate && (
          <Button onClick={() => setModalOpen(true)}>+ สร้างใบเบิก</Button>
        )}
      </div>

      <select
        className={`${selectClass} max-w-xs mb-4`}
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="">-- ทุกสถานะ --</option>
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {isLoading ? (
        <Spinner />
      ) : (
        <table className="w-full text-sm bg-white rounded-lg overflow-hidden shadow-sm border">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2">เลขที่</th>
              <th className="px-4 py-2">คลัง</th>
              <th className="px-4 py-2">ผู้ขอเบิก</th>
              <th className="px-4 py-2">วัตถุประสงค์</th>
              <th className="px-4 py-2">สถานะ</th>
              <th className="px-4 py-2">วันที่ขอ</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data?.map((r) => (
              <tr
                key={r.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => navigate(`/requisitions/${r.id}`)}
              >
                <td className="px-4 py-2 font-medium text-gray-800">#{r.id}</td>
                <td className="px-4 py-2">{r.warehouse_name}</td>
                <td className="px-4 py-2">{r.employee_name}</td>
                <td className="px-4 py-2 text-gray-500">{r.purpose || "-"}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-2">{r.requested_at?.slice(0, 10)}</td>
              </tr>
            ))}
            {!data?.length && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  ไม่พบใบเบิก
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <Modal
        open={modalOpen}
        title="สร้างใบเบิกพนักงาน"
        onClose={() => setModalOpen(false)}
        wide
      >
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-x-4">
            <FormField label="คลังต้นทาง (คลังของไซต์ตัวเอง)">
              <select
                className={selectClass}
                value={form.warehouseId}
                onChange={(e) =>
                  setForm({ ...form, warehouseId: e.target.value })
                }
                required
              >
                <option value="">-- เลือกคลัง --</option>
                {warehouses?.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="แผนก (ถ้ามี)">
              <select
                className={selectClass}
                value={form.departmentId}
                onChange={(e) =>
                  setForm({ ...form, departmentId: e.target.value })
                }
              >
                <option value="">-- ไม่ระบุ --</option>
                {branchDepartments?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <FormField label="วัตถุประสงค์">
            <input
              className={inputClass}
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              placeholder="เช่น ใช้ในไลน์ผลิต A"
            />
          </FormField>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm text-gray-700">
                รายการสินค้าที่ขอเบิก
              </h4>
              <Button type="button" variant="secondary" onClick={addItem}>
                + เพิ่มรายการ
              </Button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <select
                    className={`${selectClass} col-span-8`}
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
                    className={`${inputClass} col-span-3`}
                    placeholder="จำนวนที่ขอ"
                    value={item.quantityRequested}
                    onChange={(e) =>
                      updateItem(idx, { quantityRequested: e.target.value })
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
              ส่งใบเบิก
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
