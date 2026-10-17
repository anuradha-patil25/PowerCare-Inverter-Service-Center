import { useEffect, useMemo, useState } from "react";

const API_BASE = "http://127.0.0.1:8000/api";

function getList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.invoices)) return data.invoices;
  if (Array.isArray(data?.payments)) return data.payments;
  return [];
}

function getId(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "object") {
    return (
      value.invoice_id ??
      value.payment_id ??
      value.order_id ??
      value.job_id ??
      value.customer_id ??
      value.id ??
      "—"
    );
  }

  return value;
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

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAmount(value, currency = "INR") {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "—";

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency || "INR"} ${amount.toFixed(2)}`;
  }
}

function StatusBadge({ value }) {
  const status = String(value || "UNKNOWN").toUpperCase();

  let style = "bg-stone-100 text-stone-600";

  if (
    ["PAID", "COMPLETED", "SUCCESS", "SUCCESSFUL", "ISSUED"].includes(
      status
    )
  ) {
    style = "bg-emerald-100 text-emerald-800";
  } else if (
    ["PENDING", "INITIATED", "CREATED", "DRAFT", "PROCESSING"].includes(
      status
    )
  ) {
    style = "bg-amber-100 text-amber-800";
  } else if (
    ["FAILED", "CANCELLED", "CANCELED", "VOID", "REFUNDED"].includes(
      status
    )
  ) {
    style = "bg-red-100 text-red-800";
  } else if (
    ["PARTIAL", "PARTIALLY_PAID", "IN_PROGRESS"].includes(status)
  ) {
    style = "bg-teal-100 text-teal-800";
  }

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${style}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function AdminInvoicesPayments() {
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [activeTab, setActiveTab] = useState("INVOICES");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentWarning, setPaymentWarning] = useState("");

  useEffect(() => {
    let active = true;

    async function requestList(path, token) {
      const response = await fetch(`${API_BASE}${path}`, {
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : {},
      });

      if (!response.ok) {
        const message =
          response.status === 401 || response.status === 403
            ? "Access denied. Please log in with an Admin account."
            : `API request failed: HTTP ${response.status}`;

        throw new Error(message);
      }

      return getList(await response.json());
    }

    async function loadData() {
      try {
        setLoading(true);
        setError("");
        setPaymentWarning("");

        const token = localStorage.getItem("access_token");

        const invoiceData = await requestList("/invoices/", token);

        let paymentData = [];

        try {
          paymentData = await requestList("/payments/", token);
        } catch (err) {
          if (!active) return;

          setPaymentWarning(
            `Failed to load payments: ${err.message}`
          );
        }

        if (active) {
          setInvoices(invoiceData);
          setPayments(paymentData);
        }
      } catch (err) {
        if (active) {
          setError(
            err.message || "Failed to load invoice and payment data."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  const currentRecords =
    activeTab === "INVOICES" ? invoices : payments;

  const statusOptions = useMemo(
    () =>
      [
        ...new Set(
          currentRecords.map((record) =>
            String(record.status || "UNKNOWN").toUpperCase()
          )
        ),
      ].sort(),
    [currentRecords]
  );

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase();

    return currentRecords.filter((record) => {
      const recordStatus = String(
        record.status || "UNKNOWN"
      ).toUpperCase();

      const searchableFields =
        activeTab === "INVOICES"
          ? [
              record.invoice_id,
              getId(record.job),
              record.amount,
              record.tax_amount,
              record.total_amount,
              record.payment_status,
              record.payment_method,
              record.status,
              record.invoice_date,
            ]
          : [
              record.payment_id,
              getId(record.order),
              getId(record.invoice),
              getId(record.customer),
              record.amount,
              record.currency,
              record.payment_method,
              record.status,
              record.transaction_id,
              record.gateway_order_id,
              record.gateway_payment_id,
              record.paid_at,
            ];

      const matchesSearch = searchableFields
        .map((value) => {
          if (value && typeof value === "object") {
            return Object.values(value).join(" ");
          }

          return value ?? "";
        })
        .join(" ")
        .toLowerCase()
        .includes(term);

      const matchesStatus =
        statusFilter === "ALL" || recordStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [currentRecords, activeTab, search, statusFilter]);

  const totalInvoiceValue = invoices.reduce(
    (sum, invoice) => sum + (Number(invoice.total_amount) || 0),
    0
  );

  const paidPayments = payments.filter((payment) =>
    ["PAID", "COMPLETED", "SUCCESS", "SUCCESSFUL"].includes(
      String(payment.status || "").toUpperCase()
    )
  ).length;

  const cards = [
    {
      label: "Total Invoices",
      value: invoices.length,
    },
    {
      label: "Total Invoice Value",
      value: formatAmount(totalInvoiceValue),
    },
    {
      label: "Payment Records",
      value: payments.length,
    },
    {
      label: "Successful Payments",
      value: paidPayments,
    },
  ];

  return (
    <main className="pc-page min-h-screen bg-[#F7F7F0] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <style>{`
          .pc-page { background-color: #F7F7F0; }
          .pc-header { background-image: linear-gradient(to right, #103F35, #17836C); color: #ffffff; }
          .pc-header .pc-eyebrow { color: #D1FAE5; }
          .pc-header .pc-sub { color: #ECFDF5; }
          .pc-card { background-color: #ffffff; border-color: #E3E7D8; }
          .pc-thead { background-color: #F2F7F2; color: #285B46; }
          .pc-title { color: #173F32; }
          .pc-row:hover { background-color: #F8FAF5; }
          .pc-input { background-color: #FCFCF8; border-color: #D6D3D1; color: #292524; }
          .pc-input:focus { border-color: #059669; box-shadow: 0 0 0 2px #D1FAE5; }
          .pc-btn-primary { background-color: #12624D; color: #ffffff; }
          .pc-value { color: #12624D; }
        `}</style>

        <div className="pc-header rounded-3xl bg-gradient-to-r from-[#103F35] to-[#17836C] p-6 text-white shadow-lg sm:p-8">
          <p className="pc-eyebrow text-xs font-bold uppercase tracking-[0.2em] text-emerald-100 sm:text-sm">
            PowerCare · Administration
          </p>

          <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">
            Invoices &amp; Payments
          </h1>

          <p className="pc-sub mt-2 text-sm leading-6 text-emerald-50 sm:text-base">
            View invoice records, payment methods, transaction references and statuses.
          </p>
        </div>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6"
            >
              <p className="text-sm font-semibold text-stone-600">
                {card.label}
              </p>

              <p className="pc-value mt-3 break-words text-3xl font-extrabold text-[#12624D] sm:text-4xl">
                {loading ? "—" : card.value}
              </p>
            </div>
          ))}
        </section>

        <section className="pc-card overflow-hidden rounded-2xl border border-[#E3E7D8] bg-white shadow-sm">
          <div className="flex flex-wrap gap-3 border-b border-stone-100 p-5 sm:p-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab("INVOICES");
                setStatusFilter("ALL");
                setSearch("");
              }}
              className={`rounded-xl px-5 py-3 text-sm font-bold transition ${
                activeTab === "INVOICES"
                  ? "pc-btn-primary bg-[#12624D] text-white hover:bg-[#103F35]"
                  : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
              }`}
            >
              Invoices ({invoices.length})
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("PAYMENTS");
                setStatusFilter("ALL");
                setSearch("");
              }}
              className={`rounded-xl px-5 py-3 text-sm font-bold transition ${
                activeTab === "PAYMENTS"
                  ? "pc-btn-primary bg-[#12624D] text-white hover:bg-[#103F35]"
                  : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
              }`}
            >
              Payments ({payments.length})
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 border-b border-stone-100 p-5 sm:p-6 md:grid-cols-2">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                activeTab === "INVOICES"
                  ? "Search invoice ID, job ID, amount or status..."
                  : "Search payment, order, invoice or transaction ID..."
              }
              className="pc-input min-w-0 rounded-xl border border-stone-300 bg-[#FCFCF8] px-4 py-3 text-base text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="pc-input rounded-xl border border-stone-300 bg-[#FCFCF8] px-4 py-3 text-base text-stone-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="ALL">All Statuses</option>

              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          {loading && (
            <p className="p-10 text-center text-base text-stone-500">
              Loading invoices and payments...
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

          {!loading && !error && paymentWarning && (
            <div
              role="alert"
              className="m-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800 sm:m-6"
            >
              {paymentWarning}
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="overflow-x-auto">
                {activeTab === "INVOICES" ? (
                  <table className="w-full min-w-[1050px] text-left text-sm">
                    <thead className="pc-thead bg-[#F2F7F2] text-xs uppercase tracking-wide text-[#285B46] sm:text-sm">
                      <tr>
                        <th className="px-5 py-4 font-bold">Invoice ID</th>
                        <th className="px-5 py-4 font-bold">Job ID</th>
                        <th className="px-5 py-4 font-bold">Invoice Date</th>
                        <th className="px-5 py-4 font-bold">Amount</th>
                        <th className="px-5 py-4 font-bold">Tax</th>
                        <th className="px-5 py-4 font-bold">Total</th>
                        <th className="px-5 py-4 font-bold">Payment Status</th>
                        <th className="px-5 py-4 font-bold">Method</th>
                        <th className="px-5 py-4 font-bold">Invoice Status</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-stone-100">
                      {filteredRecords.map((invoice, index) => (
                        <tr
                          key={invoice.invoice_id ?? index}
                          className="pc-row transition hover:bg-[#F8FAF5]"
                        >
                          <td className="pc-title px-5 py-4 font-bold text-[#173F32]">
                            #{invoice.invoice_id ?? "—"}
                          </td>

                          <td className="px-5 py-4 font-semibold text-stone-600">
                            #{getId(invoice.job)}
                          </td>

                          <td className="px-5 py-4 text-stone-600">
                            {formatDate(invoice.invoice_date)}
                          </td>

                          <td className="px-5 py-4 text-stone-600">
                            {formatAmount(invoice.amount)}
                          </td>

                          <td className="px-5 py-4 text-stone-600">
                            {formatAmount(invoice.tax_amount)}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 font-semibold text-stone-700">
                            {formatAmount(invoice.total_amount)}
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge value={invoice.payment_status} />
                          </td>

                          <td className="px-5 py-4 text-stone-600">
                            {invoice.payment_method || "—"}
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge value={invoice.status} />
                          </td>
                        </tr>
                      ))}

                      {filteredRecords.length === 0 && (
                        <tr>
                          <td
                            colSpan={9}
                            className="p-10 text-center text-base text-stone-500"
                          >
                            No invoices found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full min-w-[1100px] text-left text-sm">
                    <thead className="pc-thead bg-[#F2F7F2] text-xs uppercase tracking-wide text-[#285B46] sm:text-sm">
                      <tr>
                        <th className="px-5 py-4 font-bold">Payment ID</th>
                        <th className="px-5 py-4 font-bold">Order ID</th>
                        <th className="px-5 py-4 font-bold">Invoice ID</th>
                        <th className="px-5 py-4 font-bold">Amount</th>
                        <th className="px-5 py-4 font-bold">Method</th>
                        <th className="px-5 py-4 font-bold">Transaction ID</th>
                        <th className="px-5 py-4 font-bold">Payment Status</th>
                        <th className="px-5 py-4 font-bold">Paid Date</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-stone-100">
                      {filteredRecords.map((payment, index) => (
                        <tr
                          key={payment.payment_id ?? index}
                          className="pc-row transition hover:bg-[#F8FAF5]"
                        >
                          <td className="pc-title px-5 py-4 font-bold text-[#173F32]">
                            #{payment.payment_id ?? "—"}
                          </td>

                          <td className="px-5 py-4 text-stone-600">
                            {getId(payment.order)}
                          </td>

                          <td className="px-5 py-4 text-stone-600">
                            {getId(payment.invoice)}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 font-semibold text-stone-700">
                            {formatAmount(
                              payment.amount,
                              payment.currency || "INR"
                            )}
                          </td>

                          <td className="px-5 py-4 text-stone-600">
                            {payment.payment_method || "—"}
                          </td>

                          <td className="px-5 py-4 text-stone-600">
                            {payment.transaction_id || "—"}
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge value={payment.status} />
                          </td>

                          <td className="px-5 py-4 text-stone-600">
                            {formatDateTime(payment.paid_at)}
                          </td>
                        </tr>
                      ))}

                      {filteredRecords.length === 0 && (
                        <tr>
                          <td
                            colSpan={8}
                            className="p-10 text-center text-base text-stone-500"
                          >
                            No payments found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              <p className="border-t border-stone-100 px-5 py-4 text-sm text-stone-500">
                Showing {filteredRecords.length} of {currentRecords.length}{" "}
                {activeTab === "INVOICES" ? "invoices" : "payments"}
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}