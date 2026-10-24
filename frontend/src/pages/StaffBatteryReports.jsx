
import { useEffect, useState } from "react";

const API_BASE = "/api";
const SERVER_BASE = "";

const HEALTH_OPTIONS = [
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
  { value: "POOR", label: "Poor" },
  { value: "NEEDS_REPLACEMENT", label: "Needs Replacement" },
];

function getErrorMessage(data, fallback) {
  if (data?.detail) return data.detail;

  if (data && typeof data === "object") {
    const messages = Object.entries(data).map(([key, value]) => {
      const text = Array.isArray(value)
        ? value.join(", ")
        : typeof value === "string"
          ? value
          : JSON.stringify(value);

      return `${key}: ${text}`;
    });

    if (messages.length) return messages.join(" | ");
  }

  return fallback;
}

function getReportUrl(filePath) {
  if (!filePath) return "";
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return filePath;
  }

  return `${SERVER_BASE}/${filePath.replace(/^\/+/, "")}`;
}

function statusClass(status) {
  if (status === "GOOD" || status === "ACTIVE") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "POOR" || status === "NEEDS_REPLACEMENT") {
    return "bg-red-100 text-red-700";
  }

  if (status === "FAIR") {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-stone-100 text-stone-700";
}

export default function StaffBatteryReports() {
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [jobsError, setJobsError] = useState("");

  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState("");
  const [reportsRefresh, setReportsRefresh] = useState(0);

  const [reportFile, setReportFile] = useState(null);
  const [healthStatus, setHealthStatus] = useState("");
  const [batteryVoltage, setBatteryVoltage] = useState("");
  const [remarks, setRemarks] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

  const selectedJob = jobs.find(
    (job) => String(job.job_id) === String(selectedJobId)
  );

  // Load jobs assigned to the logged-in staff member.
  useEffect(() => {
    let cancelled = false;

    async function loadJobs() {
      setJobsLoading(true);
      setJobsError("");

      const token = localStorage.getItem("access_token");

      if (!token) {
        setJobsError("Please log in again with your Staff account.");
        setJobsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/staff/jobs/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            getErrorMessage(data, `Unable to load jobs (${response.status}).`)
          );
        }

        if (!cancelled) {
          const jobList = Array.isArray(data) ? data : [];
          setJobs(jobList);

          setSelectedJobId((currentId) => {
            const currentExists = jobList.some(
              (job) => String(job.job_id) === String(currentId)
            );

            return currentExists
              ? currentId
              : jobList.length
                ? String(jobList[0].job_id)
                : "";
          });
        }
      } catch (error) {
        if (!cancelled) {
          setJobsError(error.message || "Unable to load assigned jobs.");
        }
      } finally {
        if (!cancelled) setJobsLoading(false);
      }
    }

    loadJobs();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load reports for the selected job.
  useEffect(() => {
    let cancelled = false;

    async function loadReports() {
      setReports([]);
      setReportsError("");
      setUploadError("");
      setUploadSuccess("");

      if (!selectedJobId) {
        setReportsLoading(false);
        return;
      }

      const token = localStorage.getItem("access_token");

      if (!token) {
        setReportsError("Please log in again to view reports.");
        setReportsLoading(false);
        return;
      }

      setReportsLoading(true);

      try {
        const response = await fetch(
          `${API_BASE}/staff/jobs/${selectedJobId}/battery-reports/`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            getErrorMessage(
              data,
              `Unable to load reports (${response.status}).`
            )
          );
        }

        if (!cancelled) {
          setReports(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (!cancelled) {
          setReportsError(error.message || "Unable to load battery reports.");
        }
      } finally {
        if (!cancelled) setReportsLoading(false);
      }
    }

    loadReports();

    return () => {
      cancelled = true;
    };
  }, [selectedJobId, reportsRefresh]);

  async function handleUpload(event) {
    event.preventDefault();

    if (!selectedJobId || !reportFile || uploading) return;

    const allowedExtensions = ["pdf", "jpg", "jpeg", "png"];
    const extension = reportFile.name.split(".").pop()?.toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      setUploadError("Only PDF, JPG, JPEG, or PNG files are allowed.");
      setUploadSuccess("");
      return;
    }

    if (reportFile.size > 10 * 1024 * 1024) {
      setUploadError("Report file size must not exceed 10 MB.");
      setUploadSuccess("");
      return;
    }

    if (
      batteryVoltage.trim() !== "" &&
      (!Number.isFinite(Number(batteryVoltage)) ||
        Number(batteryVoltage) < 0)
    ) {
      setUploadError("Enter a valid non-negative battery voltage.");
      setUploadSuccess("");
      return;
    }

    const token = localStorage.getItem("access_token");

    if (!token) {
      setUploadError("Please log in again before uploading.");
      setUploadSuccess("");
      return;
    }

    setUploading(true);
    setUploadError("");
    setUploadSuccess("");

    try {
      const formData = new FormData();
      formData.append("report_file", reportFile);

      if (healthStatus) formData.append("health_status", healthStatus);
      if (batteryVoltage.trim()) {
        formData.append("battery_voltage", batteryVoltage.trim());
      }
      if (remarks.trim()) formData.append("remarks", remarks.trim());

      const response = await fetch(
        `${API_BASE}/staff/jobs/${selectedJobId}/battery-reports/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, `Upload failed (${response.status}).`)
        );
      }

      setUploadSuccess(data.message || "Battery report uploaded successfully.");
      setReportFile(null);
      setHealthStatus("");
      setBatteryVoltage("");
      setRemarks("");

      const fileInput = document.getElementById("staff-battery-report-file");
      if (fileInput) fileInput.value = "";

      setReportsRefresh((current) => current + 1);
    } catch (error) {
      setUploadError(error.message || "Unable to upload battery report.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">
            Staff Workspace
          </p>

          <h1 className="mt-2 text-2xl font-bold text-stone-900 sm:text-3xl">
            Battery Health Reports
          </h1>

          <p className="mt-2 text-sm text-stone-600">
            Upload inspection reports and review report history for your
            assigned service jobs.
          </p>
        </div>

        <section className="mb-6 rounded-2xl border border-teal-100 bg-white p-5 shadow-sm">
          <label
            htmlFor="staff-report-job"
            className="mb-2 block text-sm font-semibold text-stone-700"
          >
            Select Assigned Service Job
          </label>

          {jobsLoading ? (
            <p className="text-sm text-stone-500">Loading assigned jobs...</p>
          ) : jobsError ? (
            <p role="alert" className="text-sm text-red-700">
              {jobsError}
            </p>
          ) : jobs.length === 0 ? (
            <p className="text-sm text-stone-600">
              No assigned service jobs were found for this Staff account.
            </p>
          ) : (
            <select
              id="staff-report-job"
              value={selectedJobId}
              onChange={(event) => {
                setSelectedJobId(event.target.value);
                setReportFile(null);
                setHealthStatus("");
                setBatteryVoltage("");
                setRemarks("");
                setUploadError("");
                setUploadSuccess("");
              }}
              className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            >
              {jobs.map((job) => (
                <option key={job.job_id} value={job.job_id}>
                  {`Job #${job.job_id} · ${job.service_date} · ${job.status}`}
                </option>
              ))}
            </select>
          )}

          {selectedJob && (
            <div className="mt-4 rounded-xl bg-teal-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-bold text-teal-950">
                  Job #{selectedJob.job_id}
                </h2>

                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-teal-800">
                  {selectedJob.status?.replaceAll("_", " ")}
                </span>
              </div>

              <p className="mt-2 text-sm text-stone-700">
                <strong>Service date:</strong> {selectedJob.service_date || "—"}
              </p>

              <p className="mt-1 text-sm text-stone-700">
                <strong>Service type:</strong> {selectedJob.service_type || "—"}
              </p>

              <p className="mt-2 whitespace-pre-wrap text-sm text-stone-700">
                <strong>Problem:</strong>{" "}
                {selectedJob.problem_description || "Not provided"}
              </p>
            </div>
          )}
        </section>

        {selectedJob && (
          <>
            <section className="mb-6 rounded-2xl border border-teal-100 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-bold text-stone-900">
                Upload Battery Report
              </h2>

              <p className="mt-1 text-sm text-stone-500">
                Accepted files: PDF, JPG, JPEG and PNG. Maximum size: 10 MB.
              </p>

              <form onSubmit={handleUpload} className="mt-5 space-y-5">
                <div>
                  <label
                    htmlFor="staff-battery-report-file"
                    className="mb-2 block text-sm font-semibold text-stone-700"
                  >
                    Report File <span className="text-red-600">*</span>
                  </label>

                  <input
                    id="staff-battery-report-file"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    required
                    onChange={(event) => {
                      setReportFile(event.target.files?.[0] || null);
                      setUploadError("");
                      setUploadSuccess("");
                    }}
                    className="block w-full rounded-xl border border-stone-300 p-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-teal-50 file:px-4 file:py-2 file:font-semibold file:text-teal-800"
                  />

                  {reportFile && (
                    <p className="mt-2 break-all text-xs text-stone-500">
                      Selected: {reportFile.name} (
                      {(reportFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="staff-report-health"
                      className="mb-2 block text-sm font-semibold text-stone-700"
                    >
                      Battery Health Status
                    </label>

                    <select
                      id="staff-report-health"
                      value={healthStatus}
                      onChange={(event) => setHealthStatus(event.target.value)}
                      className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    >
                      <option value="">Select status (optional)</option>
                      {HEALTH_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="staff-report-voltage"
                      className="mb-2 block text-sm font-semibold text-stone-700"
                    >
                      Battery Voltage (V)
                    </label>

                    <input
                      id="staff-report-voltage"
                      type="number"
                      min="0"
                      step="0.01"
                      value={batteryVoltage}
                      onChange={(event) => setBatteryVoltage(event.target.value)}
                      placeholder="e.g. 12.6"
                      className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="staff-report-remarks"
                    className="mb-2 block text-sm font-semibold text-stone-700"
                  >
                    Remarks
                  </label>

                  <textarea
                    id="staff-report-remarks"
                    rows={3}
                    value={remarks}
                    onChange={(event) => setRemarks(event.target.value)}
                    placeholder="Add battery inspection remarks (optional)..."
                    className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  />
                </div>

                {uploadError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                  >
                    {uploadError}
                  </div>
                )}

                {uploadSuccess && (
                  <div
                    role="status"
                    className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
                  >
                    {uploadSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={uploading || !reportFile}
                  className="rounded-xl bg-[#064E4F] px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Upload Report"}
                </button>
              </form>
            </section>

            <section className="rounded-2xl border border-teal-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-stone-900">
                  Uploaded Report History
                </h2>

                <button
                  type="button"
                  onClick={() => setReportsRefresh((current) => current + 1)}
                  disabled={reportsLoading}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                >
                  Refresh
                </button>
              </div>

              {reportsLoading ? (
                <p className="mt-5 text-sm text-stone-500">
                  Loading report history...
                </p>
              ) : reportsError ? (
                <p role="alert" className="mt-5 text-sm text-red-700">
                  {reportsError}
                </p>
              ) : reports.length === 0 ? (
                <p className="mt-5 rounded-xl bg-stone-50 p-5 text-sm text-stone-600">
                  No battery reports have been uploaded for this job yet.
                </p>
              ) : (
                <div className="mt-5 space-y-3">
                  {reports.map((report) => {
                    const reportUrl = getReportUrl(report.report_file);
                    const healthLabel = HEALTH_OPTIONS.find(
                      (option) => option.value === report.health_status
                    )?.label || report.health_status;

                    return (
                      <article
                        key={report.report_id}
                        className="rounded-xl border border-stone-200 p-4"
                      >
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                          <div className="min-w-0">
                            <h3 className="break-all font-semibold text-stone-900">
                              {report.report_file?.split("/").pop() ||
                                `Report #${report.report_id}`}
                            </h3>

                            <p className="mt-1 text-xs text-stone-500">
                              Report ID: {report.report_id}
                            </p>

                            <p className="mt-1 text-xs text-stone-500">
                              Uploaded:{" "}
                              {report.uploaded_at
                                ? new Date(report.uploaded_at).toLocaleString()
                                : "Date unavailable"}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {healthLabel && (
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                                    report.health_status
                                  )}`}
                                >
                                  {healthLabel}
                                </span>
                              )}

                              {report.battery_voltage !== null &&
                                report.battery_voltage !== undefined &&
                                report.battery_voltage !== "" && (
                                  <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
                                    {report.battery_voltage} V
                                  </span>
                                )}
                            </div>

                            {report.remarks && (
                              <p className="mt-3 whitespace-pre-wrap text-sm text-stone-600">
                                {report.remarks}
                              </p>
                            )}
                          </div>

                          {reportUrl && (
                            <a
                              href={reportUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="shrink-0 rounded-lg border border-teal-700 px-4 py-2 text-center text-sm font-semibold text-teal-800 hover:bg-teal-50"
                            >
                              View Report
                            </a>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
