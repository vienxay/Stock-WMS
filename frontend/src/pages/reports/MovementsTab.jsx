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
          <option value="">-- ທຸກຄັງ --</option>
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
          <option value="">-- ທຸກປະເພດ --</option>
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
          <table className="w-full text-sm bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
            <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wide text-left">
              <tr>
                <th className="px-4 py-3">ວັນທີ</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">ສິນຄ້າ</th>
                <th className="px-4 py-3">ຄັງ</th>
                <th className="px-4 py-3">ປະເພດ</th>
                <th className="px-4 py-3">ຈຳນວນ</th>
                <th className="px-4 py-3">ມູນຄ່າ (LAK)</th>
                <th className="px-4 py-3">ຜູ້ບັນທຶກ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(m.created_at).toLocaleString('th-TH')}</td>
                  <td className="px-4 py-3">{m.sku}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{m.product_name}</td>
                  <td className="px-4 py-3">{m.warehouse_name}</td>
                  <td className="px-4 py-3">{m.movement_type}</td>
                  <td className={`px-4 py-3 ${Number(m.quantity) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {m.quantity}
                  </td>
                  <td className="px-4 py-3">{Number(m.total_value_lak).toLocaleString()}</td>
                  <td className="px-4 py-3">{m.created_by_username}</td>
                </tr>
              ))}
              {!data?.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    ບໍ່ພົບຂໍ້ມູນ
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex justify-between mt-3">
            <Button variant="secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
              ກ່ອນໜ້າ
            </Button>
            <Button
              variant="secondary"
              disabled={!data || data.length < PAGE_SIZE}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              ຖັດໄປ
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
