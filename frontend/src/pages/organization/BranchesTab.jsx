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
      toastSuccess("เพิ่มสาขาแล้ว");
      invalidate();
      setModalOpen(false);
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => updateBranch(id, body),
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
        <Button onClick={openCreate}>+ เพิ่มสาขา</Button>
      </div>

      <table className="w-full text-sm bg-white rounded-lg overflow-hidden shadow-sm border">
        <thead className="bg-gray-50 text-gray-500 text-left">
          <tr>
            <th className="px-4 py-2">ชื่อสาขา</th>
            <th className="px-4 py-2">ประเภท</th>
            <th className="px-4 py-2">ที่อยู่</th>
            <th className="px-4 py-2">สถานะ</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data?.map((b) => (
            <tr key={b.id}>
              <td className="px-4 py-2 font-medium text-gray-800">{b.name}</td>
              <td className="px-4 py-2">
                {b.branch_type === "HEAD_OFFICE" ? "สำนักงานใหญ่" : "โรงงาน"}
              </td>
              <td className="px-4 py-2 text-gray-500">{b.address || "-"}</td>
              <td className="px-4 py-2">
                {b.is_active ? "ใช้งาน" : "ปิดใช้งาน"}
              </td>
              <td className="px-4 py-2 text-right">
                <button
                  onClick={() => openEdit(b)}
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
        title={editingId ? "แก้ไขสาขา" : "เพิ่มสาขา"}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit}>
          <FormField label="ชื่อสาขา">
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </FormField>
          <FormField label="ประเภท">
            <select
              className={selectClass}
              value={form.branchType}
              onChange={(e) => setForm({ ...form, branchType: e.target.value })}
            >
              <option value="HEAD_OFFICE">สำนักงานใหญ่</option>
              <option value="FACTORY">โรงงาน</option>
            </select>
          </FormField>
          <FormField label="ที่อยู่">
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
    </div>
  );
}
