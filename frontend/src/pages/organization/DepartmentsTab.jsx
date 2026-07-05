import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listDepartments,
  createDepartment,
  listBranches,
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

const EMPTY_FORM = { branchId: "", name: "" };

export default function DepartmentsTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: () => listDepartments(),
  });
  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: listBranches,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const createMutation = useMutation({
    mutationFn: createDepartment,
    onSuccess: () => {
      toastSuccess("เพิ่มแผนกแล้ว");
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      setModalOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({ ...form, branchId: Number(form.branchId) });
  };

  if (isLoading) return <Spinner />;

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button onClick={() => setModalOpen(true)}>+ เพิ่มแผนก</Button>
      </div>

      <table className="w-full text-sm bg-white rounded-lg overflow-hidden shadow-sm border">
        <thead className="bg-gray-50 text-gray-500 text-left">
          <tr>
            <th className="px-4 py-2">ชื่อแผนก</th>
            <th className="px-4 py-2">สาขา</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data?.map((d) => (
            <tr key={d.id}>
              <td className="px-4 py-2 font-medium text-gray-800">{d.name}</td>
              <td className="px-4 py-2">
                {branches?.find((b) => b.id === d.branch_id)?.name ||
                  d.branch_id}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal
        open={modalOpen}
        title="เพิ่มแผนก"
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
          <FormField label="ชื่อแผนก">
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
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
            <Button type="submit" disabled={createMutation.isPending}>
              บันทึก
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
