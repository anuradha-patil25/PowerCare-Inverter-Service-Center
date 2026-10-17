import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

function getCartSessionKey() {
  let sessionKey = localStorage.getItem("cart_session_key");

  if (!sessionKey) {
    sessionKey =
      "powercare_cart_" +
      Date.now() +
      "_" +
      Math.random().toString(36).substring(2, 10);

    localStorage.setItem("cart_session_key", sessionKey);
  }

  return sessionKey;
}

function Cart() {
  const [cart, setCart] = useState(null);
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const sessionKey = getCartSessionKey();

  const loadCart = async () => {
    setLoading(true);
    setError("");

    try {
      /* -----------------------------------------
         1. Get all carts
      ----------------------------------------- */
      const cartResponse = await fetch("/api/carts/");

      if (!cartResponse.ok) {
        throw new Error("Unable to load cart.");
      }

      const cartData = await cartResponse.json();

      const cartList = Array.isArray(cartData)
        ? cartData
        : Array.isArray(cartData.results)
        ? cartData.results
        : [];

      /* -----------------------------------------
         2. Find current session cart
      ----------------------------------------- */
      const currentCart = cartList.find(
       (item) =>
        item.session_key === sessionKey &&
        item.status === "ACTIVE"
       );

      if (!currentCart) {
        setCart(null);
        setItems([]);
        setProducts({});
        setLoading(false);
        return;
      }

      setCart(currentCart);

      /* -----------------------------------------
         3. Get cart items
      ----------------------------------------- */
      const cartItemsResponse = await fetch(
        "/api/cart-items/"
      );

      if (!cartItemsResponse.ok) {
        throw new Error("Unable to load cart items.");
      }

      const cartItemsData =
        await cartItemsResponse.json();

      const allCartItems = Array.isArray(cartItemsData)
        ? cartItemsData
        : Array.isArray(cartItemsData.results)
        ? cartItemsData.results
        : [];

      const currentCartItems = allCartItems.filter(
        (item) => {
          const itemCartId =
            typeof item.cart === "object"
              ? item.cart.cart_id
              : item.cart;

          return (
            Number(itemCartId) ===
            Number(currentCart.cart_id)
          );
        }
      );

      setItems(currentCartItems);

      /* -----------------------------------------
         4. Load product information
      ----------------------------------------- */
      const productMap = {};

      await Promise.all(
        currentCartItems.map(async (item) => {
          const productId =
            typeof item.product === "object"
              ? item.product.product_id
              : item.product;

          if (!productId) {
            return;
          }

          const response = await fetch(
            `/api/products/${productId}/`
          );

          if (response.ok) {
            const product = await response.json();
            productMap[productId] = product;
          }
        })
      );

      setProducts(productMap);

    } catch (err) {
      console.error("Cart error:", err);
      setError("Unable to load your cart.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  /* -----------------------------------------
     Update Quantity
  ----------------------------------------- */
  const updateQuantity = async (
    cartItemId,
    newQuantity
  ) => {
    if (newQuantity < 1) {
      return;
    }

    try {
      const response = await fetch(
        `/api/cart-items/${cartItemId}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            quantity: newQuantity,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Unable to update quantity."
        );
      }

      await loadCart();

    } catch (err) {
      console.error(err);
      setError("Unable to update quantity.");
    }
  };

  /* -----------------------------------------
     Remove Item
  ----------------------------------------- */
  const removeItem = async (cartItemId) => {
    try {
      const response = await fetch(
        `/api/cart-items/${cartItemId}/`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Unable to remove item."
        );
      }

      await loadCart();

    } catch (err) {
      console.error(err);
      setError("Unable to remove item.");
    }
  };

  /* -----------------------------------------
     Total
  ----------------------------------------- */
  const total = useMemo(() => {
    return items.reduce((sum, item) => {
      const productId =
        typeof item.product === "object"
          ? item.product.product_id
          : item.product;

      const product = products[productId];

      const price = Number(product?.price || 0);
      const quantity = Number(
        item.quantity || 0
      );

      return sum + price * quantity;
    }, 0);
  }, [items, products]);

  /* -----------------------------------------
     Loading
  ----------------------------------------- */
  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#D5EAE7]">
        <div className="rounded-2xl bg-white px-8 py-6 shadow-lg">
          <p className="font-medium text-slate-600">
            Loading your cart...
          </p>
        </div>
      </div>
    );
  }

  /* -----------------------------------------
     Error
  ----------------------------------------- */
  if (error) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#D5EAE7] px-6">
        <div className="rounded-2xl bg-white p-8 text-center shadow-lg">

          <p className="font-semibold text-red-600">
            {error}
          </p>

          <button
            type="button"
            onClick={loadCart}
            className="mt-5 rounded-xl bg-[#0F7775] px-6 py-3 font-semibold text-white hover:bg-[#0B625F]"
          >
            Try Again
          </button>

        </div>
      </div>
    );
  }

  /* -----------------------------------------
     Empty Cart
  ----------------------------------------- */
  if (!cart || items.length === 0) {
    return (
      <div className="min-h-[70vh] bg-[#D5EAE7] px-6 py-16">

        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-10 text-center shadow-xl">

          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#DDF1EF] text-3xl">
            🛒
          </div>

          <h1 className="mt-6 text-3xl font-bold text-slate-900">
            Your Cart is Empty
          </h1>

          <p className="mt-3 text-slate-600">
            Add an inverter or battery product to your cart.
          </p>

          <Link
            to="/products"
            className="mt-7 inline-block rounded-xl bg-[#0F7775] px-7 py-3.5 font-semibold text-white hover:bg-[#0B625F]"
          >
            Browse Products
          </Link>

        </div>

      </div>
    );
  }

  /* -----------------------------------------
     Cart
  ----------------------------------------- */
  return (
    <div className="min-h-[70vh] bg-[#D5EAE7] px-6 py-12 lg:px-8">

      <div className="mx-auto max-w-7xl">

        <div className="mb-10">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#0F7775]">
            PowerCare
          </p>

          <h1 className="mt-2 text-4xl font-extrabold text-slate-900">
            Shopping Cart
          </h1>

          <p className="mt-3 text-slate-700">
            Review your selected products before checkout.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">

          {/* Cart Items */}
          <div className="space-y-5">

            {items.map((item) => {
              const productId =
                typeof item.product === "object"
                  ? item.product.product_id
                  : item.product;

              const product =
                products[productId];

              if (!product) {
                return null;
              }

              const quantity = Number(
                item.quantity || 1
              );

              const price = Number(
                product.price || 0
              );

              const subtotal =
                price * quantity;

              return (
                <div
                  key={item.cart_item_id}
                  className="rounded-3xl border border-[#BBD8D5] bg-white p-6 shadow-md"
                >

                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center">

                    {/* Image */}
                    <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#EAF5F3] p-4">

                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.product_name}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-sm text-slate-400">
                          No Image
                        </span>
                      )}

                    </div>

                    {/* Product Details */}
                    <div className="min-w-0 flex-1">

                      <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#0F7775]">
                        {product.product_type}
                      </p>

                      <h2 className="mt-2 text-xl font-bold text-slate-900">
                        {product.product_name}
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        {product.brand} • {product.model}
                      </p>

                      <p className="mt-3 text-lg font-bold text-slate-900">
                        ₹{price.toLocaleString("en-IN")}
                      </p>

                      {/* Quantity */}
                      <div className="mt-4 flex items-center gap-3">

                        <span className="text-sm font-medium text-slate-600">
                          Quantity
                        </span>

                        <div className="flex overflow-hidden rounded-lg border border-slate-200">

                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(
                                item.cart_item_id,
                                quantity - 1
                              )
                            }
                            className="h-9 w-9 hover:bg-slate-100"
                          >
                            −
                          </button>

                          <span className="flex h-9 min-w-10 items-center justify-center border-x border-slate-200 text-sm font-semibold">
                            {quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(
                                item.cart_item_id,
                                quantity + 1
                              )
                            }
                            className="h-9 w-9 hover:bg-slate-100"
                          >
                            +
                          </button>

                        </div>

                      </div>

                    </div>

                    {/* Subtotal */}
                    <div className="sm:text-right">

                      <p className="text-xl font-bold text-slate-900">
                        ₹{subtotal.toLocaleString("en-IN")}
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          removeItem(
                            item.cart_item_id
                          )
                        }
                        className="mt-3 text-sm font-semibold text-red-500 hover:text-red-600"
                      >
                        Remove
                      </button>

                    </div>

                  </div>

                </div>
              );
            })}

          </div>

          {/* Summary */}
          <div className="h-fit rounded-3xl bg-white p-7 shadow-xl">

            <h2 className="text-xl font-bold text-slate-900">
              Order Summary
            </h2>

            <div className="mt-6 flex justify-between border-b border-slate-100 pb-4">

              <span className="text-slate-500">
                Subtotal
              </span>

              <span className="font-semibold">
                ₹{total.toLocaleString("en-IN")}
              </span>

            </div>

            <div className="mt-4 flex justify-between border-b border-slate-100 pb-4">

              <span className="text-slate-500">
                Delivery
              </span>

              <span className="font-semibold text-green-600">
                Free
              </span>

            </div>

            <div className="mt-5 flex items-center justify-between">

              <span className="text-lg font-bold">
                Total
              </span>

              <span className="text-2xl font-extrabold text-[#0F7775]">
                ₹{total.toLocaleString("en-IN")}
              </span>

            </div>

            <Link
              to="/checkout"
              className="mt-6 block rounded-xl bg-[#0F7775] px-5 py-3.5 text-center font-semibold text-white hover:bg-[#0B625F]"
            >
              Proceed to Checkout
            </Link>

            <Link
              to="/products"
              className="mt-3 block rounded-xl border border-[#0F7775] px-5 py-3.5 text-center font-semibold text-[#0F7775] hover:bg-[#EAF7F5]"
            >
              Continue Shopping
            </Link>

          </div>

        </div>

      </div>
    </div>
  );
}

export default Cart;