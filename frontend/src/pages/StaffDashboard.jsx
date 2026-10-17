import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 5;
const API_BASE = "http://127.0.0.1:8000/api";

function StaffDashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [savingJob, setSavingJob] = useState(false);
  const [updateError, setUpdateError] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState("");
  const [editForm, setEditForm] = useState({
    diagnosis: "",
    repair_details: "",
    replacement_details: "",
    status: "PENDING",
  });

  // Battery health report upload and history
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportFile, setReportFile] = useState(null);
  const [reportHealthStatus, setReportHealthStatus] = useState("");
  const [batteryVoltage, setBatteryVoltage] = useState("");
  const [reportRemarks, setReportRemarks] = useState("");
  const [uploadingReport, setUploadingReport] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportSuccess, setReportSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function loadJobs() {
      try {
        const token = localStorage.getItem("access_token");

        if (!token) {
          throw new Error("Please log in again to access Staff Dashboard.");
        }

        const response = await fetch(`${API_BASE}/staff/jobs/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Session expired. Please log in again.");
          }
          if (response.status === 403) {
            throw new Error("Staff access is required for this page.");
          }

          const body = await response.json().catch(() => ({}));
          throw new Error(body.detail || "Unable to load assigned jobs.");
        }

        const data = await response.json();
        if (active) {
          // This endpoint normally returns a list. Support paginated DRF responses too.
          setJobs(Array.isArray(data) ? data : Array.isArray(data.results) ? data.results : []);
          setError("");
        }
      } catch (err) {
        if (active) setError(err.message || "Something went wrong.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadJobs();
    return () => {
      active = false;
    };
  }, []);

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return jobs.filter((job) => {
      const matchesSearch =
        !query ||
        [
          job.job_id,
          job.service_date,
          job.problem_description,
          job.service_type,
          job.status,
          job.diagnosis,
          job.repair_details,
          job.replacement_details,
          job.serial,
          job.technician,
        ].some((value) => String(value ?? "").toLowerCase().includes(query));

      const matchesStatus = statusFilter === "ALL" || job.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [jobs, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const visibleJobs = filteredJobs.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setCurrentPage(1);
  };

  const statusStyle = (statusValue) => {
    switch (statusValue) {
      case "COMPLETED":
        return "bg-green-50 text-green-700 ring-green-200";
      case "PENDING":
        return "bg-amber-50 text-amber-700 ring-amber-200";
      case "IN_PROGRESS":
        return "bg-teal-50 text-teal-800 ring-teal-200";
      case "CANCELLED":
        return "bg-red-50 text-red-700 ring-red-200";
      default:
        return "bg-stone-100 text-stone-700 ring-stone-200";
    }
  };

  const formatStatus = (statusValue) =>
    (statusValue || "UNKNOWN").replaceAll("_", " ");

  const loadBatteryReports = async (jobId) => {
    setReports([]);
    setReportsLoading(true);
    setReportError("");
    setReportSuccess("");

    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("Please log in again to view reports.");

      const response = await fetch(
        `${API_BASE}/staff/jobs/${jobId}/battery-reports/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.detail || "Unable to load battery reports.");
      }

      setReports(Array.isArray(result) ? result : []);
    } catch (err) {
      setReportError(err.message || "Unable to load battery reports.");
    } finally {
      setReportsLoading(false);
    }
  };

  const openJobDetails = (job) => {
    setSelectedJob(job);
    setEditForm({
      diagnosis: job.diagnosis || "",
      repair_details: job.repair_details || "",
      replacement_details: job.replacement_details || "",
      status: job.status || "PENDING",
    });
    setUpdateError("");
    setUpdateSuccess("");
    setReportFile(null);
    setReportHealthStatus("");
    setBatteryVoltage("");
    setReportRemarks("");
    loadBatteryReports(job.job_id);
  };

  const uploadBatteryReport = async () => {
    if (!selectedJob || uploadingReport) return;

    if (!reportFile) {
      setReportError("Please choose a PDF, JPG, JPEG, or PNG report.");
      setReportSuccess("");
      return;
    }

    const extension = reportFile.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "jpg", "jpeg", "png"].includes(extension)) {
      setReportError("Only PDF, JPG, JPEG, or PNG files are allowed.");
      setReportSuccess("");
      return;
    }
    if (reportFile.size > 10 * 1024 * 1024) {
      setReportError("Report file size must not exceed 10 MB.");
      setReportSuccess("");
      return;
    }

    setUploadingReport(true);
    setReportError("");
    setReportSuccess("");

    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("Please log in again.");

      const formData = new FormData();
      formData.append("report_file", reportFile);
      if (reportHealthStatus) formData.append("health_status", reportHealthStatus);
      if (batteryVoltage !== "") formData.append("battery_voltage", batteryVoltage);
      if (reportRemarks.trim()) formData.append("remarks", reportRemarks.trim());

      const response = await fetch(
        `${API_BASE}/staff/jobs/${selectedJob.job_id}/battery-reports/`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        let message = result.detail;
        if (!message && result && typeof result === "object") {
          message = Object.entries(result)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(", ") : String(messages)}`)
            .join(" | ");
        }
        throw new Error(message || "Unable to upload battery report.");
      }

      const uploadedReport = result.report;
      if (uploadedReport) {
        setReports((current) => [uploadedReport, ...current]);
      } else {
        await loadBatteryReports(selectedJob.job_id);
      }
      setReportFile(null);
      setReportHealthStatus("");
      setBatteryVoltage("");
      setReportRemarks("");
      setReportSuccess(result.message || "Battery health report uploaded successfully.");
    } catch (err) {
      setReportError(err.message || "Unable to upload battery report.");
    } finally {
      setUploadingReport(false);
    }
  };

  const closeDetails = () => {
    if (savingJob || uploadingReport) return;
    setSelectedJob(null);
    setUpdateError("");
    setUpdateSuccess("");
    setReportError("");
    setReportSuccess("");
  };

  const saveJobChanges = async () => {
    if (!selectedJob || savingJob) return;

    setSavingJob(true);
    setUpdateError("");
    setUpdateSuccess("");

    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("Please log in again.");

      const response = await fetch(
        `${API_BASE}/staff/jobs/${selectedJob.job_id}/update/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(editForm),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        let errorMessage = result.detail;
        if (!errorMessage && result && typeof result === "object") {
          errorMessage = Object.entries(result)
            .map(([field, messages]) => {
              const messageText = Array.isArray(messages)
                ? messages.join(", ")
                : String(messages);
              return `${field}: ${messageText}`;
            })
            .join(" | ");
        }
        throw new Error(errorMessage || "Unable to update job.");
      }

      const updatedJob = result.job || result;
      if (updatedJob.job_id == null) {
        throw new Error("The server did not return the updated job record.");
      }

      setJobs((currentJobs) =>
        currentJobs.map((job) =>
          job.job_id === updatedJob.job_id ? updatedJob : job
        )
      );
      setSelectedJob(updatedJob);
      setEditForm({
        diagnosis: updatedJob.diagnosis || "",
        repair_details: updatedJob.repair_details || "",
        replacement_details: updatedJob.replacement_details || "",
        status: updatedJob.status || "PENDING",
      });
      setUpdateSuccess(result.message || "Job updated successfully.");
    } catch (err) {
      setUpdateError(err.message || "Something went wrong.");
    } finally {
      setSavingJob(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F3FAF8] px-3 py-5 text-stone-800 sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        {/* Header */}
        <header className="overflow-hidden rounded-2xl bg-gradient-to-r from-teal-800 via-teal-700 to-teal-600 p-5 text-white shadow-sm sm:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <img
                src="/powercare-logo.png"
                alt="PowerCare Inverter Service Center"
                className="mb-3 h-14 w-auto max-w-full object-contain object-left"
              />
              <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
                Staff Dashboard
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-teal-50 sm:text-base">
                View and search service jobs assigned to your technician profile.
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center self-start rounded-xl bg-white/15 text-2xl sm:self-center">
              <span aria-hidden="true">⚡</span>
            </div>
          </div>
        </header>

        {/* Summary Cards */}
        <section
          aria-label="Job summary"
          className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3"
        >
          <div className="rounded-2xl border border-teal-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-stone-500">Assigned Jobs</p>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-xl text-teal-700" aria-hidden="true">▤</span>
            </div>
            <p className="mt-3 text-3xl font-bold text-teal-800">{jobs.length}</p>
            <p className="mt-1 text-xs text-stone-500">Jobs assigned to you</p>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-stone-500">Pending Jobs</p>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-xl text-amber-700" aria-hidden="true">◷</span>
            </div>
            <p className="mt-3 text-3xl font-bold text-amber-700">
              {jobs.filter((job) => job.status === "PENDING").length}
            </p>
            <p className="mt-1 text-xs text-stone-500">Awaiting service</p>
          </div>

          <div className="rounded-2xl border border-green-100 bg-white p-5 shadow-sm sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-stone-500">Completed Jobs</p>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-xl text-green-700" aria-hidden="true">✓</span>
            </div>
            <p className="mt-3 text-3xl font-bold text-green-700">
              {jobs.filter((job) => job.status === "COMPLETED").length}
            </p>
            <p className="mt-1 text-xs text-stone-500">Successfully completed</p>
          </div>
        </section>

        {/* Jobs Section */}
        <section className="mt-5 rounded-2xl border border-teal-100 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-teal-900">My Service Jobs</h2>
              <p className="mt-1 text-sm text-stone-500">
                Search and filter your assigned service records.
              </p>
            </div>
            <span className="self-start rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 ring-1 ring-teal-100">
              {filteredJobs.length} {filteredJobs.length === 1 ? "job" : "jobs"} found
            </span>
          </div>

          {/* Search and Filter */}
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_210px_auto]">
            <div>
              <label htmlFor="job-search" className="mb-1.5 block text-sm font-medium text-stone-700">
                Search jobs
              </label>
              <div className="relative">
                <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">⌕</span>
                <input
                  id="job-search"
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search ID, problem, type..."
                  className="w-full rounded-xl border border-stone-200 bg-white py-3 pl-9 pr-3 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                />
              </div>
            </div>

            <div>
              <label htmlFor="status-filter" className="mb-1.5 block text-sm font-medium text-stone-700">
                Filter by status
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
              >
                <option value="ALL">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={resetFilters}
                className="w-full rounded-xl border border-teal-200 px-4 py-3 text-sm font-semibold text-teal-800 transition hover:bg-teal-50 sm:w-auto"
              >
                Clear filters
              </button>
            </div>
          </div>

          {loading && (
            <div className="mt-5 rounded-xl bg-teal-50 p-5 text-sm text-teal-800" role="status">
              Loading assigned jobs...
            </div>
          )}

          {error && (
            <div role="alert" className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-3 rounded-lg bg-teal-800 px-4 py-2.5 font-semibold text-white hover:bg-teal-900"
              >
                Reload Dashboard
              </button>
            </div>
          )}

          {!loading && !error && filteredJobs.length === 0 && (
            <div className="mt-5 rounded-xl border border-dashed border-teal-200 bg-[#F8FCFA] px-4 py-10 text-center">
              <div className="text-3xl text-teal-700" aria-hidden="true">⌕</div>
              <h3 className="mt-3 font-semibold text-stone-800">No matching jobs found</h3>
              <p className="mt-1 text-sm text-stone-500">
                Try another search term or clear your filters.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
              >
                Clear filters
              </button>
            </div>
          )}

          {!loading && !error && filteredJobs.length > 0 && (
            <>
              {/* Mobile / Small Tablet Cards */}
              <div className="mt-5 grid grid-cols-1 gap-3 md:hidden">
                {visibleJobs.map((job) => (
                  <article key={job.job_id} className="rounded-xl border border-stone-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-stone-500">Job ID</p>
                        <h3 className="mt-1 text-lg font-bold text-teal-900">#{job.job_id}</h3>
                      </div>
                      <span className={`inline-flex max-w-[60%] rounded-full px-2.5 py-1 text-center text-xs font-semibold ring-1 ${statusStyle(job.status)}`}>
                        {formatStatus(job.status)}
                      </span>
                    </div>
                    <div className="mt-4 space-y-3 border-t border-stone-100 pt-3">
                      <div>
                        <p className="text-xs text-stone-500">Problem</p>
                        <p className="mt-1 break-words text-sm font-medium text-stone-800">
                          {job.problem_description || "—"}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-stone-500">Service Date</p>
                          <p className="mt-1 break-words text-sm text-stone-700">{job.service_date || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-stone-500">Type</p>
                          <p className="mt-1 break-words text-sm text-stone-700">{job.service_type || "—"}</p>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openJobDetails(job)}
                      className="mt-4 w-full rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-100"
                    >
                      View Details
                    </button>
                  </article>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="mt-5 hidden overflow-x-auto rounded-xl border border-stone-200 md:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-teal-50 text-teal-900">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">Job ID</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Service Date</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Problem</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Type</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {visibleJobs.map((job) => (
                      <tr key={job.job_id} className="transition hover:bg-[#F5FBF9]">
                        <td className="whitespace-nowrap px-4 py-4 font-bold text-teal-900">#{job.job_id}</td>
                        <td className="whitespace-nowrap px-4 py-4 text-stone-600">{job.service_date || "—"}</td>
                        <td className="max-w-xs px-4 py-4 text-stone-700">
                          <p className="line-clamp-2 break-words">{job.problem_description || "—"}</p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-stone-600">{job.service_type || "—"}</td>
                        <td className="whitespace-nowrap px-4 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusStyle(job.status)}`}>
                            {formatStatus(job.status)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4">
                          <button
                            type="button"
                            onClick={() => openJobDetails(job)}
                            className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-800 focus:outline-none focus:ring-4 focus:ring-teal-100"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-5 flex flex-col gap-3 border-t border-stone-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-stone-500">
                  Showing {(safePage - 1) * PAGE_SIZE + 1}–
                  {Math.min(safePage * PAGE_SIZE, filteredJobs.length)} of {filteredJobs.length} jobs
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={safePage === 1}
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    className="min-h-10 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="min-w-16 text-center text-sm font-semibold text-teal-800">
                    {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={safePage === totalPages}
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    className="min-h-10 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        {/* Job Details and Edit Modal */}
        {selectedJob && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-3 sm:p-6"
            onClick={closeDetails}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="job-details-title"
              className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 border-b border-teal-100 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">PowerCare · Job Record</p>
                  <h2 id="job-details-title" className="mt-1 text-2xl font-bold text-teal-900">
                    Job #{selectedJob.job_id}
                  </h2>
                  <p className="mt-1 text-sm text-stone-500">View and update service information</p>
                </div>
                <button
                  type="button"
                  onClick={closeDetails}
                  disabled={savingJob || uploadingReport}
                  aria-label="Close job details"
                  className="rounded-lg px-3 py-2 text-2xl leading-none text-stone-500 hover:bg-teal-50 hover:text-teal-800 disabled:opacity-50"
                >
                  ×
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailItem label="Service Date" value={selectedJob.service_date} />
                <DetailItem label="Service Type" value={selectedJob.service_type} />
                <DetailItem label="Problem Description" value={selectedJob.problem_description} wide />

                <div className="sm:col-span-2">
                  <label htmlFor="job-diagnosis" className="mb-1.5 block text-sm font-semibold text-stone-700">Diagnosis</label>
                  <textarea
                    id="job-diagnosis"
                    value={editForm.diagnosis}
                    onChange={(event) => setEditForm((form) => ({ ...form, diagnosis: event.target.value }))}
                    rows={3}
                    className="w-full rounded-xl border border-stone-200 bg-white p-3 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                    placeholder="Enter diagnosis..."
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="job-repair" className="mb-1.5 block text-sm font-semibold text-stone-700">Repair Details</label>
                  <textarea
                    id="job-repair"
                    value={editForm.repair_details}
                    onChange={(event) => setEditForm((form) => ({ ...form, repair_details: event.target.value }))}
                    rows={3}
                    className="w-full rounded-xl border border-stone-200 bg-white p-3 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                    placeholder="Enter repair work details..."
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="job-replacement" className="mb-1.5 block text-sm font-semibold text-stone-700">Replacement Details</label>
                  <textarea
                    id="job-replacement"
                    value={editForm.replacement_details}
                    onChange={(event) => setEditForm((form) => ({ ...form, replacement_details: event.target.value }))}
                    rows={3}
                    className="w-full rounded-xl border border-stone-200 bg-white p-3 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                    placeholder="Enter replacement details, if applicable..."
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="job-status" className="mb-1.5 block text-sm font-semibold text-stone-700">Job Status</label>
                  <select
                    id="job-status"
                    value={editForm.status}
                    onChange={(event) => setEditForm((form) => ({ ...form, status: event.target.value }))}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Battery Health Report Upload and History */}
              <section className="mt-6 rounded-2xl border border-teal-100 bg-[#F8FCFA] p-4 sm:p-5">
                <div>
                  <h3 className="text-lg font-bold text-teal-900">Battery Health Report</h3>
                  <p className="mt-1 text-sm text-stone-500">
                    Upload a battery health report for Job #{selectedJob.job_id}.
                    PDF, JPG, JPEG, or PNG · Max 10 MB.
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="battery-report-file" className="mb-1.5 block text-sm font-semibold text-stone-700">
                      Report File <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="battery-report-file"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      onChange={(event) => {
                        setReportFile(event.target.files?.[0] || null);
                        setReportError("");
                        setReportSuccess("");
                      }}
                      className="w-full rounded-xl border border-stone-200 bg-white p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:font-semibold file:text-teal-800"
                    />
                    {reportFile && (
                      <p className="mt-1 text-xs text-stone-500">
                        Selected: {reportFile.name} ({(reportFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="battery-health-status" className="mb-1.5 block text-sm font-semibold text-stone-700">
                      Health Status
                    </label>
                    <select
                      id="battery-health-status"
                      value={reportHealthStatus}
                      onChange={(event) => setReportHealthStatus(event.target.value)}
                      className="w-full rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                    >
                      <option value="">Select status (optional)</option>
                      <option value="GOOD">Good</option>
                      <option value="FAIR">Fair</option>
                      <option value="POOR">Poor</option>
                      <option value="REPLACE">Needs Replacement</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="battery-voltage" className="mb-1.5 block text-sm font-semibold text-stone-700">
                      Battery Voltage (V)
                    </label>
                    <input
                      id="battery-voltage"
                      type="number"
                      min="0"
                      step="0.01"
                      value={batteryVoltage}
                      onChange={(event) => setBatteryVoltage(event.target.value)}
                      placeholder="e.g. 12.60"
                      className="w-full rounded-xl border border-stone-200 bg-white px-3 py-3 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="battery-report-remarks" className="mb-1.5 block text-sm font-semibold text-stone-700">
                      Remarks
                    </label>
                    <textarea
                      id="battery-report-remarks"
                      rows={2}
                      value={reportRemarks}
                      onChange={(event) => setReportRemarks(event.target.value)}
                      placeholder="Add battery inspection remarks (optional)..."
                      className="w-full rounded-xl border border-stone-200 bg-white p-3 text-sm outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                    />
                  </div>
                </div>

                {reportError && (
                  <div role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {reportError}
                  </div>
                )}
                {reportSuccess && (
                  <div role="status" className="mt-3 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                    {reportSuccess}
                  </div>
                )}

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={uploadBatteryReport}
                    disabled={uploadingReport || !reportFile}
                    className="w-full rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {uploadingReport ? "Uploading..." : "Upload Report"}
                  </button>
                </div>

                <div className="mt-5 border-t border-teal-100 pt-4">
                  <h4 className="font-semibold text-teal-900">Uploaded Reports</h4>
                  {reportsLoading ? (
                    <p className="mt-2 text-sm text-stone-500">Loading reports...</p>
                  ) : reports.length === 0 ? (
                    <p className="mt-2 text-sm text-stone-500">No battery reports uploaded for this job yet.</p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {reports.map((report) => (
                        <div key={report.report_id} className="rounded-xl border border-stone-200 bg-white p-3 sm:flex sm:items-start sm:justify-between sm:gap-4">
                          <div className="min-w-0">
                            <p className="break-words text-sm font-semibold text-stone-800">
                              {report.report_file?.split("/").pop() || `Report #${report.report_id}`}
                            </p>
                            <p className="mt-1 text-xs text-stone-500">
                              {report.uploaded_at ? new Date(report.uploaded_at).toLocaleString() : "Upload date unavailable"}
                              {report.health_status ? ` · ${report.health_status.replaceAll("_", " ")}` : ""}
                              {report.battery_voltage ? ` · ${report.battery_voltage} V` : ""}
                            </p>
                            {report.remarks && <p className="mt-1 whitespace-pre-wrap text-sm text-stone-600">{report.remarks}</p>}
                          </div>
                          {report.report_file && (
                            <a
                              href={report.report_file}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-flex shrink-0 rounded-lg border border-teal-200 px-3 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50 sm:mt-0"
                            >
                              View Report
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {updateError && (
                <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {updateError}
                </div>
              )}
              {updateSuccess && (
                <div role="status" className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                  {updateSuccess}
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeDetails}
                  disabled={savingJob}
                  className="w-full rounded-xl border border-teal-200 px-5 py-3 text-sm font-semibold text-teal-800 hover:bg-teal-50 disabled:opacity-50 sm:w-auto"
                >
                  Close Details
                </button>
                <button
                  type="button"
                  onClick={saveJobChanges}
                  disabled={savingJob}
                  className="w-full rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {savingJob ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function DetailItem({ label, value, wide = false }) {
  return (
    <div className={`rounded-xl border border-stone-100 bg-stone-50 p-4 ${wide ? "sm:col-span-2" : ""}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-stone-800">
        {value || "Not provided"}
      </p>
    </div>
  );
}

export default StaffDashboard;
