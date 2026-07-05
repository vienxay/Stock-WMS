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
      toastSuccess("เพิ่มคลังแล้ว");
      invalidate();
      setModalOpen(false);
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => updateWarehouse(id, body),
    onSuccess: () => {
      toastSuccess("บันทึกแล้ว");
      invalidate();
      setModalOpen(false);
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const createTypeMutation = useMutation({
    mutationFn: createWarehouseType,
    onSuccess: () => {
      toastSuccess("เพิ่มประเภทคลังแล้ว");
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
          + ประเภทคลัง
        </Button>
        <Button onClick={openCreate}>+ เพิ่มคลัง</Button>
      </div>

      <table className="w-full text-sm bg-white rounded-lg overflow-hidden shadow-sm border">
        <thead className="bg-gray-50 text-gray-500 text-left">
          <tr>
            <th className="px-4 py-2">ชื่อคลัง</th>
            <th className="px-4 py-2">สาขา</th>
            <th className="px-4 py-2">ประเภท</th>
            <th className="px-4 py-2">ส่วนกลาง</th>
            <th className="px-4 py-2">สถานะ</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data?.map((w) => (
            <tr key={w.id}>
              <td className="px-4 py-2 font-medium text-gray-800">{w.name}</td>
              <td className="px-4 py-2">{w.branch_name}</td>
              <td className="px-4 py-2">{w.warehouse_type_name}</td>
              <td className="px-4 py-2">{w.is_central ? "ใช่ (HQ)" : "-"}</td>
              <td className="px-4 py-2">
                {w.is_active ? "ใช้งาน" : "ปิดใช้งาน"}
              </td>
              <td className="px-4 py-2 text-right">
                <button
                  onClick={() => openEdit(w)}
                  className="text-blue-600 hover:underline"
                >
                  แก้ไข
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal
        open={modalOpen}
        title={editingId ? "แก้ไขคลัง" : "เพิ่มคลัง"}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit}>
          <FormField label="สาขา">
            <select
              className={selectClass}
              value={form.branchId}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}
              required
            >
              <option value="">-- เลือกสาขา --</option>
              {branches?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="ประเภทคลัง">
            <select
              className={selectClass}
              value={form.warehouseTypeId}
              onChange={(e) =>
                setForm({ ...form, warehouseTypeId: e.target.value })
              }
              required
            >
              <option value="">-- เลือกประเภท --</option>
              {warehouseTypes?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="ชื่อคลัง">
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
            เป็นคลังส่วนกลาง (HQ) — รับสินค้าเข้าได้
          </label>
          <label className="flex items-center gap-2 text-sm mb-4">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            ใช้งานอยู่
          </label>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              บันทึก
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={typeModalOpen}
        title="เพิ่มประเภทคลัง"
        onClose={() => setTypeModalOpen(false)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createTypeMutation.mutate(typeForm);
          }}
        >
          <FormField label="รหัสประเภท (เช่น HR, FOOD)">
            <input
              className={inputClass}
              value={typeForm.code}
              onChange={(e) =>
                setTypeForm({ ...typeForm, code: e.target.value.toUpperCase() })
              }
              required
            />
          </FormField>
          <FormField label="ชื่อประเภทคลัง">
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
              ยกเลิก
            </Button>
            <Button type="submit" disabled={createTypeMutation.isPending}>
              บันทึก
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
