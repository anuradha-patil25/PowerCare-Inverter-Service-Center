
import { NavLink, Outlet, Navigate, useNavigate } from "react-router-dom";

const menuItems = [
  { label: "Dashboard", path: "/admin/dashboard", icon: "▦" },
  { label: "Customers", path: "/admin/customers", icon: "♙" },
  { label: "Users & Roles", path: "/admin/users-roles", icon: "🔐" },
  { label: "Technicians", path: "/admin/technicians", icon: "⚙" },
  { label: "Products", path: "/admin/products", icon: "▣" },
  { label: "Serial Numbers", path: "/admin/serial-numbers", icon: "🏷" },
  { label: "Warranties", path: "/admin/warranties", icon: "🛡" },
  { label: "Service Jobs", path: "/admin/service-jobs", icon: "🛠" },
  {
    label: "Battery Health Reports",
    path: "/admin/battery-health-reports",
    icon: "▤",
  },
  { label: "Orders", path: "/admin/orders", icon: "📦" },
  {
    label: "Invoices & Payments",
    path: "/admin/invoices-payments",
    icon: "₹",
  },
  { label: "Reports", path: "/admin/reports", icon: "▥" },
  { label: "Notifications", path: "/admin/notifications", icon: "♧" },
  { label: "Audit Log", path: "/admin/audit-log", icon: "▤" },
  { label: "Settings", path: "/admin/settings", icon: "⚙" },
];

export default function AdminLayout() {
  const navigate = useNavigate();

  let user = {};

  try {
    user = JSON.parse(localStorage.getItem("current_user") || "{}");
  } catch {
    user = {};
  }

  const token = localStorage.getItem("access_token");
  const role = String(user.role || "").toLowerCase();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role !== "admin") {
    if (role === "staff") {
      return <Navigate to="/staff/dashboard" replace />;
    }

    if (role === "customer") {
      return <Navigate to="/customer/dashboard" replace />;
    }

    return <Navigate to="/login" replace />;
  }

  function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("current_user");
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#F3FAF8] lg:flex">
      {/* Admin Sidebar */}
      <aside
        className="
          w-full shrink-0 bg-[#064E4F] p-4 text-white
          sm:p-5
          lg:fixed lg:inset-y-0 lg:left-0
          lg:flex lg:w-[300px] lg:flex-col
          lg:overflow-y-auto lg:px-5 lg:py-6
        "
      >
        {/* Logo and heading */}
        <div className="mb-6 flex shrink-0 flex-col items-center border-b border-white/20 px-2 pb-6 text-center">
          <img
            src="/powercare-logo.png"
            alt="PowerCare Inverter Service Center"
            className="mb-4 h-auto w-full max-w-[175px] object-contain"
          />

          <h1 className="text-base font-bold leading-7 tracking-wide">
            INVERTER SERVICE CENTER
          </h1>

          <p className="mt-1 text-sm font-semibold tracking-widest text-teal-200">
            ADMIN PANEL
          </p>
        </div>

        {/* Menu: all items displayed directly */}
        <nav className="flex flex-col gap-2">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end
              className={({ isActive }) =>
                `flex min-h-[46px] items-center gap-3 rounded-xl px-4 py-3 text-[15px] transition-colors ${
                  isActive
                    ? "bg-[#20A69E] font-bold text-white shadow-sm"
                    : "font-medium text-teal-50 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <span className="w-7 shrink-0 text-center text-lg">
                {item.icon}
              </span>

              <span className="leading-6">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <button
          type="button"
          onClick={logout}
          className="mt-6 flex min-h-[46px] w-full shrink-0 items-center gap-3 rounded-xl border border-white/20 px-4 py-3 text-left text-[15px] font-semibold text-white transition hover:bg-white/10 lg:mt-auto lg:mb-2"
        >
          <span className="w-7 text-center text-lg">↪</span>
          Logout
        </button>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:ml-[300px] lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
