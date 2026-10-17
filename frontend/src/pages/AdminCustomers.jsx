import { useCallback, useEffect, useMemo, useState } from "react";

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const loadCustomers = useCallback(async (signal) => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("access_token");

      const response = await fetch("/api/customers/", {
        method: "GET",
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : {},
        signal,
      });

      if (!response.ok) {
        throw new Error(
          `Could not load customers (HTTP ${response.status}).`
        );
      }

      const data = await response.json();

      const rows = Array.isArray(data)
        ? data
        : Array.isArray(data.results)
        ? data.results
        : null;

      if (!rows) {
        throw new Error("Unexpected customer API response format.");
      }

      setCustomers(rows);
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Admin customers error:", err);
        setError(
          err.message || "Unable to load customer records."
        );
      }
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadCustomers(controller.signal);

    return () => controller.abort();
  }, [loadCustomers, reloadKey]);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return customers;

    return customers.filter((customer) =>
      [
        customer.customer_id,
        customer.customer_name,
        customer.phone,
        customer.email,
        customer.address,
        customer.status,
      ].some((value) =>
        String(value ?? "").toLowerCase().includes(query)
      )
    );
  }, [customers, search]);

  return (
    <div className="pc-page min-h-screen bg-[#F7F7F0] p-4 sm:p-6 lg:p-8">
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
          .pc-btn-light { background-color: #ffffff; color: #173E2E; }
          .pc-value { color: #12624D; }
        `}</style>

        {/* Page Heading */}
        <div className="pc-header flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-[#103F35] to-[#17836C] p-6 text-white shadow-lg sm:p-8">
          <div>
            <p className="pc-eyebrow text-xs font-bold uppercase tracking-[0.2em] text-emerald-100 sm:text-sm">
              PowerCare · Administration
            </p>

            <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">
              Customers
            </h1>

            <p className="pc-sub mt-2 text-sm leading-6 text-emerald-50 sm:text-base">
              View and search registered customer records.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            disabled={loading}
            className="pc-btn-light rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#173E2E] transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm font-semibold text-stone-600">Total Customers</p>
            <p className="pc-value mt-3 text-4xl font-extrabold text-[#12624D]">
              {loading ? "—" : customers.length.toLocaleString()}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm font-semibold text-stone-600">Matching Records</p>
            <p className="pc-value mt-3 text-4xl font-extrabold text-[#12624D]">
              {loading ? "—" : filteredCustomers.length.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
          <label
            htmlFor="customer-search"
            className="mb-2 block text-sm font-semibold text-stone-700"
          >
            Search Customers
          </label>

          <input
            id="customer-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, phone, email, address or ID..."
            className="pc-input w-full rounded-xl border border-stone-300 bg-[#FCFCF8] px-4 py-3 text-base text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
          >
            <p className="font-bold">Could not load customer records.</p>
            <p className="mt-1">{error}</p>
            <p className="mt-2">
              Check that the Django backend is running and the customer API
              is available.
            </p>

            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="mt-3 rounded-lg border border-red-300 px-3 py-2 text-xs font-bold hover:bg-red-100"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Customer Table */}
        <div className="pc-card overflow-hidden rounded-2xl border border-[#E3E7D8] bg-white shadow-sm">
          <div className="border-b border-stone-100 p-5 sm:p-6">
            <h2 className="pc-title text-xl font-bold text-[#173F32] sm:text-2xl">
              Customer Records
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Records are read from the existing customer API.
            </p>
          </div>

          {loading ? (
            <div className="p-10 text-center text-base text-stone-500">
              Loading customer records...
            </div>
          ) : error ? (
            <div className="p-10 text-center text-base text-stone-500">
              Customer table is unavailable until the API request succeeds.
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-lg font-bold text-stone-700">
                No customers found
              </p>
              <p className="mt-2 text-sm text-stone-500">
                {search
                  ? "Try another search term."
                  : "No customer records were returned by the API."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="pc-thead bg-[#F2F7F2] text-xs uppercase tracking-wide text-[#285B46] sm:text-sm">
                  <tr>
                    <th className="px-5 py-4 font-bold">ID</th>
                    <th className="px-5 py-4 font-bold">Customer</th>
                    <th className="px-5 py-4 font-bold">Phone</th>
                    <th className="px-5 py-4 font-bold">Email</th>
                    <th className="px-5 py-4 font-bold">Address</th>
                    <th className="px-5 py-4 font-bold">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-stone-100">
                  {filteredCustomers.map((customer, index) => (
                    <tr
                      key={
                        customer.customer_id ??
                        customer.id ??
                        `${customer.phone}-${index}`
                      }
                      className="pc-row transition hover:bg-[#F8FAF5]"
                    >
                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-stone-600">
                        {customer.customer_id ?? "—"}
                      </td>

                      <td className="pc-title px-5 py-4 font-bold text-[#173F32]">
                        {customer.customer_name || "—"}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-stone-600">
                        {customer.phone || "—"}
                      </td>

                      <td className="px-5 py-4 text-stone-600">
                        {customer.email || "—"}
                      </td>

                      <td className="max-w-[220px] px-5 py-4 text-stone-600">
                        <span className="line-clamp-2">
                          {customer.address || "—"}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                          {customer.status || "Not specified"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}