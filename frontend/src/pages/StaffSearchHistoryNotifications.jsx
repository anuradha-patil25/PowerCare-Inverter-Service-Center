
import { useEffect, useMemo, useState } from "react";

const API_BASE = "/api";

const asList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.serials)) return data.serials;
  if (Array.isArray(data?.data)) return data.data;
  if (
    data &&
    typeof data === "object" &&
    (
      data.serial_number ||
      data.serial_id ||
      data.serial ||
      data.product_name
    )
  ) {
    return [data];
  }
  return [];
};

const firstValue = (...values) =>
  values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );

const showValue = (value) => {
  if (value === undefined || value === null || value === "") return "—";

  if (typeof value === "object") {
    return (
      value.name ||
      value.product_name ||
      value.customer_name ||
      value.serial_number ||
      value.title ||
      JSON.stringify(value)
    );
  }

  return String(value);
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-IN");
};

const formatDateTime = (value) => {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-IN");
};

const statusClass = (status) => {
  const value = String(status || "").toUpperCase();

  if (["ACTIVE", "COMPLETED", "SUCCESS", "PAID", "GOOD"].includes(value)) {
    return "bg-emerald-100 text-emerald-800";
  }

  if (["CANCELLED", "FAILED", "EXPIRED", "POOR"].includes(value)) {
    return "bg-rose-100 text-rose-800";
  }

  if (
    [
      "PENDING",
      "IN_PROGRESS",
      "PARTIAL",
      "UNPAID",
      "FAIR",
      "NEEDS_REPLACEMENT",
    ].includes(value)
  ) {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-slate-100 text-slate-700";
};

function StaffSearchHistoryNotifications() {
  const [activeTab, setActiveTab] = useState("search");

  // Serial Search
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Service History
  const [jobs, setJobs] = useState([]);
  const [historySearch, setHistorySearch] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  // Staff Notifications
  const [notifications, setNotifications] = useState([]);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [markingReadId, setMarkingReadId] = useState(null);

  const getHeaders = () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      throw new Error("Login session expired. Please log in again.");
    }

    return {
      Authorization: `Bearer ${token}`,
    };
  };

  // ---------------- SERIAL SEARCH ----------------

  const searchSerial = async (event) => {
    event?.preventDefault();

    const query = searchText.trim();

    if (!query) {
      setSearchError(
        "Enter a serial number, customer detail, or product to search."
      );
      setSearchResults([]);
      setSearched(false);
      return;
    }

    setSearchLoading(true);
    setSearchError("");
    setSearched(false);

    try {
      const response = await fetch(
        `${API_BASE}/staff/serial-lookup/?q=${encodeURIComponent(query)}`,
        {
          headers: getHeaders(),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.detail ||
            result.error ||
            (response.status === 401
              ? "Login session expired. Please log in again."
              : `Search failed (${response.status}).`)
        );
      }

      setSearchResults(asList(result));
      setSearched(true);
    } catch (error) {
      setSearchError(error.message || "Unable to search records.");
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // ---------------- SERVICE HISTORY ----------------

  const loadJobs = async () => {
    setHistoryLoading(true);
    setHistoryError("");

    try {
      const response = await fetch(`${API_BASE}/staff/jobs/`, {
        headers: getHeaders(),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.detail ||
            result.error ||
            (response.status === 401
              ? "Login session expired. Please log in again."
              : `Could not load service history (${response.status}).`)
        );
      }

      setJobs(asList(result));
    } catch (error) {
      setHistoryError(error.message || "Unable to load service history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  // ---------------- STAFF NOTIFICATIONS ----------------

  const loadNotifications = async () => {
    setNotificationLoading(true);
    setNotificationError("");

    try {
      const response = await fetch(
        `${API_BASE}/staff/notifications/`,
        {
          headers: getHeaders(),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.detail ||
            result.error ||
            (response.status === 401
              ? "Login session expired. Please log in again."
              : `Unable to load notifications (${response.status}).`)
        );
      }

      setNotifications(
        Array.isArray(result.notifications)
          ? result.notifications
          : []
      );
    } catch (error) {
      setNotificationError(
        error.message || "Unable to load staff notifications."
      );
    } finally {
      setNotificationLoading(false);
    }
  };

  const markNotificationRead = async (notificationId) => {
    setMarkingReadId(notificationId);
    setNotificationError("");

    try {
      const response = await fetch(
        `${API_BASE}/staff/notifications/${notificationId}/read/`,
        {
          method: "POST",
          headers: getHeaders(),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.detail ||
            result.error ||
            `Unable to mark notification as read (${response.status}).`
        );
      }

      setNotifications((current) =>
        current.map((item) =>
          item.notification_id === notificationId
            ? {
                ...item,
                is_read: true,
                read_at: new Date().toISOString(),
              }
            : item
        )
      );
    } catch (error) {
      setNotificationError(
        error.message || "Unable to mark notification as read."
      );
    } finally {
      setMarkingReadId(null);
    }
  };

  useEffect(() => {
    loadJobs();
    loadNotifications();
  }, []);

  // ---------------- FILTER SERVICE HISTORY ----------------

  const filteredJobs = useMemo(() => {
    const query = historySearch.trim().toLowerCase();

    if (!query) return jobs;

    return jobs.filter((job) => {
      const values = [
        job.job_id,
        job.customer,
        job.customer_name,
        job.serial,
        job.serial_number,
        job.service_date,
        job.service_type,
        job.problem_description,
        job.diagnosis,
        job.status,
      ];

      return values.some((value) =>
        showValue(value).toLowerCase().includes(query)
      );
    });
  }, [jobs, historySearch]);

  const unreadCount = notifications.filter(
    (item) => !item.is_read
  ).length;

  // ---------------- SERIAL SEARCH RESULT CARD ----------------

  const renderSearchRecord = (record, index) => {
    const serial =
      record.serial && typeof record.serial === "object"
        ? record.serial
        : {};

    const product =
      record.product && typeof record.product === "object"
        ? record.product
        : serial.product && typeof serial.product === "object"
          ? serial.product
          : {};

    const customer =
      record.customer && typeof record.customer === "object"
        ? record.customer
        : serial.customer && typeof serial.customer === "object"
          ? serial.customer
          : {};

    const warranty =
      record.warranty && typeof record.warranty === "object"
        ? record.warranty
        : {};

    const serialNumber = firstValue(
      record.serial_number,
      serial.serial_number,
      record.serial_code
    );

    const productName = firstValue(
      record.product_name,
      product.product_name,
      product.name
    );

    const brand = firstValue(
      record.brand,
      record.product_brand,
      product.brand
    );

    const model = firstValue(
      record.model,
      record.product_model,
      product.model
    );

    const customerName = firstValue(
      record.customer_name,
      customer.name,
      customer.customer_name,
      customer.full_name
    );

    const customerPhone = firstValue(
      record.customer_phone,
      record.phone,
      customer.phone,
      customer.phone_number
    );

    const customerEmail = firstValue(
      record.customer_email,
      record.email,
      customer.email
    );

    const warrantyStatus = firstValue(
      record.warranty_status,
      warranty.status
    );

    const startDate = firstValue(
      record.warranty_start_date,
      record.start_date,
      warranty.start_date
    );

    const endDate = firstValue(
      record.warranty_end_date,
      record.end_date,
      warranty.end_date
    );

    const serialStatus = firstValue(
      record.status,
      serial.status
    );

    return (
      <article
        key={record.serial_id || serial.serial_id || serialNumber || index}
        className="rounded-2xl border border-teal-100 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
              Serial Number
            </p>

            <h3 className="mt-1 break-all text-lg font-bold text-slate-900">
              {showValue(serialNumber)}
            </h3>

            <p className="mt-1 text-sm text-slate-600">
              {showValue(brand)} {showValue(model)}
            </p>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(serialStatus)}`}
          >
            {showValue(serialStatus)}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs text-slate-500">Product</p>
            <p className="mt-1 font-medium text-slate-800">
              {showValue(productName)}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500">Customer</p>
            <p className="mt-1 font-medium text-slate-800">
              {showValue(customerName)}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500">Phone</p>
            <p className="mt-1 font-medium text-slate-800">
              {showValue(customerPhone)}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500">Email</p>
            <p className="mt-1 break-all font-medium text-slate-800">
              {showValue(customerEmail)}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500">Warranty Start</p>
            <p className="mt-1 font-medium text-slate-800">
              {formatDate(startDate)}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500">Warranty End</p>
            <p className="mt-1 font-medium text-slate-800">
              {formatDate(endDate)}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500">Warranty Status</p>
            <p className="mt-1 font-medium text-slate-800">
              {showValue(warrantyStatus)}
            </p>
          </div>
        </div>

        <details className="mt-4 border-t border-slate-100 pt-3">
          <summary className="cursor-pointer text-sm font-semibold text-teal-800">
            View returned record details
          </summary>

          <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
            {JSON.stringify(record, null, 2)}
          </pre>
        </details>
      </article>
    );
  };

  return (
    <div className="min-h-screen bg-[#F3FAF8] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* PAGE HEADER */}
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
            PowerCare · Staff Workspace
          </p>

          <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            Search, History &amp; Notifications
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Find serial records, review assigned service jobs, and manage staff notifications.
          </p>
        </header>

        {/* SUMMARY CARDS */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Search", value: "Serial lookup" },
            {
              label: "Service History",
              value: `${jobs.length} jobs`,
            },
            {
              label: "Notifications",
              value: `${unreadCount} unread`,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-teal-100 bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className="mt-2 text-lg font-bold text-[#075653]">
                {item.value}
              </p>
            </div>
          ))}
        </section>

        {/* TABS */}
        <section className="overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-sm">
          <div className="flex flex-wrap gap-2 border-b border-slate-200 p-4">
            {[
              { id: "search", label: "Serial Search" },
              { id: "history", label: "Service History" },
              {
                id: "notifications",
                label: `Notifications${unreadCount > 0 ? ` (${unreadCount})` : ""}`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
                  activeTab === tab.id
                    ? "bg-[#075653] text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* SERIAL SEARCH TAB */}
          {activeTab === "search" && (
            <div className="space-y-5 p-4 sm:p-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Search Customer or Serial Number
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Search using a serial number or another value supported by the staff serial lookup API.
                </p>
              </div>

              <form
                onSubmit={searchSerial}
                className="flex flex-col gap-3 sm:flex-row"
              >
                <input
                  type="search"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Example: INVTEST001"
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                />

                <button
                  type="submit"
                  disabled={searchLoading}
                  className="rounded-xl bg-[#075653] px-6 py-3 text-sm font-semibold text-white hover:bg-[#064744] disabled:opacity-60"
                >
                  {searchLoading ? "Searching..." : "Search"}
                </button>
              </form>

              {searchError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                  {searchError}
                </div>
              )}

              {searched && !searchError && searchResults.length === 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
                  No matching records returned.
                </div>
              )}

              {searchResults.map(renderSearchRecord)}
            </div>
          )}

          {/* SERVICE HISTORY TAB */}
          {activeTab === "history" && (
            <div className="space-y-5 p-4 sm:p-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Assigned Service History
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Records returned by the staff jobs endpoint.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadJobs}
                  disabled={historyLoading}
                  className="rounded-xl border border-teal-700 px-4 py-2.5 text-sm font-semibold text-teal-800 hover:bg-teal-50 disabled:opacity-60"
                >
                  {historyLoading ? "Refreshing..." : "Refresh History"}
                </button>
              </div>

              <input
                type="search"
                value={historySearch}
                onChange={(event) => setHistorySearch(event.target.value)}
                placeholder="Filter by job ID, customer, serial, status or problem..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              />

              {historyError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                  {historyError}
                </div>
              )}

              {historyLoading ? (
                <div className="py-10 text-center text-sm text-slate-500">
                  Loading service history...
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredJobs.map((job) => (
                    <article
                      key={job.job_id}
                      className="rounded-2xl border border-slate-200 p-4 transition hover:border-teal-200"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-slate-900">
                            Job #{showValue(job.job_id)}
                          </h3>

                          <p className="mt-1 text-sm text-slate-600">
                            {showValue(job.problem_description)}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(job.status)}`}
                        >
                          {showValue(job.status)}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <p className="text-xs text-slate-500">
                            Service Date
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-800">
                            {formatDate(job.service_date)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">
                            Customer ID / Name
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-800">
                            {showValue(
                              firstValue(job.customer_name, job.customer)
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">Serial</p>
                          <p className="mt-1 text-sm font-medium text-slate-800">
                            {showValue(
                              firstValue(job.serial_number, job.serial)
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">
                            Service Type
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-800">
                            {showValue(job.service_type)}
                          </p>
                        </div>
                      </div>

                      {job.diagnosis && (
                        <div className="mt-4 rounded-xl bg-slate-50 p-3">
                          <p className="text-xs font-semibold text-slate-500">
                            Diagnosis
                          </p>

                          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                            {job.diagnosis}
                          </p>
                        </div>
                      )}
                    </article>
                  ))}

                  {filteredJobs.length === 0 && !historyError && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
                      No matching service history records found.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STAFF NOTIFICATIONS TAB */}
          {activeTab === "notifications" && (
            <div className="space-y-5 p-4 sm:p-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Staff Notifications
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Review staff updates and mark notifications as read.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadNotifications}
                  disabled={notificationLoading}
                  className="rounded-xl border border-teal-700 px-4 py-2.5 text-sm font-semibold text-teal-800 hover:bg-teal-50 disabled:opacity-60"
                >
                  {notificationLoading
                    ? "Refreshing..."
                    : "Refresh Notifications"}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-teal-100 bg-teal-50 p-4">
                  <p className="text-sm text-teal-800">
                    Total Notifications
                  </p>
                  <p className="mt-1 text-2xl font-bold text-teal-900">
                    {notifications.length}
                  </p>
                </div>

                <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                  <p className="text-sm text-amber-800">
                    Unread Notifications
                  </p>
                  <p className="mt-1 text-2xl font-bold text-amber-900">
                    {unreadCount}
                  </p>
                </div>
              </div>

              {notificationError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                  <p className="font-semibold">
                    Could not load or update notifications
                  </p>
                  <p className="mt-1">{notificationError}</p>
                </div>
              )}

              {notificationLoading ? (
                <div className="py-10 text-center text-sm text-slate-500">
                  Loading notifications...
                </div>
              ) : notifications.length === 0 && !notificationError ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
                  <h3 className="font-semibold text-slate-800">
                    No notifications yet
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    New staff notifications will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((item) => (
                    <article
                      key={item.notification_id}
                      className={`rounded-2xl border p-5 ${
                        item.is_read
                          ? "border-slate-200 bg-white"
                          : "border-teal-200 bg-teal-50"
                      }`}
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-slate-900">
                              {item.title}
                            </h3>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                item.is_read
                                  ? "bg-slate-200 text-slate-700"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {item.is_read ? "READ" : "UNREAD"}
                            </span>
                          </div>

                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                            {item.message}
                          </p>

                          <div className="mt-3 text-xs text-slate-500">
                            {String(
                              item.notification_type || "GENERAL"
                            ).replaceAll("_", " ")}
                            {" · "}
                            {formatDateTime(item.created_at)}
                          </div>

                          {item.read_at && (
                            <p className="mt-1 text-xs text-slate-500">
                              Read at: {formatDateTime(item.read_at)}
                            </p>
                          )}
                        </div>

                        {!item.is_read && (
                          <button
                            type="button"
                            onClick={() =>
                              markNotificationRead(item.notification_id)
                            }
                            disabled={
                              markingReadId === item.notification_id
                            }
                            className="shrink-0 rounded-xl bg-[#075653] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#064744] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {markingReadId === item.notification_id
                              ? "Updating..."
                              : "Mark as Read"}
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default StaffSearchHistoryNotifications;
