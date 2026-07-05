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
      toastSuccess("ເພີ່ມກຸ່ມສິນຄ້າແລ້ວ");
      invalidate();
      setModalOpen(false);
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => updateGroup(id, body),
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
        <Button onClick={openCreate}>+ ເພີ່ມກຸ່ມສິນຄ້າ</Button>
      </div>

      <table className="w-full text-sm bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
        <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wide text-left">
          <tr>
            <th className="px-4 py-3">ຊື່ (ລາວ)</th>
            <th className="px-4 py-3">ຊື່ (ຈີນ)</th>
            <th className="px-4 py-3">ປະເພດຄັງ</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data?.map((g) => (
            <tr key={g.id}>
              <td className="px-4 py-3 font-medium text-gray-800">
                {g.name_lo}
              </td>
              <td className="px-4 py-3">{g.name_cn || "-"}</td>
              <td className="px-4 py-3">
                {warehouseTypes?.find((t) => t.id === g.warehouse_type_id)
                  ?.name || "-"}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => openEdit(g)}
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
        title={editingId ? "ແກ້ໄຂກຸ່ມສິນຄ້າ" : "ເພີ່ມກຸ່ມສິນຄ້າ"}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit}>
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
          <FormField label="ປະເພດຄັງທີ່ກ່ຽວຂ້ອງ (ຖ້າມີ)">
            <select
              className={selectClass}
              value={form.warehouseTypeId}
              onChange={(e) =>
                setForm({ ...form, warehouseTypeId: e.target.value })
              }
            >
              <option value="">-- ບໍ່ລະບຸ --</option>
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
