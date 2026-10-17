import { useRef, useState } from "react";
import { Link } from "react-router-dom";

function Services() {
  const [formData, setFormData] = useState({
    serial_number: "",
    service_type: "REPAIR",
    problem_description: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [serviceRequest, setServiceRequest] = useState(null);
  const [loginRequired, setLoginRequired] = useState(false);

  // Prevent multiple simultaneous submissions.
  const isSubmittingRef = useRef(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setLoginRequired(false);

    // Editing the form allows a new, intentional request.
    if (serviceRequest) {
      setServiceRequest(null);
    }
  };

  const getErrorMessage = (data) => {
    if (typeof data?.error === "string") {
      return data.error;
    }

    if (typeof data?.detail === "string") {
      return data.detail;
    }

    if (data && typeof data === "object") {
      for (const value of Object.values(data)) {
        if (typeof value === "string") {
          return value;
        }

        if (Array.isArray(value) && value.length > 0) {
          return String(value[0]);
        }
      }
    }

    return "Unable to submit service request.";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Synchronous guard against repeated clicks.
    if (isSubmittingRef.current || serviceRequest) {
      return;
    }

    setError("");
    setLoginRequired(false);

    const serialNumber = formData.serial_number.trim();
    const problemDescription = formData.problem_description.trim();

    if (!serialNumber) {
      setError("Please enter the product serial number.");
      return;
    }

    if (problemDescription.length < 5) {
      setError("Please describe the problem in at least 5 characters.");
      return;
    }

    let accessToken = localStorage.getItem("access_token");
    const refreshToken = localStorage.getItem("refresh_token");

    if (!accessToken) {
      setLoginRequired(true);
      setError(
        "Please log in with your customer account to request a service."
      );
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);

    try {
      const requestBody = JSON.stringify({
        serial_number: serialNumber,
        service_type: formData.service_type,
        problem_description: problemDescription,
      });

      const submitRequest = (token) =>
        fetch("/api/service-requests/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: requestBody,
        });

      let response = await submitRequest(accessToken);

      // Refresh an expired access token and retry once.
      if (response.status === 401 && refreshToken) {
        const refreshResponse = await fetch("/api/auth/refresh/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            refresh: refreshToken,
          }),
        });

        const refreshData = await refreshResponse
          .json()
          .catch(() => ({}));

        if (refreshResponse.ok && refreshData.access) {
          accessToken = refreshData.access;

          localStorage.setItem("access_token", accessToken);

          if (refreshData.refresh) {
            localStorage.setItem(
              "refresh_token",
              refreshData.refresh
            );
          }

          response = await submitRequest(accessToken);
        } else {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("current_user");

          setLoginRequired(true);
          throw new Error(
            "Your login session has expired. Please log in again."
          );
        }
      }

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("current_user");

        setLoginRequired(true);
        throw new Error(
          "Please log in again to submit your service request."
        );
      }

      if (!response.ok) {
        throw new Error(getErrorMessage(data));
      }

      // Keep the entered form data.
      // Do not clear problem_description after successful submission.
      setServiceRequest(data);
      setError("");
    } catch (err) {
      console.error("Service request error:", err);
      setError(err.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="min-h-[70vh] bg-[#D5EAE7] px-5 py-12 sm:px-6 lg:px-8">
      <main className="mx-auto max-w-6xl">

        {/* Page Heading */}
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#0F7775]">
            PowerCare Services
          </p>

          <h1 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Book a Service
          </h1>

          <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-700">
            Submit an inverter or battery service request. Our system
            will assign an active technician when you submit the form.
          </p>
        </div>

        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1fr_0.85fr]">

          {/* Service Form and Immediate Result */}
          <section className="rounded-3xl border border-[#BBD8D5] bg-white p-6 shadow-lg sm:p-8">
            <h2 className="text-2xl font-bold text-slate-900">
              Service Request Form
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Fields marked with * are required.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">

              {/* Serial Number */}
              <div>
                <label
                  htmlFor="serial_number"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Product Serial Number *
                </label>

                <input
                  id="serial_number"
                  name="serial_number"
                  type="text"
                  value={formData.serial_number}
                  onChange={handleChange}
                  placeholder="Example: INVTEST001"
                  required
                  autoComplete="off"
                  disabled={loading}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#0F7775] focus:ring-2 focus:ring-[#0F7775]/20 disabled:bg-slate-100"
                />
              </div>

              {/* Service Type */}
              <div>
                <label
                  htmlFor="service_type"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Service Type *
                </label>

                <select
                  id="service_type"
                  name="service_type"
                  value={formData.service_type}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#0F7775] focus:ring-2 focus:ring-[#0F7775]/20 disabled:bg-slate-100"
                >
                  <option value="REPAIR">Repair</option>
                  <option value="REPLACEMENT">Replacement</option>
                </select>
              </div>

              {/* Problem Description */}
              <div>
                <label
                  htmlFor="problem_description"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Describe the Problem *
                </label>

                <textarea
                  id="problem_description"
                  name="problem_description"
                  value={formData.problem_description}
                  onChange={handleChange}
                  placeholder="Describe the inverter or battery issue..."
                  rows={5}
                  minLength={5}
                  required
                  disabled={loading}
                  className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#0F7775] focus:ring-2 focus:ring-[#0F7775]/20 disabled:bg-slate-100"
                />
              </div>

              {/* Error */}
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                  <p>{error}</p>

                  {loginRequired && (
                    <Link
                      to="/login"
                      className="mt-2 inline-block font-bold underline"
                    >
                      Login to Continue
                    </Link>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || Boolean(serviceRequest)}
                className="w-full rounded-xl bg-[#0F7775] px-6 py-3.5 font-bold text-white transition hover:bg-[#0B625F] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Submitting Request..."
                  : serviceRequest
                    ? "Request Submitted"
                    : "Submit Service Request"}
              </button>

              {serviceRequest && (
                <p className="text-sm text-green-700">
                  This request has been submitted. To create a new request,
                  change the form details first.
                </p>
              )}
            </form>

            {/* Success Message: immediately below the form */}
            {serviceRequest && (
              <div
                role="status"
                className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-xl font-bold text-green-700">
                    ✓
                  </div>

                  <div>
                    <h3 className="text-lg font-extrabold text-green-800">
                      Service Request Submitted!
                    </h3>

                    <p className="mt-1 text-sm text-green-700">
                      {serviceRequest.message}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white p-3">
                    <p className="text-xs text-slate-500">Job ID</p>
                    <p className="mt-1 font-extrabold text-[#0F7775]">
                      #{serviceRequest.job_id}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-3">
                    <p className="text-xs text-slate-500">Status</p>
                    <p className="mt-1 font-bold text-amber-700">
                      {serviceRequest.status}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-3">
                    <p className="text-xs text-slate-500">Product</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {serviceRequest.product_name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Serial: {serviceRequest.serial_number}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-3">
                    <p className="text-xs text-slate-500">
                      Assigned Technician
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {serviceRequest.technician_name}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-600">
                  Service Date: {serviceRequest.service_date}
                </p>
              </div>
            )}
          </section>

          {/* Information Cards */}
          <aside className="space-y-5">

            <div className="rounded-3xl bg-white p-7 shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#DDF1EF] text-2xl">
                🔧
              </div>

              <h2 className="mt-4 text-xl font-bold text-slate-900">
                Repair Service
              </h2>

              <p className="mt-2 leading-7 text-slate-600">
                Request diagnosis and repair for inverter or battery problems.
              </p>
            </div>

            <div className="rounded-3xl bg-white p-7 shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#DDF1EF] text-2xl">
                🔋
              </div>

              <h2 className="mt-4 text-xl font-bold text-slate-900">
                Replacement Service
              </h2>

              <p className="mt-2 leading-7 text-slate-600">
                Submit a request when a product or component may need replacement.
              </p>
            </div>

            <div className="rounded-3xl bg-white p-7 shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#DDF1EF] text-2xl">
                📋
              </div>

              <h2 className="mt-4 text-xl font-bold text-slate-900">
                What Happens Next?
              </h2>

              <p className="mt-2 leading-7 text-slate-600">
                After submission, a service job is created with Pending status
                and an active technician is assigned.
              </p>
            </div>

          </aside>
        </div>
      </main>
    </div>
  );
}

export default Services;