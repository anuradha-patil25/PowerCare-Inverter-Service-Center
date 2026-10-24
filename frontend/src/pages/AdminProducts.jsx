
import { useCallback, useEffect, useMemo, useState } from "react";

const API_URL = "/api/products/";
const MEDIA_BASE = "";

const EMPTY_FORM = {
  product_name: "",
  brand: "",
  model: "",
  product_type: "INVERTER",
  purchase_date: "",
  status: "ACTIVE",
  stock_quantity: "0",
  price: "0",
  description: "",
};

function getId(product) {
  return product.product_id ?? product.id;
}

function getImageUrl(image) {
  if (!image) return "";
  if (typeof image === "object") {
    image = image.url || image.image || "";
  }
  if (!image) return "";
  if (String(image).startsWith("http")) return image;
  return `${MEDIA_BASE}${String(image).startsWith("/") ? "" : "/"}${image}`;
}

function getErrorMessage(data, fallback) {
  if (typeof data?.detail === "string") return data.detail;

  if (data && typeof data === "object") {
    const messages = Object.entries(data).map(([field, value]) => {
      const text = Array.isArray(value) ? value.join(", ") : String(value);
      return `${field}: ${text}`;
    });
    if (messages.length) return messages.join(" | ");
  }

  return fallback;
}

function formatPrice(value) {
  const number = Number(value || 0);
  return number.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
}

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [imageFile, setImageFile] = useState(null);
  const [imageInputKey, setImageInputKey] = useState(0);

  const getHeaders = () => {
    const token = localStorage.getItem("access_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(API_URL, {
        method: "GET",
        headers: getHeaders(),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, `Could not load products (${response.status}).`)
        );
      }

      const records = Array.isArray(data) ? data : data.results;
      if (!Array.isArray(records)) {
        throw new Error("Unexpected Products API response.");
      }

      setProducts(records);
    } catch (err) {
      setError(err.message || "Could not connect to the backend.");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts, refreshKey]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !term ||
        [
          getId(product),
          product.product_name,
          product.brand,
          product.model,
          product.product_type,
          product.description,
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);

      const matchesType =
        typeFilter === "ALL" || product.product_type === typeFilter;

      const matchesStatus =
        statusFilter === "ALL" || product.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [products, search, typeFilter, statusFilter]);

  function setField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function openAddForm() {
    setEditingProduct(null);
    setForm({ ...EMPTY_FORM });
    setImageFile(null);
    setImageInputKey((key) => key + 1);
    setShowForm(true);
    setError("");
    setMessage("");
  }

  function openEditForm(product) {
    setEditingProduct(product);
    setForm({
      product_name: product.product_name || "",
      brand: product.brand || "",
      model: product.model || "",
      product_type: product.product_type || "INVERTER",
      purchase_date: product.purchase_date || "",
      status: product.status || "ACTIVE",
      stock_quantity: String(product.stock_quantity ?? 0),
      price: String(product.price ?? 0),
      description: product.description || "",
    });
    setImageFile(null);
    setImageInputKey((key) => key + 1);
    setShowForm(true);
    setError("");
    setMessage("");
  }

  function closeForm() {
    setShowForm(false);
    setEditingProduct(null);
    setImageFile(null);
    setImageInputKey((key) => key + 1);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.product_name.trim() || !form.brand.trim() || !form.model.trim()) {
      setError("Product name, brand and model are required.");
      return;
    }

    if (Number(form.price) < 0 || Number(form.stock_quantity) < 0) {
      setError("Price and stock quantity cannot be negative.");
      return;
    }

    setSaving(true);

    try {
      const body = new FormData();

      body.append("product_name", form.product_name.trim());
      body.append("brand", form.brand.trim());
      body.append("model", form.model.trim());
      body.append("product_type", form.product_type);
      body.append("status", form.status);
      body.append("stock_quantity", String(Number(form.stock_quantity)));
      body.append("price", String(Number(form.price)));
      body.append("description", form.description);

      // Do not send a blank date; this also keeps existing date unchanged on edit.
      if (form.purchase_date) {
        body.append("purchase_date", form.purchase_date);
      }

      // On edit, leaving the image empty keeps the existing image.
      if (imageFile) {
        body.append("image", imageFile);
      }

      const isEditing = Boolean(editingProduct);
      const url = isEditing
        ? `${API_URL}${getId(editingProduct)}/`
        : API_URL;

      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: getHeaders(),
        body,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            `Could not ${isEditing ? "update" : "add"} product (${response.status}).`
          )
        );
      }

      closeForm();
      setMessage(
        isEditing ? "Product updated successfully." : "Product added successfully."
      );
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setError(err.message || "Unable to save product.");
    } finally {
      setSaving(false);
    }
  }

  const activeCount = products.filter((p) => p.status === "ACTIVE").length;
  const totalStock = products.reduce(
    (total, p) => total + Number(p.stock_quantity || 0),
    0
  );

  return (
    <div className="min-h-screen bg-[#F7F7F0] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-gradient-to-r from-[#103F35] to-[#17836C] p-6 text-white shadow-lg sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100">
            PowerCare · Administration
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold sm:text-4xl">Products</h1>
              <p className="mt-2 text-sm text-emerald-50 sm:text-base">
                Manage inverter and battery products, pricing and stock.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openAddForm}
                className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#173E2E] hover:bg-emerald-50"
              >
                + Add Product
              </button>

              <button
                type="button"
                onClick={() => setRefreshKey((key) => key + 1)}
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
            <p>{error}</p>
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
              {editingProduct ? "Edit Product" : "Add New Product"}
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Fields marked * are required. Existing products will not be deleted.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <FormField label="Product Name *">
                  <input
                    required
                    maxLength={100}
                    value={form.product_name}
                    onChange={(e) => setField("product_name", e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Home Inverter"
                  />
                </FormField>

                <FormField label="Brand *">
                  <input
                    required
                    maxLength={100}
                    value={form.brand}
                    onChange={(e) => setField("brand", e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Luminous"
                  />
                </FormField>

                <FormField label="Model *">
                  <input
                    required
                    maxLength={100}
                    value={form.model}
                    onChange={(e) => setField("model", e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Zelio 1700"
                  />
                </FormField>

                <FormField label="Product Type *">
                  <select
                    value={form.product_type}
                    onChange={(e) => setField("product_type", e.target.value)}
                    className={inputClass}
                  >
                    <option value="INVERTER">Inverter</option>
                    <option value="BATTERY">Battery</option>
                  </select>
                </FormField>

                <FormField label="Purchase Date">
                  <input
                    type="date"
                    value={form.purchase_date}
                    onChange={(e) => setField("purchase_date", e.target.value)}
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Status *">
                  <select
                    value={form.status}
                    onChange={(e) => setField("status", e.target.value)}
                    className={inputClass}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </FormField>

                <FormField label="Stock Quantity *">
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={form.stock_quantity}
                    onChange={(e) => setField("stock_quantity", e.target.value)}
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Price (₹) *">
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setField("price", e.target.value)}
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Product Image">
                  <input
                    key={imageInputKey}
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-700 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:font-semibold file:text-emerald-800"
                  />
                </FormField>
              </div>

              <FormField label="Description">
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  className={inputClass}
                  placeholder="Product details..."
                />
              </FormField>

              {editingProduct && getImageUrl(editingProduct.image) && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-stone-700">
                    Current Image
                  </p>
                  <img
                    src={getImageUrl(editingProduct.image)}
                    alt={editingProduct.product_name || "Current product"}
                    className="h-24 w-24 rounded-xl border border-stone-200 object-cover"
                  />
                  <p className="mt-1 text-xs text-stone-500">
                    Select a new image above only if you want to replace it.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#12624D] px-5 py-3 text-sm font-bold text-white hover:bg-[#103F35] disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingProduct
                      ? "Save Changes"
                      : "Save Product"}
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
          <SummaryCard title="Total Products" value={products.length} />
          <SummaryCard title="Active Products" value={activeCount} />
          <SummaryCard title="Total Stock Units" value={totalStock} />
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#E3E7D8] bg-white shadow-sm">
          <div className="grid gap-3 border-b border-stone-100 p-5 sm:grid-cols-3 sm:p-6">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, brand, model..."
              aria-label="Search products"
              className={inputClass}
            />

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter by product type"
              className={inputClass}
            >
              <option value="ALL">All Types</option>
              <option value="INVERTER">Inverter</option>
              <option value="BATTERY">Battery</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by product status"
              className={inputClass}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          {loading ? (
            <div className="p-10 text-center text-stone-500">Loading products...</div>
          ) : !error && filteredProducts.length === 0 ? (
            <div className="p-10 text-center text-stone-500">
              No matching products found.
            </div>
          ) : !error ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead className="bg-[#F2F7F2] text-xs uppercase tracking-wide text-[#285B46]">
                  <tr>
                    <th className="px-4 py-4">Product</th>
                    <th className="px-4 py-4">Brand / Model</th>
                    <th className="px-4 py-4">Type</th>
                    <th className="px-4 py-4">Price</th>
                    <th className="px-4 py-4">Stock</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-stone-100">
                  {filteredProducts.map((product) => {
                    const id = getId(product);
                    const active = product.status === "ACTIVE";
                    const imageUrl = getImageUrl(product.image);

                    return (
                      <tr key={id} className="transition hover:bg-[#F8FAF5]">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={product.product_name || "Product"}
                                className="h-14 w-14 rounded-xl border border-stone-200 object-cover"
                              />
                            ) : (
                              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50 text-xs font-bold text-emerald-800">
                                No Image
                              </div>
                            )}

                            <div>
                              <p className="font-bold text-[#173F32]">
                                {product.product_name || "Unnamed Product"}
                              </p>
                              <p className="mt-1 text-xs text-stone-500">
                                ID: #{id ?? "—"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-sm text-stone-600">
                          <p className="font-semibold">{product.brand || "—"}</p>
                          <p className="mt-1">{product.model || "—"}</p>
                        </td>

                        <td className="px-4 py-4 text-sm text-stone-600">
                          {product.product_type === "BATTERY" ? "Battery" : "Inverter"}
                        </td>

                        <td className="px-4 py-4 text-sm font-semibold text-stone-700">
                          {formatPrice(product.price)}
                        </td>

                        <td className="px-4 py-4 text-sm text-stone-600">
                          {product.stock_quantity ?? 0}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                              active
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-stone-100 text-stone-600"
                            }`}
                          >
                            {active ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => openEditForm(product)}
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
            Showing {loading ? 0 : filteredProducts.length} of {products.length} products.
          </div>
        </section>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-stone-300 bg-[#FCFCF8] px-4 py-3 text-sm text-stone-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

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
