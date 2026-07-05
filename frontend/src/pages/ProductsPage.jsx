import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { listProducts, createProduct, updateProduct, deleteProduct } from "../api/products";
import { listCategories } from "../api/catalog";
import { apiErrorMessage } from "../api/client";
import { toastSuccess, toastError, confirmAction } from "../lib/toast";
import { useAuth } from "../context/AuthContext";
import { Pencil, Trash2 } from "lucide-react";
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
      toastSuccess("ເພີ່ມສິນຄ້າແລ້ວ");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setModalOpen(false);
      setForm(EMPTY_FORM);
      navigate(`/products/${product.id}`);
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }) => updateProduct(id, { isActive }),
    onSuccess: () => {
      toastSuccess("ບັນທຶກແລ້ວ");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      toastSuccess("ລຶບສິນຄ້າແລ້ວ");
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const handleDelete = async (p) => {
    const result = await confirmAction({
      title: `ລຶບ "${p.name_lo}"?`,
      text: "ລຶບໄດ້ສະເພາະສິນຄ້າທີ່ຍັງບໍ່ເຄີຍມີປະຫວັດຮັບເຂົ້າ/ເບີກຈ່າຍ ຖ້າເຄີຍມີແລ້ວລະບົບຈະບໍ່ໃຫ້ລຶບ",
    });
    if (result.isConfirmed) deleteMutation.mutate(p.id);
  };

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
        <h2 className="text-xl font-bold text-gray-800">ສິນຄ້າ</h2>
        {canManage && (
          <Button onClick={() => setModalOpen(true)}>+ ເພີ່ມສິນຄ້າ</Button>
        )}
      </div>

      <div className="flex gap-3 mb-4">
        <input
          className={`${inputClass} max-w-xs`}
          placeholder="ຄົ້ນຫາ SKU / ຊື່ສິນຄ້າ / ບາໂຄດ"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className={`${selectClass} max-w-xs`}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">-- ທຸກໝວດໝູ່ --</option>
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
        <table className="w-full text-sm bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
          <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wide text-left">
            <tr>
              <th className="px-4 py-3"></th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">ຊື່ສິນຄ້າ</th>
              <th className="px-4 py-3">ໝວດໝູ່</th>
              <th className="px-4 py-3">ໜ່ວຍ</th>
              <th className="px-4 py-3">ສະຖານະ</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data?.map((p) => (
              <tr
                key={p.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => navigate(`/products/${p.id}`)}
              >
                <td className="px-4 py-3">
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
                <td className="px-4 py-3">{p.sku}</td>
                <td className="px-4 py-3 font-medium text-gray-800">
                  {p.name_lo}
                  {p.name_cn && (
                    <span className="text-gray-400"> / {p.name_cn}</span>
                  )}
                </td>
                <td className="px-4 py-3">{p.category_name || "-"}</td>
                <td className="px-4 py-3">{p.unit_lo}</td>
                <td className="px-4 py-3">
                  {canManage ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleActiveMutation.mutate({ id: p.id, isActive: !p.is_active });
                      }}
                      className={p.is_active ? "text-emerald-600 hover:underline" : "text-red-500 hover:underline"}
                    >
                      {p.is_active ? "ໃຊ້ງານ" : "ປິດໃຊ້ງານ"}
                    </button>
                  ) : p.is_active ? (
                    "ໃຊ້ງານ"
                  ) : (
                    "ປິດໃຊ້ງານ"
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/products/${p.id}`);
                      }}
                      title="ແກ້ໄຂ"
                      className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      <Pencil size={15} />
                    </button>
                    {canManage && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(p);
                        }}
                        title="ລຶບ"
                        className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!data?.length && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  ບໍ່ພົບສິນຄ້າ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <Modal
        open={modalOpen}
        title="ເພີ່ມສິນຄ້າ"
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
          <FormField label="ບາໂຄດ">
            <input
              className={inputClass}
              value={form.barcode}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
            />
          </FormField>
          <FormField label="ຊື່ສິນຄ້າ (ລາວ)">
            <input
              className={inputClass}
              value={form.nameLo}
              onChange={(e) => setForm({ ...form, nameLo: e.target.value })}
              required
            />
          </FormField>
          <FormField label="ຊື່ສິນຄ້າ (ຈີນ)">
            <input
              className={inputClass}
              value={form.nameCn}
              onChange={(e) => setForm({ ...form, nameCn: e.target.value })}
            />
          </FormField>
          <FormField label="ຮຸ່ນ/Model">
            <input
              className={inputClass}
              value={form.modelNo}
              onChange={(e) => setForm({ ...form, modelNo: e.target.value })}
            />
          </FormField>
          <FormField label="ຂະໜາດ">
            <input
              className={inputClass}
              value={form.size}
              onChange={(e) => setForm({ ...form, size: e.target.value })}
            />
          </FormField>
          <FormField label="ໝວດໝູ່">
            <select
              className={selectClass}
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              <option value="">-- ບໍ່ລະບຸ --</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_lo}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="ໜ່ວຍ">
            <input
              className={inputClass}
              value={form.unitLo}
              onChange={(e) => setForm({ ...form, unitLo: e.target.value })}
              required
            />
          </FormField>
          <FormField label="ຈຸດສັ່ງຊື້ຂັ້ນຕ່ຳ (Reorder point)">
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
              ຍົກເລີກ
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              ບັນທຶກ
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
