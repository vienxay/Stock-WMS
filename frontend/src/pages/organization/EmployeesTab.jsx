import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listEmployees,
  createEmployee,
  updateEmployee,
  listBranches,
  listDepartments,
} from "../../api/organization";
import { apiErrorMessage } from "../../api/client";
import { toastSuccess, toastError } from "../../lib/toast";
import { useAuth } from "../../context/AuthContext";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Spinner from "../../components/ui/Spinner";
import FormField, {
  inputClass,
  selectClass,
} from "../../components/ui/FormField";

const EMPTY_FORM = {
  employeeCode: "",
  fullName: "",
  departmentId: "",
  branchId: "",
  isActive: true,
};

export default function EmployeesTab() {
  const queryClient = useQueryClient();
  const { user, hasRole } = useAuth();
  const ownBranchId = hasRole("SUPER_ADMIN")
    ? null
    : (user?.roles?.find((r) => r.code === "BRANCH_ADMIN")?.branchId ?? null);

  const { data, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => listEmployees(),
  });
  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: listBranches,
  });
  const availableBranches = ownBranchId
    ? branches?.filter((b) => b.id === ownBranchId)
    : branches;
  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: () => listDepartments(),
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["employees"] });

  const createMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      toastSuccess("ເພີ່ມພະນັກງານແລ້ວ");
      invalidate();
      setModalOpen(false);
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => updateEmployee(id, body),
    onSuccess: () => {
      toastSuccess("ບັນທຶກແລ້ວ");
      invalidate();
      setModalOpen(false);
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, branchId: ownBranchId ?? "" });
    setModalOpen(true);
  };

  const openEdit = (emp) => {
    setEditingId(emp.id);
    setForm({
      employeeCode: emp.employee_code,
      fullName: emp.full_name,
      departmentId: emp.department_id || "",
      branchId: emp.branch_id,
      isActive: !!emp.is_active,
    });
    setModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const body = {
      ...form,
      branchId: Number(form.branchId),
      departmentId: form.departmentId ? Number(form.departmentId) : null,
    };
    if (editingId) updateMutation.mutate({ id: editingId, body });
    else createMutation.mutate(body);
  };

  if (isLoading) return <Spinner />;

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button onClick={openCreate}>+ ເພີ່ມພະນັກງານ</Button>
      </div>

      <table className="w-full text-sm bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
        <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wide text-left">
          <tr>
            <th className="px-4 py-3">ລະຫັດພະນັກງານ</th>
            <th className="px-4 py-3">ຊື່-ນາມສະກຸນ</th>
            <th className="px-4 py-3">ພະແນກ</th>
            <th className="px-4 py-3">ສາຂາ</th>
            <th className="px-4 py-3">ສະຖານະ</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data?.map((e) => (
            <tr key={e.id}>
              <td className="px-4 py-3">{e.employee_code}</td>
              <td className="px-4 py-3 font-medium text-gray-800">
                {e.full_name}
              </td>
              <td className="px-4 py-3">{e.department_name || "-"}</td>
              <td className="px-4 py-3">{e.branch_name}</td>
              <td className="px-4 py-3">
                {e.is_active ? "ໃຊ້ງານ" : "ປິດໃຊ້ງານ"}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => openEdit(e)}
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
        title={editingId ? "ແກ້ໄຂພະນັກງານ" : "ເພີ່ມພະນັກງານ"}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit}>
          <FormField label="ລະຫັດພະນັກງານ">
            <input
              className={inputClass}
              value={form.employeeCode}
              onChange={(e) =>
                setForm({ ...form, employeeCode: e.target.value })
              }
              required
            />
          </FormField>
          <FormField label="ຊື່-ນາມສະກຸນ">
            <input
              className={inputClass}
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
            />
          </FormField>
          <FormField label="ສາຂາ">
            <select
              className={selectClass}
              value={form.branchId}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}
              disabled={!!ownBranchId}
              required
            >
              <option value="">-- ເລືອກສາຂາ --</option>
              {availableBranches?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="ພະແນກ (ຖ້າມີ)">
            <select
              className={selectClass}
              value={form.departmentId}
              onChange={(e) =>
                setForm({ ...form, departmentId: e.target.value })
              }
            >
              <option value="">-- ບໍ່ລະບຸ --</option>
              {departments
                ?.filter(
                  (d) =>
                    !form.branchId || d.branch_id === Number(form.branchId),
                )
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </select>
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
