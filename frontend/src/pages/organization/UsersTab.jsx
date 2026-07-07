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
  listBranches,
} from "../../api/organization";
import { apiErrorMessage } from "../../api/client";
import { toastSuccess, toastError, confirmAction } from "../../lib/toast";
import { useAuth } from "../../context/AuthContext";
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
      toastSuccess("ສ້າງບັນຊີຜູ້ໃຊ້ແລ້ວ");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setCreateModalOpen(false);
      setCreateForm(EMPTY_CREATE_FORM);
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => updateUser(id, body),
    onSuccess: () => {
      toastSuccess("ບັນທຶກແລ້ວ");
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
          + ສ້າງບັນຊີຜູ້ໃຊ້
        </Button>
      </div>

      <table className="w-full text-sm bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
        <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wide text-left">
          <tr>
            <th className="px-4 py-3">Username</th>
            <th className="px-4 py-3">ພະນັກງານ</th>
            <th className="px-4 py-3">ສະຖານະ</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {users?.map((u) => (
            <tr key={u.id}>
              <td className="px-4 py-3 font-medium text-gray-800">
                {u.username}
              </td>
              <td className="px-4 py-3">
                {u.full_name} ({u.employee_code})
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => toggleActive(u)}
                  className={u.is_active ? "text-emerald-600" : "text-red-600"}
                >
                  {u.is_active ? "ໃຊ້ງານ" : "ປິດໃຊ້ງານ"}
                </button>
              </td>
              <td className="px-4 py-3 text-right space-x-3">
                <button
                  onClick={() => setRolesUser(u)}
                  className="text-blue-600 hover:underline"
                >
                  ສິດທິ
                </button>
                <button
                  onClick={() => {
                    setEditUser(u);
                    setEditPassword("");
                  }}
                  className="text-blue-600 hover:underline"
                >
                  ຣີເຊັດລະຫັດຜ່ານ
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal
        open={createModalOpen}
        title="ສ້າງບັນຊີຜູ້ໃຊ້"
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
          <FormField label="ພະນັກງານ">
            <select
              className={selectClass}
              value={createForm.employeeId}
              onChange={(e) =>
                setCreateForm({ ...createForm, employeeId: e.target.value })
              }
              required
            >
              <option value="">-- ເລືອກພະນັກງານ --</option>
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
          <FormField label="ລະຫັດຜ່ານເລີ່ມຕົ້ນ (ຢ່າງໜ້ອຍ 8 ຕົວ)">
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
              ຍົກເລີກ
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              ສ້າງບັນຊີ
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!editUser}
        title={`ຣີເຊັດລະຫັດຜ່ານ: ${editUser?.username}`}
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
          <FormField label="ລະຫັດຜ່ານໃໝ່ (ຢ່າງໜ້ອຍ 8 ຕົວ)">
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
              ຍົກເລີກ
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              ບັນທຶກ
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
  const { user: currentUser, hasRole } = useAuth();
  const ownBranchId = hasRole("SUPER_ADMIN")
    ? null
    : (currentUser?.roles?.find((r) => r.code === "BRANCH_ADMIN")?.branchId ??
      null);

  const { data: allRoles } = useQuery({ queryKey: ["roles"], queryFn: listRoles });
  const roles = ownBranchId
    ? allRoles?.filter((r) => r.code === "WAREHOUSE_STAFF")
    : allRoles;
  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: listBranches,
  });
  const { data: allWarehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => listWarehouses(),
  });
  const warehouses = ownBranchId
    ? allWarehouses?.filter((w) => w.branch_id === ownBranchId)
    : allWarehouses;
  const { data: userRoles, isLoading } = useQuery({
    queryKey: ["user-roles", user.id],
    queryFn: () => listUserRoles({ userId: user.id }),
  });

  const [roleId, setRoleId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");

  const selectedRoleCode = roles?.find((r) => String(r.id) === roleId)?.code;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["user-roles", user.id] });

  const assignMutation = useMutation({
    mutationFn: assignUserRole,
    onSuccess: () => {
      toastSuccess("ມອບສິດທິແລ້ວ");
      invalidate();
      setRoleId("");
      setBranchId("");
      setWarehouseId("");
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const revokeMutation = useMutation({
    mutationFn: revokeUserRole,
    onSuccess: () => {
      toastSuccess("ຖອນສິດທິແລ້ວ");
      invalidate();
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const handleAssign = (e) => {
    e.preventDefault();
    assignMutation.mutate({
      userId: user.id,
      roleId: Number(roleId),
      branchId:
        selectedRoleCode === "BRANCH_ADMIN" && branchId ? Number(branchId) : null,
      warehouseId:
        selectedRoleCode === "WAREHOUSE_STAFF" && warehouseId
          ? Number(warehouseId)
          : null,
    });
  };

  const handleRevoke = async (id) => {
    const result = await confirmAction({ title: "ຖອນສິດທິນີ້?" });
    if (result.isConfirmed) revokeMutation.mutate(id);
  };

  const describeScope = (r) => {
    if (r.branch_id) return ` — ສາຂາ ${r.branch_name}`;
    if (r.warehouse_id) return ` — ຄັງ ${r.warehouse_name}`;
    return " — ທົ່ວທັງລະບົບ";
  };

  return (
    <Modal open title={`ຈັດການສິດທິ: ${user.username}`} onClose={onClose}>
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
                  {describeScope(r)}
                </span>
                <button
                  onClick={() => handleRevoke(r.id)}
                  className="text-red-600 hover:underline text-xs"
                >
                  ຖອນສິດທິ
                </button>
              </div>
            ))
          ) : (
            <div className="text-gray-400 text-sm">ຍັງບໍ່ມີສິດທິ</div>
          )}
        </div>
      )}

      <form onSubmit={handleAssign} className="border-t pt-4">
        <FormField label="ເພີ່ມສິດທິ: ບົດບາດ">
          <select
            className={selectClass}
            value={roleId}
            onChange={(e) => {
              setRoleId(e.target.value);
              setBranchId("");
              setWarehouseId("");
            }}
            required
          >
            <option value="">-- ເລືອກບົດບາດ --</option>
            {roles?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.code} — {r.name}
              </option>
            ))}
          </select>
        </FormField>

        {selectedRoleCode === "BRANCH_ADMIN" && (
          <FormField label="ສາຂາ">
            <select
              className={selectClass}
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              required
            >
              <option value="">-- ເລືອກສາຂາ --</option>
              {branches?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </FormField>
        )}

        {selectedRoleCode === "WAREHOUSE_STAFF" && (
          <FormField label="ຄັງ">
            <select
              className={selectClass}
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
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
        )}

        {selectedRoleCode === "SUPER_ADMIN" && (
          <p className="text-xs text-gray-400 -mt-2 mb-4">
            ບົດບາດນີ້ໃຫ້ສິດທິທົ່ວທັງລະບົບ ບໍ່ຕ້ອງລະບຸຂອບເຂດ
          </p>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={assignMutation.isPending}>
            ມອບສິດທິ
          </Button>
        </div>
      </form>
    </Modal>
  );
}
