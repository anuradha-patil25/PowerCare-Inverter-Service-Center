import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

const API_BASE = "http://127.0.0.1:8000/api";

const SUCCESS_STATUSES = [
  "PAID",
  "COMPLETED",
  "SUCCESS",
  "SUCCESSFUL",
];

function getList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.orders)) return data.orders;
  if (Array.isArray(data?.invoices)) return data.invoices;
  if (Array.isArray(data?.payments)) return data.payments;
  return [];
}

function getDate(record, type) {
  if (type === "orders") {
    return record.order_date || record.created_at || "";
  }

  if (type === "invoices") {
    return record.invoice_date || record.created_at || "";
  }

  return record.paid_at || record.created_at || "";
}

function isWithinRange(record, type, startDate, endDate) {
  const value = getDate(record, type);

  if (!value) return !startDate && !endDate;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return !startDate && !endDate;
  }

  if (startDate) {
    const start = new Date(`${startDate}T00:00:00`);
    if (date < start) return false;
  }

  if (endDate) {
    const end = new Date(`${endDate}T23:59:59.999`);
    if (date > end) return false;
  }

  return true;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "—";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function getStatusCounts(records) {
  const counts = {};

  records.forEach((record) => {
    const status = String(record.status || "UNKNOWN").toUpperCase();
    counts[status] = (counts[status] || 0) + 1;
  });

  return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
}
function getStatusColor(status) {
  const value = String(status || "").toUpperCase();

  if (
    ["PAID", "COMPLETED", "SUCCESS", "SUCCESSFUL", "CONFIRMED", "ACTIVE"].includes(value)
  ) {
    return "#17836C";
  }

  if (["PENDING", "PROCESSING", "INITIATED"].includes(value)) {
    return "#F59E0B";
  }

  if (["FAILED", "CANCELLED", "CANCELED", "REFUNDED"].includes(value)) {
    return "#DC2626";
  }

  return "#64748B";
}
function StatusBadge({ value }) {
  const status = String(value || "UNKNOWN").toUpperCase();

  let style = "bg-stone-100 text-stone-600";

  if (SUCCESS_STATUSES.includes(status)) {
    style = "bg-emerald-100 text-emerald-800";
  } else if (["PENDING", "PROCESSING", "INITIATED"].includes(status)) {
    style = "bg-amber-100 text-amber-800";
  } else if (
    ["FAILED", "CANCELLED", "CANCELED", "REFUNDED"].includes(status)
  ) {
    style = "bg-red-100 text-red-800";
  }

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${style}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function StatusSection({ title, records }) {
  const entries = getStatusCounts(records);

  return (
    <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="pc-title text-xl font-bold text-[#173F32]">{title}</h2>

      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-stone-500">No records available.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {entries.map(([status, count]) => (
            <div
              key={status}
              className="flex items-center justify-between gap-3 border-b border-stone-100 pb-3 last:border-0 last:pb-0"
            >
              <StatusBadge value={status} />
              <span className="pc-title text-base font-bold text-[#173F32]">{count}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function AdminReports() {
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    let active = true;

    async function loadEndpoint(path, token) {
      const response = await fetch(`${API_BASE}${path}`, {
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : {},
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("Access denied. Please log in with an Admin account.");
        }

        throw new Error(`Request failed for ${path}: HTTP ${response.status}`);
      }

      return getList(await response.json());
    }

    async function loadReports() {
      try {
        setLoading(true);
        setError("");
        setWarnings([]);

        const token = localStorage.getItem("access_token");

        const endpoints = [
          { key: "orders", path: "/orders/" },
          { key: "invoices", path: "/invoices/" },
          { key: "payments", path: "/payments/" },
        ];

        const results = await Promise.allSettled(
          endpoints.map((endpoint) => loadEndpoint(endpoint.path, token))
        );

        if (!active) return;

        const errors = [];
        let successCount = 0;

        results.forEach((result, index) => {
          const endpoint = endpoints[index];

          if (result.status === "fulfilled") {
            successCount++;

            if (endpoint.key === "orders") setOrders(result.value);
            if (endpoint.key === "invoices") setInvoices(result.value);
            if (endpoint.key === "payments") setPayments(result.value);
          } else {
            errors.push(
              `${endpoint.key.charAt(0).toUpperCase() + endpoint.key.slice(1)}: ${result.reason?.message || "Request failed"}`
            );
          }
        });

        if (successCount === 0) {
          setError(errors.join(" "));
        } else if (errors.length > 0) {
          setWarnings(errors);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load reports.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadReports();

    return () => {
      active = false;
    };
  }, []);

  const filteredOrders = useMemo(
    () =>
      orders.filter((record) =>
        isWithinRange(record, "orders", startDate, endDate)
      ),
    [orders, startDate, endDate]
  );

  const filteredInvoices = useMemo(
    () =>
      invoices.filter((record) =>
        isWithinRange(record, "invoices", startDate, endDate)
      ),
    [invoices, startDate, endDate]
  );

  const filteredPayments = useMemo(
    () =>
      payments.filter((record) =>
        isWithinRange(record, "payments", startDate, endDate)
      ),
    [payments, startDate, endDate]
  );

  const totalOrderValue = filteredOrders.reduce(
    (sum, record) => sum + (Number(record.total_amount) || 0),
    0
  );

  const totalInvoiceValue = filteredInvoices.reduce(
    (sum, record) => sum + (Number(record.total_amount) || 0),
    0
  );

  const successfulPayments = filteredPayments.filter((payment) =>
    SUCCESS_STATUSES.includes(String(payment.status || "").toUpperCase())
  );

  const successfulPaymentValue = successfulPayments.reduce(
    (sum, payment) => sum + (Number(payment.amount) || 0),
    0
  );

  const cards = [
    { label: "Total Orders", value: filteredOrders.length },
    { label: "Total Order Value", value: formatAmount(totalOrderValue) },
    { label: "Total Invoices", value: filteredInvoices.length },
    { label: "Total Invoice Value", value: formatAmount(totalInvoiceValue) },
    { label: "Payment Records", value: filteredPayments.length },
    {
      label: "Successful Payment Amount",
      value: formatAmount(successfulPaymentValue),
    },
  ];
    const orderStatusData = getStatusCounts(filteredOrders).map(
    ([status, count]) => ({
      name: status.replace(/_/g, " "),
      value: count,
    })
  );

  const paymentStatusData = getStatusCounts(filteredPayments).map(
    ([status, count]) => ({
      name: status.replace(/_/g, " "),
      value: count,
    })
  );

  const financialData = [
    {
      name: "Orders",
      amount: totalOrderValue,
    },
    {
      name: "Invoices",
      amount: totalInvoiceValue,
    },
    {
      name: "Successful Payments",
      amount: successfulPaymentValue,
    },
  ];


  function exportCsv() {
    const rows = [
      ["Report", "Metric", "Value"],
      ["Orders", "Order Count", filteredOrders.length],
      ["Orders", "Order Value", totalOrderValue.toFixed(2)],
      ["Invoices", "Invoice Count", filteredInvoices.length],
      ["Invoices", "Invoice Value", totalInvoiceValue.toFixed(2)],
      ["Payments", "Payment Record Count", filteredPayments.length],
      ["Payments", "Successful Payment Count", successfulPayments.length],
      ["Payments", "Successful Payment Amount", successfulPaymentValue.toFixed(2)],
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "PowerCare_Reports.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

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
          .pc-input { background-color: #FCFCF8; border-color: #D6D3D1; color: #292524; }
          .pc-input:focus { border-color: #059669; box-shadow: 0 0 0 2px #D1FAE5; }
          .pc-btn-light { background-color: #ffffff; color: #173E2E; }
          .pc-link { color: #12624D; }
          .pc-value { color: #12624D; }
        `}</style>

        <div className="pc-header flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-[#103F35] to-[#17836C] p-6 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="pc-eyebrow text-xs font-bold uppercase tracking-[0.2em] text-emerald-100 sm:text-sm">
              PowerCare · Administration
            </p>

            <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">
              Reports
            </h1>

            <p className="pc-sub mt-2 text-sm leading-6 text-emerald-50 sm:text-base">
              Review order activity, invoices and payment summaries.
            </p>
          </div>

          <button
            type="button"
            onClick={exportCsv}
            disabled={loading || Boolean(error)}
            className="pc-btn-light shrink-0 rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#173E2E] transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Export Summary CSV
          </button>
        </div>

        <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="pc-title mb-4 text-xl font-bold text-[#173F32]">Report Date Range</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-stone-700">
              Start Date
              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(event) => setStartDate(event.target.value)}
                className="pc-input mt-2 block w-full rounded-xl border border-stone-300 bg-[#FCFCF8] px-4 py-3 text-sm text-stone-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <label className="text-sm font-semibold text-stone-700">
              End Date
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) => setEndDate(event.target.value)}
                className="pc-input mt-2 block w-full rounded-xl border border-stone-300 bg-[#FCFCF8] px-4 py-3 text-sm text-stone-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => {
              setStartDate("");
              setEndDate("");
            }}
            className="pc-link mt-4 text-sm font-bold text-[#12624D] underline transition hover:text-[#103F35]"
          >
            Clear Date Filters
          </button>
        </section>

        {loading && (
          <p className="pc-card rounded-2xl border border-[#E3E7D8] bg-white p-10 text-center text-base text-stone-500 shadow-sm">
            Loading reports...
          </p>
        )}

        {!loading && error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
          >
            {error}
          </div>
        )}

        {!loading && !error && warnings.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            <p className="mb-2 font-bold">Some reports could not be loaded.</p>
            {warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        )}

        {!loading && !error && (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {cards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6"
                >
                  <p className="text-sm font-semibold text-stone-600">{card.label}</p>
                  <p className="pc-value mt-3 break-words text-3xl font-extrabold text-[#12624D] sm:text-4xl">
                    {card.value}
                  </p>
                </div>
              ))}
            </section>

            {/* Order and Payment Status Charts */}
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Order Status Doughnut Chart */}
              <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="pc-title text-xl font-bold">
                  Order Status
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  Distribution of current orders
                </p>

                {orderStatusData.length === 0 ? (
                  <p className="mt-6 text-sm text-stone-500">
                    No order data available.
                  </p>
                ) : (
                  <div className="mt-4 h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={orderStatusData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                        >
                          {orderStatusData.map((entry, index) => (
                            <Cell
                              key={`${entry.name}-${index}`}
                              fill={getStatusColor(entry.name)}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Payment Status Doughnut Chart */}
              <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="pc-title text-xl font-bold">
                  Payment Status
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  Successful, failed and pending payments
                </p>

                {paymentStatusData.length === 0 ? (
                  <p className="mt-6 text-sm text-stone-500">
                    No payment data available.
                  </p>
                ) : (
                  <div className="mt-4 h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentStatusData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                        >
                        {paymentStatusData.map((entry, index) => (
                          <Cell
                            key={`${entry.name}-${index}`}
                            fill={getStatusColor(entry.name)}
                         />
                        ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </section>

            {/* Financial Overview Bar Chart */}
            <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="pc-title text-xl font-bold">
                Financial Overview
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Compare order value, invoice value and successful payment
                amount.
              </p>

              <div className="mt-5 h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={financialData}
                    margin={{ top: 10, right: 20, left: 15, bottom: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#E3E7D8"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      interval={0}
                    />
                    <YAxis
                      width={75}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) =>
                        value >= 1000
                          ? `₹${(value / 1000).toFixed(0)}k`
                          : `₹${value}`
                      }
                    />
                    <Tooltip
                      formatter={(value) => [
                        formatAmount(value),
                        "Amount",
                      ]}
                    />
                    <Legend />
                    <Bar
                      dataKey="amount"
                      name="Amount (₹)"
                      fill="#17836C"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={70}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <StatusSection
                title="Order Status Summary"
                records={filteredOrders}
              />

              <StatusSection
                title="Invoice Status Summary"
                records={filteredInvoices}
              />

              <StatusSection
                title="Payment Status Summary"
                records={filteredPayments}
              />
            </section>

            <p className="text-sm leading-6 text-stone-500">
              Summary values are calculated from records returned by the current APIs.
              Successful payment totals include records whose status is PAID, COMPLETED,
              SUCCESS or SUCCESSFUL. They do not independently verify bank settlements.
            </p>
          </>
        )}
      </div>
    </main>
  );
}