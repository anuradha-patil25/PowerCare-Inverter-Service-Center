import { useEffect, useMemo, useState } from "react";

const API_URL = "http://127.0.0.1:8000/api/admin/audit-log/";

function getLogs(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.logs)) return data.logs;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function formatDate(value) {
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

function ActionBadge({ value }) {
  const action = String(value || "OTHER").toUpperCase();

  const styles = {
    CREATE: "bg-emerald-100 text-emerald-800",
    UPDATE: "bg-teal-100 text-teal-800",
    DELETE: "bg-red-100 text-red-800",
    LOGIN: "bg-lime-100 text-lime-800",
    LOGOUT: "bg-stone-100 text-stone-600",
    STATUS_CHANGE: "bg-amber-100 text-amber-800",
    OTHER: "bg-stone-100 text-stone-600",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
        styles[action] || styles.OTHER
      }`}
    >
      {action.replace(/_/g, " ")}
    </span>
  );
}

export default function AdminAuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");

  useEffect(() => {
    let active = true;

    async function loadLogs() {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("access_token");

        const response = await fetch(API_URL, {
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : {},
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new Error(
              "Access denied. Please log in with an Admin account."
            );
          }

          throw new Error(
            `Failed to load audit logs. HTTP ${response.status}`
          );
        }

        const data = await response.json();

        if (
          !Array.isArray(data) &&
          !Array.isArray(data?.logs) &&
          !Array.isArray(data?.results)
        ) {
          throw new Error("Invalid audit log API response.");
        }

        if (active) {
          setLogs(getLogs(data));
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load audit logs.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadLogs();

    return () => {
      active = false;
    };
  }, []);

  const actionOptions = useMemo(
    () =>
      [
        ...new Set(
          logs.map((log) =>
            String(log.action || "OTHER").toUpperCase()
          )
        ),
      ].sort(),
    [logs]
  );

  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase();

    return logs.filter((log) => {
      const searchableText = [
        log.audit_log_id,
        log.username,
        log.user_id,
        log.action,
        log.entity_type,
        log.entity_id,
        log.description,
        log.ip_address,
        log.created_at,
      ]
        .map((value) => value ?? "")
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableText.includes(term);

      const action = String(log.action || "OTHER").toUpperCase();

      const matchesAction =
        actionFilter === "ALL" || action === actionFilter;

      return matchesSearch && matchesAction;
    });
  }, [logs, search, actionFilter]);

  const uniqueUsers = new Set(
    logs.map((log) => log.user_id).filter((id) => id !== null && id !== undefined)
  ).size;

  const actionCount = (action) =>
    logs.filter(
      (log) =>
        String(log.action || "OTHER").toUpperCase() === action
    ).length;

  const cards = [
    { label: "Total Audit Entries", value: logs.length },
    { label: "Users Recorded", value: uniqueUsers },
    { label: "Updates", value: actionCount("UPDATE") },
    { label: "Status Changes", value: actionCount("STATUS_CHANGE") },
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
          .pc-title { color: #173F32; }
          .pc-thead { background-color: #F2F7F2; color: #285B46; }
          .pc-row:hover { background-color: #F8FAF5; }
          .pc-input { background-color: #FCFCF8; border-color: #D6D3D1; color: #292524; }
          .pc-input:focus { border-color: #059669; box-shadow: 0 0 0 2px #D1FAE5; }
          .pc-value { color: #12624D; }
        `}</style>

        <div className="pc-header rounded-3xl bg-gradient-to-r from-[#103F35] to-[#17836C] p-6 text-white shadow-lg sm:p-8">
          <p className="pc-eyebrow text-xs font-bold uppercase tracking-[0.2em] text-emerald-100 sm:text-sm">
            PowerCare · Administration
          </p>

          <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">
            Audit Log
          </h1>

          <p className="pc-sub mt-2 text-sm leading-6 text-emerald-50 sm:text-base">
            Review recorded system activities and changes.
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
              <p className="pc-value mt-3 text-4xl font-extrabold text-[#12624D]">
                {loading ? "—" : card.value}
              </p>
            </div>
          ))}
        </section>

        <section className="pc-card overflow-hidden rounded-2xl border border-[#E3E7D8] bg-white shadow-sm">
          <div className="grid grid-cols-1 gap-3 border-b border-stone-100 p-5 sm:p-6 md:grid-cols-2">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search user, action, record or description..."
              className="pc-input min-w-0 rounded-xl border border-stone-300 bg-[#FCFCF8] px-4 py-3 text-base text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />

            <select
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              className="pc-input rounded-xl border border-stone-300 bg-[#FCFCF8] px-4 py-3 text-base text-stone-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="ALL">All Actions</option>
              {actionOptions.map((action) => (
                <option key={action} value={action}>
                  {action.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          {loading && (
            <p className="p-10 text-center text-base text-stone-500">
              Loading audit logs...
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

          {!loading && !error && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left text-sm">
                  <thead className="pc-thead bg-[#F2F7F2] text-xs uppercase tracking-wide text-[#285B46] sm:text-sm">
                    <tr>
                      <th className="px-5 py-4 font-bold">Log ID</th>
                      <th className="px-5 py-4 font-bold">Date &amp; Time</th>
                      <th className="px-5 py-4 font-bold">User</th>
                      <th className="px-5 py-4 font-bold">Action</th>
                      <th className="px-5 py-4 font-bold">Entity</th>
                      <th className="px-5 py-4 font-bold">Record ID</th>
                      <th className="px-5 py-4 font-bold">Description</th>
                      <th className="px-5 py-4 font-bold">IP Address</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-stone-100">
                    {filteredLogs.map((log, index) => (
                      <tr
                        key={log.audit_log_id ?? index}
                        className="pc-row transition hover:bg-[#F8FAF5]"
                      >
                        <td className="px-5 py-4 font-semibold text-stone-600">
                          #{log.audit_log_id ?? "—"}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-stone-600">
                          {formatDate(log.created_at)}
                        </td>

                        <td className="pc-title px-5 py-4 font-bold text-[#173F32]">
                          {log.username || "Unknown"}
                          {log.user_id != null && (
                            <p className="mt-1 text-xs font-semibold text-stone-500">
                              User ID: {log.user_id}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <ActionBadge value={log.action} />
                        </td>

                        <td className="px-5 py-4 text-stone-600">
                          {log.entity_type || "—"}
                        </td>

                        <td className="px-5 py-4 text-stone-600">
                          {log.entity_id || "—"}
                        </td>

                        <td className="max-w-sm whitespace-normal px-5 py-4 text-stone-600">
                          {log.description || "—"}
                        </td>

                        <td className="px-5 py-4 text-stone-600">
                          {log.ip_address || "—"}
                        </td>
                      </tr>
                    ))}

                    {filteredLogs.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="p-10 text-center text-base text-stone-500"
                        >
                          No audit log entries found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <p className="border-t border-stone-100 px-5 py-4 text-sm text-stone-500">
                Showing {filteredLogs.length} of {logs.length} entries
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}