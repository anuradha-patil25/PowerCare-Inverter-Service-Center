import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import getProductImageUrl from "../utils/productImageUrl";

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

function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [imageErrors, setImageErrors] = useState({});

  const [searchParams, setSearchParams] = useSearchParams();

  const [typeFilter, setTypeFilter] = useState(
    searchParams.get("type")?.toUpperCase() || ""
  );
  const [brandFilter, setBrandFilter] = useState(
    searchParams.get("brand") || ""
  );
  const [modelFilter, setModelFilter] = useState(
    searchParams.get("model") || ""
  );
  const [nameQuery, setNameQuery] = useState(
    searchParams.get("q") || ""
  );

  useEffect(() => {
    setTypeFilter(searchParams.get("type")?.toUpperCase() || "");
    setBrandFilter(searchParams.get("brand") || "");
    setModelFilter(searchParams.get("model") || "");
    setNameQuery(searchParams.get("q") || "");
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    const fetchProducts = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/products/");

        if (!response.ok) {
          throw new Error("Failed to load products.");
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
      } catch (fetchError) {
        console.error("Product loading error:", fetchError);

        if (!cancelled) {
          setError("Products could not be loaded. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchProducts();

    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  const brands = useMemo(() => {
    return [
      ...new Set(
        products
          .filter(
            (product) =>
              !typeFilter || getProductType(product) === typeFilter
          )
          .map((product) => product.brand)
          .filter(Boolean)
      ),
    ].sort();
  }, [products, typeFilter]);

  const models = useMemo(() => {
    return [
      ...new Set(
        products
          .filter(
            (product) =>
              (!typeFilter || getProductType(product) === typeFilter) &&
              (!brandFilter || product.brand === brandFilter)
          )
          .map((product) => product.model)
          .filter(Boolean)
      ),
    ].sort();
  }, [products, typeFilter, brandFilter]);

  const filteredProducts = useMemo(() => {
    const query = nameQuery.trim().toLowerCase();

    return products.filter((product) => {
      const matchesType =
        !typeFilter || getProductType(product) === typeFilter;

      const matchesBrand =
        !brandFilter || product.brand === brandFilter;

      const matchesModel =
        !modelFilter || product.model === modelFilter;

      const searchableText = [
        product.product_name,
        product.brand,
        product.model,
        product.product_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesName = !query || searchableText.includes(query);

      return (
        matchesType &&
        matchesBrand &&
        matchesModel &&
        matchesName
      );
    });
  }, [products, typeFilter, brandFilter, modelFilter, nameQuery]);

  const applyFilters = (event) => {
    event.preventDefault();

    const params = new URLSearchParams();

    if (typeFilter) params.set("type", typeFilter);
    if (brandFilter) params.set("brand", brandFilter);
    if (modelFilter) params.set("model", modelFilter);
    if (nameQuery.trim()) params.set("q", nameQuery.trim());

    setSearchParams(params);
  };

  const clearFilters = () => {
    setTypeFilter("");
    setBrandFilter("");
    setModelFilter("");
    setNameQuery("");
    setSearchParams({});
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#D5EAE7] px-6">
        <div className="rounded-2xl bg-white px-8 py-6 shadow-lg">
          <p className="text-lg font-medium text-slate-600">
            Loading products...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#D5EAE7] px-6">
        <div className="rounded-2xl bg-white px-8 py-6 text-center shadow-lg">
          <p className="text-lg font-semibold text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            className="mt-5 rounded-xl bg-[#0F7775] px-5 py-3 font-semibold text-white hover:bg-[#0B625F]"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#D5EAE7] text-slate-900">
      <main className="mx-auto max-w-7xl px-6 py-12 lg:px-8">

        {/* PAGE HEADING */}
        <div className="mb-10">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#0F7775]">
            PowerCare Products
          </p>

          <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">
            Inverters & Batteries
          </h1>

          <p className="mt-3 max-w-2xl leading-7 text-slate-700">
            Explore our inverter and battery collection. Filter by type,
            brand or model to find products that match your requirements.
          </p>
        </div>

        {/* PRODUCT FILTERS */}
        <form
          onSubmit={applyFilters}
          className="mb-10 rounded-3xl border border-[#BBD8D5] bg-white p-6 shadow-md"
        >
          <div className="mb-5">
            <h2 className="text-xl font-bold">Find Your Product</h2>
            <p className="mt-1 text-sm text-slate-500">
              Select any combination of filters.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <select
              aria-label="Product type"
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value);
                setBrandFilter("");
                setModelFilter("");
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#0F7775] focus:ring-2 focus:ring-[#B8E4DF]"
            >
              <option value="">All Product Types</option>
              <option value="INVERTER">Inverter</option>
              <option value="BATTERY">Battery</option>
            </select>

            <select
              aria-label="Brand"
              value={brandFilter}
              onChange={(event) => {
                setBrandFilter(event.target.value);
                setModelFilter("");
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#0F7775] focus:ring-2 focus:ring-[#B8E4DF]"
            >
              <option value="">All Brands</option>
              {brands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>

            <select
              aria-label="Model"
              value={modelFilter}
              onChange={(event) => setModelFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-[#0F7775] focus:ring-2 focus:ring-[#B8E4DF]"
            >
              <option value="">All Models</option>
              {models.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>

            <input
              type="search"
              aria-label="Search products"
              placeholder="Search name or brand..."
              value={nameQuery}
              onChange={(event) => setNameQuery(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#0F7775] focus:ring-2 focus:ring-[#B8E4DF]"
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-xl bg-[#0F7775] px-6 py-3 font-semibold text-white transition hover:bg-[#0B625F]"
            >
              Apply Filters
            </button>

            <button
              type="button"
              onClick={clearFilters}
              className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Clear Filters
            </button>
          </div>
        </form>

        {/* RESULTS HEADING */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">
            {typeFilter === "INVERTER"
              ? "Inverter Products"
              : typeFilter === "BATTERY"
                ? "Battery Products"
                : "All Products"}
          </h2>

          <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0F7775]">
            {filteredProducts.length} products found
          </span>
        </div>

        {/* EMPTY STATE */}
        {filteredProducts.length === 0 ? (
          <div className="rounded-3xl border border-[#BBD8D5] bg-white p-12 text-center shadow-md">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#DDF1EF] text-3xl">
              📦
            </div>

            <h2 className="mt-5 text-xl font-bold">
              No Matching Products
            </h2>

            <p className="mt-2 text-slate-600">
              Try changing your filters or clearing them to see all products.
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-xl bg-[#0F7775] px-5 py-3 font-semibold text-white hover:bg-[#0B625F]"
            >
              View All Products
            </button>
          </div>
        ) : (
          /* PRODUCT CARDS */
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => {
              const imageUrl = getProductImageUrl(product.image);
              const imageFailed = imageErrors[product.product_id];
              const inStock = Number(product.stock_quantity) > 0;

              return (
                <div
                  key={product.product_id}
                  className="group overflow-hidden rounded-3xl border border-[#BBD8D5] bg-white shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative flex h-64 items-center justify-center overflow-hidden bg-[#EAF5F3] p-6">
                    <div className="absolute right-[-30px] top-[-30px] h-24 w-24 rounded-full bg-[#C9EAE6]" />
                    <div className="absolute bottom-[-35px] left-[-35px] h-28 w-28 rounded-full bg-[#D8EFEC]" />

                    {imageUrl && !imageFailed ? (
                      <img
                        src={imageUrl}
                        alt={product.product_name}
                        loading="lazy"
                        className="relative z-10 h-full w-full object-contain transition duration-300 group-hover:scale-105"
                        onError={() =>
                          setImageErrors((previous) => ({
                            ...previous,
                            [product.product_id]: true,
                          }))
                        }
                      />
                    ) : (
                      <div className="relative z-10 flex flex-col items-center gap-2 text-slate-400">
                        <span className="text-4xl">
                          {getProductType(product) === "BATTERY"
                            ? "🔋"
                            : "⚡"}
                        </span>
                        <span className="text-sm">
                          Image unavailable
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#0F7775]">
                      {getProductType(product)}
                    </span>

                    <h2 className="mt-2 text-xl font-bold">
                      {product.product_name}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {product.brand} • {product.model}
                    </p>

                    <div className="mt-5 flex items-center justify-between gap-4">
                      <p className="text-2xl font-extrabold">
                        ₹{Number(product.price).toLocaleString("en-IN")}
                      </p>

                      {inStock ? (
                        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                          {product.stock_quantity} in stock
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600">
                          Out of stock
                        </span>
                      )}
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <Link
                        to={`/products/${product.product_id}`}
                        className="rounded-xl border border-[#0F7775] px-3 py-3 text-center text-sm font-semibold text-[#0F7775] transition hover:bg-[#EAF7F5]"
                      >
                        View Details
                      </Link>

                      <Link
                        to={`/products/${product.product_id}`}
                        aria-disabled={!inStock}
                        className={
                          !inStock
                            ? "pointer-events-none rounded-xl bg-slate-300 px-3 py-3 text-center text-sm font-semibold text-slate-500"
                            : "rounded-xl bg-[#0F7775] px-3 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#0B625F]"
                        }
                      >
                        View & Buy
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default Products;