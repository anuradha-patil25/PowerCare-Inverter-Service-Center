
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import Layout from "./components/Layout";
import StaffLayout from "./components/StaffLayout";
import AdminLayout from "./components/AdminLayout";

import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetails from "./pages/ProductDetails";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CustomerDashboard from "./pages/CustomerDashboard";

import StaffDashboard from "./pages/StaffDashboard";
import StaffJobs from "./pages/StaffJobs";
import StaffCustomersSerialLookup from "./pages/StaffCustomersSerialLookup";
import StaffBatteryReports from "./pages/StaffBatteryReports";
import StaffProductsWarranties from "./pages/StaffProductsWarranties";
import StaffInvoicesPayments from "./pages/StaffInvoicesPayments";
import StaffSearchHistoryNotifications from "./pages/StaffSearchHistoryNotifications";

import Services from "./pages/Services";
import Warranty from "./pages/Warranty";

import AdminDashboard from "./pages/AdminDashboard";
import AdminCustomers from "./pages/AdminCustomers";
import AdminTechnicians from "./pages/AdminTechnicians";
import AdminUsersRoles from "./pages/AdminUsersRoles";
import AdminProducts from "./pages/AdminProducts";
import AdminSerialNumbers from "./pages/AdminSerialNumbers";
import AdminWarranties from "./pages/AdminWarranties";
import AdminServiceJobs from "./pages/AdminServiceJobs";
import AdminBatteryHealthReports from "./pages/AdminBatteryHealthReports";
import AdminOrders from "./pages/AdminOrders";
import AdminInvoicesPayments from "./pages/AdminInvoicesPayments";
import AdminReports from "./pages/AdminReports";
import AdminNotifications from "./pages/AdminNotifications";
import AdminAuditLog from "./pages/AdminAuditLog";
import AdminSettings from "./pages/AdminSettings";

import SessionTimeout from "./components/SessionTimeout";

// Protect pages that require login.
// Session timeout applies only to protected pages,
// not to the public Home, Products, Services, or Login pages.
function RequireAuth({ children }) {
  const location = useLocation();
  const token = localStorage.getItem("access_token");

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  return <SessionTimeout>{children}</SessionTimeout>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Customer Website */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route
            path="/products/:id"
            element={<ProductDetails />}
          />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/services" element={<Services />} />
          <Route path="/warranty" element={<Warranty />} />

          {/* Customer Dashboard */}
          <Route
            path="/customer/dashboard"
            element={
              <RequireAuth>
                <CustomerDashboard />
              </RequireAuth>
            }
          />
        </Route>

        {/* Login and Registration */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Staff Workspace */}
        <Route element={<StaffLayout />}>
          <Route
            path="/staff/dashboard"
            element={
              <RequireAuth>
                <StaffDashboard />
              </RequireAuth>
            }
          />

          <Route
            path="/staff/customers-serial-lookup"
            element={
              <RequireAuth>
                <StaffCustomersSerialLookup />
              </RequireAuth>
            }
          />

          <Route
            path="/staff/jobs"
            element={
              <RequireAuth>
                <StaffJobs />
              </RequireAuth>
            }
          />

          <Route
            path="/staff/battery-reports"
            element={
              <RequireAuth>
                <StaffBatteryReports />
              </RequireAuth>
            }
          />

          <Route
            path="/staff/products-warranties"
            element={
              <RequireAuth>
                <StaffProductsWarranties />
              </RequireAuth>
            }
          />

          <Route
            path="/staff/invoices-payments"
            element={
              <RequireAuth>
                <StaffInvoicesPayments />
              </RequireAuth>
            }
          />

          <Route
            path="/staff/search-history-notifications"
            element={
              <RequireAuth>
                <StaffSearchHistoryNotifications />
              </RequireAuth>
            }
          />
        </Route>

        {/* Admin Workspace */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route
            path="dashboard"
            element={
              <RequireAuth>
                <AdminDashboard />
              </RequireAuth>
            }
          />

          <Route
            path="customers"
            element={
              <RequireAuth>
                <AdminCustomers />
              </RequireAuth>
            }
          />

          <Route
            path="users-roles"
            element={
              <RequireAuth>
                <AdminUsersRoles />
              </RequireAuth>
            }
          />

          <Route
            path="technicians"
            element={
              <RequireAuth>
                <AdminTechnicians />
              </RequireAuth>
            }
          />

          <Route
            path="products"
            element={
              <RequireAuth>
                <AdminProducts />
              </RequireAuth>
            }
          />

          <Route
            path="serial-numbers"
            element={
              <RequireAuth>
                <AdminSerialNumbers />
              </RequireAuth>
            }
          />

          <Route
            path="warranties"
            element={
              <RequireAuth>
                <AdminWarranties />
              </RequireAuth>
            }
          />

          <Route
            path="service-jobs"
            element={
              <RequireAuth>
                <AdminServiceJobs />
              </RequireAuth>
            }
          />

          <Route
            path="battery-health-reports"
            element={
              <RequireAuth>
                <AdminBatteryHealthReports />
              </RequireAuth>
            }
          />

          <Route
            path="orders"
            element={
              <RequireAuth>
                <AdminOrders />
              </RequireAuth>
            }
          />

          <Route
            path="invoices-payments"
            element={
              <RequireAuth>
                <AdminInvoicesPayments />
              </RequireAuth>
            }
          />

          <Route
            path="reports"
            element={
              <RequireAuth>
                <AdminReports />
              </RequireAuth>
            }
          />

          <Route
            path="notifications"
            element={
              <RequireAuth>
                <AdminNotifications />
              </RequireAuth>
            }
          />

          <Route
            path="audit-log"
            element={
              <RequireAuth>
                <AdminAuditLog />
              </RequireAuth>
            }
          />

          <Route
            path="settings"
            element={
              <RequireAuth>
                <AdminSettings />
              </RequireAuth>
            }
          />
        </Route>

        {/* Unknown URL */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
