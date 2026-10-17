
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

const API_BASE = "http://127.0.0.1:8000/api";

const managementItems = [
  { title: "Customers", description: "View and search registered customers.", path: "/admin/customers", icon: "👥", colors: "from-emerald-500 to-teal-700", soft: "bg-emerald-50" },
  { title: "Users & Roles", description: "Access user accounts and role management.", path: "/admin/users-roles", icon: "🔐", colors: "from-violet-500 to-purple-700", soft: "bg-violet-50" },
  { title: "Technicians", description: "Access technician management.", path: "/admin/technicians", icon: "🧑‍🔧", colors: "from-orange-400 to-rose-600", soft: "bg-orange-50" },
  { title: "Products", description: "Manage inverter and battery products.", path: "/admin/products", icon: "🔋", colors: "from-lime-500 to-green-700", soft: "bg-lime-50" },
  { title: "Serial Numbers", description: "Access product serial number records.", path: "/admin/serial-numbers", icon: "🏷️", colors: "from-sky-500 to-blue-700", soft: "bg-sky-50" },
  { title: "Warranties", description: "Access warranty records.", path: "/admin/warranties", icon: "🛡️", colors: "from-amber-400 to-orange-600", soft: "bg-amber-50" },
  { title: "Service Jobs", description: "Review and manage service work.", path: "/admin/service-jobs", icon: "🛠️", colors: "from-cyan-500 to-teal-700", soft: "bg-cyan-50" },
  { title: "Battery Health Reports", description: "Access battery inspection reports.", path: "/admin/battery-health-reports", icon: "📋", colors: "from-rose-400 to-pink-700", soft: "bg-rose-50" },
  { title: "Invoices & Payments", description: "Access billing and payment records.", path: "/admin/invoices-payments", icon: "🧾", colors: "from-yellow-500 to-amber-700", soft: "bg-yellow-50" },
  { title: "Orders", description: "Access customer order management.", path: "/admin/orders", icon: "📦", colors: "from-indigo-500 to-blue-800", soft: "bg-indigo-50" },
  { title: "Reports", description: "Access business reporting.", path: "/admin/reports", icon: "📊", colors: "from-fuchsia-500 to-purple-700", soft: "bg-fuchsia-50" },
  { title: "Notifications", description: "Access notification management.", path: "/admin/notifications", icon: "🔔", colors: "from-red-400 to-rose-700", soft: "bg-red-50" },
];

function getCount(data) {
  if (Array.isArray(data)) return data.length;
  if (Array.isArray(data?.results)) return data.results.length;
  if (typeof data?.count === "number") return data.count;
  return null;
}

export default function AdminDashboard() {
  const [customerCount, setCustomerCount] = useState(null);
  const [jobCount, setJobCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const user = JSON.parse(localStorage.getItem("current_user") || "{}");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      const token = localStorage.getItem("access_token");

      if (!token) {
        setError("Please log in to view dashboard information.");
        setLoading(false);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      try {
        const [customersResponse, jobsResponse] = await Promise.all([
          fetch(`${API_BASE}/customers/`, { headers }),
          fetch(`${API_BASE}/staff/jobs/`, { headers }),
        ]);

        if (!customersResponse.ok || !jobsResponse.ok) {
          throw new Error(
            "Dashboard data could not be loaded. Check your login permissions and API endpoints."
          );
        }

        const customersData = await customersResponse.json();
        const jobsData = await jobsResponse.json();

        if (!cancelled) {
          setCustomerCount(getCount(customersData));
          setJobCount(getCount(jobsData));
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load dashboard information.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("current_user");
    window.location.href = "/login";
  }

  const summaryCards = [
    {
      title: "Total Customers",
      value: customerCount,
      icon: "👥",
      note: "Registered customer records",
      path: "/admin/customers",
      gradient: "from-emerald-500 via-teal-600 to-green-800",
    },
    {
      title: "Service Jobs",
      value: jobCount,
      icon: "🛠️",
      note: "Available job records",
      path: "/admin/service-jobs",
      gradient: "from-violet-500 via-purple-600 to-indigo-800",
    },
    {
      title: "Management Areas",
      value: managementItems.length,
      icon: "✦",
      note: "Dashboard navigation sections",
      path: "/admin/customers",
      gradient: "from-orange-400 via-rose-500 to-pink-700",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F7F7F0] p-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />

      <div className="relative mx-auto max-w-7xl space-y-8">

        {/* Compact welcome header: reduced width and height */}
        <header className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-[#103F35] via-[#12624D] to-[#17836C] p-6 text-white shadow-xl sm:p-7 lg:p-8">
          <div className="pointer-events-none absolute -right-8 -top-16 h-48 w-48 rounded-full border-[24px] border-white/5" />
          <div className="pointer-events-none absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-lime-300/10 blur-2xl" />

          <div className="relative max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold tracking-wide text-emerald-100">
              <span className="h-2 w-2 rounded-full bg-lime-300" />
              POWERCARE · ADMINISTRATION
            </div>

            <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
              Welcome back,
              <span className="block text-[#E4F5A5]">
                {user.username || "Admin"}!
              </span>
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50 sm:text-base sm:leading-7">
              Your service center at a glance. Manage customers, products and
              service operations from one workspace.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/admin/customers"
                className="rounded-xl bg-[#E4F5A5] px-5 py-3 text-sm font-bold text-[#173E2E] shadow-sm transition hover:-translate-y-0.5 hover:bg-white sm:text-base"
              >
                View Customers <span className="ml-1">↗</span>
              </Link>

              <Link
                to="/admin/service-jobs"
                className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20 sm:text-base"
              >
                Service Workspace
              </Link>
            </div>
          </div>

          <div className="relative mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-4">
            <p className="text-xs font-semibold tracking-wide text-emerald-100 sm:text-sm">
              INVERTER SERVICE CENTER
            </p>

            <button
              type="button"
              onClick={logout}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10 hover:text-white"
            >
              ↪ Log out
            </button>
          </div>
        </header>

        {/* Summary cards */}
        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {summaryCards.map((card) => (
            <Link
              key={card.title}
              to={card.path}
              className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${card.gradient} p-6 text-white shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl`}
            >
              <div className="pointer-events-none absolute -right-7 -top-8 h-32 w-32 rounded-full border-[18px] border-white/10 transition duration-300 group-hover:scale-110" />

              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white/90 sm:text-base">
                    {card.title}
                  </p>
                  <p className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
                    {loading && card.value === null
                      ? "..."
                      : card.value ?? "—"}
                  </p>
                </div>

                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-2xl ring-1 ring-white/15">
                  {card.icon}
                </span>
              </div>

              <div className="relative mt-5 flex items-center justify-between border-t border-white/20 pt-4">
                <p className="text-xs text-white/90 sm:text-sm">{card.note}</p>
                <span className="text-lg transition group-hover:translate-x-1">→</span>
              </div>
            </Link>
          ))}
        </section>

        {error && (
          <div
            role="status"
            className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950 shadow-sm sm:text-base"
          >
            <p className="font-bold">Dashboard information</p>
            <p className="mt-2">{error}</p>
          </div>
        )}

        {/* Management sections */}
        <section>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700 sm:text-sm">
                YOUR WORKSPACE
              </p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#173F32] sm:text-3xl">
                Management Center
              </h2>
              <p className="mt-2 text-sm leading-6 text-stone-600 sm:text-base">
                Choose an area to continue your work.
              </p>
            </div>

            <span className="rounded-full border border-emerald-200 bg-white/80 px-4 py-2 text-xs font-bold text-emerald-800 sm:text-sm">
              {managementItems.length} sections
            </span>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {managementItems.map((item) => (
              <Link
                key={item.title}
                to={item.path}
                className="group overflow-hidden rounded-2xl border border-[#E6E8D9] bg-white/95 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl"
              >
                <div className={`h-1.5 bg-gradient-to-r ${item.colors}`} />

                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl ${item.soft} text-2xl transition duration-300 group-hover:scale-105 sm:h-16 sm:w-16 sm:text-3xl`}
                    >
                      {item.icon}
                    </span>

                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F6F7F0] text-lg text-[#285B46] transition group-hover:bg-[#173F32] group-hover:text-white">
                      ↗
                    </span>
                  </div>

                  <h3 className="mt-4 text-lg font-bold leading-snug text-[#243F32] sm:text-xl">
                    {item.title}
                  </h3>

                  <p className="mt-2 min-h-12 text-sm leading-6 text-stone-600 sm:text-base sm:leading-7">
                    {item.description}
                  </p>

                  <div className="mt-4 flex items-center gap-2 border-t border-stone-100 pt-4 text-sm font-bold text-emerald-800 sm:text-base">
                    Open section
                    <span className="transition group-hover:translate-x-1">→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E3E7D8] bg-white/80 px-5 py-4 sm:px-6 sm:py-5">
          <div>
            <p className="text-sm font-bold text-[#173F32] sm:text-base">
              PowerCare Inverter Service Center
            </p>
            <p className="mt-1 text-xs text-stone-500 sm:text-sm">
              Service management workspace
            </p>
          </div>

          <p className="text-xs text-stone-500 sm:text-sm">
            Some management pages are still under development.
          </p>
        </footer>
      </div>
    </div>
  );
}
