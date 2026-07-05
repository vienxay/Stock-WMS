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
  const { data, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => listEmployees(),
  });
  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: listBranches,
  });
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
      toastSuccess("เพิ่มพนักงานแล้ว");
      invalidate();
      setModalOpen(false);
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => updateEmployee(id, body),
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
        <Button onClick={openCreate}>+ เพิ่มพนักงาน</Button>
      </div>

      <table className="w-full text-sm bg-white rounded-lg overflow-hidden shadow-sm border">
        <thead className="bg-gray-50 text-gray-500 text-left">
          <tr>
            <th className="px-4 py-2">รหัสพนักงาน</th>
            <th className="px-4 py-2">ชื่อ-สกุล</th>
            <th className="px-4 py-2">แผนก</th>
            <th className="px-4 py-2">สาขา</th>
            <th className="px-4 py-2">สถานะ</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data?.map((e) => (
            <tr key={e.id}>
              <td className="px-4 py-2">{e.employee_code}</td>
              <td className="px-4 py-2 font-medium text-gray-800">
                {e.full_name}
              </td>
              <td className="px-4 py-2">{e.department_name || "-"}</td>
              <td className="px-4 py-2">{e.branch_name}</td>
              <td className="px-4 py-2">
                {e.is_active ? "ใช้งาน" : "ปิดใช้งาน"}
              </td>
              <td className="px-4 py-2 text-right">
                <button
                  onClick={() => openEdit(e)}
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
        title={editingId ? "แก้ไขพนักงาน" : "เพิ่มพนักงาน"}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit}>
          <FormField label="รหัสพนักงาน">
            <input
              className={inputClass}
              value={form.employeeCode}
              onChange={(e) =>
                setForm({ ...form, employeeCode: e.target.value })
              }
              required
            />
          </FormField>
          <FormField label="ชื่อ-สกุล">
            <input
              className={inputClass}
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
            />
          </FormField>
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
          <FormField label="แผนก (ถ้ามี)">
            <select
              className={selectClass}
              value={form.departmentId}
              onChange={(e) =>
                setForm({ ...form, departmentId: e.target.value })
              }
            >
              <option value="">-- ไม่ระบุ --</option>
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
