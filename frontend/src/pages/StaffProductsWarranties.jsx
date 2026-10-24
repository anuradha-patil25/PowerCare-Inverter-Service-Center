
import { useEffect, useMemo, useState } from "react";

const API_BASE = "/api";

const getList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const dateText = (value) => {
  if (!value) return "—";
  const date = new Date(`${value}`.slice(0, 10) + "T00:00:00");
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN");
};

const statusStyle = (status) => {
  const value = String(status || "").toUpperCase();

  if (value === "ACTIVE") return "bg-emerald-100 text-emerald-800";
  if (value === "EXPIRED" || value === "INACTIVE")
    return "bg-rose-100 text-rose-800";
  if (value === "CANCELLED")
    return "bg-gray-200 text-gray-700";

  return "bg-amber-100 text-amber-800";
};

function StaffProductsWarranties() {
  const [tab, setTab] = useState("products");
  const [products, setProducts] = useState([]);
  const [warranties, setWarranties] = useState([]);
  const [serials, setSerials] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("access_token");
      const headers = token
        ? { Authorization: `Bearer ${token}` }
        : {};

      const endpoints = [
        `${API_BASE}/products/`,
        `${API_BASE}/warranties/`,
        `${API_BASE}/serial-numbers/`,
      ];

      const responses = await Promise.all(
        endpoints.map((url) =>
          fetch(url, { headers })
        )
      );

      for (const response of responses) {
        if (!response.ok) {
          throw new Error(
            `API request failed (${response.status}). Check the backend server and API response.`
          );
        }
      }

      const [productData, warrantyData, serialData] =
        await Promise.all(responses.map((response) => response.json()));

      setProducts(getList(productData));
      setWarranties(getList(warrantyData));
      setSerials(getList(serialData));
    } catch (err) {
      setError(err.message || "Could not load records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const serialMap = useMemo(
    () => new Map(serials.map((item) => [String(item.serial_id), item])),
    [serials]
  );

  const productMap = useMemo(
    () => new Map(products.map((item) => [String(item.product_id), item])),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((item) => {
      const matchesSearch = [
        item.product_name,
        item.brand,
        item.model,
        item.product_type,
      ].some((value) => String(value || "").toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === "ALL" ||
        String(item.status).toUpperCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [products, search, statusFilter]);

  const filteredWarranties = useMemo(() => {
    const query = search.trim().toLowerCase();

    return warranties.filter((item) => {
      const serial = serialMap.get(String(item.serial));
      const product = serial
        ? productMap.get(String(serial.product))
        : null;

      const searchable = [
        item.warranty_id,
        serial?.serial_number,
        product?.product_name,
        product?.brand,
        product?.model,
        item.status,
      ];

      const matchesSearch = searchable.some((value) =>
        String(value ?? "").toLowerCase().includes(query)
      );

      const matchesStatus =
        statusFilter === "ALL" ||
        String(item.status).toUpperCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [warranties, serialMap, productMap, search, statusFilter]);

  const stats = [
    { label: "Total Products", value: products.length },
    {
      label: "Active Products",
      value: products.filter((item) => item.status === "ACTIVE").length,
    },
    { label: "Total Warranties", value: warranties.length },
    {
      label: "Active Warranties",
      value: warranties.filter((item) => item.status === "ACTIVE").length,
    },
  ];

  const selectTab = (nextTab) => {
    setTab(nextTab);
    setSearch("");
    setStatusFilter("ALL");
  };

  return (
    <div className="min-h-screen bg-[#F3FAF8] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
              PowerCare · Staff Workspace
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
              Products &amp; Warranties
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              View product inventory and registered warranty records.
            </p>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="rounded-xl bg-[#075653] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#064744] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh Records"}
          </button>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-teal-100 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="mt-3 text-3xl font-bold text-[#075653]">
                {stat.value}
              </p>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-sm">
          <div className="flex flex-wrap gap-2 border-b border-slate-200 p-4">
            <button
              type="button"
              onClick={() => selectTab("products")}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
                tab === "products"
                  ? "bg-[#075653] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Products ({products.length})
            </button>

            <button
              type="button"
              onClick={() => selectTab("warranties")}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
                tab === "warranties"
                  ? "bg-[#075653] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Warranties ({warranties.length})
            </button>
          </div>

          <div className="flex flex-col gap-3 p-4 sm:flex-row">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                tab === "products"
                  ? "Search product, brand or model..."
                  : "Search warranty, serial number or product..."
              }
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-teal-700"
            >
              <option value="ALL">All Statuses</option>
              {(
                tab === "products"
                  ? ["ACTIVE", "INACTIVE"]
                  : ["ACTIVE", "EXPIRED", "CANCELLED"]
              ).map((status) => (
                <option value={status} key={status}>
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
                Make sure Django is running and the API URLs are accessible.
              </p>
            </div>
          )}

          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Loading records...
            </div>
          ) : tab === "products" ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-[#E7F4F1] text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-5 py-4">Product</th>
                    <th className="px-5 py-4">Brand / Model</th>
                    <th className="px-5 py-4">Type</th>
                    <th className="px-5 py-4">Price</th>
                    <th className="px-5 py-4">Stock</th>
                    <th className="px-5 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((item) => (
                    <tr key={item.product_id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {item.product_name || "—"}
                        <div className="mt-1 text-xs font-normal text-slate-500">
                          ID: {item.product_id}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {item.brand || "—"}
                        <div className="mt-1 text-xs text-slate-500">
                          {item.model || "—"}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {item.product_type || "—"}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-800">
                        {money(item.price)}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {item.stock_quantity ?? 0}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(item.status)}`}
                        >
                          {item.status || "UNKNOWN"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-5 py-12 text-center text-slate-500">
                        No matching products found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-[#E7F4F1] text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-5 py-4">Warranty ID</th>
                    <th className="px-5 py-4">Serial Number</th>
                    <th className="px-5 py-4">Product</th>
                    <th className="px-5 py-4">Start Date</th>
                    <th className="px-5 py-4">End Date</th>
                    <th className="px-5 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredWarranties.map((item) => {
                    const serial = serialMap.get(String(item.serial));
                    const product = serial
                      ? productMap.get(String(serial.product))
                      : null;

                    return (
                      <tr key={item.warranty_id} className="hover:bg-slate-50">
                        <td className="px-5 py-4 font-semibold text-slate-900">
                          #{item.warranty_id}
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-800">
                          {serial?.serial_number || `Serial ID: ${item.serial ?? "—"}`}
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {product
                            ? `${product.brand} ${product.model}`
                            : "Product details unavailable"}
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {dateText(item.start_date)}
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {dateText(item.end_date)}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(item.status)}`}
                          >
                            {item.status || "UNKNOWN"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredWarranties.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-5 py-12 text-center text-slate-500">
                        No matching warranty records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            Showing existing records from the backend. This page does not modify
            or delete product or warranty data.
          </div>
        </section>
      </div>
    </div>
  );
}

export default StaffProductsWarranties;
