import { useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProduct,
  getProductStock,
  updateProduct,
  uploadProductImage,
  setPrimaryProductImage,
  deleteProductImage,
} from "../api/products";
import { listCategories } from "../api/catalog";
import { apiErrorMessage } from "../api/client";
import { toastSuccess, toastError, confirmAction } from "../lib/toast";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import FormField, { inputClass, selectClass } from "../components/ui/FormField";

export default function ProductDetailPage() {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const canManage = hasRole("SYSTEM_ADMIN", "HQ_STORE_KEEPER");

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProduct(id),
  });
  const { data: stock } = useQuery({
    queryKey: ["product-stock", id],
    queryFn: () => getProductStock(id),
  });
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(),
  });

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);

  const invalidateProduct = () =>
    queryClient.invalidateQueries({ queryKey: ["product", id] });

  const updateMutation = useMutation({
    mutationFn: (body) => updateProduct(id, body),
    onSuccess: () => {
      toastSuccess("บันทึกแล้ว");
      invalidateProduct();
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setEditing(false);
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, isPrimary }) =>
      uploadProductImage(id, file, isPrimary),
    onSuccess: () => {
      toastSuccess("อัปโหลดรูปแล้ว");
      invalidateProduct();
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const setPrimaryMutation = useMutation({
    mutationFn: (imageId) => setPrimaryProductImage(id, imageId),
    onSuccess: () => {
      toastSuccess("ตั้งเป็นภาพหลักแล้ว");
      invalidateProduct();
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const deleteImageMutation = useMutation({
    mutationFn: (imageId) => deleteProductImage(id, imageId),
    onSuccess: () => {
      toastSuccess("ลบรูปแล้ว");
      invalidateProduct();
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const startEdit = () => {
    setForm({
      sku: product.sku,
      barcode: product.barcode || "",
      nameLo: product.name_lo,
      nameCn: product.name_cn || "",
      modelNo: product.model_no || "",
      size: product.size || "",
      categoryId: product.category_id || "",
      unitLo: product.unit_lo,
      reorderPoint: product.reorder_point ?? 0,
      isActive: !!product.is_active,
    });
    setEditing(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      ...form,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadMutation.mutate({ file, isPrimary: !product.images?.length });
    e.target.value = "";
  };

  const handleDeleteImage = async (imageId) => {
    const result = await confirmAction({ title: "ลบรูปนี้?" });
    if (result.isConfirmed) deleteImageMutation.mutate(imageId);
  };

  if (isLoading || !product) return <Spinner />;

  return (
    <div>
      <Link to="/products" className="text-sm text-blue-600 hover:underline">
        &larr; กลับไปรายการสินค้า
      </Link>

      <div className="flex items-center justify-between mt-2 mb-4">
        <h2 className="text-xl font-bold text-gray-800">{product.name_lo}</h2>
        {canManage && !editing && (
          <Button onClick={startEdit}>แก้ไขข้อมูล</Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg border shadow-sm p-5">
          {editing ? (
            <form onSubmit={handleSave} className="grid grid-cols-2 gap-x-4">
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
                  onChange={(e) =>
                    setForm({ ...form, barcode: e.target.value })
                  }
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
                  onChange={(e) =>
                    setForm({ ...form, modelNo: e.target.value })
                  }
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
                  onChange={(e) =>
                    setForm({ ...form, categoryId: e.target.value })
                  }
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
              <FormField label="จุดสั่งซื้อขั้นต่ำ">
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
              <label className="flex items-center gap-2 text-sm mt-6">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                />
                ใช้งานอยู่
              </label>
              <div className="col-span-2 flex justify-end gap-2 mt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditing(false)}
                >
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  บันทึก
                </Button>
              </div>
            </form>
          ) : (
            <dl className="grid grid-cols-2 gap-y-3 text-sm">
              <dt className="text-gray-500">SKU</dt>
              <dd>{product.sku}</dd>
              <dt className="text-gray-500">บาร์โค้ด</dt>
              <dd>{product.barcode || "-"}</dd>
              <dt className="text-gray-500">ชื่อ (จีน)</dt>
              <dd>{product.name_cn || "-"}</dd>
              <dt className="text-gray-500">รุ่น/Model</dt>
              <dd>{product.model_no || "-"}</dd>
              <dt className="text-gray-500">ขนาด</dt>
              <dd>{product.size || "-"}</dd>
              <dt className="text-gray-500">หมวดหมู่</dt>
              <dd>{product.category_name || "-"}</dd>
              <dt className="text-gray-500">หน่วย</dt>
              <dd>{product.unit_lo}</dd>
              <dt className="text-gray-500">จุดสั่งซื้อขั้นต่ำ</dt>
              <dd>{product.reorder_point}</dd>
              <dt className="text-gray-500">สถานะ</dt>
              <dd>{product.is_active ? "ใช้งาน" : "ปิดใช้งาน"}</dd>
            </dl>
          )}
        </div>

        <div className="bg-white rounded-lg border shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700">รูปภาพ</h3>
            {canManage && (
              <>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadMutation.isPending}
                >
                  + อัปโหลด
                </Button>
              </>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {product.images?.map((img) => (
              <div key={img.id} className="relative group">
                <img
                  src={img.image_url}
                  alt=""
                  className="w-full aspect-square object-cover rounded border"
                />
                {img.is_primary && (
                  <span className="absolute top-1 left-1 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded">
                    หลัก
                  </span>
                )}
                {canManage && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity">
                    {!img.is_primary && (
                      <button
                        onClick={() => setPrimaryMutation.mutate(img.id)}
                        className="text-white text-xs bg-blue-600 rounded px-1.5 py-0.5"
                      >
                        ตั้งหลัก
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteImage(img.id)}
                      className="text-white text-xs bg-red-600 rounded px-1.5 py-0.5"
                    >
                      ลบ
                    </button>
                  </div>
                )}
              </div>
            ))}
            {!product.images?.length && (
              <div className="col-span-3 text-gray-400 text-sm">
                ยังไม่มีรูปภาพ
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm p-5 mt-6">
        <h3 className="font-semibold text-gray-700 mb-3">
          สต็อกคงเหลือแยกตามคลัง
        </h3>
        <table className="w-full text-sm">
          <thead className="text-gray-500 text-left border-b">
            <tr>
              <th className="py-2">คลัง</th>
              <th className="py-2">จำนวนคงเหลือ</th>
              <th className="py-2">ต้นทุนเฉลี่ย/หน่วย (LAK)</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {stock?.map((s) => (
              <tr key={s.warehouse_id}>
                <td className="py-2">{s.warehouse_name}</td>
                <td className="py-2">
                  {s.quantity} {product.unit_lo}
                </td>
                <td className="py-2">
                  {Number(s.avg_unit_value_lak).toLocaleString()}
                </td>
              </tr>
            ))}
            {!stock?.length && (
              <tr>
                <td colSpan={3} className="py-6 text-center text-gray-400">
                  ยังไม่มีสต็อกของสินค้านี้
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
