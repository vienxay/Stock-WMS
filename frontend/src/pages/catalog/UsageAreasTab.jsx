import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listUsageAreas,
  createUsageArea,
  updateUsageArea,
} from "../../api/catalog";
import { listBranches } from "../../api/organization";
import { apiErrorMessage } from "../../api/client";
import { toastSuccess, toastError } from "../../lib/toast";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Spinner from "../../components/ui/Spinner";
import FormField, {
  inputClass,
  selectClass,
} from "../../components/ui/FormField";

const EMPTY_FORM = { branchId: "", nameLo: "", nameCn: "" };

export default function UsageAreasTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["usage-areas"],
    queryFn: () => listUsageAreas(),
  });
  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: listBranches,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["usage-areas"] });

  const createMutation = useMutation({
    mutationFn: createUsageArea,
    onSuccess: () => {
      toastSuccess("เพิ่มพื้นที่ใช้งานแล้ว");
      invalidate();
      setModalOpen(false);
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => updateUsageArea(id, body),
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

  const openEdit = (u) => {
    setEditingId(u.id);
    setForm({
      branchId: u.branch_id,
      nameLo: u.name_lo,
      nameCn: u.name_cn || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const body = { ...form, branchId: Number(form.branchId) };
    if (editingId) updateMutation.mutate({ id: editingId, body });
    else createMutation.mutate(body);
  };

  if (isLoading) return <Spinner />;

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button onClick={openCreate}>+ เพิ่มพื้นที่ใช้งาน</Button>
      </div>

      <table className="w-full text-sm bg-white rounded-lg overflow-hidden shadow-sm border">
        <thead className="bg-gray-50 text-gray-500 text-left">
          <tr>
            <th className="px-4 py-2">ชื่อ (ลาว)</th>
            <th className="px-4 py-2">ชื่อ (จีน)</th>
            <th className="px-4 py-2">สาขา</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data?.map((u) => (
            <tr key={u.id}>
              <td className="px-4 py-2 font-medium text-gray-800">
                {u.name_lo}
              </td>
              <td className="px-4 py-2">{u.name_cn || "-"}</td>
              <td className="px-4 py-2">
                {branches?.find((b) => b.id === u.branch_id)?.name || "-"}
              </td>
              <td className="px-4 py-2 text-right">
                <button
                  onClick={() => openEdit(u)}
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
        title={editingId ? "แก้ไขพื้นที่ใช้งาน" : "เพิ่มพื้นที่ใช้งาน"}
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
