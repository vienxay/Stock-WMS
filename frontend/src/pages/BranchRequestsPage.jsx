import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  listBranchRequests,
  createBranchRequest,
  quickTransfer,
} from "../api/branchRequests";
import { listWarehouses } from "../api/organization";
import { listProducts } from "../api/products";
import { apiErrorMessage } from "../api/client";
import { toastSuccess, toastError, confirmAction } from "../lib/toast";
import { useAuth } from "../context/AuthContext";
import { ArrowLeftRight, Zap } from "lucide-react";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Spinner from "../components/ui/Spinner";
import StatusBadge from "../components/ui/StatusBadge";
import ItemRowsEditor from "../components/ui/ItemRowsEditor";
import FormField, { inputClass, selectClass } from "../components/ui/FormField";

const EMPTY_ITEM = { productId: "", quantityRequested: "" };
const EMPTY_FORM = {
  fromWarehouseId: "",
  toWarehouseId: "",
  note: "",
  items: [{ ...EMPTY_ITEM }],
};
const EMPTY_QUICK_ITEM = { productId: "", quantity: "" };
const EMPTY_QUICK_FORM = {
  fromWarehouseId: "",
  toWarehouseId: "",
  note: "",
  items: [{ ...EMPTY_QUICK_ITEM }],
};
const STATUS_OPTIONS = ["PENDING", "APPROVED", "REJECTED", "TRANSFERRED"];

export default function BranchRequestsPage() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [quickModalOpen, setQuickModalOpen] = useState(false);
  const [quickForm, setQuickForm] = useState(EMPTY_QUICK_FORM);

  const canCreate = hasRole("BRANCH_ADMIN", "WAREHOUSE_STAFF");
  const canQuickTransfer = hasRole("BRANCH_ADMIN", "WAREHOUSE_STAFF");

  const { data, isLoading } = useQuery({
    queryKey: ["branch-requests", { status }],
    queryFn: () => listBranchRequests({ status: status || undefined }),
  });
  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => listWarehouses(),
  });
  const { data: products } = useQuery({
    queryKey: ["products", { limit: 200 }],
    queryFn: () => listProducts({ limit: 200 }),
  });

  const branchWarehouses = warehouses?.filter((w) => !w.is_central);

  const createMutation = useMutation({
    mutationFn: createBranchRequest,
    onSuccess: (request) => {
      toastSuccess("ສ້າງຄຳຂໍເບີກແລ້ວ");
      queryClient.invalidateQueries({ queryKey: ["branch-requests"] });
      setModalOpen(false);
      setForm(EMPTY_FORM);
      navigate(`/branch-requests/${request.id}`);
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
      fromWarehouseId: Number(form.fromWarehouseId),
      toWarehouseId: Number(form.toWarehouseId),
      items: form.items.map((it) => ({
        productId: Number(it.productId),
        quantityRequested: Number(it.quantityRequested),
      })),
    });
  };

  const quickTransferMutation = useMutation({
    mutationFn: quickTransfer,
    onSuccess: (request) => {
      toastSuccess("ໂອນຍ້າຍສິນຄ້າແລ້ວ");
      queryClient.invalidateQueries({ queryKey: ["branch-requests"] });
      setQuickModalOpen(false);
      setQuickForm(EMPTY_QUICK_FORM);
      navigate(`/branch-requests/${request.id}`);
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const updateQuickItem = (idx, patch) => {
    const items = quickForm.items.map((it, i) =>
      i === idx ? { ...it, ...patch } : it,
    );
    setQuickForm({ ...quickForm, items });
  };
  const addQuickItem = () =>
    setQuickForm({
      ...quickForm,
      items: [...quickForm.items, { ...EMPTY_QUICK_ITEM }],
    });
  const removeQuickItem = (idx) =>
    setQuickForm({
      ...quickForm,
      items: quickForm.items.filter((_, i) => i !== idx),
    });

  const handleQuickSubmit = async (e) => {
    e.preventDefault();
    const result = await confirmAction({
      title: "ໂອນຍ້າຍສິນຄ້າດ່ວນ?",
      text: "ລະບົບຈະຕັດສະຕັອກຈາກຄັງຕົ້ນທາງແລະເພີ່ມໃຫ້ຄັງປາຍທາງທັນທີ ບໍ່ຕ້ອງລໍການອະນຸມັດ",
    });
    if (!result.isConfirmed) return;
    quickTransferMutation.mutate({
      ...quickForm,
      fromWarehouseId: Number(quickForm.fromWarehouseId),
      toWarehouseId: Number(quickForm.toWarehouseId),
      items: quickForm.items.map((it) => ({
        productId: Number(it.productId),
        quantity: Number(it.quantity),
      })),
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">ຄຳຂໍເບີກລະຫວ່າງຄັງ</h2>
        <div className="flex items-center gap-2">
          {canQuickTransfer && (
            <Button
              variant="secondary"
              onClick={() => setQuickModalOpen(true)}
            >
              <Zap size={15} /> ໂອນຍ້າຍດ່ວນ
            </Button>
          )}
          {canCreate && (
            <Button onClick={() => setModalOpen(true)}>+ ສ້າງຄຳຂໍເບີກ</Button>
          )}
        </div>
      </div>

      <select
        className={`${selectClass} max-w-xs mb-4`}
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="">-- ທຸກສະຖານະ --</option>
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {isLoading ? (
        <Spinner />
      ) : (
        <table className="w-full text-sm bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
          <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wide text-left">
            <tr>
              <th className="px-4 py-3">ເລກທີ</th>
              <th className="px-4 py-3">ຈາກຄັງ</th>
              <th className="px-4 py-3">ໄປຄັງ</th>
              <th className="px-4 py-3">ປະເພດ</th>
              <th className="px-4 py-3">ສະຖານະ</th>
              <th className="px-4 py-3">ວັນທີຂໍ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data?.map((r) => (
              <tr
                key={r.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => navigate(`/branch-requests/${r.id}`)}
              >
                <td className="px-4 py-3 font-medium text-gray-800">#{r.id}</td>
                <td className="px-4 py-3">{r.from_warehouse_name}</td>
                <td className="px-4 py-3">{r.to_warehouse_name}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.request_type} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3">{r.requested_at?.slice(0, 10)}</td>
              </tr>
            ))}
            {!data?.length && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  ບໍ່ພົບຄຳຂໍເບີກ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <Modal
        open={modalOpen}
        title="ສ້າງຄຳຂໍເບີກລະຫວ່າງຄັງ"
        icon={ArrowLeftRight}
        onClose={() => setModalOpen(false)}
        wide
      >
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-x-4">
            <FormField label="ຈາກຄັງ">
              <select
                className={selectClass}
                value={form.fromWarehouseId}
                onChange={(e) =>
                  setForm({ ...form, fromWarehouseId: e.target.value })
                }
                required
              >
                <option value="">-- ເລືອກຄັງຕົ້ນທາງ (HQ ຫຼືສາຂາອື່ນ) --</option>
                {warehouses
                  ?.filter((w) => String(w.id) !== form.toWarehouseId)
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} {w.is_central ? "(HQ)" : ""}
                    </option>
                  ))}
              </select>
            </FormField>
            <FormField label="ໄປຄັງ (ສາຂາ)">
              <select
                className={selectClass}
                value={form.toWarehouseId}
                onChange={(e) =>
                  setForm({ ...form, toWarehouseId: e.target.value })
                }
                required
              >
                <option value="">-- ເລືອກຄັງສາຂາ --</option>
                {branchWarehouses
                  ?.filter((w) => String(w.id) !== form.fromWarehouseId)
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
              </select>
            </FormField>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            ຖ້າຄັງຕົ້ນທາງເປັນ HQ = ຄຳຂໍເບີກທົ່ວໄປ, ຖ້າຄັງຕົ້ນທາງເປັນສາຂາອື່ນ = ຄຳຂໍໂອນຂ້າມສາຂາ (ຕ້ອງລໍໃຫ້ສາຂາຕົ້ນທາງອະນຸມັດ)
          </p>
          <FormField label="ໝາຍເຫດ">
            <input
              className={inputClass}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </FormField>

          <div className="mt-4">
            <ItemRowsEditor
              title="ລາຍການສິນຄ້າທີ່ຂໍເບີກ"
              items={form.items}
              products={products}
              onUpdate={updateItem}
              onAdd={addItem}
              onRemove={removeItem}
              quantityField="quantityRequested"
              quantityLabel="ຈຳນວນທີ່ຂໍ"
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
              ສົ່ງຄຳຂໍ
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={quickModalOpen}
        title="ໂອນຍ້າຍສິນຄ້າດ່ວນ"
        icon={Zap}
        onClose={() => setQuickModalOpen(false)}
        wide
      >
        <form onSubmit={handleQuickSubmit}>
          <p className="text-xs text-gray-400 mb-3">
            ໂອນລະຫວ່າງຄັງໃດກໍໄດ້ທັນທີ ບໍ່ຕ້ອງຜ່ານການອະນຸມັດ — ໃຊ້ຕອນຄັງໃດຄັງໜຶ່ງຂາດເຄື່ອງດ່ວນ
          </p>
          <div className="grid grid-cols-2 gap-x-4">
            <FormField label="ຈາກຄັງ">
              <select
                className={selectClass}
                value={quickForm.fromWarehouseId}
                onChange={(e) =>
                  setQuickForm({ ...quickForm, fromWarehouseId: e.target.value })
                }
                required
              >
                <option value="">-- ເລືອກຄັງຕົ້ນທາງ --</option>
                {warehouses?.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="ໄປຄັງ">
              <select
                className={selectClass}
                value={quickForm.toWarehouseId}
                onChange={(e) =>
                  setQuickForm({ ...quickForm, toWarehouseId: e.target.value })
                }
                required
              >
                <option value="">-- ເລືອກຄັງປາຍທາງ --</option>
                {warehouses
                  ?.filter((w) => String(w.id) !== quickForm.fromWarehouseId)
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
              </select>
            </FormField>
          </div>
          <FormField label="ໝາຍເຫດ">
            <input
              className={inputClass}
              value={quickForm.note}
              onChange={(e) =>
                setQuickForm({ ...quickForm, note: e.target.value })
              }
            />
          </FormField>

          <div className="mt-4">
            <ItemRowsEditor
              title="ລາຍການສິນຄ້າທີ່ໂອນ"
              items={quickForm.items}
              products={products}
              onUpdate={updateQuickItem}
              onAdd={addQuickItem}
              onRemove={removeQuickItem}
              quantityField="quantity"
              quantityLabel="ຈຳນວນ"
            />
          </div>

          <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setQuickModalOpen(false)}
            >
              ຍົກເລີກ
            </Button>
            <Button
              type="submit"
              disabled={quickTransferMutation.isPending}
            >
              ຢືນຢັນໂອນຍ້າຍ
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
