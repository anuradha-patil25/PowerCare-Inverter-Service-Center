
import { useCallback, useEffect, useMemo, useState } from "react";

const API = "http://127.0.0.1:8000/api";
const PAGE_SIZE = 5;

const EMPTY_FORM = {
  serial: "",
  start_date: "",
  end_date: "",
  status: "ACTIVE",
};

function listData(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function serialId(value) {
  if (value && typeof value === "object") {
    return value.serial_id ?? value.id ?? "";
  }
  return value ?? "";
}

function serialLabel(serial) {
  if (!serial) return "Unassigned";
  return serial.serial_number || serial.serial_no || `Serial #${serialId(serial)}`;
}

function productLabel(serial) {
  if (!serial) return "";
  const product = serial.product;

  if (product && typeof product === "object") {
    return product.product_name ||
      [product.brand, product.model].filter(Boolean).join(" ");
  }

  return serial.product_name || "";
}

function dateLabel(value) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysLeft(value) {
  if (!value) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(`${value}T00:00:00`);

  if (Number.isNaN(end.getTime())) return null;
  return Math.ceil((end.getTime() - today.getTime()) / 86400000);
}

function warrantyStatus(item) {
  if (item.status === "CANCELLED") return "CANCELLED";
  const days = daysLeft(item.end_date);

  if (days !== null && days < 0) return "EXPIRED";
  return item.status || "ACTIVE";
}

function statusStyle(status) {
  if (status === "ACTIVE") {
    return "bg-emerald-100 text-emerald-800";
  }
  if (status === "EXPIRED") {
    return "bg-amber-100 text-amber-800";
  }
  if (status === "CANCELLED") {
    return "bg-red-100 text-red-800";
  }
  return "bg-stone-100 text-stone-700";
}

function errorText(data, fallback) {
  if (typeof data?.detail === "string") return data.detail;

  if (data && typeof data === "object") {
    const messages = Object.entries(data)
      .map(([key, value]) => {
        const message = Array.isArray(value)
          ? value.join(", ")
          : typeof value === "string"
            ? value
            : "";
        return message ? `${key}: ${message}` : "";
      })
      .filter(Boolean);

    if (messages.length) return messages.join(" | ");
  }

  return fallback;
}

export default function AdminWarranties() {
  const [warranties, setWarranties] = useState([]);
  const [serialNumbers, setSerialNumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const token = () => localStorage.getItem("access_token");

  const headers = () => ({
    Authorization: `Bearer ${token()}`,
    "Content-Type": "application/json",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const accessToken = localStorage.getItem("access_token");

      if (!accessToken) {
        throw new Error("Login session missing. Please log in again.");
      }

      const [warrantyResponse, serialResponse] = await Promise.all([
        fetch(`${API}/warranties/`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${API}/serial-numbers/`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);

      const warrantyData = await warrantyResponse.json().catch(() => ({}));
      const serialData = await serialResponse.json().catch(() => ({}));

      if (!warrantyResponse.ok) {
        throw new Error(errorText(warrantyData, "Could not load warranties."));
      }

      if (!serialResponse.ok) {
        throw new Error(errorText(serialData, "Could not load serial numbers."));
      }

      setWarranties(listData(warrantyData));
      setSerialNumbers(listData(serialData));
    } catch (err) {
      setError(err.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return warranties.filter((item) => {
      const id = serialId(item.serial);
      const serial = serialNumbers.find(
        (row) => String(row.serial_id) === String(id)
      );

      const matchesSearch = !term || [
        item.warranty_id,
        serialLabel(serial),
        productLabel(serial),
        item.start_date,
        item.end_date,
        warrantyStatus(item),
      ].some((value) => String(value ?? "").toLowerCase().includes(term));

      return matchesSearch &&
        (statusFilter === "ALL" || warrantyStatus(item) === statusFilter);
    });
  }, [warranties, serialNumbers, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const activeCount = warranties.filter(
    (item) => warrantyStatus(item) === "ACTIVE"
  ).length;

  const expiredCount = warranties.filter(
    (item) => warrantyStatus(item) === "EXPIRED"
  ).length;

  function openAdd() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEdit(item) {
    setEditingId(item.warranty_id);
    setForm({
      serial: String(serialId(item.serial)),
      start_date: item.start_date || "",
      end_date: item.end_date || "",
      status: item.status || "ACTIVE",
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  }

  function changeForm(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submitForm(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!token()) {
      setError("Login session missing. Please log in again.");
      return;
    }

    if (!form.serial || !form.start_date || !form.end_date) {
      setError("Please fill in all required fields.");
      return;
    }

    if (form.end_date < form.start_date) {
      setError("End date cannot be before start date.");
      return;
    }

    setSaving(true);

    try {
      const url = editingId
        ? `${API}/warranties/${editingId}/`
        : `${API}/warranties/`;

      const response = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: headers(),
        body: JSON.stringify({
          serial: Number(form.serial),
          start_date: form.start_date,
          end_date: form.end_date,
          status: form.status,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(errorText(data, "Unable to save warranty."));
      }

      setShowForm(false);
      setEditingId(null);
      setForm({ ...EMPTY_FORM });
      setSuccess(editingId ? "Warranty updated successfully." : "Warranty added successfully.");
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to save warranty.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteWarranty(item) {
    if (!window.confirm(`Delete Warranty #${item.warranty_id}?`)) return;

    setDeletingId(item.warranty_id);
    setError("");
    setSuccess("");

    try {
      if (!token()) {
        throw new Error("Login session missing. Please log in again.");
      }

      const response = await fetch(`${API}/warranties/${item.warranty_id}/`, {
        method: "DELETE",
        headers: headers(),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(errorText(data, "Unable to delete warranty."));
      }

      setSuccess("Warranty deleted successfully.");
      await loadData();
    } catch (err) {
      setError(err.message || "Unable to delete warranty.");
    } finally {
      setDeletingId(null);
    }
  }

  const availableSerials = serialNumbers.filter((serial) => {
    const existing = warranties.find(
      (item) => String(serialId(item.serial)) === String(serial.serial_id)
    );

    return !existing || Number(existing.warranty_id) === Number(editingId);
  });

  return (
    <div className="min-h-screen bg-[#F7F7F0] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header: same size and spacing as Serial Numbers */}
        <header className="rounded-3xl bg-gradient-to-r from-[#103F35] to-[#17836C] p-6 text-white shadow-lg sm:p-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100">
              POWERCARE · ADMINISTRATION
            </p>
            <h1 className="text-3xl font-extrabold sm:text-4xl">
              Warranties
            </h1>
            <p className="mt-3 flex flex-wrap items-center justify-between gap-4">
              Register warranty periods and manage product coverage.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-stone-800 shadow-sm transition hover:bg-emerald-50 disabled:opacity-60"
            >
              ↻ Refresh
            </button>
            <button
              type="button"
              onClick={openAdd}
              className="rounded-lg bg-[#D7F79A] px-4 py-3 text-sm font-bold text-[#164E41] shadow-sm transition hover:bg-[#C7EE7D]"
            >
              + Add Warranty
            </button>
          </div>
        </header>

        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {success}
          </div>
        )}

        {/* Summary cards: same size as Serial Numbers */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryCard
            label="Total Warranties"
            value={warranties.length}
            icon="▤"
          />
          <SummaryCard
            label="Active Warranties"
            value={activeCount}
            icon="✓"
          />
          <SummaryCard
            label="Expired Warranties"
            value={expiredCount}
            icon="◷"
          />
        </section>

        {/* Records section */}
        <section className="overflow-hidden rounded-xl border border-[#DDE4D6] bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-stone-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#164E41]">
                Warranty Records
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Search, filter, add and update warranty records.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search serial number or ID..."
                className="w-full rounded-lg border border-stone-200 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 sm:w-64"
              />
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="EXPIRED">Expired</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-base text-stone-500">
              Loading warranty records...
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-sm">
                  <thead className="bg-[#F0F5EF] text-xs font-bold uppercase tracking-wide text-stone-600">
                    <tr>
                      <th className="px-4 py-4 text-left">ID</th>
                      <th className="px-4 py-4 text-left">Serial Number</th>
                      <th className="px-4 py-4 text-left">Start Date</th>
                      <th className="px-4 py-4 text-left">End Date</th>
                      <th className="px-4 py-4 text-left">Days Left</th>
                      <th className="px-4 py-4 text-left">Status</th>
                      <th className="px-4 py-4 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-stone-100">
                    {visible.map((item) => {
                      const id = serialId(item.serial);
                      const serial = serialNumbers.find(
                        (row) => String(row.serial_id) === String(id)
                      );
                      const days = daysLeft(item.end_date);
                      const status = warrantyStatus(item);

                      return (
                        <tr key={item.warranty_id} className="transition hover:bg-[#FAFCF8]">
                          <td className="whitespace-nowrap px-4 py-4 font-bold text-stone-700">
                            #{item.warranty_id}
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-semibold text-stone-800">
                              {serialLabel(serial)}
                            </p>
                            {productLabel(serial) && (
                              <p className="mt-1 text-xs text-stone-500">
                                {productLabel(serial)}
                              </p>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-stone-600">
                            {dateLabel(item.start_date)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-stone-600">
                            {dateLabel(item.end_date)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4">
                            {days === null ? "—" : days < 0 ? "Expired" : `${days} days`}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusStyle(status)}`}>
                              {status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEdit(item)}
                                className="rounded-md border border-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteWarranty(item)}
                                disabled={deletingId === item.warranty_id}
                                className="rounded-md border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                              >
                                {deletingId === item.warranty_id ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {visible.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center">
                          <p className="text-base font-semibold text-stone-700">
                            No warranty records found
                          </p>
                          <p className="mt-2 text-sm text-stone-500">
                            Try changing your search or status filter.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-stone-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-stone-500">
                  Showing {filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} warranty record(s).
                </p>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    disabled={currentPage <= 1}
                    className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-stone-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                    disabled={currentPage >= totalPages}
                    className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {/* Add / Edit Warranty */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-950/50 p-4">
          <div className="my-auto w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-gradient-to-r from-[#104E40] to-[#168873] px-6 py-5 text-white">
              <div>
                <h2 className="text-xl font-bold">
                  {editingId ? "Edit Warranty" : "Add Warranty"}
                </h2>
                <p className="mt-1 text-sm text-emerald-50">
                  Enter the warranty information.
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close form"
                className="rounded-lg px-3 py-1 text-2xl hover:bg-white/10 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <form onSubmit={submitForm} className="space-y-5 p-6">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="serial" className="mb-2 block text-sm font-semibold text-stone-700">
                  Serial Number *
                </label>
                <select
                  id="serial"
                  name="serial"
                  value={form.serial}
                  onChange={changeForm}
                  required
                  disabled={Boolean(editingId)}
                  className="w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-stone-100"
                >
                  <option value="">Select Serial Number</option>
                  {availableSerials.map((serial) => (
                    <option key={serial.serial_id} value={serial.serial_id}>
                      {serialLabel(serial)}{productLabel(serial) ? ` — ${productLabel(serial)}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="start_date" className="mb-2 block text-sm font-semibold text-stone-700">
                    Start Date *
                  </label>
                  <input
                    id="start_date"
                    name="start_date"
                    type="date"
                    value={form.start_date}
                    onChange={changeForm}
                    max={form.end_date || undefined}
                    required
                    className="w-full rounded-lg border border-stone-200 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <div>
                  <label htmlFor="end_date" className="mb-2 block text-sm font-semibold text-stone-700">
                    End Date *
                  </label>
                  <input
                    id="end_date"
                    name="end_date"
                    type="date"
                    value={form.end_date}
                    onChange={changeForm}
                    min={form.start_date || undefined}
                    required
                    className="w-full rounded-lg border border-stone-200 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="status" className="mb-2 block text-sm font-semibold text-stone-700">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={form.status}
                  onChange={changeForm}
                  className="w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-stone-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-lg border border-stone-200 px-5 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#126B59] px-5 py-3 text-sm font-bold text-white hover:bg-[#0F594A] disabled:opacity-60"
                >
                  {saving ? "Saving..." : editingId ? "Save Changes" : "Add Warranty"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon }) {
  return (
    <div className="rounded-xl border border-[#BDEFD9] bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-stone-600">{label}</p>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-lg font-bold text-[#087C69]">
          {icon}
        </span>
      </div>
      <p className="mt-3 text-2xl font-extrabold tracking-tight text-[#087C69]">
        {value}
      </p>
    </div>
  );
}
