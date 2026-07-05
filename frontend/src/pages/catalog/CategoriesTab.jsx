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
      toastSuccess("ເພີ່ມໝວດໝູ່ແລ້ວ");
      invalidate();
      setModalOpen(false);
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => updateCategory(id, body),
    onSuccess: () => {
      toastSuccess("ບັນທຶກແລ້ວ");
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
        <Button onClick={openCreate}>+ ເພີ່ມໝວດໝູ່</Button>
      </div>

      <table className="w-full text-sm bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
        <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wide text-left">
          <tr>
            <th className="px-4 py-3">ຊື່ (ລາວ)</th>
            <th className="px-4 py-3">ຊື່ (ຈີນ)</th>
            <th className="px-4 py-3">ກຸ່ມສິນຄ້າ</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data?.map((c) => (
            <tr key={c.id}>
              <td className="px-4 py-3 font-medium text-gray-800">
                {c.name_lo}
              </td>
              <td className="px-4 py-3">{c.name_cn || "-"}</td>
              <td className="px-4 py-3">
                {groups?.find((g) => g.id === c.group_id)?.name_lo || "-"}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => openEdit(c)}
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
        title={editingId ? "ແກ້ໄຂໝວດໝູ່" : "ເພີ່ມໝວດໝູ່"}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit}>
          <FormField label="ກຸ່ມສິນຄ້າ">
            <select
              className={selectClass}
              value={form.groupId}
              onChange={(e) => setForm({ ...form, groupId: e.target.value })}
              required
            >
              <option value="">-- ເລືອກກຸ່ມສິນຄ້າ --</option>
              {groups?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name_lo}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="ຊື່ (ລາວ)">
            <input
              className={inputClass}
              value={form.nameLo}
              onChange={(e) => setForm({ ...form, nameLo: e.target.value })}
              required
            />
          </FormField>
          <FormField label="ຊື່ (ຈີນ)">
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
    </div>
  );
}
