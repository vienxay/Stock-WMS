import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  listWarehouses,
} from "../../api/organization";
import { apiErrorMessage } from "../../api/client";
import { toastSuccess, toastError, confirmAction } from "../../lib/toast";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Spinner from "../../components/ui/Spinner";
import FormField, {
  inputClass,
  selectClass,
} from "../../components/ui/FormField";

const EMPTY_FORM = { warehouseId: "", zone: "", shelf: "", bin: "" };

export default function LocationsTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["locations"],
    queryFn: () => listLocations(),
  });
  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => listWarehouses(),
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["locations"] });

  const createMutation = useMutation({
    mutationFn: createLocation,
    onSuccess: () => {
      toastSuccess("ເພີ່ມຕໍາແໜ່ງເກັບມ້ຽນແລ້ວ");
      invalidate();
      setModalOpen(false);
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => updateLocation(id, body),
    onSuccess: () => {
      toastSuccess("ບັນທຶກແລ້ວ");
      invalidate();
      setModalOpen(false);
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLocation,
    onSuccess: () => {
      toastSuccess("ລຶບຕໍາແໜ່ງເກັບມ້ຽນແລ້ວ");
      invalidate();
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (l) => {
    setEditingId(l.id);
    setForm({
      warehouseId: l.warehouse_id,
      zone: l.zone || "",
      shelf: l.shelf || "",
      bin: l.bin || "",
    });
    setModalOpen(true);
  };

  const handleDelete = async (l) => {
    const result = await confirmAction({
      title: `ລຶບຕໍາແໜ່ງເກັບມ້ຽນນີ້?`,
    });
    if (result.isConfirmed) deleteMutation.mutate(l.id);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const body = { ...form, warehouseId: Number(form.warehouseId) };
    if (editingId) updateMutation.mutate({ id: editingId, body });
    else createMutation.mutate(body);
  };

  if (isLoading) return <Spinner />;

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button onClick={openCreate}>+ ເພີ່ມຕໍາແໜ່ງເກັບມ້ຽນ</Button>
      </div>

      <table className="w-full text-sm bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
        <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wide text-left">
          <tr>
            <th className="px-4 py-3">ຄັງ</th>
            <th className="px-4 py-3">ໂຊນ (Zone)</th>
            <th className="px-4 py-3">ຊັ້ນ (Shelf)</th>
            <th className="px-4 py-3">ຊ່ອງ (Bin)</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data?.map((l) => (
            <tr key={l.id}>
              <td className="px-4 py-3 font-medium text-gray-800">
                {l.warehouse_name}
              </td>
              <td className="px-4 py-3">{l.zone || "-"}</td>
              <td className="px-4 py-3">{l.shelf || "-"}</td>
              <td className="px-4 py-3">{l.bin || "-"}</td>
              <td className="px-4 py-3 text-right space-x-3">
                <button
                  onClick={() => openEdit(l)}
                  className="text-blue-600 hover:underline"
                >
                  ແກ້ໄຂ
                </button>
                <button
                  onClick={() => handleDelete(l)}
                  className="text-red-600 hover:underline"
                >
                  ລຶບ
                </button>
              </td>
            </tr>
          ))}
          {!data?.length && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                ຍັງບໍ່ມີຕໍາແໜ່ງເກັບມ້ຽນ
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Modal
        open={modalOpen}
        title={editingId ? "ແກ້ໄຂຕໍາແໜ່ງເກັບມ້ຽນ" : "ເພີ່ມຕໍາແໜ່ງເກັບມ້ຽນ"}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit}>
          <FormField label="ຄັງ">
            <select
              className={selectClass}
              value={form.warehouseId}
              onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}
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
          <FormField label="ໂຊນ (Zone)">
            <input
              className={inputClass}
              value={form.zone}
              onChange={(e) => setForm({ ...form, zone: e.target.value })}
            />
          </FormField>
          <FormField label="ຊັ້ນ (Shelf)">
            <input
              className={inputClass}
              value={form.shelf}
              onChange={(e) => setForm({ ...form, shelf: e.target.value })}
            />
          </FormField>
          <FormField label="ຊ່ອງ (Bin)">
            <input
              className={inputClass}
              value={form.bin}
              onChange={(e) => setForm({ ...form, bin: e.target.value })}
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
