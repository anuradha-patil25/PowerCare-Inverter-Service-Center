import { useCallback, useEffect, useState } from "react";

const API_BASE = "/api";

const EMPTY_FORM = {
  diagnosis: "",
  repair_details: "",
  replacement_details: "",
  status: "PENDING",
};

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

function getStatusLabel(status) {
  return (
    STATUS_OPTIONS.find((item) => item.value === status)?.label ||
    status ||
    "Unknown"
  );
}

function getRelationValue(value) {
  if (value == null) return "—";

  if (typeof value === "object") {
    return (
      value.name ||
      value.customer_name ||
      value.serial_number ||
      value.serial_no ||
      value.id ||
      "—"
    );
  }

  return value;
}
function customerLabel(job) {
  return job.customer_name || getRelationValue(job.customer);
}

function serialLabel(job) {
  return job.serial_number_text || getRelationValue(job.serial);
}

function technicianLabel(job) {
  return job.technician_name || getRelationValue(job.technician);
}

export default function StaffJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedJob, setSelectedJob] = useState(null);
  const [editingJob, setEditingJob] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("access_token");

      if (!token) {
        throw new Error("Please log in again to access Service Jobs.");
      }

      const response = await fetch(`${API_BASE}/staff/jobs/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to load Service Jobs."
        );
      }

      setJobs(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const filteredJobs = jobs.filter((job) => {
    const searchableText = [
      job.job_id,
      getRelationValue(job.customer),
      getRelationValue(job.serial),
      job.problem_description,
      job.diagnosis,
      job.service_type,
      job.status,
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = searchableText.includes(
      search.trim().toLowerCase()
    );

    const matchesStatus =
      statusFilter === "ALL" || job.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  function openEditForm(job) {
    setEditingJob(job);
    setForm({
      diagnosis: job.diagnosis || "",
      repair_details: job.repair_details || "",
      replacement_details: job.replacement_details || "",
      status: job.status || "PENDING",
    });
    setMessage("");
    setError("");
  }

  async function saveJob(event) {
    event.preventDefault();

    if (!editingJob) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const token = localStorage.getItem("access_token");

      if (!token) {
        throw new Error("Please log in again.");
      }

      const response = await fetch(
        `${API_BASE}/staff/jobs/${editingJob.job_id}/update/`,
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
        const detail =
          data.detail ||
          Object.values(data).flat().join(" ") ||
          "Unable to update this job.";

        throw new Error(detail);
      }

      setEditingJob(null);
      setMessage(`Service Job #${editingJob.job_id} updated.`);
      await loadJobs();
    } catch (err) {
      setError(err.message || "Unable to update this job.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">
              PowerCare · Staff Workspace
            </p>

            <h1 className="mt-2 text-2xl font-bold text-stone-900 sm:text-3xl">
              Service Jobs
            </h1>

            <p className="mt-2 text-sm text-stone-600">
              Search jobs, view service details and update repair progress.
            </p>
          </div>

          <button
            type="button"
            onClick={loadJobs}
            disabled={loading}
            className="rounded-xl border border-teal-200 bg-white px-4 py-3 text-sm font-semibold text-teal-800 hover:bg-teal-50 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Refresh Jobs"}
          </button>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
  <div className="rounded-2xl border border-teal-100 bg-white p-5">
    <p className="text-sm text-stone-500">Total Jobs</p>
    <p className="mt-2 text-3xl font-bold text-stone-900">
      {jobs.length}
    </p>
  </div>

  <div className="rounded-2xl border border-teal-100 bg-white p-5">
    <p className="text-sm text-stone-500">Pending</p>
    <p className="mt-2 text-3xl font-bold text-amber-600">
      {jobs.filter((job) => job.status === "PENDING").length}
    </p>
  </div>

  <div className="rounded-2xl border border-teal-100 bg-white p-5">
    <p className="text-sm text-stone-500">In Progress</p>
    <p className="mt-2 text-3xl font-bold text-teal-700">
      {jobs.filter((job) => job.status === "IN_PROGRESS").length}
    </p>
  </div>

  <div className="rounded-2xl border border-teal-100 bg-white p-5">
    <p className="text-sm text-stone-500">Completed</p>
    <p className="mt-2 text-3xl font-bold text-emerald-700">
      {jobs.filter((job) => job.status === "COMPLETED").length}
    </p>
  </div>
</div>
        <div className="mt-6 rounded-2xl border border-teal-100 bg-white p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search job, customer, serial number..."
              className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-teal-600"
            >
              <option value="ALL">All Statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            {message}
          </div>
        )}

        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="rounded-2xl border border-teal-100 bg-white p-8 text-center text-stone-500">
              Loading Service Jobs...
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="rounded-2xl border border-teal-100 bg-white p-8 text-center">
              <h2 className="font-semibold text-stone-800">
                No Service Jobs found
              </h2>
              <p className="mt-2 text-sm text-stone-500">
                Try another search term or status filter.
              </p>
            </div>
          ) : (
            filteredJobs.map((job) => (
              <article
                key={job.job_id}
                className="rounded-2xl border border-teal-100 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-bold text-stone-900">
                        Service Job #{job.job_id}
                      </h2>

                      <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
                        {getStatusLabel(job.status)}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-stone-600">
                      <strong>Customer:</strong>{" "}
                        {customerLabel(job)}
                        {" · "}
                        <strong>Serial:</strong>{" "}
                        {serialLabel(job)}
                    </p>

                    <p className="mt-2 text-sm text-stone-600">
                      <strong>Service type:</strong>{" "}
                      {job.service_type || "—"}
                      {" · "}
                      <strong>Date:</strong>{" "}
                      {job.service_date || "—"}
                    </p>

                    <p className="mt-3 whitespace-pre-wrap text-sm text-stone-800">
                      <strong>Problem:</strong>{" "}
                      {job.problem_description || "No description provided."}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedJob(job)}
                      className="rounded-xl border border-teal-200 px-4 py-2.5 text-sm font-semibold text-teal-800 hover:bg-teal-50"
                    >
                      View Details
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditForm(job)}
                      className="rounded-xl bg-[#064E4F] px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
                    >
                      Edit Job
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-xl font-bold text-stone-900">
                Service Job #{selectedJob.job_id}
              </h2>

              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="rounded-lg px-3 py-1 text-xl text-stone-500 hover:bg-stone-100"
                aria-label="Close details"
              >
                ×
              </button>
            </div>

            <div className="mt-5 space-y-4 text-sm text-stone-700">
              <p><strong>Customer:</strong> {customerLabel(selectedJob)}</p>
              <p><strong>Serial:</strong> {serialLabel(selectedJob)}</p>
              <p><strong>Technician:</strong> {technicianLabel(selectedJob)}</p>
              <p><strong>Problem:</strong> {selectedJob.problem_description || "—"}</p>
              <p className="whitespace-pre-wrap"><strong>Diagnosis:</strong>{"\n"}{selectedJob.diagnosis || "Not added"}</p>
              <p className="whitespace-pre-wrap"><strong>Repair details:</strong>{"\n"}{selectedJob.repair_details || "Not added"}</p>
              <p className="whitespace-pre-wrap"><strong>Replacement details:</strong>{"\n"}{selectedJob.replacement_details || "Not added"}</p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedJob(null)}
              className="mt-6 rounded-xl bg-[#064E4F] px-5 py-3 text-sm font-semibold text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {editingJob && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <form
            onSubmit={saveJob}
            className="my-8 w-full max-w-2xl space-y-5 rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-stone-900">
                  Update Job #{editingJob.job_id}
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  Add diagnosis and repair or replacement details.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditingJob(null)}
                className="rounded-lg px-3 py-1 text-xl text-stone-500 hover:bg-stone-100"
                aria-label="Close edit form"
              >
                ×
              </button>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">
                Diagnosis
              </span>
              <textarea
                rows={3}
                value={form.diagnosis}
                onChange={(event) =>
                  setForm({ ...form, diagnosis: event.target.value })
                }
                className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-teal-600"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">
                Repair Details
              </span>
              <textarea
                rows={3}
                value={form.repair_details}
                onChange={(event) =>
                  setForm({ ...form, repair_details: event.target.value })
                }
                className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-teal-600"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">
                Replacement Details
              </span>
              <textarea
                rows={3}
                value={form.replacement_details}
                onChange={(event) =>
                  setForm({ ...form, replacement_details: event.target.value })
                }
                className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-teal-600"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">
                Job Status
              </span>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm({ ...form, status: event.target.value })
                }
                className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-teal-600"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap justify-end gap-3 border-t border-stone-100 pt-4">
              <button
                type="button"
                onClick={() => setEditingJob(null)}
                className="rounded-xl border border-stone-200 px-5 py-3 text-sm font-semibold text-stone-700"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#00A86B] px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}