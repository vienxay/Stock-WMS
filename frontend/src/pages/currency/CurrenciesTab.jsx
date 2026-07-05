import { useQuery } from "@tanstack/react-query";
import { listCurrencies } from "../../api/currency";
import Spinner from "../../components/ui/Spinner";

export default function CurrenciesTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["currencies"],
    queryFn: listCurrencies,
  });

  if (isLoading) return <Spinner />;

  return (
    <table className="w-full text-sm bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
      <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wide text-left">
        <tr>
          <th className="px-4 py-3">ລະຫັດ</th>
          <th className="px-4 py-3">ຊື່</th>
          <th className="px-4 py-3">ສັນຍາລັກ</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {data?.map((c) => (
          <tr key={c.code}>
            <td className="px-4 py-3 font-medium text-gray-800">{c.code}</td>
            <td className="px-4 py-3">{c.name}</td>
            <td className="px-4 py-3">{c.symbol}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
