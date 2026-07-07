import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ProductsPage from "./pages/ProductsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import StockReceiptsPage from "./pages/StockReceiptsPage";
import StockReceiptDetailPage from "./pages/StockReceiptDetailPage";
import BranchRequestsPage from "./pages/BranchRequestsPage";
import BranchRequestDetailPage from "./pages/BranchRequestDetailPage";
import RequisitionsPage from "./pages/RequisitionsPage";
import RequisitionDetailPage from "./pages/RequisitionDetailPage";
import StockTakesPage from "./pages/StockTakesPage";
import StockTakeDetailPage from "./pages/StockTakeDetailPage";
import ReportsPage from "./pages/ReportsPage";
import OrganizationPage from "./pages/OrganizationPage";
import CatalogPage from "./pages/CatalogPage";
import CurrencyPage from "./pages/CurrencyPage";
import StockUsagePage from "./pages/StockUsagePage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />

          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />

          <Route path="/stock-receipts" element={<StockReceiptsPage />} />
          <Route
            path="/stock-receipts/:id"
            element={<StockReceiptDetailPage />}
          />

          <Route path="/branch-requests" element={<BranchRequestsPage />} />
          <Route
            path="/branch-requests/:id"
            element={<BranchRequestDetailPage />}
          />

          <Route path="/requisitions" element={<RequisitionsPage />} />
          <Route path="/requisitions/:id" element={<RequisitionDetailPage />} />

          <Route path="/stock-takes" element={<StockTakesPage />} />
          <Route path="/stock-takes/:id" element={<StockTakeDetailPage />} />

          <Route path="/reports" element={<ReportsPage />} />

          <Route path="/stock-usages" element={<StockUsagePage />} />

          <Route
            element={<ProtectedRoute roles={["SUPER_ADMIN", "BRANCH_ADMIN"]} />}
          >
            <Route path="/organization" element={<OrganizationPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={["SUPER_ADMIN"]} />}>
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/currency" element={<CurrencyPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
