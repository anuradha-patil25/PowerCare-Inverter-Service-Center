import { useCallback, useEffect, useMemo, useState } from "react";

const API = "/api";
const PAGE_SIZE = 5;

const EMPTY_FORM = {
  status: "PENDING",
  diagnosis: "",
  repair_details: "",
  replacement_details: "",
};

function getList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function displayDate(value) {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function jobStatus(job) {
  return String(job.status || "PENDING").toUpperCase();
}

function statusClasses(status) {
  const styles = {
    PENDING: "bg-amber-100 text-amber-800",
    IN_PROGRESS: "bg-teal-100 text-teal-800",
    COMPLETED: "bg-emerald-100 text-emerald-800",
    CANCELLED: "bg-red-100 text-red-800",
  };

  return styles[status] || "bg-stone-100 text-stone-600";
}

function errorMessage(data, fallback) {
  if (typeof data?.detail === "string") return data.detail;

  if (data && typeof data === "object") {
    const messages = Object.entries(data)
      .map(([key, value]) => {
        const text = Array.isArray(value)
          ? value.join(", ")
          : typeof value === "string"
            ? value
            : "";

        return text ? `${key}: ${text}` : "";
      })
      .filter(Boolean);

    if (messages.length) return messages.join(" | ");
  }

  return fallback;
}

function customerName(job) {
  const customer = job.customer;

  if (customer && typeof customer === "object") {
    return (
      customer.customer_name ||
      customer.name ||
      customer.full_name ||
      customer.username ||
      "Customer"
    );
  }

  return job.customer_name || job.customer_username || "—";
}

function serialLabel(job) {
  const serial = job.serial_number || job.serial;

  if (serial && typeof serial === "object") {
    return (
      serial.serial_number ||
      serial.serial_no ||
      `Serial #${serial.serial_id ?? serial.id ?? "—"}`
    );
  }

  return job.serial_number_text || serial || "—";
}

function problemText(job) {
  return (
    job.problem_description ||
    job.issue_description ||
    job.problem ||
    job.description ||
    "—"
  );
}

export default function AdminServiceJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("access_token");

      if (!token) {
        throw new Error("Login session missing. Please log in again.");
      }

      const response = await fetch(`${API}/jobs/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          errorMessage(data, "Unable to load service jobs.")
        );
      }

      setJobs(getList(data));
    } catch (err) {
      setError(err.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const filteredJobs = useMemo(() => {
    const term = search.trim().toLowerCase();

    return jobs.filter((job) => {
      const values = [
        job.job_id,
        job.id,
        customerName(job),
        serialLabel(job),
        problemText(job),
        job.service_type,
        job.job_type,
        jobStatus(job),
      ];

      const matchesSearch =
        !term ||
        values.some((value) =>
          String(value ?? "").toLowerCase().includes(term)
        );

      const matchesStatus =
        statusFilter === "ALL" || jobStatus(job) === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [jobs, search, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredJobs.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const visibleJobs = filteredJobs.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const pendingCount = jobs.filter(
    (job) => jobStatus(job) === "PENDING"
  ).length;

  const inProgressCount = jobs.filter(
    (job) => jobStatus(job) === "IN_PROGRESS"
  ).length;

  const completedCount = jobs.filter(
    (job) => jobStatus(job) === "COMPLETED"
  ).length;

  function openEdit(job) {
    setSelectedJob(job);
    setForm({
      status: jobStatus(job),
      diagnosis: job.diagnosis || "",
      repair_details: job.repair_details || "",
      replacement_details: job.replacement_details || "",
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
    setSelectedJob(null);
    setForm(EMPTY_FORM);
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function saveJob(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const token = localStorage.getItem("access_token");

    if (!token) {
      setError("Login session missing. Please log in again.");
      return;
    }

    if (!selectedJob) return;

    const jobId = selectedJob.job_id ?? selectedJob.id;

    if (!jobId) {
      setError("Job ID is missing. Unable to update this job.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${API}/jobs/${jobId}/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          errorMessage(
            data,
            "Unable to update the service job. Please check the API endpoint."
          )
        );
      }

      setShowForm(false);
      setSelectedJob(null);
      setSuccess(`Service Job #${jobId} updated successfully.`);
      await loadJobs();
    } catch (err) {
      setError(err.message || "Unable to update service job.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pc-page min-h-screen bg-[#F7F7F0] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <style>{`
          .pc-page { background-color: #F7F7F0; }
          .pc-header, .pc-modal-head { background-image: linear-gradient(to right, #103F35, #17836C); color: #ffffff; }
          .pc-header .pc-eyebrow { color: #D1FAE5; }
          .pc-header .pc-sub, .pc-modal-head .pc-sub { color: #ECFDF5; }
          .pc-card { background-color: #ffffff; border-color: #E3E7D8; }
          .pc-title { color: #173F32; }
          .pc-thead { background-color: #F2F7F2; color: #285B46; }
          .pc-row:hover { background-color: #F8FAF5; }
          .pc-input { background-color: #FCFCF8; border-color: #D6D3D1; color: #292524; }
          .pc-input:focus { border-color: #059669; box-shadow: 0 0 0 2px #D1FAE5; }
          .pc-btn-outline { color: #12624D; border-color: #A7F3D0; }
          .pc-btn-outline:hover:not(:disabled) { background-color: #ECFDF5; }
          .pc-btn-primary { background-color: #12624D; color: #ffffff; }
          .pc-btn-primary:hover:not(:disabled) { background-color: #103F35; }
          .pc-btn-light { background-color: #ffffff; color: #173E2E; }
          .pc-value { color: #12624D; }
        `}</style>

        {/* Page header */}
        <header className="pc-header flex flex-col gap-5 rounded-3xl bg-gradient-to-r from-[#103F35] to-[#17836C] p-6 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="pc-eyebrow text-xs font-bold uppercase tracking-[0.2em] text-emerald-100 sm:text-sm">
              POWERCARE · ADMINISTRATION
            </p>

            <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">
              Service Jobs
            </h1>

            <p className="pc-sub mt-2 text-sm leading-6 text-emerald-50 sm:text-base">
              Manage service requests, diagnosis and repair progress.
            </p>
          </div>

          <button
            type="button"
            onClick={loadJobs}
            disabled={loading}
            className="pc-btn-light shrink-0 rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#173E2E] transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            ↻ Refresh
          </button>
        </header>

        {/* Alerts */}
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            {success}
          </div>
        )}

        {/* Summary cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard
            label="Total Service Jobs"
            value={jobs.length}
            icon="▤"
          />

          <SummaryCard
            label="Pending Jobs"
            value={pendingCount}
            icon="◷"
          />

          <SummaryCard
            label="In Progress"
            value={inProgressCount}
            icon="↻"
          />
        </section>

        {/* Service job records */}
        <section className="pc-card overflow-hidden rounded-2xl border border-[#E3E7D8] bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-stone-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="pc-title text-xl font-bold text-[#173F32] sm:text-2xl">
                Service Job Records
              </h2>

              <p className="mt-1 text-sm text-stone-500">
                Search, filter and update service job records.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search job, customer, serial..."
                className="pc-input w-full rounded-xl border border-stone-300 bg-[#FCFCF8] px-4 py-3 text-base text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 sm:w-72"
              />

              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
                className="pc-input rounded-xl border border-stone-300 bg-[#FCFCF8] px-4 py-3 text-base text-stone-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-base text-stone-500">
              Loading service jobs...
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left text-sm">
                  <thead className="pc-thead bg-[#F2F7F2] text-xs uppercase tracking-wide text-[#285B46] sm:text-sm">
                    <tr>
                      <th className="px-5 py-4 text-left font-bold">Job ID</th>
                      <th className="px-5 py-4 text-left font-bold">Customer</th>
                      <th className="px-5 py-4 text-left font-bold">Serial Number</th>
                      <th className="px-5 py-4 text-left font-bold">Service Type</th>
                      <th className="px-5 py-4 text-left font-bold">Problem</th>
                      <th className="px-5 py-4 text-left font-bold">Service Date</th>
                      <th className="px-5 py-4 text-left font-bold">Status</th>
                      <th className="px-5 py-4 text-right font-bold">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-stone-100">
                    {visibleJobs.map((job) => {
                      const id = job.job_id ?? job.id;
                      const status = jobStatus(job);

                      return (
                        <tr
                          key={id}
                          className="pc-row transition hover:bg-[#F8FAF5]"
                        >
                          <td className="whitespace-nowrap px-5 py-4 font-semibold text-stone-600">
                            #{id ?? "—"}
                          </td>

                          <td className="pc-title px-5 py-4 font-bold text-[#173F32]">
                            {customerName(job)}
                          </td>

                          <td className="px-5 py-4 text-stone-600">
                            {serialLabel(job)}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-stone-600">
                            {job.service_type || job.job_type || "—"}
                          </td>

                          <td className="max-w-[220px] px-5 py-4 text-stone-600">
                            <p className="line-clamp-2">
                              {problemText(job)}
                            </p>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-stone-600">
                            {displayDate(
                              job.service_date ||
                              job.scheduled_date ||
                              job.created_at
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${statusClasses(status)}`}
                            >
                              {status.replaceAll("_", " ")}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4">
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => openEdit(job)}
                                className="pc-btn-outline rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-[#12624D] transition hover:bg-emerald-50"
                              >
                                Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {visibleJobs.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-10 text-center">
                          <p className="text-lg font-bold text-stone-700">
                            No service jobs found
                          </p>
                          <p className="mt-2 text-sm text-stone-500">
                            Try changing your search or status filter.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-stone-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-stone-500">
                  Showing{" "}
                  {filteredJobs.length === 0
                    ? 0
                    : (currentPage - 1) * PAGE_SIZE + 1}
                  –
                  {Math.min(
                    currentPage * PAGE_SIZE,
                    filteredJobs.length
                  )}{" "}
                  of {filteredJobs.length} service job(s).
                </p>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setPage((value) => Math.max(1, value - 1))
                    }
                    disabled={currentPage <= 1}
                    className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Previous
                  </button>

                  <span className="text-sm text-stone-500">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setPage((value) => Math.min(totalPages, value + 1))
                    }
                    disabled={currentPage >= totalPages}
                    className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        {/* Completed jobs summary */}
        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-stone-600">
              Completed Service Jobs
            </p>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-lg font-bold text-[#12624D]">
              ✓
            </span>
          </div>
          <p className="pc-value mt-3 text-4xl font-extrabold text-[#12624D]">
            {completedCount}
          </p>
        </div>
      </div>

      {/* Edit Service Job */}
      {showForm && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-950/50 p-4">
          <div className="my-auto w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="pc-modal-head flex items-center justify-between bg-gradient-to-r from-[#103F35] to-[#17836C] px-6 py-5 text-white">
              <div>
                <h2 className="text-xl font-bold">
                  Edit Service Job #{selectedJob.job_id ?? selectedJob.id}
                </h2>
                <p className="pc-sub mt-1 text-sm text-emerald-50">
                  Update diagnosis, repair details and status.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close form"
                className="rounded-lg px-3 py-1 text-2xl hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                ×
              </button>
            </div>

            <form onSubmit={saveJob} className="space-y-4 p-5 sm:p-6">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="status"
                  className="mb-2 block text-sm font-semibold text-stone-700"
                >
                  Job Status <span className="ml-1 text-red-600">*</span>
                </label>
                <select
                  id="status"
                  name="status"
                  value={form.status}
                  onChange={handleFormChange}
                  required
                  className="pc-input w-full rounded-xl border border-stone-300 bg-[#FCFCF8] px-4 py-3 text-sm text-stone-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="diagnosis"
                  className="mb-2 block text-sm font-semibold text-stone-700"
                >
                  Diagnosis
                </label>
                <textarea
                  id="diagnosis"
                  name="diagnosis"
                  value={form.diagnosis}
                  onChange={handleFormChange}
                  rows={3}
                  placeholder="Enter the diagnosed problem..."
                  className="pc-input w-full rounded-xl border border-stone-300 bg-[#FCFCF8] px-4 py-3 text-sm text-stone-800 outline-none placeholder:text-stone-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label
                  htmlFor="repair_details"
                  className="mb-2 block text-sm font-semibold text-stone-700"
                >
                  Repair Details
                </label>
                <textarea
                  id="repair_details"
                  name="repair_details"
                  value={form.repair_details}
                  onChange={handleFormChange}
                  rows={3}
                  placeholder="Describe the repair performed..."
                  className="pc-input w-full rounded-xl border border-stone-300 bg-[#FCFCF8] px-4 py-3 text-sm text-stone-800 outline-none placeholder:text-stone-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label
                  htmlFor="replacement_details"
                  className="mb-2 block text-sm font-semibold text-stone-700"
                >
                  Replacement Details
                </label>
                <textarea
                  id="replacement_details"
                  name="replacement_details"
                  value={form.replacement_details}
                  onChange={handleFormChange}
                  rows={3}
                  placeholder="Describe any parts replaced..."
                  className="pc-input w-full rounded-xl border border-stone-300 bg-[#FCFCF8] px-4 py-3 text-sm text-stone-800 outline-none placeholder:text-stone-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-stone-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="pc-btn-primary rounded-xl bg-[#12624D] px-5 py-3 text-sm font-bold text-white hover:bg-[#103F35] disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon }) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-stone-600">{label}</p>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-lg font-bold text-[#12624D]">
          {icon}
        </span>
      </div>
      <p className="pc-value mt-3 text-4xl font-extrabold text-[#12624D]">
        {value}
      </p>
    </div>
  );
}