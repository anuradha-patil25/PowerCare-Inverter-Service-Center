
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

function Checkout() {
  const [cart, setCart] = useState(null);
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState({});
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState(null);

  const sessionKey = localStorage.getItem("cart_session_key") || "";
  const accessToken = localStorage.getItem("access_token");

  useEffect(() => {
    let cancelled = false;

    async function loadCheckoutCart() {
      setLoading(true);
      setError("");

      try {
        if (!sessionKey) {
          setCart(null);
          setItems([]);
          setProducts({});
          return;
        }

        const cartResponse = await fetch("/api/carts/");

        if (!cartResponse.ok) {
          throw new Error("Unable to load your cart.");
        }

        const cartData = await cartResponse.json();

        const cartList = Array.isArray(cartData)
          ? cartData
          : Array.isArray(cartData.results)
            ? cartData.results
            : [];

        const currentCart = cartList.find(
          (item) =>
            item.session_key === sessionKey &&
            item.status === "ACTIVE"
        );

        if (!currentCart) {
          setCart(null);
          setItems([]);
          setProducts({});
          return;
        }

        const itemsResponse = await fetch("/api/cart-items/");

        if (!itemsResponse.ok) {
          throw new Error("Unable to load cart items.");
        }

        const itemsData = await itemsResponse.json();

        const allItems = Array.isArray(itemsData)
          ? itemsData
          : Array.isArray(itemsData.results)
            ? itemsData.results
            : [];

        const currentItems = allItems.filter((item) => {
          const itemCartId =
            typeof item.cart === "object"
              ? item.cart.cart_id
              : item.cart;

          return Number(itemCartId) === Number(currentCart.cart_id);
        });

        const productMap = {};

        await Promise.all(
          currentItems.map(async (item) => {
            const productId =
              typeof item.product === "object"
                ? item.product.product_id
                : item.product;

            if (!productId) return;

            const response = await fetch(
              `/api/products/${productId}/`
            );

            if (response.ok) {
              const product = await response.json();
              productMap[productId] = product;
            }
          })
        );

        if (!cancelled) {
          setCart(currentCart);
          setItems(currentItems);
          setProducts(productMap);
        }
      } catch (err) {
        console.error("Checkout loading error:", err);

        if (!cancelled) {
          setError(err.message || "Unable to load checkout.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCheckoutCart();

    return () => {
      cancelled = true;
    };
  }, [sessionKey]);

  const total = useMemo(() => {
    return items.reduce((sum, item) => {
      const productId =
        typeof item.product === "object"
          ? item.product.product_id
          : item.product;

      const product = products[productId];

      return (
        sum +
        Number(product?.price || 0) *
          Number(item.quantity || 0)
      );
    }, 0);
  }, [items, products]);

  const handlePlaceOrder = async (event) => {
    event.preventDefault();
    setError("");

    if (!accessToken) {
      setError(
        "Please log in with your customer account before placing the order."
      );
      return;
    }

    if (!sessionKey || !cart || items.length === 0) {
      setError("Your cart is empty. Please add a product first.");
      return;
    }

    if (!deliveryAddress.trim()) {
      setError("Please enter your delivery address.");
      return;
    }

    if (!["UPI", "CASH", "RAZORPAY"].includes(paymentMethod)) {
      setError("Please select a valid payment method.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        "/api/checkout/create-order/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            session_key: sessionKey,
            delivery_address: deliveryAddress.trim(),
            payment_method: paymentMethod,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            "Your login session has expired. Please log in again."
          );
        }

        throw new Error(
          data.error ||
            data.detail ||
            "Unable to create order. Please try again."
        );
      }

      setOrder(data);
    } catch (err) {
      console.error("Order creation error:", err);
      setError(err.message || "Unable to create order.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#D5EAE7] px-5">
        <div className="rounded-2xl bg-white p-8 shadow-lg">
          <p className="font-medium text-slate-600">
            Loading checkout...
          </p>
        </div>
      </div>
    );
  }

  // Order and payment result
  if (order) {
    const payment = order.payment || {};
    const paymentStatus = String(
      payment.status || ""
    ).toUpperCase();

    const paymentSucceeded = paymentStatus === "SUCCESS";

    return (
      <div className="min-h-[70vh] bg-[#D5EAE7] px-5 py-12">
        <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 text-center shadow-xl sm:p-12">
          <div
            className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full text-4xl ${
              paymentSucceeded
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {paymentSucceeded ? "✓" : "!"}
          </div>

          <h1 className="mt-6 text-3xl font-extrabold text-slate-900">
            {paymentSucceeded
              ? "Order Placed Successfully!"
              : "Order Created Successfully"}
          </h1>

          <p className="mt-3 text-slate-600">
            {paymentSucceeded
              ? "Your order has been confirmed and the payment status has been updated."
              : "Your order has been created. Please check the payment status."}
          </p>

          <div className="mt-8 rounded-2xl bg-[#EAF5F3] p-6 text-left">
            <div className="flex justify-between gap-4 py-2">
              <span className="text-slate-600">Order ID</span>
              <span className="font-bold text-slate-900">
                #{order.order_id ?? "—"}
              </span>
            </div>

            <div className="flex justify-between gap-4 py-2">
              <span className="text-slate-600">Order Status</span>
              <span className="font-bold text-slate-900">
                {order.status || "—"}
              </span>
            </div>

            <div className="flex justify-between gap-4 py-2">
              <span className="text-slate-600">Payment Method</span>
              <span className="font-semibold text-slate-900">
                {payment.payment_method === "RAZORPAY"
                  ? "Online Payment"
                  : payment.payment_method || "—"}
              </span>
            </div>

            <div className="flex justify-between gap-4 py-2">
              <span className="text-slate-600">Payment Status</span>
              <span
                className={`font-bold ${
                  paymentSucceeded
                    ? "text-green-700"
                    : "text-amber-700"
                }`}
              >
                {paymentSucceeded
                  ? "Paid"
                  : payment.status || "Pending"}
              </span>
            </div>

            {payment.transaction_id && (
              <div className="border-t border-[#C9E3DF] py-3">
                <p className="text-sm text-slate-600">
                  Transaction Reference
                </p>
                <p className="mt-1 break-all text-sm font-semibold text-slate-900">
                  {payment.transaction_id}
                </p>
              </div>
            )}

            <div className="flex justify-between gap-4 border-t border-[#C9E3DF] pt-4">
              <span className="font-semibold text-slate-700">
                Total Amount
              </span>
              <span className="text-xl font-extrabold text-[#0F7775]">
                ₹{Number(
                  order.total_amount || 0
                ).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          <p className="mt-5 break-words text-sm text-slate-600">
            Delivery Address: {order.delivery_address || "—"}
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/products"
              className="rounded-xl bg-[#0F7775] px-6 py-3 font-semibold text-white hover:bg-[#0B625F]"
            >
              Continue Shopping
            </Link>

            <Link
              to="/customer/dashboard"
              className="rounded-xl border border-[#0F7775] px-6 py-3 font-semibold text-[#0F7775] hover:bg-[#EAF7F5]"
            >
              Customer Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Empty cart
  if (!cart || items.length === 0) {
    return (
      <div className="min-h-[70vh] bg-[#D5EAE7] px-5 py-16">
        <div className="mx-auto max-w-2xl rounded-3xl bg-white p-10 text-center shadow-xl">
          <div className="text-5xl">🛒</div>

          <h1 className="mt-5 text-3xl font-bold text-slate-900">
            Your Cart is Empty
          </h1>

          <p className="mt-3 text-slate-600">
            Add an inverter or battery before proceeding to checkout.
          </p>

          <Link
            to="/products"
            className="mt-7 inline-block rounded-xl bg-[#0F7775] px-6 py-3 font-semibold text-white hover:bg-[#0B625F]"
          >
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] bg-[#D5EAE7] px-5 py-12 lg:px-8">
      <main className="mx-auto max-w-7xl">
        <div className="mb-10">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#0F7775]">
            PowerCare Checkout
          </p>

          <h1 className="mt-2 text-4xl font-extrabold text-slate-900">
            Complete Your Order
          </h1>

          <p className="mt-3 text-slate-700">
            Confirm your products, delivery address and payment method.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"
          >
            {error}
            {!accessToken && (
              <div className="mt-3">
                <Link
                  to="/login"
                  className="font-bold underline"
                >
                  Go to Login
                </Link>
              </div>
            )}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Delivery and Payment Form */}
          <form
            onSubmit={handlePlaceOrder}
            className="rounded-3xl bg-white p-6 shadow-lg sm:p-8"
          >
            <h2 className="text-xl font-bold text-slate-900">
              Delivery Information
            </h2>

            <label
              htmlFor="deliveryAddress"
              className="mt-6 block text-sm font-semibold text-slate-700"
            >
              Full Delivery Address *
            </label>

            <textarea
              id="deliveryAddress"
              value={deliveryAddress}
              onChange={(event) =>
                setDeliveryAddress(event.target.value)
              }
              placeholder="House number, street, area, city, state, PIN code"
              rows={5}
              required
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-[#0F7775] focus:ring-2 focus:ring-[#0F7775]/20"
            />

            <p className="mt-2 text-xs text-slate-500">
              Enter the complete address where your order should be delivered.
            </p>

            {/* Payment Options */}
            <div className="mt-6">
              <h2 className="text-lg font-bold text-slate-900">
                Payment Method
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Choose your preferred payment method.
              </p>

              <div className="mt-4 grid gap-3">
                {[
                  {
                    value: "UPI",
                    label: "UPI",
                    description: "UPI payment option",
                  },
                  {
                    value: "CASH",
                    label: "Cash",
                    description: "Cash payment option",
                  },
                  {
                    value: "RAZORPAY",
                    label: "Online Payment",
                    description: "Online payment option",
                  },
                ].map((method) => (
                  <label
                    key={method.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                      paymentMethod === method.value
                        ? "border-[#0F7775] bg-[#EAF5F3]"
                        : "border-slate-200 bg-white hover:border-teal-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value={method.value}
                      checked={paymentMethod === method.value}
                      onChange={() =>
                        setPaymentMethod(method.value)
                      }
                      className="mt-1 accent-[#0F7775]"
                    />

                    <span>
                      <span className="block font-semibold text-slate-900">
                        {method.label}
                      </span>
                      <span className="mt-1 block text-sm text-slate-500">
                        {method.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !accessToken}
              className="mt-7 w-full rounded-xl bg-[#0F7775] px-6 py-3.5 font-semibold text-white transition hover:bg-[#0B625F] disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {submitting
                ? "Processing Order..."
                : !accessToken
                  ? "Login Required"
                  : "Place Order"}
            </button>

            {!accessToken && (
              <Link
                to="/login"
                className="mt-3 block text-center text-sm font-semibold text-[#0F7775] hover:underline"
              >
                Login to Continue
              </Link>
            )}
          </form>

          {/* Order Summary */}
          <aside className="h-fit rounded-3xl bg-white p-6 shadow-lg sm:p-8">
            <h2 className="text-xl font-bold text-slate-900">
              Order Summary
            </h2>

            <div className="mt-6 space-y-5">
              {items.map((item) => {
                const productId =
                  typeof item.product === "object"
                    ? item.product.product_id
                    : item.product;

                const product = products[productId];

                if (!product) return null;

                const quantity = Number(item.quantity || 1);
                const price = Number(product.price || 0);

                return (
                  <div
                    key={item.cart_item_id}
                    className="flex items-center gap-4"
                  >
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#EAF5F3] p-2">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.product_name}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-slate-400">
                          No Image
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-900">
                        {product.product_name}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Qty: {quantity}
                      </p>
                    </div>

                    <p className="shrink-0 font-bold text-slate-900">
                      ₹{(price * quantity).toLocaleString("en-IN")}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 space-y-4 border-t border-slate-200 pt-5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-semibold text-slate-900">
                  ₹{total.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Delivery</span>
                <span className="font-semibold text-green-600">
                  Free
                </span>
              </div>

              <div className="flex justify-between border-t border-slate-200 pt-4">
                <span className="text-lg font-bold text-slate-900">
                  Total
                </span>

                <span className="text-2xl font-extrabold text-[#0F7775]">
                  ₹{total.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <Link
              to="/cart"
              className="mt-6 block text-center text-sm font-semibold text-[#0F7775] hover:underline"
            >
              ← Return to Cart
            </Link>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default Checkout;
