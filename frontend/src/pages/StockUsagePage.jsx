import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listUsages, createUsage } from "../api/stockUsage";
import { listWarehouses } from "../api/organization";
import { listProducts } from "../api/products";
import { apiErrorMessage } from "../api/client";
import { toastSuccess, toastError } from "../lib/toast";
import { useAuth } from "../context/AuthContext";
import { PackageMinus } from "lucide-react";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Spinner from "../components/ui/Spinner";
import FormField, { inputClass, selectClass } from "../components/ui/FormField";

const EMPTY_FORM = { warehouseId: "", productId: "", quantity: "", note: "" };

export default function StockUsagePage() {
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const roles = user?.roles || [];
  const isSuperAdmin = hasRole("SUPER_ADMIN");
  const branchAdminRole = roles.find((r) => r.code === "BRANCH_ADMIN");
  const warehouseStaffRole = roles.find((r) => r.code === "WAREHOUSE_STAFF");
  const lockedWarehouseId =
    !isSuperAdmin && warehouseStaffRole ? warehouseStaffRole.warehouseId : null;
  const canCreate = hasRole("BRANCH_ADMIN", "WAREHOUSE_STAFF");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    warehouseId: lockedWarehouseId ? String(lockedWarehouseId) : "",
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => listWarehouses(),
  });
  const { data: products } = useQuery({
    queryKey: ["products", { limit: 200 }],
    queryFn: () => listProducts({ limit: 200 }),
  });

  const availableWarehouses = lockedWarehouseId
    ? warehouses?.filter((w) => w.id === lockedWarehouseId)
    : !isSuperAdmin && branchAdminRole
      ? warehouses?.filter((w) => w.branch_id === branchAdminRole.branchId)
      : warehouses;

  const { data, isLoading } = useQuery({
    queryKey: ["stock-usages"],
    queryFn: () => listUsages(),
  });

  const createMutation = useMutation({
    mutationFn: createUsage,
    onSuccess: () => {
      toastSuccess("ບັນທຶກການນຳໃຊ້ແລ້ວ");
      queryClient.invalidateQueries({ queryKey: ["stock-usages"] });
      setModalOpen(false);
      setForm({
        ...EMPTY_FORM,
        warehouseId: lockedWarehouseId ? String(lockedWarehouseId) : "",
      });
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      warehouseId: Number(form.warehouseId),
      productId: Number(form.productId),
      quantity: Number(form.quantity),
      note: form.note || undefined,
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">ນຳໃຊ້ອຸປະກອນ</h2>
        {canCreate && (
          <Button onClick={() => setModalOpen(true)}>+ ບັນທຶກການນຳໃຊ້</Button>
        )}
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <table className="w-full text-sm bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
          <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wide text-left">
            <tr>
              <th className="px-4 py-3">ວັນທີ</th>
              <th className="px-4 py-3">ຄັງ</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">ສິນຄ້າ</th>
              <th className="px-4 py-3">ຈຳນວນ</th>
              <th className="px-4 py-3">ໝາຍເຫດ</th>
              <th className="px-4 py-3">ຜູ້ບັນທຶກ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data?.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">{u.created_at?.slice(0, 10)}</td>
                <td className="px-4 py-3">{u.warehouse_name}</td>
                <td className="px-4 py-3">{u.sku}</td>
                <td className="px-4 py-3 font-medium text-gray-800">
                  {u.product_name}
                </td>
                <td className="px-4 py-3">{Math.abs(Number(u.quantity))}</td>
                <td className="px-4 py-3 text-gray-500">{u.note || "-"}</td>
                <td className="px-4 py-3">{u.created_by_username}</td>
              </tr>
            ))}
            {!data?.length && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  ຍັງບໍ່ມີການບັນທຶກການນຳໃຊ້
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <Modal
        open={modalOpen}
        title="ບັນທຶກການນຳໃຊ້ອຸປະກອນ"
        icon={PackageMinus}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit}>
          <FormField label="ຄັງ">
            <select
              className={selectClass}
              value={form.warehouseId}
              onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}
              disabled={!!lockedWarehouseId}
              required
            >
              <option value="">-- ເລືອກຄັງ --</option>
              {availableWarehouses?.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="ສິນຄ້າ">
            <select
              className={selectClass}
              value={form.productId}
              onChange={(e) => setForm({ ...form, productId: e.target.value })}
              required
            >
              <option value="">-- ເລືອກສິນຄ້າ --</option>
              {products?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name_lo}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="ຈຳນວນທີ່ນຳໃຊ້">
            <input
              type="number"
              step="1"
              min="0"
              className={inputClass}
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              required
            />
          </FormField>
          <FormField label="ໝາຍເຫດ (ຖ້າມີ)">
            <input
              className={inputClass}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="ຕົວຢ່າງ: ນຳໃຊ້ສ້ອມແປງເຄື່ອງຈັກ"
            />
          </FormField>
          <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100">
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
