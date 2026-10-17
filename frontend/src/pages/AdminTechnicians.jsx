
import { useCallback, useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:8000/api/technicians/";

const EMPTY_FORM = {
  technician_name: "",
  email: "",
  phone: "",
  specialization: "",
  status: "ACTIVE",
};

function getId(item) {
  return item.technician_id ?? item.id;
}

function getName(item) {
  return item.technician_name || item.name || "Unnamed Technician";
}

// Use only the independent Technician email field.
// Do not fall back to the linked Staff user's email.
function getEmail(item) {
  return item.email || "";
}

function getErrorMessage(data, fallback) {
  if (typeof data?.detail === "string") return data.detail;

  if (data && typeof data === "object") {
    const messages = Object.entries(data)
      .map(([field, value]) => {
        const text = Array.isArray(value) ? value.join(", ") : String(value);
        return `${field}: ${text}`;
      })
      .filter(Boolean);

    if (messages.length) return messages.join(" | ");
  }

  return fallback;
}

export default function AdminTechnicians() {
  const [technicians, setTechnicians] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTechnician, setNewTechnician] = useState({ ...EMPTY_FORM });

  const [editingId, setEditingId] = useState(null);
  const [emailDraft, setEmailDraft] = useState("");

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
    "Content-Type": "application/json",
  });

  const loadTechnicians = useCallback(async () => {
    setLoading(true);
    setError("");
    setMessage("");

    const token = localStorage.getItem("access_token");

    if (!token) {
      setError("Please log in before viewing technician records.");
      setTechnicians([]);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(API_URL, {
        method: "GET",
        headers: getHeaders(),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, `Unable to load technicians (${response.status}).`)
        );
      }

      const records = Array.isArray(data) ? data : data.results;

      if (!Array.isArray(records)) {
        throw new Error("Unexpected API response format.");
      }

      setTechnicians(records);
    } catch (err) {
      setError(err.message || "Unable to connect to the server.");
      setTechnicians([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTechnicians();
  }, [loadTechnicians, refreshKey]);

  const filteredTechnicians = technicians.filter((item) => {
    const searchableText = [
      getId(item),
      getName(item),
      getEmail(item),
      item.phone,
      item.specialization,
      item.status,
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(search.trim().toLowerCase());
  });

  function updateNewTechnician(field, value) {
    setNewTechnician((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleAddTechnician(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!newTechnician.technician_name.trim()) {
      setError("Technician name is required.");
      return;
    }

    if (!newTechnician.phone.trim()) {
      setError("Technician phone number is required.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        technician_name: newTechnician.technician_name.trim(),
        email: newTechnician.email.trim(),
        phone: newTechnician.phone.trim(),
        specialization: newTechnician.specialization.trim(),
        status: newTechnician.status,
      };

      const response = await fetch(API_URL, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, `Unable to add technician (${response.status}).`)
        );
      }

      setNewTechnician({ ...EMPTY_FORM });
      setShowAddForm(false);
      setMessage("Technician added successfully.");
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(err.message || "Could not add technician.");
    } finally {
      setSaving(false);
    }
  }

  function startEmailEdit(item) {
    setEditingId(getId(item));
    setEmailDraft(getEmail(item));
    setError("");
    setMessage("");
  }

  function cancelEmailEdit() {
    setEditingId(null);
    setEmailDraft("");
  }

  async function saveEmail(item) {
    const id = getId(item);

    if (id == null) {
      setError("Technician ID is missing. Email cannot be updated.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}${id}/`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
          email: emailDraft.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, `Unable to update email (${response.status}).`)
        );
      }

      // Use the server response where available; otherwise use the saved value.
      const savedEmail =
        data.email !== undefined ? data.email : emailDraft.trim();

      setTechnicians((current) =>
        current.map((technician) =>
          getId(technician) === id
            ? { ...technician, email: savedEmail }
            : technician
        )
      );

      setEditingId(null);
      setEmailDraft("");
      setMessage("Technician email updated successfully.");
    } catch (err) {
      setError(err.message || "Could not update technician email.");
    } finally {
      setSaving(false);
    }
  }

  const activeCount = technicians.filter(
    (item) => String(item.status).toUpperCase() === "ACTIVE"
  ).length;

  return (
    <div className="min-h-screen bg-[#F7F7F0] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-gradient-to-r from-[#103F35] to-[#17836C] p-6 text-white shadow-lg sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100 sm:text-sm">
            PowerCare · Administration
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold sm:text-4xl">
                Technicians
              </h1>
              <p className="mt-2 text-sm leading-6 text-emerald-50 sm:text-base">
                Manage technician records and independent email addresses.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm((value) => !value);
                  setError("");
                  setMessage("");
                }}
                className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#173E2E] transition hover:bg-emerald-50"
              >
                {showAddForm ? "Close Form" : "+ Add Technician"}
              </button>

              <button
                type="button"
                onClick={() => setRefreshKey((value) => value + 1)}
                disabled={loading || saving}
                className="rounded-xl bg-[#E4F5A5] px-4 py-3 text-sm font-bold text-[#173E2E] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
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

        {showAddForm && (
          <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold text-[#173F32]">
              Add New Technician
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Technician email is stored separately from the linked login account.
            </p>

            <form onSubmit={handleAddTechnician} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <FormField label="Technician Name" required>
                  <input
                    type="text"
                    value={newTechnician.technician_name}
                    onChange={(event) =>
                      updateNewTechnician("technician_name", event.target.value)
                    }
                    required
                    maxLength={100}
                    className={inputClass}
                    placeholder="Enter technician name"
                  />
                </FormField>

                <FormField label="Technician Email">
                  <input
                    type="email"
                    value={newTechnician.email}
                    onChange={(event) =>
                      updateNewTechnician("email", event.target.value)
                    }
                    maxLength={254}
                    className={inputClass}
                    placeholder="technician@example.com"
                  />
                </FormField>

                <FormField label="Phone Number" required>
                  <input
                    type="tel"
                    value={newTechnician.phone}
                    onChange={(event) =>
                      updateNewTechnician("phone", event.target.value)
                    }
                    required
                    maxLength={15}
                    className={inputClass}
                    placeholder="Enter phone number"
                  />
                </FormField>

                <FormField label="Specialization">
                  <input
                    type="text"
                    value={newTechnician.specialization}
                    onChange={(event) =>
                      updateNewTechnician("specialization", event.target.value)
                    }
                    maxLength={100}
                    className={inputClass}
                    placeholder="e.g. Inverter Repair"
                  />
                </FormField>

                <FormField label="Account Status">
                  <select
                    value={newTechnician.status}
                    onChange={(event) =>
                      updateNewTechnician("status", event.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </FormField>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#12624D] px-5 py-3 text-sm font-bold text-white hover:bg-[#103F35] disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Technician"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewTechnician({ ...EMPTY_FORM });
                    setShowAddForm(false);
                  }}
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
          <SummaryCard title="Total Technicians" value={technicians.length} />
          <SummaryCard title="Active Technicians" value={activeCount} />
          <SummaryCard
            title="Matching Records"
            value={filteredTechnicians.length}
          />
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#E3E7D8] bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-stone-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-xl font-bold text-[#173F32] sm:text-2xl">
                Technician Records
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Search records and edit each technician&apos;s independent email.
              </p>
            </div>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search technicians..."
              aria-label="Search technicians"
              className="w-full rounded-xl border border-stone-300 bg-[#FCFCF8] px-4 py-3 text-base text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 sm:max-w-sm"
            />
          </div>

          {loading ? (
            <div className="p-10 text-center text-base text-stone-500">
              Loading technician records...
            </div>
          ) : !error && filteredTechnicians.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-lg font-bold text-stone-700">
                No technicians found
              </p>
              <p className="mt-2 text-sm text-stone-500">
                {search
                  ? "Try another search term."
                  : "No technician records are currently available."}
              </p>
            </div>
          ) : !error ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead className="bg-[#F2F7F2] text-xs uppercase tracking-wide text-[#285B46] sm:text-sm">
                  <tr>
                    <th className="px-5 py-4 font-bold">ID</th>
                    <th className="px-5 py-4 font-bold">Technician</th>
                    <th className="px-5 py-4 font-bold">Technician Email</th>
                    <th className="px-5 py-4 font-bold">Phone</th>
                    <th className="px-5 py-4 font-bold">Specialization</th>
                    <th className="px-5 py-4 font-bold">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-stone-100">
                  {filteredTechnicians.map((item) => {
                    const id = getId(item);
                    const status = String(item.status || "Not specified");
                    const active = status.toUpperCase() === "ACTIVE";
                    const isEditing = editingId === id;

                    return (
                      <tr
                        key={id}
                        className="transition hover:bg-[#F8FAF5]"
                      >
                        <td className="px-5 py-4 text-sm font-semibold text-stone-600">
                          #{id ?? "—"}
                        </td>

                        <td className="px-5 py-4 text-sm font-bold text-[#173F32]">
                          {getName(item)}
                        </td>

                        <td className="min-w-[280px] px-5 py-4">
                          {isEditing ? (
                            <div className="space-y-2">
                              <input
                                type="email"
                                value={emailDraft}
                                onChange={(event) =>
                                  setEmailDraft(event.target.value)
                                }
                                maxLength={254}
                                aria-label={`Email for ${getName(item)}`}
                                placeholder="technician@example.com"
                                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                              />

                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => saveEmail(item)}
                                  disabled={saving}
                                  className="rounded-lg bg-[#12624D] px-3 py-2 text-xs font-bold text-white hover:bg-[#103F35] disabled:opacity-60"
                                >
                                  {saving ? "Saving..." : "Save"}
                                </button>

                                <button
                                  type="button"
                                  onClick={cancelEmailEdit}
                                  disabled={saving}
                                  className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-60"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="break-all text-sm text-stone-600">
                                {getEmail(item) || "Not added"}
                              </span>

                              <button
                                type="button"
                                onClick={() => startEmailEdit(item)}
                                disabled={saving}
                                className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-[#12624D] hover:bg-emerald-50 disabled:opacity-60"
                              >
                                Edit Email
                              </button>
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-stone-600">
                          {item.phone || "—"}
                        </td>

                        <td className="px-5 py-4 text-sm text-stone-600">
                          {item.specialization || "Not specified"}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                              active
                                ? "bg-emerald-100 text-emerald-800"
                                : status.toUpperCase() === "INACTIVE"
                                  ? "bg-stone-100 text-stone-600"
                                  : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {status.toUpperCase() === "ACTIVE"
                              ? "Active"
                              : status.toUpperCase() === "INACTIVE"
                                ? "Inactive"
                                : status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="border-t border-stone-100 px-5 py-4 text-sm text-stone-500">
            Showing {loading ? 0 : filteredTechnicians.length} of{" "}
            {technicians.length} technician record(s).
          </div>
        </section>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-stone-300 bg-[#FCFCF8] px-4 py-3 text-sm text-stone-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

function FormField({ label, required = false, children }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-stone-700">
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </span>
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
