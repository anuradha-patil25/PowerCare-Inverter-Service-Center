import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

function ProductDetails() {
  const { id } = useParams();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [cartLoading, setCartLoading] = useState(false);
  const [cartMessage, setCartMessage] = useState("");
  const [cartMessageType, setCartMessageType] = useState("");

  // ==========================================
  // LOAD PRODUCT
  // ==========================================
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`/api/products/${id}/`);

        if (!response.ok) {
          throw new Error("Unable to load product details.");
        }

        const data = await response.json();
        setProduct(data);
      } catch (err) {
        console.error("Product loading error:", err);
        setError(err.message || "Unable to load product.");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // ==========================================
  // GET OR CREATE CART SESSION KEY
  // ==========================================
  const getCartSessionKey = () => {
    let sessionKey = localStorage.getItem("cart_session_key");

    if (!sessionKey) {
      sessionKey =
        `powercare_cart_${Date.now()}_` +
        Math.random().toString(36).substring(2, 10);

      localStorage.setItem("cart_session_key", sessionKey);
    }

    return sessionKey;
  };

  // ==========================================
  // ADD PRODUCT TO CART
  // ==========================================
  const handleAddToCart = async () => {
    if (!product || product.stock_quantity <= 0) {
      return;
    }

    try {
      setCartLoading(true);
      setCartMessage("");
      setCartMessageType("");

      const sessionKey = getCartSessionKey();

      const response = await fetch("/api/carts/add-item/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_key: sessionKey,

          // Important: backend expects product_id
          product_id: Number(product.product_id),

          quantity: 1,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.detail ||
            data.message ||
            `Unable to add product. HTTP ${response.status}`
        );
      }

      setCartMessage(
        `${product.product_name} added to cart successfully.`
      );
      setCartMessageType("success");
    } catch (err) {
      console.error("Add to Cart error:", err);

      setCartMessage(
        err.message || "Unable to add product to cart."
      );
      setCartMessageType("error");
    } finally {
      setCartLoading(false);
    }
  };

  // ==========================================
  // LOADING
  // ==========================================
  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#D5EAE7] px-5">
        <div className="rounded-2xl bg-white px-8 py-6 shadow-lg">
          <p className="text-lg font-medium text-slate-600">
            Loading product...
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // PRODUCT ERROR
  // ==========================================
  if (error || !product) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#D5EAE7] px-5">
        <div className="max-w-lg rounded-3xl bg-white p-8 text-center shadow-xl">
          <h2 className="text-2xl font-bold text-slate-900">
            Product Not Found
          </h2>

          <p className="mt-3 text-slate-600">
            {error || "The requested product could not be found."}
          </p>

          <Link
            to="/products"
            className="mt-6 inline-block rounded-xl bg-[#0F7775] px-6 py-3 font-semibold text-white hover:bg-[#0B625F]"
          >
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  // ==========================================
  // PRODUCT DETAILS PAGE
  // ==========================================
  return (
    <div className="min-h-screen bg-[#D5EAE7] text-slate-900">
      <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">

        {/* Back Link */}
        <Link
          to="/products"
          className="inline-flex items-center gap-2 font-semibold text-[#0F7775] transition hover:text-[#0B625F]"
        >
          ← Back to Products
        </Link>

        <div className="mt-7 grid grid-cols-1 gap-8 lg:grid-cols-2">

          {/* ==================================
              PRODUCT IMAGE
          ================================== */}
          <div className="flex min-h-[350px] items-center justify-center rounded-3xl border border-[#BBD8D5] bg-white p-8 shadow-lg sm:min-h-[480px]">

            {product.image ? (
              <img
                src={product.image}
                alt={product.product_name}
                className="max-h-[460px] w-full object-contain"
              />
            ) : (
              <div className="text-center text-slate-400">
                <span className="text-5xl">📦</span>
                <p className="mt-4">No Image Available</p>
              </div>
            )}

          </div>

          {/* ==================================
              PRODUCT INFORMATION
          ================================== */}
          <div className="rounded-3xl border border-[#BBD8D5] bg-white p-6 shadow-lg sm:p-8">

            {/* Product Type */}
            <span className="inline-block rounded-full bg-[#DDF1EF] px-4 py-2 text-sm font-bold text-[#0F7775]">
              {product.product_type}
            </span>

            {/* Name */}
            <h1 className="mt-5 text-3xl font-extrabold text-slate-900 sm:text-4xl">
              {product.product_name}
            </h1>

            {/* Brand and Model */}
            <p className="mt-3 text-lg text-slate-500">
              {product.brand} · {product.model}
            </p>

            {/* Price */}
            <div className="mt-6">
              <p className="text-3xl font-extrabold text-[#0F7775]">
                ₹{Number(product.price).toLocaleString("en-IN")}
              </p>
            </div>

            {/* Stock */}
            <div className="mt-5">
              {product.stock_quantity > 0 ? (
                <span className="inline-flex rounded-full bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
                  In Stock ({product.stock_quantity} available)
                </span>
              ) : (
                <span className="inline-flex rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
                  Out of Stock
                </span>
              )}
            </div>

            {/* Description */}
            <div className="mt-8">
              <h2 className="text-xl font-bold text-slate-900">
                Product Description
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                {product.description?.trim()
                  ? product.description
                  : "No product description is available yet."}
              </p>
            </div>

            {/* Product Information Table */}
            <div className="mt-8">
              <h2 className="text-xl font-bold text-slate-900">
                Product Information
              </h2>

              <div className="mt-4 overflow-hidden rounded-xl border border-[#D5EAE7]">

                <div className="grid grid-cols-2 border-b border-[#D5EAE7]">
                  <div className="bg-[#EAF5F3] px-4 py-3 font-semibold text-slate-700">
                    Brand
                  </div>
                  <div className="break-words px-4 py-3 text-slate-600">
                    {product.brand}
                  </div>
                </div>

                <div className="grid grid-cols-2 border-b border-[#D5EAE7]">
                  <div className="bg-[#EAF5F3] px-4 py-3 font-semibold text-slate-700">
                    Model
                  </div>
                  <div className="break-words px-4 py-3 text-slate-600">
                    {product.model}
                  </div>
                </div>

                <div className="grid grid-cols-2 border-b border-[#D5EAE7]">
                  <div className="bg-[#EAF5F3] px-4 py-3 font-semibold text-slate-700">
                    Product Type
                  </div>
                  <div className="break-words px-4 py-3 text-slate-600">
                    {product.product_type}
                  </div>
                </div>

                <div className="grid grid-cols-2 border-b border-[#D5EAE7]">
                  <div className="bg-[#EAF5F3] px-4 py-3 font-semibold text-slate-700">
                    Purchase Date
                  </div>
                  <div className="break-words px-4 py-3 text-slate-600">
                    {product.purchase_date || "Not available"}
                  </div>
                </div>

                <div className="grid grid-cols-2">
                  <div className="bg-[#EAF5F3] px-4 py-3 font-semibold text-slate-700">
                    Status
                  </div>
                  <div className="break-words px-4 py-3 text-slate-600">
                    {product.status}
                  </div>
                </div>

              </div>
            </div>

            {/* ==================================
                CART MESSAGE
            ================================== */}
            {cartMessage && (
              <div
                role="status"
                className={`mt-5 rounded-xl border px-4 py-3 text-sm font-medium ${
                  cartMessageType === "success"
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                <p>{cartMessage}</p>

                {cartMessageType === "success" && (
                  <Link
                    to="/cart"
                    className="mt-2 inline-block font-bold underline"
                  >
                    View Cart
                  </Link>
                )}
              </div>
            )}

            {/* ==================================
                ADD TO CART
            ================================== */}
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={
                product.stock_quantity <= 0 || cartLoading
              }
              className={`mt-6 w-full rounded-xl px-6 py-4 text-lg font-bold transition ${
                product.stock_quantity > 0 && !cartLoading
                  ? "bg-[#0F7775] text-white shadow-md hover:bg-[#0B625F]"
                  : "cursor-not-allowed bg-slate-300 text-slate-500"
              }`}
            >
              {cartLoading
                ? "Adding to Cart..."
                : product.stock_quantity > 0
                  ? "Add to Cart"
                  : "Out of Stock"}
            </button>

          </div>
        </div>
      </main>
    </div>
  );
}

export default ProductDetails;