import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listGroups, createGroup, updateGroup } from "../../api/catalog";
import { listWarehouseTypes } from "../../api/organization";
import { apiErrorMessage } from "../../api/client";
import { toastSuccess, toastError } from "../../lib/toast";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Spinner from "../../components/ui/Spinner";
import FormField, {
  inputClass,
  selectClass,
} from "../../components/ui/FormField";

const EMPTY_FORM = { nameLo: "", nameCn: "", warehouseTypeId: "" };

export default function GroupsTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: listGroups,
  });
  const { data: warehouseTypes } = useQuery({
    queryKey: ["warehouse-types"],
    queryFn: listWarehouseTypes,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["groups"] });

  const createMutation = useMutation({
    mutationFn: createGroup,
    onSuccess: () => {
      toastSuccess("เพิ่มกลุ่มสินค้าแล้ว");
      invalidate();
      setModalOpen(false);
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => updateGroup(id, body),
    onSuccess: () => {
      toastSuccess("บันทึกแล้ว");
      invalidate();
      setModalOpen(false);
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (g) => {
    setEditingId(g.id);
    setForm({
      nameLo: g.name_lo,
      nameCn: g.name_cn || "",
      warehouseTypeId: g.warehouse_type_id || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const body = {
      ...form,
      warehouseTypeId: form.warehouseTypeId
        ? Number(form.warehouseTypeId)
        : null,
    };
    if (editingId) updateMutation.mutate({ id: editingId, body });
    else createMutation.mutate(body);
  };

  if (isLoading) return <Spinner />;

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button onClick={openCreate}>+ เพิ่มกลุ่มสินค้า</Button>
      </div>

      <table className="w-full text-sm bg-white rounded-lg overflow-hidden shadow-sm border">
        <thead className="bg-gray-50 text-gray-500 text-left">
          <tr>
            <th className="px-4 py-2">ชื่อ (ลาว)</th>
            <th className="px-4 py-2">ชื่อ (จีน)</th>
            <th className="px-4 py-2">ประเภทคลัง</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data?.map((g) => (
            <tr key={g.id}>
              <td className="px-4 py-2 font-medium text-gray-800">
                {g.name_lo}
              </td>
              <td className="px-4 py-2">{g.name_cn || "-"}</td>
              <td className="px-4 py-2">
                {warehouseTypes?.find((t) => t.id === g.warehouse_type_id)
                  ?.name || "-"}
              </td>
              <td className="px-4 py-2 text-right">
                <button
                  onClick={() => openEdit(g)}
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
        title={editingId ? "แก้ไขกลุ่มสินค้า" : "เพิ่มกลุ่มสินค้า"}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit}>
          <FormField label="ชื่อ (ลาว)">
            <input
              className={inputClass}
              value={form.nameLo}
              onChange={(e) => setForm({ ...form, nameLo: e.target.value })}
              required
            />
          </FormField>
          <FormField label="ชื่อ (จีน)">
            <input
              className={inputClass}
              value={form.nameCn}
              onChange={(e) => setForm({ ...form, nameCn: e.target.value })}
            />
          </FormField>
          <FormField label="ประเภทคลังที่เกี่ยวข้อง (ถ้ามี)">
            <select
              className={selectClass}
              value={form.warehouseTypeId}
              onChange={(e) =>
                setForm({ ...form, warehouseTypeId: e.target.value })
              }
            >
              <option value="">-- ไม่ระบุ --</option>
              {warehouseTypes?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </FormField>
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
    </div>
  );
}
