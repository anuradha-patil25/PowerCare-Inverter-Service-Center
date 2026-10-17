import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

async function notificationApi(url, options = {}) {
  let accessToken = localStorage.getItem("access_token");
  const refreshToken = localStorage.getItem("refresh_token");

  if (!accessToken) {
    const error = new Error("Please log in to view notifications.");
    error.loginRequired = true;
    throw error;
  }

  const sendRequest = (token) =>
    fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

  let response = await sendRequest(accessToken);

  if (response.status === 401 && refreshToken) {
    const refreshResponse = await fetch("/api/auth/refresh/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    const refreshData = await refreshResponse.json().catch(() => ({}));

    if (refreshResponse.ok && refreshData.access) {
      accessToken = refreshData.access;
      localStorage.setItem("access_token", accessToken);

      if (refreshData.refresh) {
        localStorage.setItem("refresh_token", refreshData.refresh);
      }

      response = await sendRequest(accessToken);
    } else {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("current_user");

      const error = new Error("Your login session has expired.");
      error.loginRequired = true;
      throw error;
    }
  }

  if (response.status === 401) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("current_user");

    const error = new Error("Your login session has expired.");
    error.loginRequired = true;
    throw error;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || data.detail || "Unable to complete the request."
    );
  }

  return data;
}

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getTypeLabel = (type) => {
  const labels = {
    SERVICE_UPDATE: "Service Update",
    ORDER_UPDATE: "Order Update",
    WARRANTY: "Warranty",
    PAYMENT: "Payment",
    GENERAL: "General",
  };

  return labels[type] || String(type || "GENERAL").replaceAll("_", " ");
};

function CustomerNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loginRequired, setLoginRequired] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccessMessage("");
    setLoginRequired(false);

    try {
      const data = await notificationApi("/api/my-notifications/");

      const records = Array.isArray(data.notifications)
        ? data.notifications
        : [];

      setNotifications(records);
      setUnreadCount(
        typeof data.unread === "number"
          ? data.unread
          : records.filter((item) => !item.is_read).length
      );
    } catch (err) {
      setError(err.message || "Unable to load notifications.");
      setLoginRequired(Boolean(err.loginRequired));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markAsRead = async (notificationId) => {
    setUpdatingId(notificationId);
    setError("");
    setSuccessMessage("");

    try {
      await notificationApi(
        `/api/my-notifications/${notificationId}/read/`,
        { method: "POST" }
      );

      setNotifications((previous) =>
        previous.map((item) =>
          item.notification_id === notificationId
            ? { ...item, is_read: true, read_at: new Date().toISOString() }
            : item
        )
      );

      setUnreadCount((previous) => Math.max(0, previous - 1));
      setSuccessMessage("Notification marked as read.");
    } catch (err) {
      setError(err.message || "Unable to update notification.");
      setLoginRequired(Boolean(err.loginRequired));
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#C9E3DF] bg-white p-10 text-center">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[#C9E3DF] border-t-[#0F7775]" />
        <p className="mt-4 font-semibold text-[#0F7775]">
          Loading notifications...
        </p>
      </div>
    );
  }

  if (loginRequired) {
    return (
      <div className="rounded-2xl border border-[#C9E3DF] bg-white p-8 text-center">
        <h2 className="text-xl font-bold text-slate-800">
          Login Required
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Please log in to view your notifications.
        </p>
        <Link
          to="/login"
          className="mt-5 inline-block rounded-xl bg-[#0F7775] px-5 py-3 font-semibold text-white hover:bg-[#096260]"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Notifications
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            View service, order, warranty and payment updates.
          </p>
        </div>

        <button
          type="button"
          onClick={loadNotifications}
          className="rounded-xl bg-[#0F7775] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#096260]"
        >
          Refresh Notifications
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#C9E3DF] bg-white p-5">
          <p className="text-sm text-slate-500">Total Notifications</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">
            {notifications.length}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-white p-5">
          <p className="text-sm text-slate-500">Unread Notifications</p>
          <p className="mt-2 text-3xl font-bold text-amber-700">
            {unreadCount}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
          {loginRequired && (
            <div>
              <Link to="/login" className="mt-2 inline-block font-semibold underline">
                Go to Login
              </Link>
            </div>
          )}
        </div>
      )}

      {successMessage && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {successMessage}
        </p>
      )}

      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#A7D1CB] bg-white px-6 py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF5F3] text-2xl text-[#0F7775]">
            ♧
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-800">
            No notifications yet
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Notifications will appear here when records are created for your
            customer account.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((item) => (
            <article
              key={item.notification_id}
              className={`rounded-2xl border bg-white p-5 transition ${
                item.is_read
                  ? "border-[#C9E3DF]"
                  : "border-[#8BC7BF] bg-[#FCFEFD]"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${
                    item.is_read
                      ? "bg-slate-100 text-slate-500"
                      : "bg-[#EAF5F3] text-[#0F7775]"
                  }`}
                >
                  ♧
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-800">
                          {item.title}
                        </h3>

                        {!item.is_read && (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                            NEW
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#0F7775]">
                        {getTypeLabel(item.notification_type)}
                      </p>
                    </div>

                    <span className="text-xs text-slate-400">
                      {formatDateTime(item.created_at)}
                    </span>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {item.message}
                  </p>

                  {!item.is_read && (
                    <button
                      type="button"
                      disabled={updatingId === item.notification_id}
                      onClick={() => markAsRead(item.notification_id)}
                      className="mt-4 rounded-lg border border-[#A7D1CB] px-3 py-2 text-sm font-semibold text-[#0F7775] transition hover:bg-[#EAF5F3] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {updatingId === item.notification_id
                        ? "Updating..."
                        : "Mark as Read"}
                    </button>
                  )}

                  {item.is_read && item.read_at && (
                    <p className="mt-3 text-xs text-slate-400">
                      Read: {formatDateTime(item.read_at)}
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default CustomerNotifications;