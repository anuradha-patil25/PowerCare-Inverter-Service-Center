
import { useEffect, useMemo, useState } from "react";

const API_BASE = "/api";

const asList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-IN");
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-IN");
};

const badgeClass = (value) => {
  const status = String(value || "").toUpperCase();

  if (["PAID", "SUCCESS"].includes(status)) {
    return "bg-emerald-100 text-emerald-800";
  }

  if (["FAILED", "CANCELLED", "REFUNDED"].includes(status)) {
    return "bg-rose-100 text-rose-800";
  }

  if (["PARTIAL", "PENDING", "UNPAID"].includes(status)) {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-slate-100 text-slate-700";
};

function StaffInvoicesPayments() {
  const [tab, setTab] = useState("invoices");
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
const [creatingInvoice, setCreatingInvoice] = useState(false);
const [createError, setCreateError] = useState("");
const [createSuccess, setCreateSuccess] = useState("");

const getTodayLocalDate = () => {
  const today = new Date();

  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};

const [invoiceForm, setInvoiceForm] = useState({
  job: "",
  invoice_date: getTodayLocalDate(),
  amount: "",
  tax_amount: "",
});

const invoiceFormTotal =
  (Number(invoiceForm.amount) || 0) +
  (Number(invoiceForm.tax_amount) || 0);

  const loadRecords = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("access_token");

      if (!token) {
        throw new Error("Please log in again to view invoice and payment records.");
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [invoiceResponse, paymentResponse] = await Promise.all([
        fetch(`${API_BASE}/invoices/`, { headers }),
        fetch(`${API_BASE}/payments/`, { headers }),
      ]);

      if (!invoiceResponse.ok || !paymentResponse.ok) {
        const failedResponse = !invoiceResponse.ok
          ? invoiceResponse
          : paymentResponse;

        if (failedResponse.status === 401) {
          throw new Error("Login session expired. Please log out and log in again.");
        }

        if (failedResponse.status === 403) {
          throw new Error("You do not have permission to view these records.");
        }

        throw new Error(`API request failed (${failedResponse.status}).`);
      }

      const [invoiceData, paymentData] = await Promise.all([
        invoiceResponse.json(),
        paymentResponse.json(),
      ]);

      setInvoices(asList(invoiceData));
      setPayments(asList(paymentData));
    } catch (err) {
      setError(err.message || "Unable to load invoice and payment records.");
    } finally {
      setLoading(false);
    }
  };
const createInvoice = async (event) => {
  event.preventDefault();
  setCreateError("");
  setCreateSuccess("");

  const token = localStorage.getItem("access_token");

  if (!token) {
    setCreateError("Please log in again.");
    return;
  }

  const jobId = Number(invoiceForm.job);
  const amount = Number(invoiceForm.amount);
  const tax = Number(invoiceForm.tax_amount);

  if (!Number.isInteger(jobId) || jobId <= 0) {
    setCreateError("Enter a valid Job ID.");
    return;
  }

  if (invoices.some((invoice) => String(invoice.job) === String(jobId))) {
    setCreateError("This Job already has an invoice. Please enter another Job ID.");
    return;
  }

  if (
    invoiceForm.amount.trim() === "" ||
    invoiceForm.tax_amount.trim() === "" ||
    !Number.isFinite(amount) ||
    !Number.isFinite(tax) ||
    amount < 0 ||
    tax < 0
  ) {
    setCreateError("Enter valid, non-negative amount and tax values.");
    return;
  }

  setCreatingInvoice(true);

  try {
    const response = await fetch(`${API_BASE}/invoices/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        job: jobId,
        invoice_date: invoiceForm.invoice_date,
        amount: amount.toFixed(2),
        tax_amount: tax.toFixed(2),
        total_amount: (amount + tax).toFixed(2),
        payment_status: "UNPAID",
        payment_method: null,
        status: "ACTIVE",
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        result.detail ||
        result.job?.[0] ||
        result.non_field_errors?.[0] ||
        Object.entries(result)
          .map(([field, value]) =>
            `${field}: ${Array.isArray(value) ? value.join(", ") : String(value)}`
          )
          .join(" | ") ||
        `Could not create invoice (${response.status}).`;

      throw new Error(message);
    }

    setShowCreateInvoice(false);
    setInvoiceForm({
      job: "",
      invoice_date: getTodayLocalDate(),
      amount: "",
      tax_amount: "",
    });

    setCreateSuccess(
      `Invoice${result.invoice_id ? ` #${result.invoice_id}` : ""} created successfully. Payment status: UNPAID.`
    );

    await loadRecords();
  } catch (err) {
    setCreateError(err.message || "Unable to create invoice.");
  } finally {
    setCreatingInvoice(false);
  }
};
  useEffect(() => {
    loadRecords();
  }, []);

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const searchable = [
        invoice.invoice_id,
        invoice.job,
        invoice.invoice_date,
        invoice.payment_status,
        invoice.payment_method,
        invoice.status,
        invoice.total_amount,
      ];

      const matchesSearch = searchable.some((value) =>
        String(value ?? "").toLowerCase().includes(query)
      );

      const matchesStatus =
        statusFilter === "ALL" ||
        String(invoice.payment_status || "").toUpperCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [invoices, search, statusFilter]);

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return payments.filter((payment) => {
      const searchable = [
        payment.payment_id,
        payment.customer,
        payment.order,
        payment.invoice,
        payment.amount,
        payment.payment_method,
        payment.status,
        payment.transaction_id,
        payment.gateway_order_id,
        payment.gateway_payment_id,
      ];

      const matchesSearch = searchable.some((value) =>
        String(value ?? "").toLowerCase().includes(query)
      );

      const matchesStatus =
        statusFilter === "ALL" ||
        String(payment.status || "").toUpperCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [payments, search, statusFilter]);

  const invoiceTotal = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.total_amount || 0),
    0
  );

  const paidInvoiceTotal = invoices
    .filter((invoice) => invoice.payment_status === "PAID")
    .reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0);

  const successfulPayments = payments.filter(
    (payment) => payment.status === "SUCCESS"
  );

  const successfulPaymentTotal = successfulPayments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0
  );

  const selectTab = (nextTab) => {
    setTab(nextTab);
    setSearch("");
    setStatusFilter("ALL");
  };

  const statusOptions =
    tab === "invoices"
      ? ["UNPAID", "PARTIAL", "PAID"]
      : ["PENDING", "SUCCESS", "FAILED", "REFUNDED"];

  return (
    <div className="min-h-screen bg-[#F3FAF8] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
              PowerCare · Staff Workspace
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
              Invoices &amp; Payments
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Review service invoices and recorded payment transactions.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
  {tab === "invoices" && (
    <button
      type="button"
      onClick={() => {
        setShowCreateInvoice(!showCreateInvoice);
        setCreateError("");
        setCreateSuccess("");
      }}
className="rounded-xl border border-teal-200 bg-white px-4 py-3 text-sm font-semibold text-teal-800 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"    >
      {showCreateInvoice ? "Close Invoice Form" : "+ Create Invoice"}
    </button>
  )}

  <button
    type="button"
    onClick={loadRecords}
    disabled={loading}
    className="rounded-xl bg-[#075653] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#064744] disabled:cursor-not-allowed disabled:opacity-60"
  >
    {loading ? "Refreshing..." : "Refresh Records"}
  </button>
</div>
        </header>

        {createSuccess && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {createSuccess}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total Invoices", value: invoices.length },
            { label: "Invoice Total", value: formatMoney(invoiceTotal) },
            { label: "Paid Invoices", value: invoices.filter((item) => item.payment_status === "PAID").length },
            { label: "Successful Payments", value: formatMoney(successfulPaymentTotal) },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-teal-100 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-slate-500">{item.label}</p>
              <p className="mt-3 break-words text-2xl font-bold text-[#075653]">
                {item.value}
              </p>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-sm">
          <div className="flex flex-wrap gap-2 border-b border-slate-200 p-4">
            <button
              type="button"
              onClick={() => selectTab("invoices")}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
                tab === "invoices"
                  ? "bg-[#075653] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Invoices ({invoices.length})
            </button>

            <button
              type="button"
              onClick={() => selectTab("payments")}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
                tab === "payments"
                  ? "bg-[#075653] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Payments ({payments.length})
            </button>
          </div>
          {tab === "invoices" && showCreateInvoice && (
  <form
    onSubmit={createInvoice}
    className="m-4 space-y-4 rounded-2xl border border-teal-200 bg-[#F8FCFB] p-5"
  >
    <div>
      <h2 className="text-lg font-bold text-slate-900">
        Create Service Invoice
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Enter a Job ID that does not already have an invoice.
        This creates an unpaid invoice only; it does not collect payment.
      </p>
    </div>

    {createError && (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
        {createError}
      </div>
    )}

    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <label className="text-sm font-medium text-slate-700">
        Job ID
        <input
          type="number"
          min="1"
          required
          value={invoiceForm.job}
          onChange={(event) =>
            setInvoiceForm({ ...invoiceForm, job: event.target.value })
          }
          placeholder="e.g. 22"
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none focus:border-teal-700"
        />
      </label>

      <label className="text-sm font-medium text-slate-700">
        Invoice Date
        <input
          type="date"
          required
          value={invoiceForm.invoice_date}
          onChange={(event) =>
            setInvoiceForm({
              ...invoiceForm,
              invoice_date: event.target.value,
            })
          }
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none focus:border-teal-700"
        />
      </label>

      <label className="text-sm font-medium text-slate-700">
        Amount (₹)
        <input
          type="number"
          min="0"
          step="0.01"
          required
          value={invoiceForm.amount}
          onChange={(event) =>
            setInvoiceForm({ ...invoiceForm, amount: event.target.value })
          }
          placeholder="2000.00"
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none focus:border-teal-700"
        />
      </label>

      <label className="text-sm font-medium text-slate-700">
        Tax Amount (₹)
        <input
          type="number"
          min="0"
          step="0.01"
          required
          value={invoiceForm.tax_amount}
          onChange={(event) =>
            setInvoiceForm({
              ...invoiceForm,
              tax_amount: event.target.value,
            })
          }
          placeholder="360.00"
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 outline-none focus:border-teal-700"
        />
      </label>
    </div>

    <div className="rounded-xl bg-white p-4">
      <p className="text-sm text-slate-500">Invoice Total</p>
      <p className="mt-1 text-2xl font-bold text-[#075653]">
        {formatMoney(invoiceFormTotal)}
      </p>
    </div>

    <div className="flex flex-wrap gap-3">
      <button
        type="submit"
        disabled={creatingInvoice}
        className="rounded-xl bg-[#075653] px-5 py-3 text-sm font-semibold text-white hover:bg-[#064744] disabled:opacity-60"
      >
        {creatingInvoice ? "Creating..." : "Create Invoice"}
      </button>

      <button
        type="button"
        onClick={() => {
          setShowCreateInvoice(false);
          setCreateError("");
        }}
        className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
      >
        Cancel
      </button>
    </div>
  </form>
)}
          <div className="flex flex-col gap-3 p-4 sm:flex-row">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                tab === "invoices"
                  ? "Search invoice ID, job ID or payment method..."
                  : "Search payment, customer, order or transaction ID..."
              }
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-teal-700"
            >
              <option value="ALL">All Statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="mx-4 mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <p className="font-semibold">Could not load records</p>
              <p className="mt-1">{error}</p>
              <p className="mt-2">
                Check that the Django backend is running and your staff login is valid.
              </p>
            </div>
          )}

          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Loading records...
            </div>
          ) : tab === "invoices" ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-[#E7F4F1] text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-5 py-4">Invoice</th>
                    <th className="px-5 py-4">Job ID</th>
                    <th className="px-5 py-4">Invoice Date</th>
                    <th className="px-5 py-4">Amount</th>
                    <th className="px-5 py-4">Tax</th>
                    <th className="px-5 py-4">Total</th>
                    <th className="px-5 py-4">Payment Method</th>
                    <th className="px-5 py-4">Payment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.invoice_id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        #{invoice.invoice_id}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {invoice.job ? `#${invoice.job}` : "—"}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {formatDate(invoice.invoice_date)}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {formatMoney(invoice.amount)}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {formatMoney(invoice.tax_amount)}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {formatMoney(invoice.total_amount)}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {invoice.payment_method || "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(invoice.payment_status)}`}
                        >
                          {invoice.payment_status || "UNKNOWN"}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan="8" className="px-5 py-12 text-center text-slate-500">
                        No matching invoice records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="bg-[#E7F4F1] text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-5 py-4">Payment</th>
                    <th className="px-5 py-4">Customer ID</th>
                    <th className="px-5 py-4">Order ID</th>
                    <th className="px-5 py-4">Invoice ID</th>
                    <th className="px-5 py-4">Amount</th>
                    <th className="px-5 py-4">Method</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Transaction ID</th>
                    <th className="px-5 py-4">Paid At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.payment_id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        #{payment.payment_id}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {payment.customer ? `#${payment.customer}` : "—"}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {payment.order ? `#${payment.order}` : "—"}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {payment.invoice ? `#${payment.invoice}` : "—"}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {formatMoney(payment.amount)}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {payment.payment_method || "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(payment.status)}`}
                        >
                          {payment.status || "UNKNOWN"}
                        </span>
                      </td>
                      <td className="max-w-[220px] truncate px-5 py-4 text-slate-700" title={payment.transaction_id || ""}>
                        {payment.transaction_id || "—"}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {formatDateTime(payment.paid_at)}
                      </td>
                    </tr>
                  ))}

                  {filteredPayments.length === 0 && (
                    <tr>
                      <td colSpan="9" className="px-5 py-12 text-center text-slate-500">
                        No matching payment records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            This page displays records already stored in the backend. It does not initiate payments or change invoice/payment status.
          </div>
        </section>
      </div>
    </div>
  );
}

export default StaffInvoicesPayments;
