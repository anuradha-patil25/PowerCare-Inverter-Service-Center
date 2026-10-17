import { useState } from "react";

function Warranty() {
  const [serialNumber, setSerialNumber] = useState("");
  const [warranty, setWarranty] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getList = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    return [];
  };

  const getRelationId = (value) => {
    if (value && typeof value === "object") {
      return (
        value.serial_id ??
        value.product_id ??
        value.id ??
        value.pk ??
        null
      );
    }

    return value;
  };

  const formatDate = (value) => {
    if (!value) return "Not available";

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getWarrantyStatus = (record) => {
    if (record.status === "CANCELLED") {
      return {
        label: "Cancelled",
        classes: "bg-red-100 text-red-700",
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (record.start_date) {
      const start = new Date(`${record.start_date}T00:00:00`);

      if (!Number.isNaN(start.getTime()) && start > today) {
        return {
          label: "Upcoming",
          classes: "bg-amber-100 text-amber-700",
        };
      }
    }

    if (record.end_date) {
      const end = new Date(`${record.end_date}T00:00:00`);

      if (!Number.isNaN(end.getTime()) && end < today) {
        return {
          label: "Expired",
          classes: "bg-red-100 text-red-700",
        };
      }
    }

    return {
      label: record.status === "ACTIVE" ? "Active" : record.status,
      classes:
        record.status === "ACTIVE"
          ? "bg-green-100 text-green-700"
          : "bg-slate-100 text-slate-700",
    };
  };

  const handleWarrantyCheck = async (event) => {
    event.preventDefault();

    setLoading(true);
    setError("");
    setWarranty(null);

    const enteredSerial = serialNumber.trim().toLowerCase();

    if (!enteredSerial) {
      setError("Please enter a serial number.");
      setLoading(false);
      return;
    }

    try {
      // Get registered serial numbers.
      const serialResponse = await fetch("/api/serial-numbers/");

      if (!serialResponse.ok) {
        throw new Error("Unable to load registered serial numbers.");
      }

      const serialData = await serialResponse.json();
      const serials = getList(serialData);

      const selectedSerial = serials.find(
        (item) =>
          String(item.serial_number || "").trim().toLowerCase() ===
          enteredSerial
      );

      if (!selectedSerial) {
        throw new Error(
          "Serial number not found. Please check and try again."
        );
      }

      // Find the warranty linked to this serial number.
      const warrantyResponse = await fetch("/api/warranties/");

      if (!warrantyResponse.ok) {
        throw new Error("Unable to load warranty records.");
      }

      const warrantyData = await warrantyResponse.json();
      const warrantyList = getList(warrantyData);

      const matchingWarranty = warrantyList.find((item) => {
        const relation = item.serial;

        if (relation && typeof relation === "object") {
          return (
            String(relation.serial_number || "").trim().toLowerCase() ===
              enteredSerial ||
            Number(getRelationId(relation)) ===
              Number(selectedSerial.serial_id)
          );
        }

        return (
          Number(relation) === Number(selectedSerial.serial_id) ||
          String(relation).trim().toLowerCase() === enteredSerial
        );
      });

      if (!matchingWarranty) {
        throw new Error(
          "This product is registered, but no warranty record was found."
        );
      }

      // Load product information.
      const productId = getRelationId(selectedSerial.product);
      let product = null;

      if (productId) {
        const productResponse = await fetch(
          `/api/products/${productId}/`
        );

        if (productResponse.ok) {
          product = await productResponse.json();
        }
      }

      setWarranty({
        serial: selectedSerial,
        product,
        record: matchingWarranty,
      });
    } catch (err) {
      console.error("Warranty check error:", err);
      setError(err.message || "Unable to check warranty.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] bg-[#D5EAE7] px-5 py-12 sm:px-6 lg:px-8">
      <main className="mx-auto max-w-5xl">

        {/* Page Heading */}
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#0F7775]">
            PowerCare Warranty
          </p>

          <h1 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Check Your Warranty
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-slate-700">
            Enter your registered product's serial number to check
            its warranty details.
          </p>
        </div>

        {/* Search Form */}
        <section className="mx-auto mt-9 max-w-2xl rounded-3xl border border-[#BBD8D5] bg-white p-6 shadow-lg sm:p-8">
          <form onSubmit={handleWarrantyCheck}>
            <label
              htmlFor="serialNumber"
              className="block text-sm font-bold text-slate-700"
            >
              Product Serial Number
            </label>

            <input
              id="serialNumber"
              type="text"
              value={serialNumber}
              onChange={(event) => setSerialNumber(event.target.value)}
              placeholder="Example: INVTEST001"
              autoComplete="off"
              required
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-[#0F7775] focus:ring-2 focus:ring-[#0F7775]/20"
            />

            <button
              type="submit"
              disabled={loading}
              className="mt-5 w-full rounded-xl bg-[#0F7775] px-6 py-3.5 font-bold text-white transition hover:bg-[#0B625F] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Checking Warranty..." : "Check Warranty"}
            </button>
          </form>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}
        </section>

        {/* Warranty Result */}
        {warranty && (
          <section className="mx-auto mt-8 max-w-2xl rounded-3xl border border-[#BBD8D5] bg-white p-6 shadow-lg sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-[#0F7775]">
                  Warranty Result
                </p>

                <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
                  {warranty.product?.product_name || "Registered Product"}
                </h2>
              </div>

              <span
                className={`rounded-full px-4 py-2 text-sm font-bold ${getWarrantyStatus(warranty.record).classes}`}
              >
                {getWarrantyStatus(warranty.record).label}
              </span>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-[#D5EAE7]">
              {[
                ["Serial Number", warranty.serial.serial_number],
                ["Brand", warranty.product?.brand || "Not available"],
                ["Model", warranty.product?.model || "Not available"],
                ["Warranty Start", formatDate(warranty.record.start_date)],
                ["Warranty End", formatDate(warranty.record.end_date)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-2 border-b border-[#D5EAE7] last:border-b-0"
                >
                  <div className="bg-[#EAF5F3] px-4 py-3 text-sm font-semibold text-slate-700">
                    {label}
                  </div>

                  <div className="break-words px-4 py-3 text-sm text-slate-700">
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-5 text-sm leading-6 text-slate-600">
              This result is based on the warranty record currently
              stored in the PowerCare database.
            </p>
          </section>
        )}

      </main>
    </div>
  );
}

export default Warranty;