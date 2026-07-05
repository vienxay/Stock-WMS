import Tabs from "../components/ui/Tabs";
import GroupsTab from "./catalog/GroupsTab";
import CategoriesTab from "./catalog/CategoriesTab";
import UsageAreasTab from "./catalog/UsageAreasTab";

export default function CatalogPage() {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">ໝວດໝູ່ສິນຄ້າ</h2>
      <Tabs
        tabs={[
          { key: "groups", label: "ກຸ່ມສິນຄ້າ", component: <GroupsTab /> },
          {
            key: "categories",
            label: "ໝວດໝູ່",
            component: <CategoriesTab />,
          },
          {
            key: "usage-areas",
            label: "ພື້ນທີ່ໃຊ້ງານ",
            component: <UsageAreasTab />,
          },
        ]}
      />
    </div>
  );
}
