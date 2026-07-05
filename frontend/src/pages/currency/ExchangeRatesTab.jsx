import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listExchangeRates, createExchangeRate } from "../../api/currency";
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
  currencyCode: "THB",
  rateToBase: "",
  effectiveDate: new Date().toISOString().slice(0, 10),
};

export default function ExchangeRatesTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["exchange-rates"],
    queryFn: () => listExchangeRates(),
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const createMutation = useMutation({
    mutationFn: createExchangeRate,
    onSuccess: () => {
      toastSuccess("ບັນທຶກອັດຕາແລກປ່ຽນແລ້ວ");
      queryClient.invalidateQueries({ queryKey: ["exchange-rates"] });
      setModalOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (err) => toastError(apiErrorMessage(err)),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({ ...form, rateToBase: Number(form.rateToBase) });
  };

  if (isLoading) return <Spinner />;

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button onClick={() => setModalOpen(true)}>
          + ຕັ້ງອັດຕາແລກປ່ຽນ
        </Button>
      </div>

      <table className="w-full text-sm bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
        <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wide text-left">
          <tr>
            <th className="px-4 py-3">ສະກຸນເງິນ</th>
            <th className="px-4 py-3">ອັດຕາ (1 ໜ່ວຍ = ເທົ່າໃດ LAK)</th>
            <th className="px-4 py-3">ມີຜົນຕັ້ງແຕ່ວັນທີ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data?.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3 font-medium text-gray-800">
                {r.currency_code}
              </td>
              <td className="px-4 py-3">
                {Number(r.rate_to_base).toLocaleString()}
              </td>
              <td className="px-4 py-3">{r.effective_date?.slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal
        open={modalOpen}
        title="ຕັ້ງອັດຕາແລກປ່ຽນ"
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit}>
          <FormField label="ສະກຸນເງິນ">
            <select
              className={selectClass}
              value={form.currencyCode}
              onChange={(e) =>
                setForm({ ...form, currencyCode: e.target.value })
              }
            >
              <option value="THB">THB — ບາດໄທ</option>
              <option value="CNY">CNY — ຢວນຈີນ</option>
            </select>
          </FormField>
          <FormField label="ອັດຕາ (1 ໜ່ວຍ = ເທົ່າໃດ LAK)">
            <input
              type="number"
              step="0.000001"
              className={inputClass}
              value={form.rateToBase}
              onChange={(e) => setForm({ ...form, rateToBase: e.target.value })}
              required
            />
          </FormField>
          <FormField label="ມີຜົນຕັ້ງແຕ່ວັນທີ">
            <input
              type="date"
              className={inputClass}
              value={form.effectiveDate}
              onChange={(e) =>
                setForm({ ...form, effectiveDate: e.target.value })
              }
              required
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
            <Button type="submit" disabled={createMutation.isPending}>
              ບັນທຶກ
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
