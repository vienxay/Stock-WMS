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
            <option value="">-- ทุกคลัง --</option>
            {warehouses?.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <select className={`${selectClass} max-w-xs`} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">-- ทุกหมวดหมู่ --</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_lo}
              </option>
            ))}
          </select>
        </div>
        <Button variant="secondary" onClick={handleExport}>
          ดาวน์โหลด Excel
        </Button>
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <table className="w-full text-sm bg-white rounded-lg overflow-hidden shadow-sm border">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2">SKU</th>
              <th className="px-4 py-2">สินค้า</th>
              <th className="px-4 py-2">คลัง</th>
              <th className="px-4 py-2">จำนวนคงเหลือ</th>
              <th className="px-4 py-2">ต้นทุนเฉลี่ย/หน่วย</th>
              <th className="px-4 py-2">มูลค่ารวม (LAK)</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data?.map((r, idx) => (
              <tr key={idx}>
                <td className="px-4 py-2">{r.sku}</td>
                <td className="px-4 py-2 font-medium text-gray-800">{r.product_name}</td>
                <td className="px-4 py-2">{r.warehouse_name}</td>
                <td className="px-4 py-2">
                  {r.quantity} {r.unit_lo}
                </td>
                <td className="px-4 py-2">{Number(r.avg_unit_value_lak).toLocaleString()}</td>
                <td className="px-4 py-2">{Number(r.total_value_lak).toLocaleString()}</td>
              </tr>
            ))}
            {!data?.length && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  ไม่พบข้อมูล
                </td>
              </tr>
            )}
          </tbody>
          {!!data?.length && (
            <tfoot>
              <tr className="border-t font-semibold">
                <td colSpan={5} className="px-4 py-2 text-right">
                  รวมมูลค่า (LAK)
                </td>
                <td className="px-4 py-2">{totalValue.toLocaleString()}</td>
              </tr>
            </tfoot>
          )}
        </table>
      )}
    </div>
  )
}
