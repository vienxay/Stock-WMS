import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listCategories,
  createCategory,
  updateCategory,
  listGroups,
} from "../../api/catalog";
import { apiErrorMessage } from "../../api/client";
import { toastSuccess, toastError } from "../../lib/toast";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Spinner from "../../components/ui/Spinner";
import FormField, {
  inputClass,
  selectClass,
} from "../../components/ui/FormField";

const EMPTY_FORM = { groupId: "", nameLo: "", nameCn: "" };

export default function CategoriesTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(),
  });
  const { data: groups } = useQuery({
    queryKey: ["groups"],
    queryFn: listGroups,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["categories"] });

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      toastSuccess("เพิ่มหมวดหมู่แล้ว");
      invalidate();
      setModalOpen(false);
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => updateCategory(id, body),
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

  const openEdit = (c) => {
    setEditingId(c.id);
    setForm({
      groupId: c.group_id,
      nameLo: c.name_lo,
      nameCn: c.name_cn || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const body = { ...form, groupId: Number(form.groupId) };
    if (editingId) updateMutation.mutate({ id: editingId, body });
    else createMutation.mutate(body);
  };

  if (isLoading) return <Spinner />;

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button onClick={openCreate}>+ เพิ่มหมวดหมู่</Button>
      </div>

      <table className="w-full text-sm bg-white rounded-lg overflow-hidden shadow-sm border">
        <thead className="bg-gray-50 text-gray-500 text-left">
          <tr>
            <th className="px-4 py-2">ชื่อ (ลาว)</th>
            <th className="px-4 py-2">ชื่อ (จีน)</th>
            <th className="px-4 py-2">กลุ่มสินค้า</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data?.map((c) => (
            <tr key={c.id}>
              <td className="px-4 py-2 font-medium text-gray-800">
                {c.name_lo}
              </td>
              <td className="px-4 py-2">{c.name_cn || "-"}</td>
              <td className="px-4 py-2">
                {groups?.find((g) => g.id === c.group_id)?.name_lo || "-"}
              </td>
              <td className="px-4 py-2 text-right">
                <button
                  onClick={() => openEdit(c)}
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
        title={editingId ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่"}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit}>
          <FormField label="กลุ่มสินค้า">
            <select
              className={selectClass}
              value={form.groupId}
              onChange={(e) => setForm({ ...form, groupId: e.target.value })}
              required
            >
              <option value="">-- เลือกกลุ่มสินค้า --</option>
              {groups?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name_lo}
                </option>
              ))}
            </select>
          </FormField>
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
