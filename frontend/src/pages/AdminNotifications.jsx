import { useEffect, useMemo, useState } from "react";

const API_URL = "/api/admin/notifications/";

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

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [recipientFilter, setRecipientFilter] = useState("ALL");
  const [readFilter, setReadFilter] = useState("ALL");

  useEffect(() => {
    let active = true;

    async function loadNotifications() {
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
            `Failed to load notifications. HTTP ${response.status}`
          );
        }

        const data = await response.json();
        const list = Array.isArray(data)
          ? data
          : data.notifications;

        if (!Array.isArray(list)) {
          throw new Error("Invalid notifications API response.");
        }

        if (active) setNotifications(list);
      } catch (err) {
        if (active) {
          setError(
            err.message || "Failed to load notifications."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadNotifications();

    return () => {
      active = false;
    };
  }, []);

  const unreadCount = notifications.filter(
    (item) => !item.is_read
  ).length;

  const customerCount = notifications.filter(
    (item) => item.recipient_type === "Customer"
  ).length;

  const staffCount = notifications.filter(
    (item) => item.recipient_type === "Staff"
  ).length;

  const filteredNotifications = useMemo(() => {
    const term = search.trim().toLowerCase();

    return notifications.filter((item) => {
      const searchableText = [
        item.title,
        item.message,
        item.notification_type,
        item.recipient_name,
        item.recipient_email,
        item.recipient_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableText.includes(term);

      const matchesRecipient =
        recipientFilter === "ALL" ||
        item.recipient_type === recipientFilter;

      const matchesRead =
        readFilter === "ALL" ||
        (readFilter === "UNREAD" && !item.is_read) ||
        (readFilter === "READ" && item.is_read);

      return matchesSearch && matchesRecipient && matchesRead;
    });
  }, [notifications, search, recipientFilter, readFilter]);

  const cards = [
    { label: "Total Notifications", value: notifications.length },
    { label: "Unread Notifications", value: unreadCount },
    { label: "Customer Notifications", value: customerCount },
    { label: "Staff Notifications", value: staffCount },
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
          .pc-tile { background-color: #F2F7F2; }
          .pc-row:hover { background-color: #F8FAF5; border-color: #A7F3D0; }
          .pc-input { background-color: #FCFCF8; border-color: #D6D3D1; color: #292524; }
          .pc-input:focus { border-color: #059669; box-shadow: 0 0 0 2px #D1FAE5; }
          .pc-value { color: #12624D; }
        `}</style>

        <div className="pc-header rounded-3xl bg-gradient-to-r from-[#103F35] to-[#17836C] p-6 text-white shadow-lg sm:p-8">
          <p className="pc-eyebrow text-xs font-bold uppercase tracking-[0.2em] text-emerald-100 sm:text-sm">
            PowerCare · Administration
          </p>

          <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">
            Notifications
          </h1>

          <p className="pc-sub mt-2 text-sm leading-6 text-emerald-50 sm:text-base">
            Monitor notifications sent to customers and staff.
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
          <div className="grid grid-cols-1 gap-3 border-b border-stone-100 p-5 sm:p-6 lg:grid-cols-3">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, message or recipient..."
              className="pc-input min-w-0 rounded-xl border border-stone-300 bg-[#FCFCF8] px-4 py-3 text-base text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />

            <select
              value={recipientFilter}
              onChange={(event) => setRecipientFilter(event.target.value)}
              className="pc-input rounded-xl border border-stone-300 bg-[#FCFCF8] px-4 py-3 text-base text-stone-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="ALL">All Recipients</option>
              <option value="Customer">Customers</option>
              <option value="Staff">Staff</option>
            </select>

            <select
              value={readFilter}
              onChange={(event) => setReadFilter(event.target.value)}
              className="pc-input rounded-xl border border-stone-300 bg-[#FCFCF8] px-4 py-3 text-base text-stone-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="ALL">All Read Statuses</option>
              <option value="UNREAD">Unread</option>
              <option value="READ">Read</option>
            </select>
          </div>

          {loading && (
            <p className="p-10 text-center text-base text-stone-500">
              Loading notifications...
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
              {filteredNotifications.length === 0 ? (
                <div className="pc-tile m-5 rounded-xl bg-[#F2F7F2] p-10 text-center sm:m-6">
                  <h2 className="pc-title text-lg font-bold text-[#173F32]">
                    No notifications found
                  </h2>
                  <p className="mt-2 text-sm text-stone-500">
                    Notifications matching the selected filters will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 p-5 sm:p-6">
                  {filteredNotifications.map((item) => (
                    <article
                      key={item.notification_key}
                      className="pc-row rounded-xl border border-stone-200 p-4 transition hover:border-emerald-200 hover:bg-[#F8FAF5] sm:p-5"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                              {item.recipient_type || "Unknown"}
                            </span>

                            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-600">
                              {(item.notification_type || "GENERAL").replace(/_/g, " ")}
                            </span>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${
                                item.is_read
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {item.is_read ? "Read" : "Unread"}
                            </span>
                          </div>

                          <h2 className="pc-title text-lg font-bold text-[#173F32]">
                            {item.title || "Untitled Notification"}
                          </h2>

                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-600">
                            {item.message || "No message provided."}
                          </p>
                        </div>

                        <p className="shrink-0 text-xs text-stone-500">
                          {formatDate(item.created_at)}
                        </p>
                      </div>

                      <div className="mt-4 flex flex-col gap-1 border-t border-stone-100 pt-3 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <span className="font-semibold text-stone-700">
                            Recipient:
                          </span>{" "}
                          {item.recipient_name || "Unknown"}
                          {item.recipient_email
                            ? ` · ${item.recipient_email}`
                            : ""}
                        </div>

                        <div>
                          <span className="font-semibold text-stone-700">
                            Notification ID:
                          </span>{" "}
                          {item.notification_id}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              <p className="border-t border-stone-100 px-5 py-4 text-sm text-stone-500">
                Showing {filteredNotifications.length} of {notifications.length} notifications
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}