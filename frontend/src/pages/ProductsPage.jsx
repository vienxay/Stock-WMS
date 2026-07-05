import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { listProducts, createProduct } from "../api/products";
import { listCategories } from "../api/catalog";
import { apiErrorMessage } from "../api/client";
import { toastSuccess, toastError } from "../lib/toast";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Spinner from "../components/ui/Spinner";
import FormField, { inputClass, selectClass } from "../components/ui/FormField";

const EMPTY_FORM = {
  sku: "",
  barcode: "",
  nameLo: "",
  nameCn: "",
  modelNo: "",
  size: "",
  categoryId: "",
  unitLo: "",
  reorderPoint: "0",
};

export default function ProductsPage() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const canManage = hasRole("SYSTEM_ADMIN", "HQ_STORE_KEEPER");

  const { data, isLoading } = useQuery({
    queryKey: ["products", { q, categoryId }],
    queryFn: () =>
      listProducts({
        q: q || undefined,
        categoryId: categoryId || undefined,
        limit: 100,
      }),
  });
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(),
  });

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: (product) => {
      toastSuccess("เพิ่มสินค้าแล้ว");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setModalOpen(false);
      setForm(EMPTY_FORM);
      navigate(`/products/${product.id}`);
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      reorderPoint: Number(form.reorderPoint) || 0,
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">สินค้า</h2>
        {canManage && (
          <Button onClick={() => setModalOpen(true)}>+ เพิ่มสินค้า</Button>
        )}
      </div>

      <div className="flex gap-3 mb-4">
        <input
          className={`${inputClass} max-w-xs`}
          placeholder="ค้นหา SKU / ชื่อสินค้า / บาร์โค้ด"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className={`${selectClass} max-w-xs`}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">-- ทุกหมวดหมู่ --</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_lo}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <table className="w-full text-sm bg-white rounded-lg overflow-hidden shadow-sm border">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2"></th>
              <th className="px-4 py-2">SKU</th>
              <th className="px-4 py-2">ชื่อสินค้า</th>
              <th className="px-4 py-2">หมวดหมู่</th>
              <th className="px-4 py-2">หน่วย</th>
              <th className="px-4 py-2">สถานะ</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data?.map((p) => (
              <tr
                key={p.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => navigate(`/products/${p.id}`)}
              >
                <td className="px-4 py-2">
                  {p.primary_image_url ? (
                    <img
                      src={p.primary_image_url}
                      alt=""
                      className="w-10 h-10 object-cover rounded"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded" />
                  )}
                </td>
                <td className="px-4 py-2">{p.sku}</td>
                <td className="px-4 py-2 font-medium text-gray-800">
                  {p.name_lo}
                  {p.name_cn && (
                    <span className="text-gray-400"> / {p.name_cn}</span>
                  )}
                </td>
                <td className="px-4 py-2">{p.category_name || "-"}</td>
                <td className="px-4 py-2">{p.unit_lo}</td>
                <td className="px-4 py-2">
                  {p.is_active ? "ใช้งาน" : "ปิดใช้งาน"}
                </td>
              </tr>
            ))}
            {!data?.length && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  ไม่พบสินค้า
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <Modal
        open={modalOpen}
        title="เพิ่มสินค้า"
        onClose={() => setModalOpen(false)}
        wide
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-x-4">
          <FormField label="SKU">
            <input
              className={inputClass}
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              required
            />
          </FormField>
          <FormField label="บาร์โค้ด">
            <input
              className={inputClass}
              value={form.barcode}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
            />
          </FormField>
          <FormField label="ชื่อสินค้า (ลาว)">
            <input
              className={inputClass}
              value={form.nameLo}
              onChange={(e) => setForm({ ...form, nameLo: e.target.value })}
              required
            />
          </FormField>
          <FormField label="ชื่อสินค้า (จีน)">
            <input
              className={inputClass}
              value={form.nameCn}
              onChange={(e) => setForm({ ...form, nameCn: e.target.value })}
            />
          </FormField>
          <FormField label="รุ่น/Model">
            <input
              className={inputClass}
              value={form.modelNo}
              onChange={(e) => setForm({ ...form, modelNo: e.target.value })}
            />
          </FormField>
          <FormField label="ขนาด">
            <input
              className={inputClass}
              value={form.size}
              onChange={(e) => setForm({ ...form, size: e.target.value })}
            />
          </FormField>
          <FormField label="หมวดหมู่">
            <select
              className={selectClass}
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              <option value="">-- ไม่ระบุ --</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_lo}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="หน่วย">
            <input
              className={inputClass}
              value={form.unitLo}
              onChange={(e) => setForm({ ...form, unitLo: e.target.value })}
              required
            />
          </FormField>
          <FormField label="จุดสั่งซื้อขั้นต่ำ (Reorder point)">
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={form.reorderPoint}
              onChange={(e) =>
                setForm({ ...form, reorderPoint: e.target.value })
              }
            />
          </FormField>
          <div className="col-span-2 flex justify-end gap-2 mt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              บันทึก
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
