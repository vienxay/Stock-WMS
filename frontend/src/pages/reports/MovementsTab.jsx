import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getMovementsReport } from '../../api/reports'
import { listWarehouses } from '../../api/organization'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'
import { selectClass } from '../../components/ui/FormField'

const MOVEMENT_TYPES = ['RECEIPT', 'ISSUE', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT']
const PAGE_SIZE = 50

export default function MovementsTab() {
  const [warehouseId, setWarehouseId] = useState('')
  const [movementType, setMovementType] = useState('')
  const [offset, setOffset] = useState(0)

  const { data: warehouses } = useQuery({ queryKey: ['warehouses'], queryFn: () => listWarehouses() })
  const { data, isLoading } = useQuery({
    queryKey: ['report-movements', { warehouseId, movementType, offset }],
    queryFn: () =>
      getMovementsReport({
        warehouseId: warehouseId || undefined,
        movementType: movementType || undefined,
        limit: PAGE_SIZE,
        offset,
      }),
  })

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <select
          className={`${selectClass} max-w-xs`}
          value={warehouseId}
          onChange={(e) => {
            setWarehouseId(e.target.value)
            setOffset(0)
          }}
        >
          <option value="">-- ทุกคลัง --</option>
          {warehouses?.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <select
          className={`${selectClass} max-w-xs`}
          value={movementType}
          onChange={(e) => {
            setMovementType(e.target.value)
            setOffset(0)
          }}
        >
          <option value="">-- ทุกประเภท --</option>
          {MOVEMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <>
          <table className="w-full text-sm bg-white rounded-lg overflow-hidden shadow-sm border">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2">วันที่</th>
                <th className="px-4 py-2">SKU</th>
                <th className="px-4 py-2">สินค้า</th>
                <th className="px-4 py-2">คลัง</th>
                <th className="px-4 py-2">ประเภท</th>
                <th className="px-4 py-2">จำนวน</th>
                <th className="px-4 py-2">มูลค่า (LAK)</th>
                <th className="px-4 py-2">ผู้บันทึก</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2 whitespace-nowrap">{new Date(m.created_at).toLocaleString('th-TH')}</td>
                  <td className="px-4 py-2">{m.sku}</td>
                  <td className="px-4 py-2 font-medium text-gray-800">{m.product_name}</td>
                  <td className="px-4 py-2">{m.warehouse_name}</td>
                  <td className="px-4 py-2">{m.movement_type}</td>
                  <td className={`px-4 py-2 ${Number(m.quantity) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {m.quantity}
                  </td>
                  <td className="px-4 py-2">{Number(m.total_value_lak).toLocaleString()}</td>
                  <td className="px-4 py-2">{m.created_by_username}</td>
                </tr>
              ))}
              {!data?.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    ไม่พบข้อมูล
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex justify-between mt-3">
            <Button variant="secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
              ก่อนหน้า
            </Button>
            <Button
              variant="secondary"
              disabled={!data || data.length < PAGE_SIZE}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              ถัดไป
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
