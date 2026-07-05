import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkImportProducts,
  bulkDeleteProducts,
  downloadImportTemplate,
} from "../api/products";
import { listCategories } from "../api/catalog";
import { apiErrorMessage } from "../api/client";
import { toastSuccess, toastError, confirmAction } from "../lib/toast";
import { useAuth } from "../context/AuthContext";
import { Pencil, Trash2, Upload, Download } from "lucide-react";
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
  const [importResult, setImportResult] = useState(null);
  const [deleteResult, setDeleteResult] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const fileInputRef = useRef(null);

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

  const bulkDeleteMutation = useMutation({
    mutationFn: bulkDeleteProducts,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setSelectedIds(new Set());
      setDeleteResult(result);
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const toggleSelected = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!data?.length) return;
    setSelectedIds((prev) =>
      prev.size === data.length ? new Set() : new Set(data.map((p) => p.id)),
    );
  };

  const handleBulkDelete = async () => {
    const result = await confirmAction({
      title: `ລຶບ ${selectedIds.size} ລາຍການທີ່ເລືອກ?`,
      text: "ລຶບໄດ້ສະເພາະສິນຄ້າທີ່ຍັງບໍ່ເຄີຍມີປະຫວັດຮັບເຂົ້າ/ເບີກຈ່າຍ ລາຍການທີ່ເຄີຍມີແລ້ວຈະຖືກຂ້າມໄປ",
    });
    if (result.isConfirmed) bulkDeleteMutation.mutate([...selectedIds]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      reorderPoint: Number(form.reorderPoint) || 0,
    });
  };

  const importMutation = useMutation({
    mutationFn: bulkImportProducts,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setImportResult(result);
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    importMutation.mutate(file);
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadImportTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "product-import-template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toastError(apiErrorMessage(err));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">ສິນຄ້າ</h2>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleDownloadTemplate}>
              <Download size={15} /> ດາວໂຫຼດແບບຟอร์ม
            </Button>
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={importMutation.isPending}
            >
              <Upload size={15} />
              {importMutation.isPending
                ? "ກຳລັງນຳເຂົ້າ..."
                : "ນຳເຂົ້າຈາກ Excel/CSV"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleImportFile}
            />
            <Button onClick={() => setModalOpen(true)}>+ ເພີ່ມສິນຄ້າ</Button>
          </div>
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

      {canManage && selectedIds.size > 0 && (
        <div className="flex items-center justify-between mb-4 px-4 py-2.5 rounded-lg bg-blue-50 text-blue-700 text-sm">
          <span>ເລືອກແລ້ວ {selectedIds.size} ລາຍການ</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-blue-600 hover:underline"
            >
              ຍົກເລີກການເລືອກ
            </button>
            <Button
              variant="danger"
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
            >
              <Trash2 size={15} /> ລຶບທີ່ເລືອກ
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <Spinner />
      ) : (
        <table className="w-full text-sm bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
          <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wide text-left">
            <tr>
              {canManage && (
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={!!data?.length && selectedIds.size === data.length}
                    onChange={toggleSelectAll}
                  />
                </th>
              )}
              <th className="px-4 py-3">ຮູບພາບ</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">ຊື່ສິນຄ້າ</th>
              <th className="px-4 py-3">ໝວດໝູ່</th>
              <th className="px-4 py-3">ໜ່ວຍ</th>
              <th className="px-4 py-3">ສະຖານະ</th>
              <th className="px-4 py-3 text-right">ການຈັດການ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data?.map((p) => (
              <tr
                key={p.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => navigate(`/products/${p.id}`)}
              >
                {canManage && (
                  <td
                    className="px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p.id)}
                      onChange={() => toggleSelected(p.id)}
                    />
                  </td>
                )}
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
                        toggleActiveMutation.mutate({
                          id: p.id,
                          isActive: !p.is_active,
                        });
                      }}
                      className={
                        p.is_active
                          ? "text-emerald-600 hover:underline"
                          : "text-red-500 hover:underline"
                      }
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
                <td
                  colSpan={canManage ? 8 : 7}
                  className="px-4 py-8 text-center text-gray-400"
                >
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

      <Modal
        open={!!importResult}
        title="ຜົນການນຳເຂົ້າສິນຄ້າ"
        onClose={() => setImportResult(null)}
      >
        {importResult && (
          <div className="space-y-3">
            <div className="flex gap-4 text-sm">
              <div className="px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700">
                ສ້າງໃໝ່: <strong>{importResult.created}</strong>
              </div>
              <div className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700">
                ອັບເດດ: <strong>{importResult.updated}</strong>
              </div>
              <div className="px-3 py-2 rounded-lg bg-red-50 text-red-700">
                ຜິດພາດ: <strong>{importResult.errors.length}</strong>
              </div>
            </div>
            {importResult.errors.length > 0 && (
              <div className="max-h-48 overflow-y-auto text-sm border border-gray-100 rounded-lg divide-y divide-gray-100">
                {importResult.errors.map((e, i) => (
                  <div key={i} className="px-3 py-2">
                    <span className="text-gray-400">ແຖວ {e.row}:</span>{" "}
                    <span className="text-red-600">{e.message}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={() => setImportResult(null)}>ປິດ</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!deleteResult}
        title="ຜົນການລຶບສິນຄ້າ"
        onClose={() => setDeleteResult(null)}
      >
        {deleteResult && (
          <div className="space-y-3">
            <div className="flex gap-4 text-sm">
              <div className="px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700">
                ລຶບສຳເລັດ: <strong>{deleteResult.deleted.length}</strong>
              </div>
              <div className="px-3 py-2 rounded-lg bg-red-50 text-red-700">
                ລຶບບໍ່ໄດ້: <strong>{deleteResult.errors.length}</strong>
              </div>
            </div>
            {deleteResult.errors.length > 0 && (
              <div className="max-h-48 overflow-y-auto text-sm border border-gray-100 rounded-lg divide-y divide-gray-100">
                {deleteResult.errors.map((e, i) => (
                  <div key={i} className="px-3 py-2">
                    <span className="text-gray-400">ID {e.id}:</span>{" "}
                    <span className="text-red-600">{e.message}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={() => setDeleteResult(null)}>ປິດ</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
