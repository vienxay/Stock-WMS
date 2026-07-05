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
      toastSuccess("บันทึกอัตราแลกเปลี่ยนแล้ว");
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
          + ตั้งอัตราแลกเปลี่ยน
        </Button>
      </div>

      <table className="w-full text-sm bg-white rounded-lg overflow-hidden shadow-sm border">
        <thead className="bg-gray-50 text-gray-500 text-left">
          <tr>
            <th className="px-4 py-2">สกุลเงิน</th>
            <th className="px-4 py-2">อัตรา (1 หน่วย = กี่ LAK)</th>
            <th className="px-4 py-2">มีผลตั้งแต่วันที่</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data?.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-2 font-medium text-gray-800">
                {r.currency_code}
              </td>
              <td className="px-4 py-2">
                {Number(r.rate_to_base).toLocaleString()}
              </td>
              <td className="px-4 py-2">{r.effective_date?.slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal
        open={modalOpen}
        title="ตั้งอัตราแลกเปลี่ยน"
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit}>
          <FormField label="สกุลเงิน">
            <select
              className={selectClass}
              value={form.currencyCode}
              onChange={(e) =>
                setForm({ ...form, currencyCode: e.target.value })
              }
            >
              <option value="THB">THB — บาทไทย</option>
              <option value="CNY">CNY — หยวนจีน</option>
            </select>
          </FormField>
          <FormField label="อัตรา (1 หน่วย = กี่ LAK)">
            <input
              type="number"
              step="0.000001"
              className={inputClass}
              value={form.rateToBase}
              onChange={(e) => setForm({ ...form, rateToBase: e.target.value })}
              required
            />
          </FormField>
          <FormField label="มีผลตั้งแต่วันที่">
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
