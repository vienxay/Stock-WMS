import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listUsers,
  createUser,
  updateUser,
  listEmployees,
  listRoles,
  listUserRoles,
  assignUserRole,
  revokeUserRole,
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

const EMPTY_CREATE_FORM = { employeeId: "", username: "", password: "" };

export default function UsersTab() {
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
  });
  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: () => listEmployees(),
  });

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);

  const [editUser, setEditUser] = useState(null);
  const [editPassword, setEditPassword] = useState("");

  const [rolesUser, setRolesUser] = useState(null);

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      toastSuccess("สร้างบัญชีผู้ใช้แล้ว");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setCreateModalOpen(false);
      setCreateForm(EMPTY_CREATE_FORM);
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => updateUser(id, body),
    onSuccess: () => {
      toastSuccess("บันทึกแล้ว");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setEditUser(null);
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const toggleActive = (u) =>
    updateMutation.mutate({ id: u.id, body: { isActive: !u.is_active } });

  if (isLoading) return <Spinner />;

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button onClick={() => setCreateModalOpen(true)}>
          + สร้างบัญชีผู้ใช้
        </Button>
      </div>

      <table className="w-full text-sm bg-white rounded-lg overflow-hidden shadow-sm border">
        <thead className="bg-gray-50 text-gray-500 text-left">
          <tr>
            <th className="px-4 py-2">Username</th>
            <th className="px-4 py-2">พนักงาน</th>
            <th className="px-4 py-2">สถานะ</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {users?.map((u) => (
            <tr key={u.id}>
              <td className="px-4 py-2 font-medium text-gray-800">
                {u.username}
              </td>
              <td className="px-4 py-2">
                {u.full_name} ({u.employee_code})
              </td>
              <td className="px-4 py-2">
                <button
                  onClick={() => toggleActive(u)}
                  className={u.is_active ? "text-emerald-600" : "text-red-600"}
                >
                  {u.is_active ? "ใช้งาน" : "ปิดใช้งาน"}
                </button>
              </td>
              <td className="px-4 py-2 text-right space-x-3">
                <button
                  onClick={() => setRolesUser(u)}
                  className="text-blue-600 hover:underline"
                >
                  สิทธิ์
                </button>
                <button
                  onClick={() => {
                    setEditUser(u);
                    setEditPassword("");
                  }}
                  className="text-blue-600 hover:underline"
                >
                  รีเซ็ตรหัสผ่าน
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal
        open={createModalOpen}
        title="สร้างบัญชีผู้ใช้"
        onClose={() => setCreateModalOpen(false)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate({
              ...createForm,
              employeeId: Number(createForm.employeeId),
            });
          }}
        >
          <FormField label="พนักงาน">
            <select
              className={selectClass}
              value={createForm.employeeId}
              onChange={(e) =>
                setCreateForm({ ...createForm, employeeId: e.target.value })
              }
              required
            >
              <option value="">-- เลือกพนักงาน --</option>
              {employees?.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.full_name} ({e.employee_code})
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Username">
            <input
              className={inputClass}
              value={createForm.username}
              onChange={(e) =>
                setCreateForm({ ...createForm, username: e.target.value })
              }
              required
              minLength={3}
            />
          </FormField>
          <FormField label="รหัสผ่านเริ่มต้น (อย่างน้อย 8 ตัว)">
            <input
              type="password"
              className={inputClass}
              value={createForm.password}
              onChange={(e) =>
                setCreateForm({ ...createForm, password: e.target.value })
              }
              required
              minLength={8}
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCreateModalOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              สร้างบัญชี
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!editUser}
        title={`รีเซ็ตรหัสผ่าน: ${editUser?.username}`}
        onClose={() => setEditUser(null)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateMutation.mutate({
              id: editUser.id,
              body: { password: editPassword },
            });
          }}
        >
          <FormField label="รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)">
            <input
              type="password"
              className={inputClass}
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              required
              minLength={8}
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditUser(null)}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              บันทึก
            </Button>
          </div>
        </form>
      </Modal>

      {rolesUser && (
        <UserRolesModal user={rolesUser} onClose={() => setRolesUser(null)} />
      )}
    </div>
  );
}

function UserRolesModal({ user, onClose }) {
  const queryClient = useQueryClient();
  const { data: roles } = useQuery({ queryKey: ["roles"], queryFn: listRoles });
  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => listWarehouses(),
  });
  const { data: userRoles, isLoading } = useQuery({
    queryKey: ["user-roles", user.id],
    queryFn: () => listUserRoles({ userId: user.id }),
  });

  const [roleId, setRoleId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["user-roles", user.id] });

  const assignMutation = useMutation({
    mutationFn: assignUserRole,
    onSuccess: () => {
      toastSuccess("มอบสิทธิ์แล้ว");
      invalidate();
      setRoleId("");
      setWarehouseId("");
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const revokeMutation = useMutation({
    mutationFn: revokeUserRole,
    onSuccess: () => {
      toastSuccess("ถอนสิทธิ์แล้ว");
      invalidate();
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const handleAssign = (e) => {
    e.preventDefault();
    assignMutation.mutate({
      userId: user.id,
      roleId: Number(roleId),
      warehouseId: warehouseId ? Number(warehouseId) : null,
    });
  };

  const handleRevoke = async (id) => {
    const result = await confirmAction({ title: "ถอนสิทธิ์นี้?" });
    if (result.isConfirmed) revokeMutation.mutate(id);
  };

  return (
    <Modal open title={`จัดการสิทธิ์: ${user.username}`} onClose={onClose}>
      {isLoading ? (
        <Spinner />
      ) : (
        <div className="space-y-1 mb-4">
          {userRoles?.length ? (
            userRoles.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between text-sm border-b py-1.5"
              >
                <span>
                  {r.role_code}
                  {r.warehouse_id
                    ? ` — คลัง #${r.warehouse_id}`
                    : " — ทั่วทั้งระบบ"}
                </span>
                <button
                  onClick={() => handleRevoke(r.id)}
                  className="text-red-600 hover:underline text-xs"
                >
                  ถอนสิทธิ์
                </button>
              </div>
            ))
          ) : (
            <div className="text-gray-400 text-sm">ยังไม่มีสิทธิ์</div>
          )}
        </div>
      )}

      <form onSubmit={handleAssign} className="border-t pt-4">
        <FormField label="เพิ่มสิทธิ์: บทบาท">
          <select
            className={selectClass}
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            required
          >
            <option value="">-- เลือกบทบาท --</option>
            {roles?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.code} — {r.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="ขอบเขตคลัง (ไม่ระบุ = ทั่วทั้งระบบ)">
          <select
            className={selectClass}
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
          >
            <option value="">-- ทั่วทั้งระบบ --</option>
            {warehouses?.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </FormField>
        <div className="flex justify-end">
          <Button type="submit" disabled={assignMutation.isPending}>
            มอบสิทธิ์
          </Button>
        </div>
      </form>
    </Modal>
  );
}
