import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { listRequisitions, createRequisition } from "../api/requisitions";
import { listWarehouses, listDepartments } from "../api/organization";
import { listProducts } from "../api/products";
import { apiErrorMessage } from "../api/client";
import { toastSuccess, toastError } from "../lib/toast";
import { useAuth } from "../context/AuthContext";
import { PackageMinus } from "lucide-react";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Spinner from "../components/ui/Spinner";
import StatusBadge from "../components/ui/StatusBadge";
import ItemRowsEditor from "../components/ui/ItemRowsEditor";
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

  const canCreate = hasRole("BRANCH_ADMIN", "WAREHOUSE_STAFF");

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
      toastSuccess("ສ້າງໃບເບີກແລ້ວ");
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
        <h2 className="text-xl font-bold text-gray-800">ໃບເບີກພະນັກງານ</h2>
        {canCreate && (
          <Button onClick={() => setModalOpen(true)}>+ ສ້າງໃບເບີກ</Button>
        )}
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
              <th className="px-4 py-3">ສາງ</th>
              <th className="px-4 py-3">ຜູ້ຂໍເບີກ</th>
              <th className="px-4 py-3">ຈຸດປະສົງ</th>
              <th className="px-4 py-3">ສະຖານະ</th>
              <th className="px-4 py-3">ວັນທີຂໍ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data?.map((r) => (
              <tr
                key={r.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => navigate(`/requisitions/${r.id}`)}
              >
                <td className="px-4 py-3 font-medium text-gray-800">#{r.id}</td>
                <td className="px-4 py-3">{r.warehouse_name}</td>
                <td className="px-4 py-3">{r.employee_name}</td>
                <td className="px-4 py-3 text-gray-500">{r.purpose || "-"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3">{r.requested_at?.slice(0, 10)}</td>
              </tr>
            ))}
            {!data?.length && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  ບໍ່ເຫັນໃບເບີກ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <Modal
        open={modalOpen}
        title="ສ້າງໃບເບີກພະນັກງານ"
        icon={PackageMinus}
        onClose={() => setModalOpen(false)}
        wide
      >
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-x-4">
            <FormField label="ສາງຕົ້ນທາງ (ສາງຂອງໄຊທ໌ຕົນເອງ)">
              <select
                className={selectClass}
                value={form.warehouseId}
                onChange={(e) =>
                  setForm({ ...form, warehouseId: e.target.value })
                }
                required
              >
                <option value="">-- ເລືອກຄັງ --</option>
                {warehouses?.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="ພະແນກ (ຖ້າມີ)">
              <select
                className={selectClass}
                value={form.departmentId}
                onChange={(e) =>
                  setForm({ ...form, departmentId: e.target.value })
                }
              >
                <option value="">-- ບໍ່ລະບຸ --</option>
                {branchDepartments?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <FormField label="ຈຸດປະສົງ">
            <input
              className={inputClass}
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              placeholder="ຕົວຢ່າງ: ໃຊ້ໃນສາຍການຜະລິດ A"
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
              ສົ່ງໃບເບີກ
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
