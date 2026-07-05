import Tabs from "../components/ui/Tabs";
import GroupsTab from "./catalog/GroupsTab";
import CategoriesTab from "./catalog/CategoriesTab";
import UsageAreasTab from "./catalog/UsageAreasTab";

export default function CatalogPage() {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">หมวดหมู่สินค้า</h2>
      <Tabs
        tabs={[
          { key: "groups", label: "กลุ่มสินค้า", component: <GroupsTab /> },
          {
            key: "categories",
            label: "หมวดหมู่",
            component: <CategoriesTab />,
          },
          {
            key: "usage-areas",
            label: "พื้นที่ใช้งาน",
            component: <UsageAreasTab />,
          },
        ]}
      />
    </div>
  );
}
