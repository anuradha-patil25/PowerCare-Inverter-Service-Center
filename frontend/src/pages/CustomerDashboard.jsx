
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import InvoiceReceipt from "../components/InvoiceReceipt";
import CustomerNotifications from "../components/CustomerNotifications";

const SIDEBAR_ITEMS = [
  { label: "Dashboard", icon: "⌂" },
  { label: "My Profile", icon: "◉" },
  { label: "My Products", icon: "▣" },
  { label: "Warranty", icon: "✓" },
  { label: "My Service Requests", icon: "⚙" },
  { label: "Service History", icon: "▤" },
  { label: "Replacement History", icon: "↻" },
  { label: "Invoice / Receipt", icon: "₹" },
  { label: "Notifications", icon: "♧" },
  { label: "Order History", icon: "▧" },
];

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "—";

  const text = String(value).trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T|\s)/);

  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }

  const date = new Date(text);

  if (!Number.isNaN(date.getTime())) {
    return [
      String(date.getDate()).padStart(2, "0"),
      String(date.getMonth() + 1).padStart(2, "0"),
      date.getFullYear(),
    ].join("/");
  }

  return text;
};

const getStatusClass = (status) => {
  const value = String(status || "").toUpperCase();

  if (
    [
      "ACTIVE",
      "COMPLETED",
      "DELIVERED",
      "PAID",
      "SUCCESS",
      "CONFIRMED",
    ].includes(value)
  ) {
    return "bg-emerald-100 text-emerald-800";
  }

  if (["PENDING", "IN_PROGRESS", "PARTIAL"].includes(value)) {
    return "bg-amber-100 text-amber-800";
  }

  if (
    [
      "CANCELLED",
      "INACTIVE",
      "EXPIRED",
      "FAILED",
      "UNPAID",
      "RETIRED",
    ].includes(value)
  ) {
    return "bg-rose-100 text-rose-800";
  }

  return "bg-slate-100 text-slate-700";
};

const getImageUrl = (image) => {
  if (!image) return "";
  if (/^https?:\/\//i.test(image)) return image;
  return image.startsWith("/") ? image : `/${image}`;
};

// Shared authenticated customer API helper
async function customerApi(url, options = {}) {
  let accessToken = localStorage.getItem("access_token");
  const refreshToken = localStorage.getItem("refresh_token");

  if (!accessToken) {
    const error = new Error(
      "Please log in to access your customer dashboard."
    );
    error.code = "LOGIN_REQUIRED";
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
      headers: { "Content-Type": "application/json" },
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

      const error = new Error(
        "Your session has expired. Please log in again."
      );
      error.code = "LOGIN_REQUIRED";
      throw error;
    }
  }

  if (response.status === 401) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("current_user");

    const error = new Error(
      "Your session has expired. Please log in again."
    );
    error.code = "LOGIN_REQUIRED";
    throw error;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error ||
        data.detail ||
        (response.status === 404
          ? `API endpoint not found: ${url}`
          : `Request failed with status ${response.status}.`)
    );
  }

  return data;
}

function SectionHeading({ title, subtitle }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
      {subtitle && (
        <p className="mt-1 text-sm leading-6 text-slate-500">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
        status
      )}`}
    >
      {String(status || "UNKNOWN").replace(/_/g, " ")}
    </span>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#A7D1CB] bg-white px-6 py-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF5F3] text-2xl text-[#0F7775]">
        ✓
      </div>
      <h3 className="mt-4 text-lg font-bold text-slate-800">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function CustomerDashboard() {
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState("Dashboard");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [loginRequired, setLoginRequired] = useState(false);

  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);

  const [paymentMethods, setPaymentMethods] = useState({});
  const [payingOrderId, setPayingOrderId] = useState(null);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentError, setPaymentError] = useState("");

  const [profileForm, setProfileForm] = useState({
    customer_name: "",
    phone: "",
    email: "",
    address: "",
  });

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setPageError("");
    setLoginRequired(false);

    try {
      const results = await Promise.all([
        customerApi("/api/auth/profile/"),
        customerApi("/api/my-orders/"),
        customerApi("/api/my-service-requests/"),
        customerApi("/api/my-products/"),
      ]);

      const profileData = results[0]?.customer || null;
      const ordersData = results[1]?.orders || [];
      const servicesData = results[2]?.service_requests || [];
      const productsData = results[3]?.products || [];

      setProfile(profileData);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setServiceRequests(
        Array.isArray(servicesData) ? servicesData : []
      );
      setProducts(Array.isArray(productsData) ? productsData : []);

      if (profileData) {
        setProfileForm({
          customer_name: profileData.customer_name || "",
          phone: profileData.phone || "",
          email: profileData.email || "",
          address: profileData.address || "",
        });
      }
    } catch (error) {
      console.error("Customer dashboard loading error:", error);
      setPageError(error.message || "Unable to load dashboard data.");
      setLoginRequired(error.code === "LOGIN_REQUIRED");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const completedServices = useMemo(
    () =>
      serviceRequests.filter(
        (job) => String(job.status).toUpperCase() === "COMPLETED"
      ),
    [serviceRequests]
  );

  const activeServices = useMemo(
    () =>
      serviceRequests.filter((job) =>
        ["PENDING", "IN_PROGRESS"].includes(
          String(job.status).toUpperCase()
        )
      ),
    [serviceRequests]
  );

  const replacementServices = useMemo(
    () =>
      serviceRequests.filter(
        (job) =>
          String(job.service_type).toUpperCase() === "REPLACEMENT"
      ),
    [serviceRequests]
  );

  const activeWarranties = useMemo(
    () =>
      products.filter(
        (item) =>
          item.warranty &&
          String(item.warranty.status).toUpperCase() === "ACTIVE"
      ),
    [products]
  );

  const updateProfileField = (event) => {
    const { name, value } = event.target;

    setProfileForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setProfileSaving(true);
    setProfileMessage("");
    setProfileError("");

    try {
      const result = await customerApi("/api/auth/profile/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: profileForm.customer_name.trim(),
          phone: profileForm.phone.trim(),
          email: profileForm.email.trim(),
          address: profileForm.address.trim(),
        }),
      });

      const updatedProfile = result.customer || profile;
      setProfile(updatedProfile);

      if (updatedProfile) {
        setProfileForm({
          customer_name: updatedProfile.customer_name || "",
          phone: updatedProfile.phone || "",
          email: updatedProfile.email || "",
          address: updatedProfile.address || "",
        });
      }

      setProfileMessage(
        result.message || "Profile updated successfully."
      );
    } catch (error) {
      setProfileError(error.message || "Unable to update profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  // Pay an existing order. This uses the project's simulated-payment API.
  const handleOrderPayment = async (order) => {
    console.log("Pay Now clicked for order:", order.order_id);

    setPaymentMessage("");
    setPaymentError("");
    setPayingOrderId(order.order_id);

    const paymentMethod = paymentMethods[order.order_id] || "UPI";

    try {
      const result = await customerApi(
        `/api/my-orders/${order.order_id}/pay/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payment_method: paymentMethod,
          }),
        }
      );

      setOrders((previousOrders) =>
        previousOrders.map((item) =>
          item.order_id === order.order_id
            ? {
                ...item,
                status: result.status || item.status,
              }
            : item
        )
      );

      setPaymentMessage(
        result.message ||
          `Payment updated for Order #${order.order_id}.`
      );
    } catch (error) {
      console.error("Payment request error:", error);
      setPaymentError(
        error.message || "Unable to complete the payment request."
      );
    } finally {
      setPayingOrderId(null);
    }
  };

  const handleLogout = () => {
  navigate("/logout", {
    state: { from: "/customer/dashboard" },
  });
};

  const navigateSection = (section) => {
    setActiveSection(section);
    setPageError("");
    setProfileMessage("");
    setProfileError("");
    setPaymentMessage("");
    setPaymentError("");
  };

  const renderDashboardHome = () => (
    <div className="space-y-6">
      <SectionHeading
        title={`Welcome${profile?.customer_name ? `, ${profile.customer_name}` : ""}!`}
        subtitle="Manage your registered products, warranties, services and orders in one place."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "My Products",
            value: products.length,
            icon: "▣",
            action: "My Products",
            link: "View Products",
          },
          {
            label: "Active Warranties",
            value: activeWarranties.length,
            icon: "✓",
            action: "Warranty",
            link: "Check Warranty",
          },
          {
            label: "Active Services",
            value: activeServices.length,
            icon: "⚙",
            action: "My Service Requests",
            link: "Track Services",
          },
          {
            label: "Total Orders",
            value: orders.length,
            icon: "▧",
            action: "Order History",
            link: "View Orders",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-[#C9E3DF] bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">
                {card.label}
              </span>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF5F3] text-xl text-[#0F7775]">
                {card.icon}
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold text-slate-800">
              {card.value}
            </p>
            <button
              type="button"
              onClick={() => navigateSection(card.action)}
              className="mt-3 text-sm font-semibold text-[#0F7775] hover:underline"
            >
              {card.link} →
            </button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-[#C9E3DF] bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                Recent Service Requests
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Your latest service activity
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigateSection("My Service Requests")}
              className="text-sm font-semibold text-[#0F7775] hover:underline"
            >
              View All
            </button>
          </div>

          {serviceRequests.length === 0 ? (
            <p className="rounded-xl bg-[#F5FAF9] p-4 text-sm text-slate-500">
              No service requests found.
            </p>
          ) : (
            <div className="space-y-3">
              {serviceRequests.slice(0, 3).map((job) => (
                <div
                  key={job.job_id}
                  className="flex flex-col justify-between gap-3 rounded-xl border border-[#E2EFED] p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-semibold text-slate-800">
                      Job #{job.job_id}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {job.product_name || "Product"} ·{" "}
                      {job.serial_number || "No serial number"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatDate(job.service_date)}
                    </p>
                  </div>
                  <StatusBadge status={job.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[#C9E3DF] bg-white p-5 sm:p-6">
          <h3 className="text-lg font-bold text-slate-800">Quick Actions</h3>
          <p className="mt-1 text-sm text-slate-500">
            Go directly to a customer feature
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              ["My Profile", "View or update your details"],
              ["My Products", "View serial numbers"],
              ["Warranty", "Check warranty dates"],
              ["Invoice / Receipt", "View bills and print receipts"],
              ["Service History", "Review completed services"],
              ["Order History", "Track product orders"],
            ].map(([label, description]) => (
              <button
                key={label}
                type="button"
                onClick={() => navigateSection(label)}
                className="rounded-xl border border-[#C9E3DF] p-4 text-left transition hover:bg-[#F2F8F7]"
              >
                <p className="font-semibold text-slate-800">{label}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {description}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div>
      <SectionHeading
        title="My Profile"
        subtitle="View and update your customer information."
      />

      <form
        onSubmit={saveProfile}
        className="max-w-3xl rounded-2xl border border-[#C9E3DF] bg-white p-5 sm:p-8"
      >
        <div className="mb-6 flex items-center gap-4 border-b border-[#E2EFED] pb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0F7775] text-2xl font-bold text-white">
            {(profileForm.customer_name || "C").charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              {profileForm.customer_name || "Customer"}
            </h3>
            <p className="text-sm text-slate-500">
              Customer ID: {profile?.customer_id ?? "—"}
            </p>
          </div>
        </div>

        {profileMessage && (
          <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
            {profileMessage}
          </p>
        )}
        {profileError && (
          <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            {profileError}
          </p>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Full Name
            </span>
            <input
              name="customer_name"
              type="text"
              value={profileForm.customer_name}
              onChange={updateProfileField}
              required
              className="w-full rounded-xl border border-[#C9E3DF] px-4 py-3 outline-none focus:border-[#0F7775] focus:ring-2 focus:ring-[#CFFAF4]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Phone Number
            </span>
            <input
              name="phone"
              type="tel"
              value={profileForm.phone}
              onChange={updateProfileField}
              required
              className="w-full rounded-xl border border-[#C9E3DF] px-4 py-3 outline-none focus:border-[#0F7775] focus:ring-2 focus:ring-[#CFFAF4]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Email Address
            </span>
            <input
              name="email"
              type="email"
              value={profileForm.email}
              onChange={updateProfileField}
              className="w-full rounded-xl border border-[#C9E3DF] px-4 py-3 outline-none focus:border-[#0F7775] focus:ring-2 focus:ring-[#CFFAF4]"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Address
            </span>
            <textarea
              name="address"
              value={profileForm.address}
              onChange={updateProfileField}
              rows={3}
              className="w-full rounded-xl border border-[#C9E3DF] px-4 py-3 outline-none focus:border-[#0F7775] focus:ring-2 focus:ring-[#CFFAF4]"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={profileSaving}
            className="rounded-xl bg-[#0F7775] px-6 py-3 font-semibold text-white hover:bg-[#096260] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {profileSaving ? "Saving..." : "Save Changes"}
          </button>

          <button
            type="button"
            onClick={() => {
              setProfileForm({
                customer_name: profile?.customer_name || "",
                phone: profile?.phone || "",
                email: profile?.email || "",
                address: profile?.address || "",
              });
              setProfileMessage("");
              setProfileError("");
            }}
            className="rounded-xl border border-[#C9E3DF] px-6 py-3 font-semibold text-slate-700 hover:bg-[#F2F8F7]"
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );

  const renderProducts = () => (
    <div>
      <SectionHeading
        title="My Products"
        subtitle="Your registered inverter and battery products, serial numbers and warranty information."
      />

      {products.length === 0 ? (
        <EmptyState
          title="No registered products"
          description="Products registered to your customer account will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {products.map((item) => {
            const product = item.product || {};
            const warranty = item.warranty;
            const imageUrl = getImageUrl(product.image);

            return (
              <article
               key={
  item.item_id ||
  item.serial_id ||
  `order-${item.purchase_order_id}`
}
                className="overflow-hidden rounded-2xl border border-[#C9E3DF] bg-white"
              >
                <div className="flex h-48 items-center justify-center bg-[#F2F8F7] p-5">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={product.product_name || "Registered product"}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-sm text-slate-400">
                      Product image not available
                    </span>
                  )}
                </div>

                <div className="space-y-4 p-5">
                  <div>
                    <span className="inline-flex rounded-full bg-[#EAF5F3] px-3 py-1 text-xs font-bold text-[#0F7775]">
                      {product.product_type || "PRODUCT"}
                    </span>
                    <h3 className="mt-3 text-lg font-bold text-slate-800">
                      {product.product_name || "Product"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {product.brand || "—"} · {product.model || "—"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#F5FAF9] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Serial Number
                    </p>
                    <p className="mt-1 break-all font-bold text-slate-800">
                      {item.serial_number ||
  (item.source === "ORDER"
    ? `Awaiting registration — Order #${item.purchase_order_id}`
    : "—")}
                    </p>
                    <p className="mt-3 text-xs text-slate-500">
                      Registered: {formatDate(item.registered_date || item.purchase_date)}
                    </p>
                    <p className="mt-3 text-xs text-slate-500">
                      Serial Status
                    </p>
                    <div className="mt-1">
                      <StatusBadge status={item.serial_status} />
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#C9E3DF] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="font-semibold text-slate-800">
                        Warranty
                      </h4>
                      <StatusBadge status={warranty?.status || "UNKNOWN"} />
                    </div>

                    {warranty ? (
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500">Start Date</span>
                          <span className="font-medium text-slate-700">
                            {formatDate(warranty.start_date)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500">End Date</span>
                          <span className="font-medium text-slate-700">
                            {formatDate(warranty.end_date)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">
                        No warranty record is available for this product.
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderWarranty = () => (
    <div>
      <SectionHeading
        title="Warranty"
        subtitle="Check the warranty details of your registered products."
      />

      {products.length === 0 ? (
        <EmptyState
          title="No registered products"
          description="Register a product to view its warranty information."
        />
      ) : (
        <div className="space-y-4">
          {products.map((item) => {
            const product = item.product || {};
            const warranty = item.warranty;

            return (
              <article
                key={
  item.item_id ||
  item.serial_id ||
  `order-${item.purchase_order_id}`
}
                className="rounded-2xl border border-[#C9E3DF] bg-white p-5 sm:p-6"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">
                      {product.product_name || "Product"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {product.brand || "—"} · {product.model || "—"}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      Serial Number: <strong>{item.serial_number ||
  (item.source === "ORDER"
    ? `Awaiting registration — Order #${item.purchase_order_id}`
    : "—")}</strong>
                    </p>
                  </div>
                  <StatusBadge status={warranty?.status || "UNKNOWN"} />
                </div>

                {warranty ? (
                  <div className="mt-5 grid grid-cols-1 gap-4 rounded-xl bg-[#F2F8F7] p-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-slate-500">Warranty Start</p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {formatDate(warranty.start_date)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Warranty End</p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {formatDate(warranty.end_date)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Registered Date</p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {formatDate(item.registered_date || item.purchase_date)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                    No warranty information is currently available.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderServiceRequests = () => (
    <div>
      <SectionHeading
        title="My Service Requests"
        subtitle="Track the current status of your service requests."
      />

      {serviceRequests.length === 0 ? (
        <EmptyState
          title="No service requests found"
          description="When you submit a service request, its details and status will appear here."
        />
      ) : (
        <div className="space-y-4">
          {serviceRequests.map((job) => (
            <article
              key={job.job_id}
              className="rounded-2xl border border-[#C9E3DF] bg-white p-5 sm:p-6"
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#0F7775]">
                    Job Number
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-slate-800">
                    JOB-{job.job_id}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatDate(job.service_date)}
                  </p>
                </div>
                <StatusBadge status={job.status} />
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Product
                  </p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {job.product_name || "—"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {job.brand || "—"} · {job.model || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Serial Number
                  </p>
                  <p className="mt-1 break-all font-semibold text-slate-800">
                    {job.serial_number || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Service Type
                  </p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {job.service_type || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Technician
                  </p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {job.technician_name || "Not assigned"}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-[#F5FAF9] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Problem Description
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {job.problem_description || "—"}
                </p>

                {job.diagnosis && (
                  <>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Diagnosis
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {job.diagnosis}
                    </p>
                  </>
                )}

                {job.repair_details && (
                  <>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Repair Details
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {job.repair_details}
                    </p>
                  </>
                )}

                {job.replacement_details && (
                  <>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Replacement Details
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {job.replacement_details}
                    </p>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );

  const renderServiceHistory = () => (
    <div>
      <SectionHeading
        title="Service History"
        subtitle="Review completed service jobs and their recorded details."
      />

      {completedServices.length === 0 ? (
        <EmptyState
          title="No completed services"
          description="Completed service records will be listed here."
        />
      ) : (
        <div className="space-y-4">
          {completedServices.map((job) => (
            <article
              key={job.job_id}
              className="rounded-2xl border border-[#C9E3DF] bg-white p-5"
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h3 className="font-bold text-slate-800">
                    Job #{job.job_id} · {job.service_type || "Service"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {job.product_name || "Product"} · {job.serial_number || "—"}
                  </p>
                </div>
                <StatusBadge status={job.status} />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-[#F5FAF9] p-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-500">Service Date</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {formatDate(job.service_date)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Technician</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {job.technician_name || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Serial Number</p>
                  <p className="mt-1 break-all text-sm font-semibold text-slate-800">
                    {job.serial_number || "—"}
                  </p>
                </div>
              </div>

              {job.diagnosis && (
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  <strong>Diagnosis:</strong> {job.diagnosis}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );

  const renderReplacementHistory = () => (
    <div>
      <SectionHeading
        title="Replacement History"
        subtitle="View service jobs recorded as replacements."
      />

      {replacementServices.length === 0 ? (
        <EmptyState
          title="No replacement records"
          description="Replacement service jobs associated with your account will appear here."
        />
      ) : (
        <div className="space-y-4">
          {replacementServices.map((job) => (
            <article
              key={job.job_id}
              className="rounded-2xl border border-[#C9E3DF] bg-white p-5"
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h3 className="font-bold text-slate-800">
                    Replacement · Job #{job.job_id}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {job.product_name || "Product"} · {job.serial_number || "—"}
                  </p>
                </div>
                <StatusBadge status={job.status} />
              </div>

              <div className="mt-4 rounded-xl bg-[#F5FAF9] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Replacement Details
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {job.replacement_details || "No replacement details recorded."}
                </p>
                <p className="mt-4 text-xs text-slate-500">
                  Service Date: {formatDate(job.service_date)}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );

  const renderOrderHistory = () => (
    <div>
      <SectionHeading
        title="Order History"
        subtitle="View your product orders, order status and totals."
      />

      {paymentMessage && (
        <p
          role="status"
          className="mb-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          {paymentMessage}
        </p>
      )}

      {paymentError && (
        <p
          role="alert"
          className="mb-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          {paymentError}
        </p>
      )}

      {orders.length === 0 ? (
        <EmptyState
          title="No orders found"
          description="Orders placed using your customer account will appear here."
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const orderItems = Array.isArray(order.items)
              ? order.items
              : Array.isArray(order.order_items)
                ? order.order_items
                : [];

            const orderStatus = String(order.status || "").toUpperCase();
            const canPay = orderStatus === "PENDING";

            return (
              <article
                key={order.order_id}
                className="overflow-hidden rounded-2xl border border-[#C9E3DF] bg-white"
              >
                <div className="flex flex-col justify-between gap-3 border-b border-[#E2EFED] bg-[#F5FAF9] p-5 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">
                      Order #{order.order_id}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Ordered: {formatDate(order.order_date)}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                <div className="p-5">
                  {canPay && (
                    <div className="mb-5 rounded-xl border border-[#C9E3DF] bg-[#F5FAF9] p-4">
                      <h4 className="font-bold text-slate-800">
                        Payment
                      </h4>
                      <p className="mt-1 text-sm text-slate-500">
                        Select a payment method for this order.
                      </p>

                      <select
                        value={paymentMethods[order.order_id] || "UPI"}
                        onChange={(event) =>
                          setPaymentMethods((previous) => ({
                            ...previous,
                            [order.order_id]: event.target.value,
                          }))
                        }
                        disabled={payingOrderId === order.order_id}
                        className="mt-3 w-full rounded-xl border border-[#C9E3DF] bg-white px-4 py-3 text-sm"
                      >
                        <option value="UPI">UPI</option>
                        <option value="CASH">Cash</option>
                        <option value="RAZORPAY">Online Payment</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleOrderPayment(order)}
                        disabled={payingOrderId === order.order_id}
                        className="mt-3 w-full rounded-xl bg-[#0F7775] px-5 py-3 font-semibold text-white transition hover:bg-[#096260] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {payingOrderId === order.order_id
                          ? "Processing..."
                          : "Pay Now"}
                      </button>

                      <p className="mt-2 text-xs text-slate-500">
                        Payments in this project are simulated. No real money is collected.
                      </p>
                    </div>
                  )}

                  {orderItems.length > 0 && (
                    <div className="mb-4 space-y-3">
                      {orderItems.map((item, index) => (
                        <div
                          key={item.order_item_id || index}
                          className="flex flex-col justify-between gap-2 rounded-xl border border-[#E2EFED] p-3 sm:flex-row sm:items-center"
                        >
                          <div>
                            <p className="font-semibold text-slate-800">
                              {item.product_name ||
                                item.product?.product_name ||
                                item.product ||
                                "Product"}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              Quantity: {item.quantity ?? "—"}
                            </p>
                          </div>
                          <p className="font-semibold text-slate-800">
                            {formatMoney(
                              item.subtotal ??
                                Number(item.unit_price || 0) *
                                  Number(item.quantity || 0)
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="rounded-xl bg-[#F2F8F7] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-semibold text-slate-700">
                        Order Total
                      </span>
                      <span className="text-xl font-bold text-[#0F7775]">
                        {formatMoney(order.total_amount)}
                      </span>
                    </div>

                    {order.delivery_address && (
                      <p className="mt-3 text-sm leading-6 text-slate-500">
                        <strong>Delivery Address:</strong>{" "}
                        {order.delivery_address}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderActiveSection = () => {
    switch (activeSection) {
      case "My Profile":
        return renderProfile();
      case "My Products":
        return renderProducts();
      case "Warranty":
        return renderWarranty();
      case "My Service Requests":
        return renderServiceRequests();
      case "Service History":
        return renderServiceHistory();
      case "Replacement History":
        return renderReplacementHistory();
      case "Invoice / Receipt":
        return <InvoiceReceipt />;
      case "Notifications":
        return <CustomerNotifications />;
      case "Order History":
        return renderOrderHistory();
      case "Dashboard":
      default:
        return renderDashboardHome();
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-[#D5EAE7] px-4 py-16">
        <div className="mx-auto max-w-7xl rounded-2xl border border-[#C9E3DF] bg-white p-10 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#C9E3DF] border-t-[#0F7775]" />
          <p className="mt-4 font-semibold text-[#0F7775]">
            Loading customer dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="min-h-[60vh] bg-[#D5EAE7] px-4 py-12">
        <div className="mx-auto max-w-2xl rounded-2xl border border-[#C9E3DF] bg-white p-8 text-center">
          <h2 className="text-2xl font-bold text-slate-800">
            Unable to Load Dashboard
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {pageError}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {loginRequired ? (
              <Link
                to="/login"
                className="rounded-xl bg-[#0F7775] px-5 py-3 font-semibold text-white hover:bg-[#096260]"
              >
                Go to Login
              </Link>
            ) : (
              <button
                type="button"
                onClick={loadDashboardData}
                className="rounded-xl bg-[#0F7775] px-5 py-3 font-semibold text-white hover:bg-[#096260]"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#D5EAE7] px-3 py-6 sm:px-5 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#0F7775]">
              PowerCare Service Center
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-800 sm:text-3xl">
              Customer Dashboard
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Welcome back, {profile?.customer_name || "Customer"}.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadDashboardData}
              className="rounded-xl border border-[#A7D1CB] bg-white px-4 py-2.5 text-sm font-semibold text-[#0F7775] transition hover:bg-[#F2F8F7]"
            >
              Refresh Data
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl bg-[#0F7775] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#096260]"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-2xl border border-[#C9E3DF] bg-white">
            <div className="border-b border-[#DCECE9] bg-[#F5FAF9] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0F7775] to-[#159C98] text-lg font-bold text-white">
                  {(profile?.customer_name || "C").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-800">
                    {profile?.customer_name || "Customer"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Customer ID: {profile?.customer_id ?? "—"}
                  </p>
                </div>
              </div>
            </div>

            <nav
              aria-label="Customer dashboard navigation"
              className="flex gap-2 overflow-x-auto p-3 lg:block lg:space-y-1 lg:overflow-visible"
            >
              {SIDEBAR_ITEMS.map((item) => {
                const isActive = activeSection === item.label;

                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => navigateSection(item.label)}
                    className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition lg:w-full ${
                      isActive
                        ? "bg-[#0F7775] text-white shadow-sm"
                        : "text-slate-600 hover:bg-[#EAF5F3] hover:text-[#0F7775]"
                    }`}
                  >
                    <span className="flex h-6 w-6 items-center justify-center text-base">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="hidden border-t border-[#DCECE9] p-4 lg:block">
              <p className="text-xs leading-5 text-slate-500">
                Need assistance? Contact your service center for help with your product or service request.
              </p>
              <Link
                to="/services"
                className="mt-3 inline-flex text-sm font-bold text-[#0F7775] hover:underline"
              >
                Request Service →
              </Link>
            </div>
          </aside>

          <section className="min-w-0 rounded-2xl border border-[#C9E3DF] bg-[#F8FCFB] p-4 sm:p-6 lg:p-8">
            {renderActiveSection()}
          </section>
        </div>

        <footer className="mt-8 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} PowerCare Service Center. All rights reserved.
        </footer>
      </div>
    </main>
  );
}

export default CustomerDashboard;
