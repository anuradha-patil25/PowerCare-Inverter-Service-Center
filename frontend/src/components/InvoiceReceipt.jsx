import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const dateText = (value) => {
  if (!value) return "—";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value);
};

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);

async function invoiceApi(url) {
  let access = localStorage.getItem("access_token");
  const refresh = localStorage.getItem("refresh_token");

  if (!access) {
    const error = new Error("Please log in to view invoices and receipts.");
    error.loginRequired = true;
    throw error;
  }

  const send = (token) =>
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

  let response = await send(access);

  if (response.status === 401 && refresh) {
    const refreshResponse = await fetch("/api/auth/refresh/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });

    const refreshData = await refreshResponse.json().catch(() => ({}));

    if (refreshResponse.ok && refreshData.access) {
      access = refreshData.access;
      localStorage.setItem("access_token", access);

      if (refreshData.refresh) {
        localStorage.setItem("refresh_token", refreshData.refresh);
      }

      response = await send(access);
    }
  }

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("current_user");

    const error = new Error("Your session has expired. Please log in again.");
    error.loginRequired = true;
    throw error;
  }

  if (!response.ok) {
    throw new Error(
      data.error || data.detail || `Request failed (${response.status}).`
    );
  }

  return data;
}

function InvoiceReceipt() {
  const [records, setRecords] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loginRequired, setLoginRequired] = useState(false);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError("");
    setLoginRequired(false);

    try {
      const data = await invoiceApi("/api/my-invoices/");
      setRecords(Array.isArray(data.invoices) ? data.invoices : []);
    } catch (err) {
      setError(err.message || "Unable to load invoices and receipts.");
      setLoginRequired(Boolean(err.loginRequired));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const filteredRecords = useMemo(() => {
    if (filter === "PAID") {
      return records.filter((item) => item.payment_status === "PAID");
    }

    if (filter === "UNPAID") {
      return records.some((item) => item.payment_status === "UNPAID")
        ? records.filter(
            (item) =>
              item.payment_status === "UNPAID" ||
              item.payment_status === "PARTIAL"
          )
        : records.filter((item) => item.payment_status === "PARTIAL");
    }

    return records;
  }, [records, filter]);

  const printReceipt = (record) => {
    const popup = window.open("", "_blank", "width=900,height=750");

    if (!popup) {
      window.alert("Please allow pop-ups to print the receipt.");
      return;
    }

    const isOrder = record.record_type === "ORDER_RECEIPT";
    const order = record.order || {};
    const job = record.job || {};
    const payments = Array.isArray(record.payments) ? record.payments : [];
    const items = Array.isArray(order.items) ? order.items : [];

    const paymentRows = payments.length
      ? payments.map((payment) => `
          <tr>
            <td>${escapeHtml(payment.payment_method)}</td>
            <td>${escapeHtml(payment.status)}</td>
            <td>${escapeHtml(payment.transaction_id || "—")}</td>
            <td>${escapeHtml(money(payment.amount))}</td>
          </tr>
        `).join("")
      : `<tr><td colspan="4">No payment record available.</td></tr>`;

    const detailRows = isOrder
      ? items.map((item) => `
          <tr>
            <td>${escapeHtml(item.product_name)}</td>
            <td>${escapeHtml(item.brand)} ${escapeHtml(item.model)}</td>
            <td>${escapeHtml(item.quantity)}</td>
            <td>${escapeHtml(money(item.subtotal))}</td>
          </tr>
        `).join("")
      : `
          <tr>
            <td>${escapeHtml(job.product_name || "—")}</td>
            <td>${escapeHtml(`${job.brand || "—"} ${job.model || ""}`)}</td>
            <td>${escapeHtml(job.serial_number || "—")}</td>
            <td>${escapeHtml(job.service_type || "—")}</td>
          </tr>
        `;

    const detailHead = isOrder
      ? "<th>Product</th><th>Brand / Model</th><th>Qty</th><th>Subtotal</th>"
      : "<th>Product</th><th>Brand / Model</th><th>Serial Number</th><th>Service</th>";

    const identifier = isOrder
      ? `Order #${record.order_id}`
      : `Invoice #${String(record.invoice_id).padStart(5, "0")}`;

    const html = `
      <!doctype html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(identifier)} - PowerCare</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 850px; margin: 30px auto; padding: 20px; color: #263b3a; }
          h1 { color: #0f7775; }
          .muted { color: #64748b; }
          .box { border: 1px solid #d5eae7; border-radius: 8px; padding: 14px; margin: 16px 0; }
          table { width: 100%; border-collapse: collapse; margin: 12px 0; }
          th, td { border: 1px solid #d8e4e2; text-align: left; padding: 9px; overflow-wrap: anywhere; }
          th { background: #eaf5f3; }
          .total { text-align: right; font-size: 20px; color: #0f7775; font-weight: bold; }
          @media print { button { display: none; } body { margin: 0; } }
        </style>
      </head>
      <body>
        <h1>PowerCare Inverter Service Center</h1>
        <p class="muted">${isOrder ? "Product Order Receipt" : "Service Invoice"}</p>

        <div class="box">
          <strong>${escapeHtml(identifier)}</strong><br>
          Date: ${escapeHtml(dateText(record.invoice_date))}<br>
          Status: ${escapeHtml(record.status || "—")}<br>
          Payment Status: ${escapeHtml(record.payment_status || "UNPAID")}<br>
          Payment Method: ${escapeHtml(record.payment_method || "—")}
          ${isOrder ? `<br>Delivery Address: ${escapeHtml(order.delivery_address || "—")}` : `<br>Job: ${escapeHtml(job.job_id ?? "—")}`}
        </div>

        <h3>${isOrder ? "Purchased Products" : "Service Details"}</h3>
        <table>
          <thead><tr>${detailHead}</tr></thead>
          <tbody>${detailRows || `<tr><td colspan="4">No item details available.</td></tr>`}</tbody>
        </table>

        <div class="box">
          ${isOrder ? "" : `Service Amount: ${escapeHtml(money(record.amount))}<br>Tax Amount: ${escapeHtml(money(record.tax_amount))}<br>`}
          <p class="total">Total: ${escapeHtml(money(record.total_amount))}</p>
        </div>

        <h3>Payment Records</h3>
        <table>
          <thead>
            <tr><th>Method</th><th>Status</th><th>Transaction Reference</th><th>Amount</th></tr>
          </thead>
          <tbody>${paymentRows}</tbody>
        </table>

        <p class="muted">Generated from the PowerCare system. Demo payments do not represent a real money transfer.</p>
        <button onclick="window.print()">Print / Save as PDF</button>
      </body>
      </html>
    `;

    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus();
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#C9E3DF] bg-white p-8 text-center">
        Loading invoices and receipts...
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Invoices / Receipts</h2>
          <p className="mt-1 text-sm text-slate-500">
            View service invoices and receipts for your product orders.
          </p>
        </div>
        <button
          type="button"
          onClick={loadRecords}
          className="rounded-xl bg-[#0F7775] px-4 py-2.5 font-semibold text-white hover:bg-[#096260]"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
          {loginRequired && (
            <div>
              <Link to="/login" className="mt-2 inline-block underline">
                Go to Login
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          ["Total Records", records.length],
          ["Paid", records.filter((item) => item.payment_status === "PAID").length],
          ["Unpaid / Partial", records.filter((item) =>
            ["UNPAID", "PARTIAL"].includes(item.payment_status)
          ).length],
        ].map(([label, count]) => (
          <div key={label} className="rounded-2xl border border-[#C9E3DF] bg-white p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-800">{count}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ["ALL", "All Records"],
          ["PAID", "Paid"],
          ["UNPAID", "Unpaid / Partial"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              filter === value
                ? "bg-[#0F7775] text-white"
                : "border border-[#C9E3DF] bg-white text-slate-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {!error && filteredRecords.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#A7D1CB] bg-white px-6 py-12 text-center">
          <h3 className="text-lg font-bold text-slate-800">No invoices or receipts found</h3>
          <p className="mt-2 text-sm text-slate-500">
            Receipts appear after orders and their payment records are available. Service invoices appear after an invoice is created for a service job.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecords.map((record, index) => {
            const isOrder = record.record_type === "ORDER_RECEIPT";
            const orderItems = record.order?.items || [];
            const job = record.job || {};

            return (
              <article
                key={isOrder ? `order-${record.order_id}` : `invoice-${record.invoice_id}-${index}`}
                className="overflow-hidden rounded-2xl border border-[#C9E3DF] bg-white"
              >
                <div className="flex flex-col justify-between gap-3 border-b border-[#DCECE9] bg-[#F5FAF9] p-5 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {isOrder ? "Product Order Receipt" : "Service Invoice"}
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-slate-800">
                      {isOrder
                        ? `Order #${record.order_id}`
                        : `INV-${String(record.invoice_id).padStart(5, "0")}`}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Date: {dateText(record.invoice_date)}
                    </p>
                  </div>
                  <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold ${
                    record.payment_status === "PAID"
                      ? "bg-emerald-100 text-emerald-800"
                      : record.payment_status === "PARTIAL"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-rose-100 text-rose-800"
                  }`}>
                    {record.payment_status || "UNPAID"}
                  </span>
                </div>

                <div className="space-y-4 p-5">
                  {isOrder ? (
                    <>
                      <div className="space-y-3">
                        {orderItems.map((item) => (
                          <div
                            key={item.order_item_id}
                            className="flex flex-col justify-between gap-2 rounded-xl border border-[#E2EFED] p-3 sm:flex-row"
                          >
                            <div>
                              <p className="font-semibold text-slate-800">{item.product_name}</p>
                              <p className="text-sm text-slate-500">
                                {item.brand} {item.model} · Qty: {item.quantity}
                              </p>
                            </div>
                            <p className="font-semibold text-slate-800">{money(item.subtotal)}</p>
                          </div>
                        ))}
                      </div>
                      <div className="rounded-xl bg-[#F2F8F7] p-4 text-sm text-slate-600">
                        <strong>Delivery address:</strong> {record.order?.delivery_address || "—"}
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 rounded-xl bg-[#F2F8F7] p-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-slate-500">Product / Service</p>
                        <p className="mt-1 font-semibold text-slate-800">
                          {job.product_name || "Service"}
                        </p>
                        <p className="text-sm text-slate-500">
                          {job.brand || "—"} {job.model || ""}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Serial Number / Job</p>
                        <p className="mt-1 font-semibold text-slate-800">
                          {job.serial_number || "—"} · Job #{job.job_id ?? "—"}
                        </p>
                        <p className="text-sm text-slate-500">
                          {job.service_type || "—"}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl bg-[#F2F8F7] p-4">
                    {!isOrder && (
                      <>
                        <div className="flex justify-between gap-4 py-1 text-sm">
                          <span>Service Amount</span><span>{money(record.amount)}</span>
                        </div>
                        <div className="flex justify-between gap-4 py-1 text-sm">
                          <span>Tax Amount</span><span>{money(record.tax_amount)}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between gap-4 border-t border-[#C9E3DF] pt-3">
                      <span className="font-bold text-slate-700">Total</span>
                      <span className="text-xl font-bold text-[#0F7775]">
                        {money(record.total_amount)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      Payment method: {record.payment_method || "Not recorded"}
                    </p>
                  </div>

                  {record.payments?.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-[#EAF5F3]">
                          <tr>
                            <th className="px-3 py-2">Method</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Reference</th>
                            <th className="px-3 py-2">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {record.payments.map((payment) => (
                            <tr key={payment.payment_id} className="border-b border-[#E2EFED]">
                              <td className="px-3 py-3">{payment.payment_method}</td>
                              <td className="px-3 py-3">{payment.status}</td>
                              <td className="px-3 py-3 break-all">{payment.transaction_id || "—"}</td>
                              <td className="px-3 py-3">{money(payment.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => printReceipt(record)}
                      className="rounded-xl bg-[#0F7775] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#096260]"
                    >
                      Print / Save as PDF
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default InvoiceReceipt;