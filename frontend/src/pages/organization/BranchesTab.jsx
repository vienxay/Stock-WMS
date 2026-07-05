import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listBranches,
  createBranch,
  updateBranch,
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
  name: "",
  branchType: "FACTORY",
  address: "",
  isActive: true,
};

export default function BranchesTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: listBranches,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["branches"] });

  const createMutation = useMutation({
    mutationFn: createBranch,
    onSuccess: () => {
      toastSuccess("ເພີ່ມສາຂາແລ້ວ");
      invalidate();
      setModalOpen(false);
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => updateBranch(id, body),
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

  const openEdit = (branch) => {
    setEditingId(branch.id);
    setForm({
      name: branch.name,
      branchType: branch.branch_type,
      address: branch.address || "",
      isActive: !!branch.is_active,
    });
    setModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingId) updateMutation.mutate({ id: editingId, body: form });
    else createMutation.mutate(form);
  };

  if (isLoading) return <Spinner />;

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button onClick={openCreate}>+ ເພີ່ມສາຂາ</Button>
      </div>

      <table className="w-full text-sm bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
        <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wide text-left">
          <tr>
            <th className="px-4 py-3">ຊື່ສາຂາ</th>
            <th className="px-4 py-3">ປະເພດ</th>
            <th className="px-4 py-3">ທີ່ຢູ່</th>
            <th className="px-4 py-3">ສະຖານະ</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data?.map((b) => (
            <tr key={b.id}>
              <td className="px-4 py-3 font-medium text-gray-800">{b.name}</td>
              <td className="px-4 py-3">
                {b.branch_type === "HEAD_OFFICE" ? "ສຳນັກງານໃຫຍ່" : "ໂຮງງານ"}
              </td>
              <td className="px-4 py-3 text-gray-500">{b.address || "-"}</td>
              <td className="px-4 py-3">
                {b.is_active ? "ໃຊ້ງານ" : "ປິດໃຊ້ງານ"}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => openEdit(b)}
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
        title={editingId ? "ແກ້ໄຂສາຂາ" : "ເພີ່ມສາຂາ"}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit}>
          <FormField label="ຊື່ສາຂາ">
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </FormField>
          <FormField label="ປະເພດ">
            <select
              className={selectClass}
              value={form.branchType}
              onChange={(e) => setForm({ ...form, branchType: e.target.value })}
            >
              <option value="HEAD_OFFICE">ສຳນັກງານໃຫຍ່</option>
              <option value="FACTORY">ໂຮງງານ</option>
            </select>
          </FormField>
          <FormField label="ທີ່ຢູ່">
            <textarea
              className={inputClass}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </FormField>
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
    </div>
  );
}
