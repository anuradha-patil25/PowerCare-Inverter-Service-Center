import { useEffect, useMemo, useState } from "react";

const API_BASE = "http://127.0.0.1:8000/api";
const MEDIA_BASE = "http://127.0.0.1:8000";

const getHealth = (report) =>
  String(
    report.health_status ||
      report.battery_health ||
      report.status ||
      ""
  )
    .trim()
    .toUpperCase();

const getCustomerName = (report) => {
  const customer =
    report.customer_name ||
    report.customer?.customer_name ||
    report.customer?.name ||
    report.customer;

  if (typeof customer === "string" || typeof customer === "number") {
    return String(customer);
  }

  return "—";
};

const getJobId = (report) =>
  report.job_id ?? report.job?.job_id ?? report.job ?? "—";

const getVoltage = (report) =>
  report.battery_voltage ?? report.voltage ?? "—";

const getFileUrl = (file) => {
  if (!file) return "";

  const url = String(file);

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `${MEDIA_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
};

export default function AdminBatteryHealthReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [healthFilter, setHealthFilter] = useState("ALL");

  useEffect(() => {
    let active = true;

    async function loadReports() {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("access_token");

        const response = await fetch(
          `${API_BASE}/admin/battery-health-reports/`,
          {
            headers: token
              ? { Authorization: `Bearer ${token}` }
              : {},
          }
        );

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new Error(
              "Access denied. Please log in with an Admin account."
            );
          }

          throw new Error(
            `Unable to load reports. HTTP status: ${response.status}`
          );
        }

        const data = await response.json();

        let list = [];

        if (Array.isArray(data)) {
          list = data;
        } else if (Array.isArray(data.results)) {
          list = data.results;
        } else if (Array.isArray(data.reports)) {
          list = data.reports;
        } else if (Array.isArray(data.data)) {
          list = data.data;
        } else {
          throw new Error(
            "Invalid API response format. Please check the backend response."
          );
        }

        if (active) {
          setReports(list);
        }
      } catch (err) {
        if (active) {
          setError(
            err.message || "An error occurred while loading reports."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadReports();

    return () => {
      active = false;
    };
  }, []);

  const countHealth = (status) =>
    reports.filter((report) => getHealth(report) === status).length;

  const cards = [
    { label: "Total Reports", value: reports.length },
    { label: "Good", value: countHealth("GOOD") },
    { label: "Fair", value: countHealth("FAIR") },
    { label: "Poor", value: countHealth("POOR") },
    {
      label: "Needs Replacement",
      value: countHealth("NEEDS REPLACEMENT"),
    },
  ];

  const filteredReports = useMemo(() => {
    const term = search.trim().toLowerCase();

    return reports.filter((report) => {
      const searchableText = [
        getJobId(report),
        getCustomerName(report),
        getVoltage(report),
        report.remarks || "",
        report.serial_number || "",
        report.product_name || "",
        report.brand || "",
        report.model || "",
        report.technician_name || "",
        report.file_name || "",
        getHealth(report),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableText.includes(term);

      const health = getHealth(report);
      const matchesHealth =
        healthFilter === "ALL" || health === healthFilter;

      return matchesSearch && matchesHealth;
    });
  }, [reports, search, healthFilter]);

  return (
    <main className="pc-page min-h-screen bg-[#F7F7F0] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <style>{`
          .pc-page { background-color: #F7F7F0; }
          .pc-header { background-image: linear-gradient(to right, #103F35, #17836C); color: #ffffff; }
          .pc-header .pc-eyebrow { color: #D1FAE5; }
          .pc-header .pc-sub { color: #ECFDF5; }
          .pc-card { background-color: #ffffff; border-color: #E3E7D8; }
          .pc-title { color: #173F32; }
          .pc-thead { background-color: #F2F7F2; color: #285B46; }
          .pc-row:hover { background-color: #F8FAF5; }
          .pc-input { background-color: #FCFCF8; border-color: #D6D3D1; color: #292524; }
          .pc-input:focus { border-color: #059669; box-shadow: 0 0 0 2px #D1FAE5; }
          .pc-link { color: #12624D; }
          .pc-value { color: #12624D; }
        `}</style>

        <div className="pc-header rounded-3xl bg-gradient-to-r from-[#103F35] to-[#17836C] p-6 text-white shadow-lg sm:p-8">
          <p className="pc-eyebrow text-xs font-bold uppercase tracking-[0.2em] text-emerald-100 sm:text-sm">
            PowerCare · Administration
          </p>

          <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">
            Battery Health Reports
          </h1>

          <p className="pc-sub mt-2 text-sm leading-6 text-emerald-50 sm:text-base">
            View and search battery inspection reports uploaded by staff.
          </p>
        </div>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6"
            >
              <p className="text-sm font-semibold text-stone-600">
                {card.label}
              </p>

              <p className="pc-value mt-3 text-4xl font-extrabold text-[#12624D]">
                {loading ? "—" : card.value}
              </p>
            </div>
          ))}
        </section>

        <section className="pc-card overflow-hidden rounded-2xl border border-[#E3E7D8] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-stone-100 p-5 sm:p-6 md:flex-row">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search job, customer, voltage or remarks..."
              className="pc-input min-w-0 flex-1 rounded-xl border border-stone-300 bg-[#FCFCF8] px-4 py-3 text-base text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />

            <select
              value={healthFilter}
              onChange={(e) => setHealthFilter(e.target.value)}
              className="pc-input rounded-xl border border-stone-300 bg-[#FCFCF8] px-4 py-3 text-base text-stone-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="ALL">All Health Statuses</option>
              <option value="GOOD">Good</option>
              <option value="FAIR">Fair</option>
              <option value="POOR">Poor</option>
              <option value="NEEDS REPLACEMENT">
                Needs Replacement
              </option>
            </select>
          </div>

          {loading && (
            <p className="p-10 text-center text-base text-stone-500">
              Loading battery reports...
            </p>
          )}

          {!loading && error && (
            <div
              role="alert"
              className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800 sm:m-6"
            >
              {error}
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left text-sm">
                  <thead className="pc-thead bg-[#F2F7F2] text-xs uppercase tracking-wide text-[#285B46] sm:text-sm">
                    <tr>
                      <th className="px-5 py-4 font-bold">Job ID</th>
                      <th className="px-5 py-4 font-bold">Customer</th>
                      <th className="px-5 py-4 font-bold">Product</th>
                      <th className="px-5 py-4 font-bold">Battery Health</th>
                      <th className="px-5 py-4 font-bold">Voltage</th>
                      <th className="px-5 py-4 font-bold">Remarks</th>
                      <th className="px-5 py-4 font-bold">Report</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-stone-100">
                    {filteredReports.map((report, index) => {
                      const health = getHealth(report);
                      const file = getFileUrl(report.file_url);
                      const voltage = getVoltage(report);
                      const customer = getCustomerName(report);
                      const jobId = getJobId(report);

                      const healthStyle = {
                        GOOD: "bg-emerald-100 text-emerald-800",
                        FAIR: "bg-amber-100 text-amber-800",
                        POOR: "bg-red-100 text-red-800",
                        "NEEDS REPLACEMENT":
                          "bg-orange-100 text-orange-800",
                      };

                      const productName = [
                        report.brand,
                        report.model || report.product_name,
                      ]
                        .filter(Boolean)
                        .join(" ");

                      return (
                        <tr
                          key={report.report_id ?? index}
                          className="pc-row transition hover:bg-[#F8FAF5]"
                        >
                          <td className="px-5 py-4 font-semibold text-stone-600">
                            #{jobId}
                          </td>

                          <td className="pc-title px-5 py-4 font-bold text-[#173F32]">
                            {customer}
                          </td>

                          <td className="px-5 py-4 text-stone-600">
                            {productName || "—"}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                                healthStyle[health] ||
                                "bg-stone-100 text-stone-600"
                              }`}
                            >
                              {health || "—"}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-stone-600">
                            {voltage === "—"
                              ? "—"
                              : `${voltage}${typeof voltage === "number" ? " V" : ""}`}
                          </td>

                          <td className="max-w-xs whitespace-normal px-5 py-4 text-stone-600">
                            {report.remarks || "—"}
                          </td>

                          <td className="px-5 py-4">
                            {file ? (
                              <a
                                href={file}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="pc-link font-bold text-[#12624D] underline transition hover:text-[#103F35]"
                              >
                                {report.file_name || "View file"}
                              </a>
                            ) : (
                              <span className="text-stone-400">
                                No file
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {filteredReports.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="p-10 text-center text-base text-stone-500"
                        >
                          No battery reports found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-stone-100 px-5 py-4 text-sm text-stone-500">
                Showing {filteredReports.length} of {reports.length} reports
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}