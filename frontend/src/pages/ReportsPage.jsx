import Tabs from '../components/ui/Tabs'
import StockBalanceTab from './reports/StockBalanceTab'
import MovementsTab from './reports/MovementsTab'
import YearlySummaryTab from './reports/YearlySummaryTab'

export default function ReportsPage() {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">ບົດລາຍງານ</h2>
      <Tabs
        tabs={[
          { key: 'stock-balance', label: 'ສະຕັອກຄົງເຫຼືອ', component: <StockBalanceTab /> },
          { key: 'movements', label: 'ປະຫວັດການເຄື່ອນໄຫວ', component: <MovementsTab /> },
          { key: 'yearly-summary', label: 'ສະຫຼຸບລາຍປີ', component: <YearlySummaryTab /> },
        ]}
      />
    </div>
  )
}
