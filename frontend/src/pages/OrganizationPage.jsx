import Tabs from "../components/ui/Tabs";
import BranchesTab from "./organization/BranchesTab";
import WarehousesTab from "./organization/WarehousesTab";
import DepartmentsTab from "./organization/DepartmentsTab";
import EmployeesTab from "./organization/EmployeesTab";
import UsersTab from "./organization/UsersTab";

export default function OrganizationPage() {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">องค์กร/ผู้ใช้งาน</h2>
      <Tabs
        tabs={[
          { key: "branches", label: "สาขา", component: <BranchesTab /> },
          { key: "warehouses", label: "คลัง", component: <WarehousesTab /> },
          { key: "departments", label: "แผนก", component: <DepartmentsTab /> },
          { key: "employees", label: "พนักงาน", component: <EmployeesTab /> },
          {
            key: "users",
            label: "ผู้ใช้งานและสิทธิ์",
            component: <UsersTab />,
          },
        ]}
      />
    </div>
  );
}
