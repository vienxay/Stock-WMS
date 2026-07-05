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
    <table className="w-full text-sm bg-white rounded-lg overflow-hidden shadow-sm border">
      <thead className="bg-gray-50 text-gray-500 text-left">
        <tr>
          <th className="px-4 py-2">รหัส</th>
          <th className="px-4 py-2">ชื่อ</th>
          <th className="px-4 py-2">สัญลักษณ์</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {data?.map((c) => (
          <tr key={c.code}>
            <td className="px-4 py-2 font-medium text-gray-800">{c.code}</td>
            <td className="px-4 py-2">{c.name}</td>
            <td className="px-4 py-2">{c.symbol}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
