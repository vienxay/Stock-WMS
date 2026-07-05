import Tabs from "../components/ui/Tabs";
import CurrenciesTab from "./currency/CurrenciesTab";
import ExchangeRatesTab from "./currency/ExchangeRatesTab";

export default function CurrencyPage() {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">ສະກຸນເງິນ</h2>
      <Tabs
        tabs={[
          {
            key: "currencies",
            label: "ສະກຸນເງິນ",
            component: <CurrenciesTab />,
          },
          {
            key: "exchange-rates",
            label: "ອັດຕາແລກປ່ຽນ",
            component: <ExchangeRatesTab />,
          },
        ]}
      />
    </div>
  );
}
