import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { listStockTakes, createStockTake } from "../api/stockTakes";
import { listWarehouses } from "../api/organization";
import { apiErrorMessage } from "../api/client";
import { toastSuccess, toastError } from "../lib/toast";
import { useAuth } from "../context/AuthContext";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Spinner from "../components/ui/Spinner";
import StatusBadge from "../components/ui/StatusBadge";
import FormField, { inputClass, selectClass } from "../components/ui/FormField";

const EMPTY_FORM = {
  warehouseId: "",
  countDate: new Date().toISOString().slice(0, 10),
};

export default function StockTakesPage() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [warehouseId, setWarehouseId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const canCreate = hasRole(
    "SYSTEM_ADMIN",
    "HQ_STORE_KEEPER",
    "BRANCH_STORE_KEEPER",
  );

  const { data, isLoading } = useQuery({
    queryKey: ["stock-takes", { warehouseId }],
    queryFn: () => listStockTakes({ warehouseId: warehouseId || undefined }),
  });
  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => listWarehouses(),
  });

  const createMutation = useMutation({
    mutationFn: createStockTake,
    onSuccess: (stockTake) => {
      toastSuccess("ເປີດຮອບກວດນັບແລ້ວ");
      queryClient.invalidateQueries({ queryKey: ["stock-takes"] });
      setModalOpen(false);
      setForm(EMPTY_FORM);
      navigate(`/stock-takes/${stockTake.id}`);
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({ ...form, warehouseId: Number(form.warehouseId) });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">ກວດນັບສະຕັອກ</h2>
        {canCreate && (
          <Button onClick={() => setModalOpen(true)}>+ ເປີດຮອບກວດນັບ</Button>
        )}
      </div>

      <select
        className={`${selectClass} max-w-xs mb-4`}
        value={warehouseId}
        onChange={(e) => setWarehouseId(e.target.value)}
      >
        <option value="">-- ທຸກຄັງ --</option>
        {warehouses?.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </select>

      {isLoading ? (
        <Spinner />
      ) : (
        <table className="w-full text-sm bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
          <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wide text-left">
            <tr>
              <th className="px-4 py-3">ເລກທີ</th>
              <th className="px-4 py-3">ຄັງ</th>
              <th className="px-4 py-3">ວັນທີນັບ</th>
              <th className="px-4 py-3">ສະຖານະ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data?.map((st) => (
              <tr
                key={st.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => navigate(`/stock-takes/${st.id}`)}
              >
                <td className="px-4 py-3 font-medium text-gray-800">
                  #{st.id}
                </td>
                <td className="px-4 py-3">{st.warehouse_name}</td>
                <td className="px-4 py-3">{st.count_date?.slice(0, 10)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={st.status} />
                </td>
              </tr>
            ))}
            {!data?.length && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  ຍັງບໍ່ມີຮອບກວດນັບ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <Modal
        open={modalOpen}
        title="ເປີດຮອບກວດນັບສະຕັອກ"
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit}>
          <FormField label="ຄັງ">
            <select
              className={selectClass}
              value={form.warehouseId}
              onChange={(e) =>
                setForm({ ...form, warehouseId: e.target.value })
              }
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
          <FormField label="ວັນທີນັບ">
            <input
              type="date"
              className={inputClass}
              value={form.countDate}
              onChange={(e) => setForm({ ...form, countDate: e.target.value })}
              required
            />
          </FormField>
          <p className="text-xs text-gray-400 mb-4">
            ລະບົບຈະດຶງຍອດຄົງເຫຼືອປັດຈຸບັນຂອງທຸກສິນຄ້າໃນຄັງນີ້ມາເປັນຄ່າຕັ້ງຕົ້ນໃຫ້ອັດຕະໂນມັດ
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              ຍົກເລີກ
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              ເປີດຮອບກວດນັບ
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
