import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const getProductType = (product) =>
  String(product?.product_type || "").toUpperCase();

const getImageUrl = (image) => {
  if (!image) return "";

  if (/^https?:\/\//i.test(image)) {
    return image;
  }

  const path = image.replace(/^\/+/, "");

  if (path.startsWith("media/")) {
    return `/${path}`;
  }

  if (path.startsWith("products/")) {
    return `/media/${path}`;
  }

  return `/${path}`;
};

function Home() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productError, setProductError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [imageErrors, setImageErrors] = useState({});

  const [selectedType, setSelectedType] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchProducts = async () => {
      setLoadingProducts(true);
      setProductError(false);

      try {
        const response = await fetch("/api/products/");

        if (!response.ok) {
          throw new Error("Unable to load products.");
        }

        const data = await response.json();

        const productList = Array.isArray(data)
          ? data
          : Array.isArray(data.results)
            ? data.results
            : [];

        if (!cancelled) {
          setProducts(productList);
        }
      } catch (error) {
        console.error("Product loading error:", error);

        if (!cancelled) {
          setProductError(true);
        }
      } finally {
        if (!cancelled) {
          setLoadingProducts(false);
        }
      }
    };

    fetchProducts();

    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  const typeProducts = useMemo(() => {
    if (!selectedType) return products;

    return products.filter(
      (product) => getProductType(product) === selectedType
    );
  }, [products, selectedType]);

  const brands = useMemo(() => {
    return [
      ...new Set(
        typeProducts
          .map((product) => product.brand)
          .filter(Boolean)
      ),
    ].sort();
  }, [typeProducts]);

  const models = useMemo(() => {
    return [
      ...new Set(
        typeProducts
          .filter(
            (product) =>
              !selectedBrand || product.brand === selectedBrand
          )
          .map((product) => product.model)
          .filter(Boolean)
      ),
    ].sort();
  }, [typeProducts, selectedBrand]);

  const featuredProducts = useMemo(
    () => products.slice(0, 4),
    [products]
  );

  const handleSearch = (event) => {
    event.preventDefault();

    const params = new URLSearchParams();

    if (selectedType) params.set("type", selectedType);
    if (selectedBrand) params.set("brand", selectedBrand);
    if (selectedModel) params.set("model", selectedModel);

    const query = params.toString();

    navigate(query ? `/products?${query}` : "/products");
  };

  const renderProductImage = (product, className = "") => {
    const imageUrl = getImageUrl(product.image);
    const failed = imageErrors[product.product_id];

    if (!imageUrl || failed) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
          <span className="text-4xl" aria-hidden="true">
            {getProductType(product) === "BATTERY" ? "🔋" : "⚡"}
          </span>
          <span className="text-sm">Image unavailable</span>
        </div>
      );
    }

    return (
      <img
        src={imageUrl}
        alt={product.product_name}
        className={className}
        loading="lazy"
        onError={() =>
          setImageErrors((previous) => ({
            ...previous,
            [product.product_id]: true,
          }))
        }
      />
    );
  };

  return (
    <div className="min-h-screen bg-[#D5EAE7] text-slate-900">

      {/* HERO */}
      <section className="overflow-hidden bg-gradient-to-br from-[#D8EFEC] via-[#D5EAE7] to-[#C9E3DF]">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 md:grid-cols-2 lg:px-8 lg:py-20">
          <div>
            <span className="inline-flex rounded-full bg-[#B8E4DF] px-4 py-2 text-sm font-semibold text-[#0F6663]">
              Inverter & Battery Solutions
            </span>

            <h1 className="mt-6 text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
              Reliable Power.
              <span className="block text-[#0F7775]">
                Reliable Service.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-slate-700 sm:text-lg">
              Explore quality inverters and batteries, manage service needs,
              check warranty information, and track your products in one place.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/products"
                className="rounded-xl bg-[#0F7775] px-6 py-3.5 font-semibold text-white shadow-md transition hover:bg-[#0B625F]"
              >
                Explore Products
              </Link>

              <Link
                to="/services"
                className="rounded-xl border border-[#0F7775] bg-white/80 px-6 py-3.5 font-semibold text-[#0F7775] transition hover:bg-white"
              >
                Book a Service
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-6 text-sm font-medium text-slate-700">
              <span>✓ Genuine Products</span>
              <span>✓ Expert Service</span>
              <span>✓ Warranty Support</span>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="relative flex h-[380px] w-full max-w-lg items-center justify-center overflow-hidden rounded-3xl border border-[#BBDDD9] bg-white p-8 shadow-2xl">
              <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#B8E4DF]" />
              <div className="absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-[#C9EAE6]" />

              <img
                src="/powercare-inverter.png"
                alt="PowerCare inverter and battery"
                className="relative z-10 max-h-72 w-full object-contain"
                onError={(event) => {
                  event.currentTarget.style.visibility = "hidden";
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCT FINDER */}
      <section className="bg-[#D5EAE7] px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#0F7775]">
              Product Finder
            </p>

            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
              Find Your Inverter or Battery
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-slate-700">
              Choose your product category, brand and model to find matching products.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <Link
              to="/products?type=INVERTER"
              className="group rounded-3xl border border-[#BFDAD7] bg-white p-7 shadow-md transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#0F7775]">
                    POWER SOLUTIONS
                  </p>
                  <h3 className="mt-2 text-2xl font-bold">Inverters</h3>
                  <p className="mt-3 max-w-md leading-7 text-slate-600">
                    Explore inverter solutions for home and business power backup.
                  </p>
                </div>

                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#DDF1EF] text-4xl">
                  ⚡
                </div>
              </div>

              <div className="mt-6 font-semibold text-[#0F7775]">
                View Inverters →
              </div>
            </Link>

            <Link
              to="/products?type=BATTERY"
              className="group rounded-3xl border border-[#BFDAD7] bg-white p-7 shadow-md transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#0F7775]">
                    POWER STORAGE
                  </p>
                  <h3 className="mt-2 text-2xl font-bold">
                    Inverter Batteries
                  </h3>
                  <p className="mt-3 max-w-md leading-7 text-slate-600">
                    Explore batteries for compatible inverter backup systems.
                  </p>
                </div>

                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#DDF1EF] text-4xl">
                  🔋
                </div>
              </div>

              <div className="mt-6 font-semibold text-[#0F7775]">
                View Batteries →
              </div>
            </Link>
          </div>

          {/* FUNCTIONAL QUICK SEARCH */}
          <form
            onSubmit={handleSearch}
            className="mt-10 rounded-3xl bg-gradient-to-r from-[#0F7775] to-[#159C98] p-7 text-white shadow-xl sm:p-10"
          >
            <p className="text-sm font-semibold uppercase tracking-wider text-[#CFFAF4]">
              Quick Search
            </p>

            <h3 className="mt-2 text-2xl font-bold">
              What are you looking for?
            </h3>

            {productError && (
              <p className="mt-4 text-sm text-white">
                Product options could not be loaded. You can still browse all products.
              </p>
            )}

            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <select
                aria-label="Select product type"
                value={selectedType}
                onChange={(event) => {
                  setSelectedType(event.target.value);
                  setSelectedBrand("");
                  setSelectedModel("");
                }}
                className="w-full rounded-xl border border-white/20 bg-white px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-[#CFFAF4]"
              >
                <option value="">All Product Types</option>
                <option value="INVERTER">Inverter</option>
                <option value="BATTERY">Battery</option>
              </select>

              <select
                aria-label="Select brand"
                value={selectedBrand}
                onChange={(event) => {
                  setSelectedBrand(event.target.value);
                  setSelectedModel("");
                }}
                className="w-full rounded-xl border border-white/20 bg-white px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-[#CFFAF4]"
              >
                <option value="">All Brands</option>
                {brands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>

              <select
                aria-label="Select model"
                value={selectedModel}
                onChange={(event) => setSelectedModel(event.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-[#CFFAF4]"
              >
                <option value="">All Models</option>
                {models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                className="rounded-xl bg-[#CFFAF4] px-5 py-3 font-semibold text-[#0F7775] transition hover:bg-white"
              >
                Search Products
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="bg-[#C9E3DF] px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#0F7775]">
                Featured Products
              </p>
              <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
                Explore Our Products
              </h2>
              <p className="mt-3 text-slate-700">
                Discover products currently available in our catalog.
              </p>
            </div>

            <Link
              to="/products"
              className="font-semibold text-[#0F7775] hover:text-[#0B625F]"
            >
              View All Products →
            </Link>
          </div>

          {loadingProducts ? (
            <div className="mt-10 rounded-2xl bg-white p-10 text-center">
              <p className="text-slate-600">Loading products...</p>
            </div>
          ) : productError ? (
            <div className="mt-10 rounded-2xl bg-white p-10 text-center shadow-sm">
              <p className="font-semibold text-slate-800">
                Products could not be loaded.
              </p>
              <button
                type="button"
                onClick={() => setRetryCount((count) => count + 1)}
                className="mt-4 rounded-lg bg-[#0F7775] px-5 py-2.5 font-semibold text-white hover:bg-[#0B625F]"
              >
                Try Again
              </button>
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="mt-10 rounded-2xl bg-white p-10 text-center">
              <p className="text-slate-600">No products available.</p>
            </div>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featuredProducts.map((product) => (
                <div
                  key={product.product_id}
                  className="overflow-hidden rounded-2xl border border-[#BBDDD9] bg-white shadow-md transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="flex h-52 items-center justify-center bg-[#EAF5F3] p-5">
                    {renderProductImage(
                      product,
                      "h-full w-full object-contain"
                    )}
                  </div>

                  <div className="p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#0F7775]">
                      {getProductType(product)}
                    </p>

                    <h3 className="mt-2 font-bold text-slate-900">
                      {product.product_name}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {product.brand} • {product.model}
                    </p>

                    <div className="mt-4 flex items-center justify-between gap-2">
                      <p className="text-lg font-bold">
                        ₹{Number(product.price).toLocaleString("en-IN")}
                      </p>

                      <span
                        className={
                          Number(product.stock_quantity) > 0
                            ? "text-xs font-semibold text-green-600"
                            : "text-xs font-semibold text-red-600"
                        }
                      >
                        {Number(product.stock_quantity) > 0
                          ? "In Stock"
                          : "Out of Stock"}
                      </span>
                    </div>

                    <Link
                      to={`/products/${product.product_id}`}
                      className="mt-5 block rounded-lg border border-[#0F7775] px-4 py-2.5 text-center text-sm font-semibold text-[#0F7775] transition hover:bg-[#EAF7F5]"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="bg-[#D5EAE7] px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#0F7775]">
              PowerCare Services
            </p>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
              Complete Inverter & Battery Care
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <Link
              to="/services"
              className="rounded-2xl border border-[#BDD8D5] bg-white p-7 shadow-md transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="text-3xl">🛠️</div>
              <h3 className="mt-5 text-xl font-bold">Service Booking</h3>
              <p className="mt-3 leading-7 text-slate-600">
                Request service and track your repair or replacement process.
              </p>
              <span className="mt-4 block font-semibold text-[#0F7775]">
                Book Service →
              </span>
            </Link>

            <Link
              to="/warranty"
              className="rounded-2xl border border-[#BDD8D5] bg-white p-7 shadow-md transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="text-3xl">🛡️</div>
              <h3 className="mt-5 text-xl font-bold">Warranty Support</h3>
              <p className="mt-3 leading-7 text-slate-600">
                Check warranty information and product records.
              </p>
              <span className="mt-4 block font-semibold text-[#0F7775]">
                Check Warranty →
              </span>
            </Link>

            <Link
              to="/customer/dashboard"
              className="rounded-2xl border border-[#BDD8D5] bg-white p-7 shadow-md transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="text-3xl">📋</div>
              <h3 className="mt-5 text-xl font-bold">Service History</h3>
              <p className="mt-3 leading-7 text-slate-600">
                Access your account and review available customer information.
              </p>
              <span className="mt-4 block font-semibold text-[#0F7775]">
                Open Dashboard →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* WHY POWERCARE */}
      <section className="bg-gradient-to-r from-[#0F7775] to-[#159C98] px-6 py-16 text-white lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#CFFAF4]">
              Why PowerCare
            </p>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
              Power Support You Can Rely On
            </h2>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Genuine Products",
                description: "Quality inverter and battery solutions.",
              },
              {
                title: "Expert Technicians",
                description: "Skilled service and repair support.",
              },
              {
                title: "Warranty Support",
                description: "Better visibility into warranty records.",
              },
              {
                title: "Fast Assistance",
                description: "Service information in one system.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl bg-white/10 p-6 backdrop-blur-sm"
              >
                <h3 className="font-bold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-teal-50">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="bg-[#D5EAE7] px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-3xl bg-slate-900 px-7 py-12 text-center text-white shadow-xl sm:px-10">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Need Help With Your Inverter or Battery?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-300">
            Explore products or visit our service section for support with
            your inverter and battery needs.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-4">
            <Link
              to="/products"
              className="rounded-xl bg-[#159C98] px-6 py-3 font-semibold text-white transition hover:bg-[#0F7775]"
            >
              Explore Products
            </Link>
            <Link
              to="/services"
              className="rounded-xl border border-white/30 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              Book a Service
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#BBD8D5] bg-[#C9E3DF]">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div>
            <h3 className="text-xl font-extrabold">PowerCare</h3>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              Inverter and battery products with service management support.
            </p>
          </div>

          <div>
            <h4 className="font-bold">Quick Links</h4>
            <div className="mt-4 space-y-2 text-sm">
              <Link to="/" className="block text-slate-700 hover:text-[#0F7775]">
                Home
              </Link>
              <Link to="/products" className="block text-slate-700 hover:text-[#0F7775]">
                Products
              </Link>
              <Link to="/login" className="block text-slate-700 hover:text-[#0F7775]">
                Login
              </Link>
            </div>
          </div>

          <div>
            <h4 className="font-bold">Services</h4>
            <div className="mt-4 space-y-2 text-sm">
              <Link to="/services" className="block text-slate-700 hover:text-[#0F7775]">
                Service Booking
              </Link>
              <Link to="/warranty" className="block text-slate-700 hover:text-[#0F7775]">
                Warranty Support
              </Link>
              <Link to="/customer/dashboard" className="block text-slate-700 hover:text-[#0F7775]">
                Customer Dashboard
              </Link>
            </div>
          </div>

          <div>
            <h4 className="font-bold">Support</h4>
            <div className="mt-4 space-y-2 text-sm">
              <Link to="/products" className="block text-slate-700 hover:text-[#0F7775]">
                Product Support
              </Link>
              <Link to="/services" className="block text-slate-700 hover:text-[#0F7775]">
                Inverter & Battery Care
              </Link>
              <Link to="/login" className="block text-slate-700 hover:text-[#0F7775]">
                Customer Assistance
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-[#BBD8D5] px-6 py-5 text-center text-xs text-slate-600">
          © 2026 PowerCare Inverter Service Center
        </div>
      </footer>
    </div>
  );
}

export default Home;