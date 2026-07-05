import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getStockBalanceReport, exportStockBalanceXlsx } from '../../api/reports'
import { listWarehouses } from '../../api/organization'
import { listCategories } from '../../api/catalog'
import { toastError } from '../../lib/toast'
import { apiErrorMessage } from '../../api/client'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import { selectClass } from '../../components/ui/FormField'

export default function StockBalanceTab() {
  const [warehouseId, setWarehouseId] = useState('')
  const [categoryId, setCategoryId] = useState('')

  const { data: warehouses } = useQuery({ queryKey: ['warehouses'], queryFn: () => listWarehouses() })
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: () => listCategories() })
  const { data, isLoading } = useQuery({
    queryKey: ['report-stock-balance', { warehouseId, categoryId }],
    queryFn: () => getStockBalanceReport({ warehouseId: warehouseId || undefined, categoryId: categoryId || undefined }),
  })

  const handleExport = async () => {
    try {
      await exportStockBalanceXlsx({ warehouseId: warehouseId || undefined, categoryId: categoryId || undefined })
    } catch (err) {
      toastError(apiErrorMessage(err))
    }
  }

  const totalValue = data?.reduce((sum, r) => sum + Number(r.total_value_lak), 0) || 0

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-3">
          <select className={`${selectClass} max-w-xs`} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
            <option value="">-- ທຸກຄັງ --</option>
            {warehouses?.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <select className={`${selectClass} max-w-xs`} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">-- ທຸກໝວດໝູ່ --</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_lo}
              </option>
            ))}
          </select>
        </div>
        <Button variant="secondary" onClick={handleExport}>
          ດາວໂຫລດ Excel
        </Button>
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <table className="w-full text-sm bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
          <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wide text-left">
            <tr>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">ສິນຄ້າ</th>
              <th className="px-4 py-3">ຄັງ</th>
              <th className="px-4 py-3">ຈຳນວນຄົງເຫຼືອ</th>
              <th className="px-4 py-3">ຕົ້ນທຶນສະເລ່ຍ/ໜ່ວຍ</th>
              <th className="px-4 py-3">ມູນຄ່າລວມ (LAK)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data?.map((r, idx) => (
              <tr key={idx}>
                <td className="px-4 py-3">{r.sku}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{r.product_name}</td>
                <td className="px-4 py-3">{r.warehouse_name}</td>
                <td className="px-4 py-3">
                  {r.quantity} {r.unit_lo}
                </td>
                <td className="px-4 py-3">{Number(r.avg_unit_value_lak).toLocaleString()}</td>
                <td className="px-4 py-3">{Number(r.total_value_lak).toLocaleString()}</td>
              </tr>
            ))}
            {!data?.length && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  ບໍ່ພົບຂໍ້ມູນ
                </td>
              </tr>
            )}
          </tbody>
          {!!data?.length && (
            <tfoot>
              <tr className="border-t font-semibold">
                <td colSpan={5} className="px-4 py-3 text-right">
                  ລວມມູນຄ່າ (LAK)
                </td>
                <td className="px-4 py-3">{totalValue.toLocaleString()}</td>
              </tr>
            </tfoot>
          )}
        </table>
      )}
    </div>
  )
}
