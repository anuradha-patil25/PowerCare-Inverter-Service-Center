
import { NavLink, Outlet, useNavigate } from "react-router-dom";

const menuItems = [
  {
    label: "Dashboard",
    path: "/staff/dashboard",
    icon: "▦",
  },
  {
    label: "Customers & Serial Lookup",
    path: "/staff/customers-serial-lookup",
    icon: "⌕",
  },
  {
    label: "Service Jobs",
    path: "/staff/jobs",
    icon: "⚒",
  },
  {
    label: "Battery Health Reports",
    path: "/staff/battery-reports",
    icon: "ϟ",
  },
  {
    label: "Products & Warranties",
    path: "/staff/products-warranties",
    icon: "◇",
  },
  {
    label: "Invoices & Payments",
    path: "/staff/invoices-payments",
    icon: "₹",
  },
  {
    label: "Search, History & Notifications",
    path: "/staff/search-history-notifications",
    icon: "⌕",
  },
];

export default function StaffLayout() {
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("current_user");
    navigate("/login");
  }

  const navLinkClass = ({ isActive }) =>
    `flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
      isActive
        ? "bg-[#00A86B] text-white shadow-sm"
        : "text-teal-50 hover:bg-white/10"
    }`;

  return (
    <div className="min-h-screen bg-[#F3FAF8] md:flex">
      <aside className="w-full shrink-0 bg-[#064E4F] text-white md:sticky md:top-0 md:flex md:h-screen md:w-64 md:flex-col">
        <div className="border-b border-white/10 px-5 py-5">
          <img
            src="/powercare-logo.png"
            alt="PowerCare Inverter Service Center"
            className="mb-4 h-12 w-auto max-w-full object-contain object-left"
          />

          <h1 className="text-xl font-bold">Inverter Service Center</h1>
          <p className="mt-1 text-sm text-teal-100">
            Staff Workspace
          </p>
        </div>

        <nav
          aria-label="Staff navigation"
          className="flex gap-2 overflow-x-auto p-3 md:flex-1 md:flex-col md:overflow-y-auto"
        >
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/staff/dashboard"}
              className={navLinkClass}
            >
              <span
                className="w-5 shrink-0 text-center text-lg"
                aria-hidden="true"
              >
                {item.icon}
              </span>

              <span className="leading-tight">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <button
            type="button"
            onClick={logout}
            className="w-full rounded-xl border border-white/20 px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-white/10"
          >
            ↪ Log out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-teal-100 bg-white px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-teal-700">
              POWERCARE
            </p>

            <p className="mt-1 text-sm font-semibold text-stone-800">
              Inverter Service Center · Staff Workspace
            </p>
          </div>


        </header>

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
