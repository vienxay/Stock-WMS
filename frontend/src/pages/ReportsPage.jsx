import Tabs from '../components/ui/Tabs'
import StockBalanceTab from './reports/StockBalanceTab'
import MovementsTab from './reports/MovementsTab'
import YearlySummaryTab from './reports/YearlySummaryTab'

export default function ReportsPage() {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">รายงาน</h2>
      <Tabs
        tabs={[
          { key: 'stock-balance', label: 'สต็อกคงเหลือ', component: <StockBalanceTab /> },
          { key: 'movements', label: 'ประวัติการเคลื่อนไหว', component: <MovementsTab /> },
          { key: 'yearly-summary', label: 'สรุปรายปี', component: <YearlySummaryTab /> },
        ]}
      />
    </div>
  )
}
