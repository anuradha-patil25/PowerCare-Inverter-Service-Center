
import { useCallback, useEffect, useMemo, useState } from "react";

const SERIALS_API = "http://127.0.0.1:8000/api/serial-numbers/";
const PRODUCTS_API = "http://127.0.0.1:8000/api/products/";
const CUSTOMERS_API = "http://127.0.0.1:8000/api/customers/";

const EMPTY_FORM = {
  serial_number: "",
  product: "",
  customer: "",
  registered_date: new Date().toISOString().slice(0, 10),
  status: "ACTIVE",
};

const inputClass =
  "w-full rounded-xl border border-stone-300 bg-[#FCFCF8] px-4 py-3 text-sm text-stone-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

function getHeaders() {
  const token = localStorage.getItem("access_token");
  return token
    ? {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      }
    : { "Content-Type": "application/json" };
}

function getId(item) {
  return item?.serial_id ?? item?.id;
}

function getRelationId(value) {
  if (value == null) return "";
  if (typeof value === "object") {
    return String(value.product_id ?? value.customer_id ?? value.id ?? value.pk ?? "");
  }
  return String(value);
}

function getRecords(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return null;
}

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Login expired. Please log in again.");
    }
    if (response.status === 403) {
      throw new Error("You do not have permission to perform this action.");
    }

    const details =
      data && typeof data === "object"
        ? Object.entries(data)
            .map(([key, value]) => {
              const message = Array.isArray(value)
                ? value.join(", ")
                : typeof value === "string"
                  ? value
                  : JSON.stringify(value);
              return `${key}: ${message}`;
            })
            .join(" | ")
        : "";

    throw new Error(
      details || data.detail || `Request failed (${response.status}).`
    );
  }

  return data;
}

function getProductName(productValue, products) {
  if (productValue && typeof productValue === "object") {
    return (
      productValue.product_name ||
      productValue.name ||
      productValue.brand ||
      `Product #${getRelationId(productValue)}`
    );
  }

  const productId = getRelationId(productValue);
  const found = products.find(
    (product) => String(product.product_id ?? product.id) === productId
  );

  return found
    ? `${found.product_name || found.name || "Product"}${
        found.brand ? ` — ${found.brand}` : ""
      }`
    : productId
      ? `Product #${productId}`
      : "—";
}

function getCustomerName(customerValue, customers) {
  if (customerValue && typeof customerValue === "object") {
    return (
      customerValue.customer_name ||
      customerValue.name ||
      customerValue.username ||
      `Customer #${getRelationId(customerValue)}`
    );
  }

  const customerId = getRelationId(customerValue);
  if (!customerId) return "Unassigned";

  const found = customers.find(
    (customer) => String(customer.customer_id ?? customer.id) === customerId
  );

  return found
    ? `${found.customer_name || found.name || "Customer"}`
    : `Customer #${customerId}`;
}

function getStatusLabel(status) {
  const labels = {
    ACTIVE: "Active",
    INACTIVE: "Inactive",
    RETIRED: "Retired",
  };
  return labels[String(status || "").toUpperCase()] || status || "Unknown";
}

export default function AdminSerialNumbers() {
  const [serials, setSerials] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editingSerial, setEditingSerial] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    setMessage("");

    const token = localStorage.getItem("access_token");

    if (!token) {
      setSerials([]);
      setError("Please log in to view serial number records.");
      setLoading(false);
      return;
    }

    try {
      const serialResponse = await fetch(SERIALS_API, {
        headers: getHeaders(),
      });
      const serialData = await readResponse(serialResponse);
      const serialRecords = getRecords(serialData);

      if (!serialRecords) {
        throw new Error("Unexpected Serial Numbers API response format.");
      }

      setSerials(serialRecords);

      // Product and customer lists are used for display and form dropdowns.
      // A failure in either optional list will not hide existing serial records.
      const [productResult, customerResult] = await Promise.allSettled([
        fetch(PRODUCTS_API, { headers: getHeaders() }).then(readResponse),
        fetch(CUSTOMERS_API, { headers: getHeaders() }).then(readResponse),
      ]);

      if (productResult.status === "fulfilled") {
        const records = getRecords(productResult.value);
        setProducts(records || []);
      } else {
        setProducts([]);
      }

      if (customerResult.status === "fulfilled") {
        const records = getRecords(customerResult.value);
        setCustomers(records || []);
      } else {
        setCustomers([]);
      }
    } catch (err) {
      setError(err.message || "Could not load serial number records.");
      setSerials([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  const filteredSerials = useMemo(() => {
    const term = search.trim().toLowerCase();

    return serials.filter((item) => {
      const productName = getProductName(item.product, products);
      const customerName = getCustomerName(item.customer, customers);

      const searchableText = [
        getId(item),
        item.serial_number,
        productName,
        customerName,
        item.registered_date,
        getStatusLabel(item.status),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !term || searchableText.includes(term);
      const matchesStatus =
        statusFilter === "ALL" ||
        String(item.status).toUpperCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [serials, products, customers, search, statusFilter]);

  const activeCount = serials.filter(
    (item) => String(item.status).toUpperCase() === "ACTIVE"
  ).length;

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function openAddForm() {
    setEditingSerial(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
    setError("");
    setMessage("");
  }

  function openEditForm(item) {
    setEditingSerial(item);
    setForm({
      serial_number: item.serial_number || "",
      product: getRelationId(item.product),
      customer: getRelationId(item.customer),
      registered_date: item.registered_date
        ? String(item.registered_date).slice(0, 10)
        : "",
      status: item.status || "ACTIVE",
    });
    setShowForm(true);
    setError("");
    setMessage("");
  }

  function closeForm() {
    setShowForm(false);
    setEditingSerial(null);
    setForm({ ...EMPTY_FORM });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.serial_number.trim()) {
      setError("Serial number is required.");
      return;
    }

    if (!form.product) {
      setError("Please select a product.");
      return;
    }

    if (!form.registered_date) {
      setError("Registration date is required.");
      return;
    }

    const payload = {
      serial_number: form.serial_number.trim(),
      product: Number(form.product),
      customer: form.customer ? Number(form.customer) : null,
      registered_date: form.registered_date,
      status: form.status,
    };

    setSaving(true);

    try {
      const isEditing = Boolean(editingSerial);
      const url = isEditing
        ? `${SERIALS_API}${getId(editingSerial)}/`
        : SERIALS_API;

      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      await readResponse(response);

      closeForm();
      setMessage(
        isEditing
          ? "Serial number updated successfully."
          : "Serial number added successfully."
      );
      setRefreshKey((current) => current + 1);
    } catch (err) {
      setError(err.message || "Could not save the serial number.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F7F0] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-gradient-to-r from-[#103F35] to-[#17836C] p-6 text-white shadow-lg sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100">
            PowerCare · Administration
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold sm:text-4xl">
                Serial Numbers
              </h1>
              <p className="mt-2 text-sm text-emerald-50 sm:text-base">
                Register products and manage their serial number records.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openAddForm}
                className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#173E2E] hover:bg-emerald-50"
              >
                + Add Serial Number
              </button>

              <button
                type="button"
                onClick={() => setRefreshKey((current) => current + 1)}
                disabled={loading || saving}
                className="rounded-xl bg-[#E4F5A5] px-4 py-3 text-sm font-bold text-[#173E2E] hover:bg-white disabled:opacity-60"
              >
                {loading ? "Loading..." : "↻ Refresh"}
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
          >
            <p className="font-bold">Action could not be completed</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {message && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            {message}
          </div>
        )}

        {showForm && (
          <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold text-[#173F32]">
              {editingSerial ? "Edit Serial Number" : "Add New Serial Number"}
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Product and registration date are required. Customer assignment is optional.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <FormField label="Serial Number *">
                  <input
                    required
                    maxLength={100}
                    value={form.serial_number}
                    onChange={(event) =>
                      setField("serial_number", event.target.value)
                    }
                    placeholder="Enter unique serial number"
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Product *">
                  <select
                    required
                    value={form.product}
                    onChange={(event) => setField("product", event.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select product</option>
                    {products.map((product) => {
                      const productId = product.product_id ?? product.id;
                      return (
                        <option key={productId} value={productId}>
                          {product.product_name || product.name || "Product"} —{" "}
                          {product.brand || "Brand not specified"} (
                          {product.model || productId})
                        </option>
                      );
                    })}
                  </select>
                  {products.length === 0 && (
                    <p className="mt-1 text-xs text-amber-700">
                      Product list could not be loaded. Check the Products API.
                    </p>
                  )}
                </FormField>

                <FormField label="Customer (Optional)">
                  <select
                    value={form.customer}
                    onChange={(event) =>
                      setField("customer", event.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="">Unassigned</option>
                    {customers.map((customer) => {
                      const customerId = customer.customer_id ?? customer.id;
                      return (
                        <option key={customerId} value={customerId}>
                          {customer.customer_name || customer.name || "Customer"}{" "}
                          — #{customerId}
                        </option>
                      );
                    })}
                  </select>
                </FormField>

                <FormField label="Registration Date *">
                  <input
                    type="date"
                    required
                    value={form.registered_date}
                    onChange={(event) =>
                      setField("registered_date", event.target.value)
                    }
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Status *">
                  <select
                    value={form.status}
                    onChange={(event) => setField("status", event.target.value)}
                    className={inputClass}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="RETIRED">Retired</option>
                  </select>
                </FormField>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving || products.length === 0}
                  className="rounded-xl bg-[#12624D] px-5 py-3 text-sm font-bold text-white hover:bg-[#103F35] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingSerial
                      ? "Save Changes"
                      : "Save Serial Number"}
                </button>

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="grid gap-4 sm:grid-cols-3">
          <SummaryCard title="Total Serial Numbers" value={serials.length} />
          <SummaryCard title="Active Serial Numbers" value={activeCount} />
          <SummaryCard title="Matching Records" value={filteredSerials.length} />
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#E3E7D8] bg-white shadow-sm">
          <div className="grid gap-3 border-b border-stone-100 p-5 sm:grid-cols-2 sm:p-6">
            <div>
              <h2 className="text-xl font-bold text-[#173F32] sm:text-2xl">
                Serial Number Records
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Search by serial number, product, customer or status.
              </p>
            </div>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search serial numbers..."
              aria-label="Search serial numbers"
              className={inputClass}
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter by serial number status"
              className={inputClass}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="RETIRED">Retired</option>
            </select>
          </div>

          {loading ? (
            <div className="p-10 text-center text-stone-500">
              Loading serial number records...
            </div>
          ) : !error && filteredSerials.length === 0 ? (
            <div className="p-10 text-center text-stone-500">
              No matching serial number records found.
            </div>
          ) : !error ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead className="bg-[#F2F7F2] text-xs uppercase tracking-wide text-[#285B46]">
                  <tr>
                    <th className="px-4 py-4">ID</th>
                    <th className="px-4 py-4">Serial Number</th>
                    <th className="px-4 py-4">Product</th>
                    <th className="px-4 py-4">Customer</th>
                    <th className="px-4 py-4">Registered Date</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-stone-100">
                  {filteredSerials.map((item) => {
                    const id = getId(item);
                    const status = String(item.status || "").toUpperCase();
                    const active = status === "ACTIVE";

                    return (
                      <tr key={id} className="transition hover:bg-[#F8FAF5]">
                        <td className="px-4 py-4 text-sm font-semibold text-stone-600">
                          #{id ?? "—"}
                        </td>

                        <td className="px-4 py-4 text-sm font-bold text-[#173F32]">
                          {item.serial_number || "—"}
                        </td>

                        <td className="px-4 py-4 text-sm text-stone-600">
                          {getProductName(item.product, products)}
                        </td>

                        <td className="px-4 py-4 text-sm text-stone-600">
                          {getCustomerName(item.customer, customers)}
                        </td>

                        <td className="px-4 py-4 text-sm text-stone-600">
                          {item.registered_date
                            ? String(item.registered_date).slice(0, 10)
                            : "—"}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                              active
                                ? "bg-emerald-100 text-emerald-800"
                                : status === "INACTIVE"
                                  ? "bg-stone-100 text-stone-600"
                                  : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {getStatusLabel(item.status)}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => openEditForm(item)}
                            className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-[#12624D] hover:bg-emerald-50"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="border-t border-stone-100 px-5 py-4 text-sm text-stone-500">
            Showing {loading ? 0 : filteredSerials.length} of {serials.length} serial number records.
          </div>
        </section>
      </div>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-stone-700">{label}</span>
      {children}
    </label>
  );
}

function SummaryCard({ title, value }) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-sm font-semibold text-stone-600">{title}</p>
      <p className="mt-3 text-4xl font-extrabold text-[#12624D]">{value}</p>
    </div>
  );
}
