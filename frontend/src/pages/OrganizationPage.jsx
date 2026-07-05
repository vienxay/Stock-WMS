import Tabs from "../components/ui/Tabs";
import BranchesTab from "./organization/BranchesTab";
import WarehousesTab from "./organization/WarehousesTab";
import DepartmentsTab from "./organization/DepartmentsTab";
import EmployeesTab from "./organization/EmployeesTab";
import UsersTab from "./organization/UsersTab";
import BrandingTab from "./organization/BrandingTab";

export default function OrganizationPage() {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">ອົງກອນ/ຜູ້ໃຊ້ງານ</h2>
      <Tabs
        tabs={[
          { key: "branches", label: "ສາຂາ", component: <BranchesTab /> },
          { key: "warehouses", label: "ຄັງ", component: <WarehousesTab /> },
          { key: "departments", label: "ພະແນກ", component: <DepartmentsTab /> },
          { key: "employees", label: "ພະນັກງານ", component: <EmployeesTab /> },
          {
            key: "users",
            label: "ຜູ້ໃຊ້ງານແລະສິດທິ",
            component: <UsersTab />,
          },
          { key: "branding", label: "ຍີ່ຫໍ້/ໜ້າ Login", component: <BrandingTab /> },
        ]}
      />
    </div>
  );
}
