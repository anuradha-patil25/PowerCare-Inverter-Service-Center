import { useCallback, useEffect, useMemo, useState } from "react";

const API_BASE = "http://127.0.0.1:8000/api/admin/users-roles/";

export default function AdminUsersRoles() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
    "Content-Type": "application/json",
  });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(API_BASE, {
        headers: getHeaders(),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail ||
            (response.status === 401
              ? "Login expired. Please log in again."
              : "Unable to load users.")
        );
      }

      setUsers(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError(err.message || "Server connection failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !term ||
        String(user.username || "").toLowerCase().includes(term) ||
        String(user.email || "").toLowerCase().includes(term) ||
        String(user.id || "").includes(term);

      const matchesRole =
        roleFilter === "All" || user.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  async function updateUser(userId, changes) {
    setUpdatingId(userId);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_BASE}${userId}/`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(changes),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to update user."
        );
      }

      setUsers((current) =>
        current.map((user) =>
          user.id === userId ? { ...user, ...data.user } : user
        )
      );

      setMessage(data.message || "User updated successfully.");
    } catch (err) {
      setError(err.message || "User update failed.");
    } finally {
      setUpdatingId(null);
    }
  }

  const totalActive = users.filter((user) => user.is_active).length;
  const totalInactive = users.length - totalActive;

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
          .pc-btn-outline { color: #12624D; border-color: #A7F3D0; }
          .pc-btn-outline:hover:not(:disabled) { background-color: #ECFDF5; }
          .pc-value { color: #12624D; }
        `}</style>
        <header className="pc-header rounded-3xl bg-gradient-to-r from-[#103F35] to-[#17836C] p-6 text-white shadow-lg sm:p-8">
          <p className="pc-eyebrow text-xs font-bold uppercase tracking-[0.2em] text-emerald-100 sm:text-sm">
            PowerCare · Administration
          </p>
          <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">
            Users &amp; Roles
          </h1>
          <p className="pc-sub mt-2 text-sm leading-6 text-emerald-50 sm:text-base">
            Manage registered users, assign roles and control account status.
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
          >
            {error}
            {error.toLowerCase().includes("login") && (
              <button
                onClick={() => (window.location.href = "/login")}
                className="ml-2 font-bold underline"
              >
                Login
              </button>
            )}
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

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard title="Total Users" value={users.length} />
          <SummaryCard title="Active Users" value={totalActive} />
          <SummaryCard title="Inactive Users" value={totalInactive} />
        </section>

        <section className="pc-card overflow-hidden rounded-2xl border border-[#E3E7D8] bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-stone-100 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="pc-title text-xl font-bold text-[#173F32] sm:text-2xl">
                User Directory
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Search accounts and manage their access.
              </p>
            </div>

            <button
              onClick={loadUsers}
              disabled={loading}
              className="pc-btn-outline rounded-xl border border-emerald-200 px-4 py-3 text-sm font-bold text-[#12624D] transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Loading..." : "↻ Refresh"}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 border-b border-stone-100 p-5 sm:p-6 md:grid-cols-2">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search username, email or user ID..."
              className="pc-input w-full rounded-xl border border-stone-300 bg-[#FCFCF8] px-4 py-3 text-base text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />

            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="pc-input w-full rounded-xl border border-stone-300 bg-[#FCFCF8] px-4 py-3 text-base text-stone-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="All">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Staff">Staff</option>
              <option value="Customer">Customer</option>
              <option value="Unassigned">Unassigned</option>
            </select>
          </div>

          {loading ? (
            <div className="p-10 text-center text-base text-stone-500">
              Loading users...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left">
                <thead>
                  <tr className="pc-thead bg-[#F2F7F2] text-xs uppercase tracking-wide text-[#285B46] sm:text-sm">
                    <th className="px-5 py-4 font-bold">User</th>
                    <th className="px-5 py-4 font-bold">Email</th>
                    <th className="px-5 py-4 font-bold">Role</th>
                    <th className="px-5 py-4 font-bold">Account Status</th>
                    <th className="px-5 py-4 font-bold">Joined</th>
                    <th className="px-5 py-4 font-bold">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-stone-100">
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="pc-row transition hover:bg-[#F8FAF5]"
                    >
                      <td className="px-5 py-4">
                        <p className="pc-title text-sm font-bold text-[#173F32]">
                          {user.username || "—"}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-stone-500">
                          ID: {user.id}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-stone-600">
                        {user.email || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <select
                          value={
                            ["Admin", "Staff", "Customer"].includes(user.role)
                              ? user.role
                              : "Unassigned"
                          }
                          disabled={updatingId === user.id}
                          onChange={(event) =>
                            updateUser(user.id, { role: event.target.value })
                          }
                          className="pc-input rounded-lg border border-stone-300 bg-[#FCFCF8] px-3 py-2 text-sm text-stone-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:opacity-60"
                        >
                          <option value="Admin">Admin</option>
                          <option value="Staff">Staff</option>
                          <option value="Customer">Customer</option>
                          <option value="Unassigned" disabled>
                            Unassigned
                          </option>
                        </select>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                            user.is_active
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-stone-100 text-stone-600"
                          }`}
                        >
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-stone-600">
                        {user.date_joined
                          ? new Date(user.date_joined).toLocaleDateString()
                          : "—"}
                      </td>

                      <td className="px-5 py-4">
                        <button
                          disabled={
                            updatingId === user.id ||
                            user.role === "Admin" && user.id ===
                              Number(JSON.parse(
                                localStorage.getItem("current_user") || "{}"
                              ).user_id)
                          }
                          onClick={() =>
                            updateUser(user.id, {
                              is_active: !user.is_active,
                            })
                          }
                          className={`rounded-lg border px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            user.is_active
                              ? "border-red-200 text-red-700 hover:bg-red-50"
                              : "border-emerald-200 text-[#12624D] hover:bg-emerald-50"
                          }`}
                        >
                          {updatingId === user.id
                            ? "Saving..."
                            : user.is_active
                              ? "Deactivate"
                              : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredUsers.length === 0 && (
                    <tr>
                      <td
                        colSpan="6"
                        className="p-10 text-center text-base text-stone-500"
                      >
                        {error
                          ? "Unable to load users."
                          : "No matching users found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <p className="border-t border-stone-100 px-5 py-4 text-sm text-stone-500">
            Showing {filteredUsers.length} of {users.length} users
          </p>
        </section>
      </div>
    </div>
  );
}

function SummaryCard({ title, value }) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-sm font-semibold text-stone-600">{title}</p>
      <p className="pc-value mt-3 text-4xl font-extrabold text-[#12624D]">{value}</p>
    </div>
  );
}