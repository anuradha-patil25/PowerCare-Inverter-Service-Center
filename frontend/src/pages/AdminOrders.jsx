import { useEffect, useMemo, useState } from "react";

const API_BASE = "http://127.0.0.1:8000/api";

function getList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.orders)) return data.orders;
  return [];
}

function getId(value, fallback = null) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value === "object") {
    return (
      value.order_id ??
      value.order_item_id ??
      value.payment_id ??
      value.customer_id ??
      value.product_id ??
      value.id ??
      fallback
    );
  }

  return value;
}

function getCustomerName(customer) {
  if (!customer || typeof customer !== "object") {
    return "";
  }

  return (
    customer.customer_name ||
    customer.full_name ||
    customer.name ||
    customer.user?.email ||
    customer.email ||
    ""
  );
}

function getProductName(product) {
  if (!product || typeof product !== "object") {
    return "";
  }

  return (
    product.product_name ||
    product.name ||
    product.title ||
    product.model ||
    ""
  );
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(value, currency = "INR") {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "—";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function StatusBadge({ value }) {
  const status = String(value || "UNKNOWN").toUpperCase();

  let style = "bg-stone-100 text-stone-600";

  if (
    ["COMPLETED", "DELIVERED", "PAID", "SUCCESS", "SUCCESSFUL"].includes(
      status
    )
  ) {
    style = "bg-emerald-100 text-emerald-800";
  } else if (
    ["PENDING", "PROCESSING", "CREATED", "INITIATED"].includes(status)
  ) {
    style = "bg-amber-100 text-amber-800";
  } else if (
    ["CANCELLED", "CANCELED", "FAILED", "REFUNDED"].includes(status)
  ) {
    style = "bg-red-100 text-red-800";
  } else if (
    ["SHIPPED", "CONFIRMED", "IN_PROGRESS"].includes(status)
  ) {
    style = "bg-teal-100 text-teal-800";
  }

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${style}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    let active = true;

    async function fetchList(path, token, required = false) {
      try {
        const response = await fetch(`${API_BASE}${path}`, {
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : {},
        });

        if (!response.ok) {
          if (required) {
            if (response.status === 401 || response.status === 403) {
              throw new Error(
                "Access denied. Please log in with an Admin account."
              );
            }

            throw new Error(
              `Orders API error: HTTP ${response.status}`
            );
          }

          return [];
        }

        return getList(await response.json());
      } catch (err) {
        if (required) throw err;
        return [];
      }
    }

    async function loadOrders() {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("access_token");

        const [orderData, itemData, paymentData, customerData, productData] =
          await Promise.all([
            fetchList("/orders/", token, true),
            fetchList("/order-items/", token),
            fetchList("/payments/", token),
            fetchList("/customers/", token),
            fetchList("/products/", token),
          ]);

        if (!active) return;

        setOrders(orderData);
        setOrderItems(itemData);
        setPayments(paymentData);
        setCustomers(customerData);
        setProducts(productData);
      } catch (err) {
        if (active) {
          setError(err.message ||"Failed to load orders. Please try again.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadOrders();

    return () => {
      active = false;
    };
  }, []);

  const customerMap = useMemo(
    () =>
      new Map(
        customers.map((customer) => [
          String(getId(customer.customer_id ?? customer.id)),
          customer,
        ])
      ),
    [customers]
  );

  const productMap = useMemo(
    () =>
      new Map(
        products.map((product) => [
          String(getId(product.product_id ?? product.id)),
          product,
        ])
      ),
    [products]
  );

  const itemsByOrder = useMemo(() => {
    const map = new Map();

    orderItems.forEach((item) => {
      const orderId = getId(item.order);

      if (orderId === null) return;

      const key = String(orderId);

      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });

    return map;
  }, [orderItems]);

  const paymentsByOrder = useMemo(() => {
    const map = new Map();

    payments.forEach((payment) => {
      const orderId = getId(payment.order);

      if (orderId === null) return;

      const key = String(orderId);

      if (!map.has(key)) map.set(key, []);
      map.get(key).push(payment);
    });

    return map;
  }, [payments]);

  function getOrderCustomer(order) {
    const customerId = getId(order.customer);

    const customer =
      customerMap.get(String(customerId)) ||
      (typeof order.customer === "object" ? order.customer : null);

    return getCustomerName(customer) || (
      customerId !== null ? `Customer #${customerId}` : "—"
    );
  }

  function getOrderProducts(order) {
    const items = itemsByOrder.get(String(order.order_id)) || [];

    if (items.length === 0) {
      return "No items found";
    }

    return items
      .map((item) => {
        const productId = getId(item.product);

        const product =
          productMap.get(String(productId)) ||
          (typeof item.product === "object" ? item.product : null);

        const name =
          getProductName(product) ||
          (productId !== null ? `Product #${productId}` : "Product");

        return `${name} × ${item.quantity ?? 1}`;
      })
      .join(", ");
  }

  function getOrderPaymentStatus(order) {
    const orderPayments =
      paymentsByOrder.get(String(order.order_id)) || [];

    if (orderPayments.length === 0) {
      return "NOT RECORDED";
    }

    const latest = [...orderPayments].sort((a, b) => {
      const dateA = new Date(
        a.updated_at || a.created_at || a.paid_at || 0
      ).getTime();

      const dateB = new Date(
        b.updated_at || b.created_at || b.paid_at || 0
      ).getTime();

      return dateB - dateA;
    })[0];

    return String(latest.status || "UNKNOWN").toUpperCase();
  }

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();

    return orders.filter((order) => {
      const customer = getOrderCustomer(order);
      const productsText = getOrderProducts(order);
      const paymentStatus = getOrderPaymentStatus(order);
      const orderStatus = String(order.status || "UNKNOWN").toUpperCase();

      const text = [
        order.order_id,
        customer,
        productsText,
        order.delivery_address,
        order.total_amount,
        orderStatus,
        paymentStatus,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = text.includes(term);
      const matchesStatus =
        statusFilter === "ALL" || orderStatus === statusFilter;
      const matchesPayment =
        paymentFilter === "ALL" || paymentStatus === paymentFilter;

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [
    orders,
    orderItems,
    payments,
    customers,
    products,
    search,
    statusFilter,
    paymentFilter,
  ]);

  const orderStatuses = [
    ...new Set(
      orders.map((order) =>
        String(order.status || "UNKNOWN").toUpperCase()
      )
    ),
  ].sort();

  const paymentStatuses = [
    ...new Set(orders.map(getOrderPaymentStatus)),
  ].sort();

  const totalValue = orders.reduce(
    (sum, order) => sum + (Number(order.total_amount) || 0),
    0
  );

  return (
    <main className="pc-page min-h-screen bg-[#F7F7F0] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <style>{`
          .pc-page { background-color: #F7F7F0; }
          .pc-header, .pc-modal-head { background-image: linear-gradient(to right, #103F35, #17836C); color: #ffffff; }
          .pc-header .pc-eyebrow, .pc-modal-head .pc-eyebrow { color: #D1FAE5; }
          .pc-header .pc-sub { color: #ECFDF5; }
          .pc-card { background-color: #ffffff; border-color: #E3E7D8; }
          .pc-title { color: #173F32; }
          .pc-thead { background-color: #F2F7F2; color: #285B46; }
          .pc-row:hover { background-color: #F8FAF5; }
          .pc-input { background-color: #FCFCF8; border-color: #D6D3D1; color: #292524; }
          .pc-input:focus { border-color: #059669; box-shadow: 0 0 0 2px #D1FAE5; }
          .pc-btn-outline { color: #12624D; border-color: #A7F3D0; }
          .pc-btn-outline:hover { background-color: #ECFDF5; }
          .pc-tile { background-color: #F2F7F2; }
          .pc-value { color: #12624D; }
        `}</style>

        <div className="pc-header rounded-3xl bg-gradient-to-r from-[#103F35] to-[#17836C] p-6 text-white shadow-lg sm:p-8">
          <p className="pc-eyebrow text-xs font-bold uppercase tracking-[0.2em] text-emerald-100 sm:text-sm">
            PowerCare · Administration
          </p>

          <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">
            Orders Management
          </h1>

          <p className="pc-sub mt-2 text-sm leading-6 text-emerald-50 sm:text-base">
            View customer orders, products, delivery details and payment records.
          </p>
        </div>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[
            { label: "Total Orders", value: orders.length },
            { label: "Matching Orders", value: filteredOrders.length },
            {
              label: "Total Order Value",
              value: formatAmount(totalValue),
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6"
            >
              <p className="text-sm font-semibold text-stone-600">
                {card.label}
              </p>
              <p className="pc-value mt-3 break-words text-3xl font-extrabold text-[#12624D] sm:text-4xl">
                {loading ? "—" : card.value}
              </p>
            </div>
          ))}
        </section>

        <section className="pc-card overflow-hidden rounded-2xl border border-[#E3E7D8] bg-white shadow-sm">
          <div className="grid grid-cols-1 gap-3 border-b border-stone-100 p-5 sm:p-6 md:grid-cols-3">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search order, customer or product..."
              className="pc-input min-w-0 rounded-xl border border-stone-300 bg-[#FCFCF8] px-4 py-3 text-base text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="pc-input rounded-xl border border-stone-300 bg-[#FCFCF8] px-4 py-3 text-base text-stone-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="ALL">All Order Statuses</option>
              {orderStatuses.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </select>

            <select
              value={paymentFilter}
              onChange={(event) => setPaymentFilter(event.target.value)}
              className="pc-input rounded-xl border border-stone-300 bg-[#FCFCF8] px-4 py-3 text-base text-stone-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="ALL">All Payment Statuses</option>
              {paymentStatuses.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>

          {loading && (
            <p className="p-10 text-center text-base text-stone-500">
              Loading orders...
            </p>
          )}

          {!loading && error && (
            <div
              role="alert"
              className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800 sm:m-6"
            >
              {error}
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left text-sm">
                  <thead className="pc-thead bg-[#F2F7F2] text-xs uppercase tracking-wide text-[#285B46] sm:text-sm">
                    <tr>
                      <th className="px-5 py-4 font-bold">Order ID</th>
                      <th className="px-5 py-4 font-bold">Customer</th>
                      <th className="px-5 py-4 font-bold">Order Date</th>
                      <th className="px-5 py-4 font-bold">Products</th>
                      <th className="px-5 py-4 font-bold">Total</th>
                      <th className="px-5 py-4 font-bold">Payment</th>
                      <th className="px-5 py-4 font-bold">Order Status</th>
                      <th className="px-5 py-4 font-bold">Details</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-stone-100">
                    {filteredOrders.map((order) => (
                      <tr
                        key={order.order_id}
                        className="pc-row transition hover:bg-[#F8FAF5]"
                      >
                        <td className="px-5 py-4 font-semibold text-stone-600">
                          #{order.order_id}
                        </td>

                        <td className="pc-title px-5 py-4 font-bold text-[#173F32]">
                          {getOrderCustomer(order)}
                        </td>

                        <td className="px-5 py-4 text-stone-600">
                          {formatDate(order.order_date || order.created_at)}
                        </td>

                        <td className="max-w-xs whitespace-normal px-5 py-4 text-stone-600">
                          {getOrderProducts(order)}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 font-semibold text-stone-700">
                          {formatAmount(order.total_amount)}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            value={getOrderPaymentStatus(order)}
                          />
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge value={order.status} />
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="pc-btn-outline rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-[#12624D] transition hover:bg-emerald-50"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}

                    {filteredOrders.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="p-10 text-center text-base text-stone-500"
                        >
                          {orders.length === 0
                            ? "No orders are available."
                            : "No orders match your search or filters."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <p className="border-t border-stone-100 px-5 py-4 text-sm text-stone-500">
                Showing {filteredOrders.length} of {orders.length} orders
              </p>
            </>
          )}
        </section>
      </div>

      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4"
          onClick={() => setSelectedOrder(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-detail-title"
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pc-modal-head -mx-5 -mt-5 mb-5 flex items-start justify-between gap-4 bg-gradient-to-r from-[#103F35] to-[#17836C] px-5 py-5 text-white sm:-mx-6 sm:-mt-6 sm:px-6">
              <div>
                <p className="pc-eyebrow text-xs font-bold uppercase tracking-[0.2em] text-emerald-100">
                  PowerCare · Order Details
                </p>
                <h2
                  id="order-detail-title"
                  className="mt-2 text-2xl font-extrabold"
                >
                  Order #{selectedOrder.order_id}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-lg border border-white/30 px-3 py-2 text-sm font-semibold hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="pc-tile rounded-xl bg-[#F2F7F2] p-4">
                <dt className="text-xs font-semibold text-stone-500">Customer</dt>
                <dd className="pc-title mt-1 font-bold text-[#173F32]">
                  {getOrderCustomer(selectedOrder)}
                </dd>
              </div>

              <div className="pc-tile rounded-xl bg-[#F2F7F2] p-4">
                <dt className="text-xs font-semibold text-stone-500">Order Date</dt>
                <dd className="pc-title mt-1 font-bold text-[#173F32]">
                  {formatDate(
                    selectedOrder.order_date || selectedOrder.created_at
                  )}
                </dd>
              </div>

              <div className="pc-tile rounded-xl bg-[#F2F7F2] p-4">
                <dt className="text-xs font-semibold text-stone-500">Order Status</dt>
                <dd className="mt-2">
                  <StatusBadge value={selectedOrder.status} />
                </dd>
              </div>

              <div className="pc-tile rounded-xl bg-[#F2F7F2] p-4">
                <dt className="text-xs font-semibold text-stone-500">Payment Status</dt>
                <dd className="mt-2">
                  <StatusBadge
                    value={getOrderPaymentStatus(selectedOrder)}
                  />
                </dd>
              </div>

              <div className="pc-tile rounded-xl bg-[#F2F7F2] p-4 sm:col-span-2">
                <dt className="text-xs font-semibold text-stone-500">Products</dt>
                <dd className="pc-title mt-1 font-semibold text-[#173F32]">
                  {getOrderProducts(selectedOrder)}
                </dd>
              </div>

              <div className="pc-tile rounded-xl bg-[#F2F7F2] p-4 sm:col-span-2">
                <dt className="text-xs font-semibold text-stone-500">Delivery Address</dt>
                <dd className="mt-1 whitespace-pre-wrap text-stone-600">
                  {selectedOrder.delivery_address || "—"}
                </dd>
              </div>

              <div className="rounded-xl border border-emerald-200 p-4 sm:col-span-2">
                <dt className="text-sm font-semibold text-stone-600">Total Amount</dt>
                <dd className="pc-value mt-1 text-3xl font-extrabold text-[#12624D]">
                  {formatAmount(selectedOrder.total_amount)}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      )}
    </main>
  );
}