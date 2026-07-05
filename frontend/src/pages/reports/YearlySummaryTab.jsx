import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getYearlySummary, exportYearlySummaryXlsx } from '../../api/reports'
import { listWarehouses } from '../../api/organization'
import { toastError } from '../../lib/toast'
import { apiErrorMessage } from '../../api/client'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import { selectClass, inputClass } from '../../components/ui/FormField'

const CURRENT_YEAR = new Date().getFullYear()

export default function YearlySummaryTab() {
  const [warehouseId, setWarehouseId] = useState('')
  const [year, setYear] = useState(String(CURRENT_YEAR))

  const { data: warehouses } = useQuery({ queryKey: ['warehouses'], queryFn: () => listWarehouses() })
  const { data, isLoading } = useQuery({
    queryKey: ['report-yearly-summary', { warehouseId, year }],
    queryFn: () => getYearlySummary({ warehouseId, year }),
    enabled: !!warehouseId && !!year,
  })

  const handleExport = async () => {
    try {
      await exportYearlySummaryXlsx({ warehouseId, year })
    } catch (err) {
      toastError(apiErrorMessage(err))
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-3">
          <select className={`${selectClass} max-w-xs`} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
            <option value="">-- ເລືອກຄັງ --</option>
            {warehouses?.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            className={`${inputClass} max-w-[120px]`}
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
        </div>
        <Button variant="secondary" onClick={handleExport} disabled={!warehouseId}>
          ດາວໂຫລດ Excel
        </Button>
      </div>

      {!warehouseId ? (
        <div className="text-gray-400 text-center py-10">ກະລຸນາເລືອກຄັງເພື່ອເບິ່ງສະຫຼຸບລາຍປີ</div>
      ) : isLoading ? (
        <Spinner />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
            <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wide text-left">
              <tr>
                <th className="px-3 py-3">SKU</th>
                <th className="px-3 py-3">ສິນຄ້າ</th>
                <th className="px-3 py-3">ຍອດຍົກມາ</th>
                <th className="px-3 py-3">ຮັບເຂົ້າ</th>
                <th className="px-3 py-3">ເບີກໃຊ້</th>
                <th className="px-3 py-3">ປັບເພີ່ມ</th>
                <th className="px-3 py-3">ປັບລົດ</th>
                <th className="px-3 py-3">ໂອນເຂົ້າ</th>
                <th className="px-3 py-3">ໂອນອອກ</th>
                <th className="px-3 py-3">ຍອດທ້າຍປີ</th>
                <th className="px-3 py-3">ມູນຄ່າທ້າຍປີ (LAK)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.map((r) => (
                <tr key={r.product_id}>
                  <td className="px-3 py-3">{r.sku}</td>
                  <td className="px-3 py-3 font-medium text-gray-800">{r.product_name}</td>
                  <td className="px-3 py-3">{r.opening_qty ?? 0}</td>
                  <td className="px-3 py-3">{r.received_qty}</td>
                  <td className="px-3 py-3">{r.issued_qty}</td>
                  <td className="px-3 py-3">{r.adjust_in_qty}</td>
                  <td className="px-3 py-3">{r.adjust_out_qty}</td>
                  <td className="px-3 py-3">{r.transfer_in_qty}</td>
                  <td className="px-3 py-3">{r.transfer_out_qty}</td>
                  <td className="px-3 py-3 font-medium">{r.closing_qty ?? 0}</td>
                  <td className="px-3 py-3">{Number(r.closing_value_lak || 0).toLocaleString()}</td>
                </tr>
              ))}
              {!data?.length && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-400">
                    ບໍ່ພົບຂໍ້ມູນຂອງປີນີ້
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
