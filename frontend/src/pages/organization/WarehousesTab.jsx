import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listWarehouses,
  createWarehouse,
  updateWarehouse,
  listBranches,
  listWarehouseTypes,
  createWarehouseType,
} from "../../api/organization";
import { apiErrorMessage } from "../../api/client";
import { toastSuccess, toastError } from "../../lib/toast";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Spinner from "../../components/ui/Spinner";
import FormField, {
  inputClass,
  selectClass,
} from "../../components/ui/FormField";

const EMPTY_FORM = {
  branchId: "",
  warehouseTypeId: "",
  name: "",
  isCentral: false,
  isActive: true,
};
const EMPTY_TYPE_FORM = { code: "", name: "" };

export default function WarehousesTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => listWarehouses(),
  });
  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: listBranches,
  });
  const { data: warehouseTypes } = useQuery({
    queryKey: ["warehouse-types"],
    queryFn: listWarehouseTypes,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [typeForm, setTypeForm] = useState(EMPTY_TYPE_FORM);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["warehouses"] });

  const createMutation = useMutation({
    mutationFn: createWarehouse,
    onSuccess: () => {
      toastSuccess("ເພີ່ມຄັງແລ້ວ");
      invalidate();
      setModalOpen(false);
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => updateWarehouse(id, body),
    onSuccess: () => {
      toastSuccess("ບັນທຶກແລ້ວ");
      invalidate();
      setModalOpen(false);
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const createTypeMutation = useMutation({
    mutationFn: createWarehouseType,
    onSuccess: () => {
      toastSuccess("ເພີ່ມປະເພດຄັງແລ້ວ");
      queryClient.invalidateQueries({ queryKey: ["warehouse-types"] });
      setTypeModalOpen(false);
      setTypeForm(EMPTY_TYPE_FORM);
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (w) => {
    setEditingId(w.id);
    setForm({
      branchId: w.branch_id,
      warehouseTypeId: w.warehouse_type_id,
      name: w.name,
      isCentral: !!w.is_central,
      isActive: !!w.is_active,
    });
    setModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const body = {
      ...form,
      branchId: Number(form.branchId),
      warehouseTypeId: Number(form.warehouseTypeId),
    };
    if (editingId) updateMutation.mutate({ id: editingId, body });
    else createMutation.mutate(body);
  };

  if (isLoading) return <Spinner />;

  return (
    <div>
      <div className="flex justify-end gap-2 mb-3">
        <Button variant="secondary" onClick={() => setTypeModalOpen(true)}>
          + ປະເພດຄັງ
        </Button>
        <Button onClick={openCreate}>+ ເພີ່ມຄັງ</Button>
      </div>

      <table className="w-full text-sm bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
        <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wide text-left">
          <tr>
            <th className="px-4 py-3">ຊື່ຄັງ</th>
            <th className="px-4 py-3">ສາຂາ</th>
            <th className="px-4 py-3">ປະເພດ</th>
            <th className="px-4 py-3">ສ່ວນກາງ</th>
            <th className="px-4 py-3">ສະຖານະ</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data?.map((w) => (
            <tr key={w.id}>
              <td className="px-4 py-3 font-medium text-gray-800">{w.name}</td>
              <td className="px-4 py-3">{w.branch_name}</td>
              <td className="px-4 py-3">{w.warehouse_type_name}</td>
              <td className="px-4 py-3">{w.is_central ? "ແມ່ນ (HQ)" : "-"}</td>
              <td className="px-4 py-3">
                {w.is_active ? "ໃຊ້ງານ" : "ປິດໃຊ້ງານ"}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => openEdit(w)}
                  className="text-blue-600 hover:underline"
                >
                  ແກ້ໄຂ
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal
        open={modalOpen}
        title={editingId ? "ແກ້ໄຂຄັງ" : "ເພີ່ມຄັງ"}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit}>
          <FormField label="ສາຂາ">
            <select
              className={selectClass}
              value={form.branchId}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}
              required
            >
              <option value="">-- ເລືອກສາຂາ --</option>
              {branches?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="ປະເພດຄັງ">
            <select
              className={selectClass}
              value={form.warehouseTypeId}
              onChange={(e) =>
                setForm({ ...form, warehouseTypeId: e.target.value })
              }
              required
            >
              <option value="">-- ເລືອກປະເພດ --</option>
              {warehouseTypes?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="ຊື່ຄັງ">
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </FormField>
          <label className="flex items-center gap-2 text-sm mb-2">
            <input
              type="checkbox"
              checked={form.isCentral}
              onChange={(e) =>
                setForm({ ...form, isCentral: e.target.checked })
              }
            />
            ເປັນຄັງສ່ວນກາງ (HQ) — ຮັບສິນຄ້າເຂົ້າໄດ້
          </label>
          <label className="flex items-center gap-2 text-sm mb-4">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            ກຳລັງໃຊ້ງານ
          </label>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              ຍົກເລີກ
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              ບັນທຶກ
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={typeModalOpen}
        title="ເພີ່ມປະເພດຄັງ"
        onClose={() => setTypeModalOpen(false)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createTypeMutation.mutate(typeForm);
          }}
        >
          <FormField label="ລະຫັດປະເພດ (ຕົວຢ່າງ: HR, FOOD)">
            <input
              className={inputClass}
              value={typeForm.code}
              onChange={(e) =>
                setTypeForm({ ...typeForm, code: e.target.value.toUpperCase() })
              }
              required
            />
          </FormField>
          <FormField label="ຊື່ປະເພດຄັງ">
            <input
              className={inputClass}
              value={typeForm.name}
              onChange={(e) =>
                setTypeForm({ ...typeForm, name: e.target.value })
              }
              required
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setTypeModalOpen(false)}
            >
              ຍົກເລີກ
            </Button>
            <Button type="submit" disabled={createTypeMutation.isPending}>
              ບັນທຶກ
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
