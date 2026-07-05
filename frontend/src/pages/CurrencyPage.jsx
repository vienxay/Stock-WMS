import Tabs from "../components/ui/Tabs";
import CurrenciesTab from "./currency/CurrenciesTab";
import ExchangeRatesTab from "./currency/ExchangeRatesTab";

export default function CurrencyPage() {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">สกุลเงิน</h2>
      <Tabs
        tabs={[
          {
            key: "currencies",
            label: "สกุลเงิน",
            component: <CurrenciesTab />,
          },
          {
            key: "exchange-rates",
            label: "อัตราแลกเปลี่ยน",
            component: <ExchangeRatesTab />,
          },
        ]}
      />
    </div>
  );
}
