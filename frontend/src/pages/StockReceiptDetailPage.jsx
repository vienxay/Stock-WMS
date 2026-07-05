import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getReceipt } from "../api/stockReceipts";
import Spinner from "../components/ui/Spinner";

export default function StockReceiptDetailPage() {
  const { id } = useParams();
  const { data: receipt, isLoading } = useQuery({
    queryKey: ["stock-receipt", id],
    queryFn: () => getReceipt(id),
  });

  if (isLoading || !receipt) return <Spinner />;

  const totalValue = receipt.items.reduce(
    (sum, it) => sum + Number(it.total_value_lak),
    0,
  );

  return (
    <div>
      <Link
        to="/stock-receipts"
        className="text-sm text-blue-600 hover:underline"
      >
        &larr; กลับไปรายการรับสินค้าเข้า
      </Link>

      <h2 className="text-xl font-bold text-gray-800 mt-2 mb-4">
        ใบรับสินค้าเข้า #{receipt.id}
      </h2>

      <div className="bg-white rounded-lg border shadow-sm p-5 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-gray-500">วันที่รับ</div>
          <div className="font-medium">
            {receipt.received_date?.slice(0, 10)}
          </div>
        </div>
        <div>
          <div className="text-gray-500">สกุลเงิน</div>
          <div className="font-medium">{receipt.currency_code}</div>
        </div>
        <div>
          <div className="text-gray-500">อัตราแลกเปลี่ยนที่ใช้</div>
          <div className="font-medium">
            {Number(receipt.exchange_rate_used).toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-gray-500">หมายเหตุ</div>
          <div className="font-medium">{receipt.source_note || "-"}</div>
        </div>
      </div>

      <table className="w-full text-sm bg-white rounded-lg overflow-hidden shadow-sm border">
        <thead className="bg-gray-50 text-gray-500 text-left">
          <tr>
            <th className="px-4 py-2">SKU</th>
            <th className="px-4 py-2">สินค้า</th>
            <th className="px-4 py-2">จำนวน</th>
            <th className="px-4 py-2">ราคา/หน่วย (เดิม)</th>
            <th className="px-4 py-2">ราคา/หน่วย (LAK)</th>
            <th className="px-4 py-2">มูลค่ารวม (LAK)</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {receipt.items.map((it) => (
            <tr key={it.id}>
              <td className="px-4 py-2">{it.sku}</td>
              <td className="px-4 py-2 font-medium text-gray-800">
                {it.product_name}
              </td>
              <td className="px-4 py-2">{it.quantity}</td>
              <td className="px-4 py-2">
                {Number(it.unit_price_original).toLocaleString()}
              </td>
              <td className="px-4 py-2">
                {Number(it.unit_price_lak).toLocaleString()}
              </td>
              <td className="px-4 py-2">
                {Number(it.total_value_lak).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t font-semibold">
            <td colSpan={5} className="px-4 py-2 text-right">
              รวมมูลค่า (LAK)
            </td>
            <td className="px-4 py-2">{totalValue.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
