import { useEffect, useState } from "react";

const API_BASE = "http://127.0.0.1:8000/api";

export default function StaffCustomersSerialLookup() {
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadSerials() {
      const token = localStorage.getItem("access_token");

      setLoading(true);
      setError("");
      setResults([]);

      if (!token) {
        setError("Please log in with a Staff account.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE}/staff/serial-lookup/?q=${encodeURIComponent(query)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data.detail || `Request failed (${response.status}).`
          );
        }

        if (!cancelled) {
          setResults(
            Array.isArray(data.results) ? data.results : []
          );
          setTotalCount(data.count || 0);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load serial records.");
          setTotalCount(0);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSerials();

    return () => {
      cancelled = true;
    };
  }, [query]);

  function handleSearch(event) {
    event.preventDefault();
    setQuery(searchInput.trim());
  }

  function clearSearch() {
    setSearchInput("");
    setQuery("");
  }

  const statusClass = (status) => {
    if (status === "ACTIVE" || status === "PAID") {
      return "bg-emerald-100 text-emerald-800";
    }

    if (status === "EXPIRED" || status === "CANCELLED") {
      return "bg-red-100 text-red-700";
    }

    return "bg-stone-100 text-stone-700";
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">
            Staff Workspace
          </p>

          <h1 className="mt-2 text-2xl font-bold text-stone-900 sm:text-3xl">
            Customers & Serial Lookup
          </h1>

          <p className="mt-2 text-sm text-stone-600">
            Search inverter and battery records using a serial number,
            product name, brand, model or customer phone number.
          </p>
        </div>

        <form
          onSubmit={handleSearch}
          className="mb-6 rounded-2xl border border-teal-100 bg-white p-4 shadow-sm sm:p-6"
        >
          <label
            htmlFor="serial-search"
            className="mb-2 block text-sm font-semibold text-stone-700"
          >
            Search records
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="serial-search"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Enter serial number, product or customer phone..."
              className="min-w-0 flex-1 rounded-xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            />

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-[#064E4F] px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Search
            </button>

            <button
              type="button"
              onClick={clearSearch}
              className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
            >
              Clear
            </button>
          </div>
        </form>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-stone-800">
            Serial Number Records
          </h2>

          <span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-800">
            {totalCount} record(s)
          </span>
        </div>

        {loading && (
          <div className="rounded-2xl border border-teal-100 bg-white p-8 text-center text-sm text-stone-600">
            Loading records...
          </div>
        )}

        {!loading && error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {!loading && !error && results.length === 0 && (
          <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center">
            <h3 className="font-semibold text-stone-800">
              No records found
            </h3>
            <p className="mt-2 text-sm text-stone-500">
              Try another serial number, product name or phone number.
            </p>
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-teal-100 bg-white shadow-sm">
            <table className="min-w-[1050px] w-full text-left text-sm">
              <thead className="bg-[#064E4F] text-white">
                <tr>
                  <th className="px-4 py-4 font-semibold">Serial Number</th>
                  <th className="px-4 py-4 font-semibold">Product</th>
                  <th className="px-4 py-4 font-semibold">Customer</th>
                  <th className="px-4 py-4 font-semibold">Warranty</th>
                  <th className="px-4 py-4 font-semibold">Registered</th>
                  <th className="px-4 py-4 font-semibold">Serial Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-stone-100">
                {results.map((item) => (
                  <tr
                    key={item.serial_id}
                    className="align-top transition hover:bg-teal-50/50"
                  >
                    <td className="px-4 py-4">
                      <p className="font-semibold text-stone-900">
                        {item.serial_number}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        ID: {item.serial_id}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-semibold text-stone-800">
                        {item.product?.product_name || "—"}
                      </p>
                      <p className="mt-1 text-stone-600">
                        {item.product?.brand || "—"}{" "}
                        {item.product?.model || ""}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        {item.product?.product_type || "—"}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      {item.customer ? (
                        <>
                          <p className="font-semibold text-stone-800">
                            {item.customer.customer_name}
                          </p>
                          <p className="mt-1 text-stone-600">
                            {item.customer.phone}
                          </p>
                          {item.customer.email && (
                            <p className="mt-1 text-xs text-stone-500">
                              {item.customer.email}
                            </p>
                          )}
                        </>
                      ) : (
                        <span className="text-stone-400">
                          Not registered
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      {item.warranty ? (
                        <>
                          <span
                            className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                              item.warranty.status
                            )}`}
                          >
                            {item.warranty.status}
                          </span>
                          <p className="mt-2 text-xs text-stone-600">
                            {item.warranty.start_date}
                          </p>
                          <p className="mt-1 text-xs text-stone-600">
                            to {item.warranty.end_date}
                          </p>
                        </>
                      ) : (
                        <span className="text-stone-400">
                          No warranty record
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4 text-stone-600">
                      {item.registered_date || "—"}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                          item.serial_status
                        )}`}
                      >
                        {item.serial_status || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && results.length > 0 && totalCount > results.length && (
          <p className="mt-3 text-sm text-stone-500">
            Showing the first {results.length} records. Search to narrow down
            the results.
          </p>
        )}
      </div>
    </div>
  );
}