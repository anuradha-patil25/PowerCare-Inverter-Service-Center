import { useState } from "react";

const DEFAULT_SETTINGS = [
  {
    id: "sessionTimeout",
    title: "Session Timeout",
    description:
      "Automatically log out users after 30 minutes of inactivity.",
    detail: "Timeout duration: 30 minutes",
    enabled: true,
  },
  {
    id: "twoStepLogin",
    title: "Two-Step Login",
    description:
      "Require a verification code for staff and admin on new devices.",
    detail: "Applies to staff and admin accounts",
    enabled: false,
  },
  {
    id: "emailInvoices",
    title: "Email Invoices Automatically",
    description:
      "Send PDF invoices by email after successful payment.",
    detail: "Triggered after successful payment",
    enabled: false,
  },
  {
    id: "lowStockAlerts",
    title: "Low-Stock Alerts",
    description:
      "Show an alert when product stock falls below 5 units.",
    detail: "Stock threshold: 5 units",
    enabled: true,
  },
];

const STORAGE_KEY = "powercare_admin_settings";

function loadSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) return DEFAULT_SETTINGS;

    return DEFAULT_SETTINGS.map((defaultSetting) => {
      const savedSetting = parsed.find(
        (item) => item.id === defaultSetting.id
      );

      return savedSetting
        ? { ...defaultSetting, enabled: Boolean(savedSetting.enabled) }
        : defaultSetting;
    });
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export default function AdminSettings() {
  const [settings, setSettings] = useState(loadSettings);
  const [message, setMessage] = useState("");

  function toggleSetting(id) {
    const updatedSettings = settings.map((setting) =>
      setting.id === id
        ? { ...setting, enabled: !setting.enabled }
        : setting
    );

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(updatedSettings)
      );

      setSettings(updatedSettings);
      setMessage("Setting preference saved in this browser.");
    } catch {
      setMessage(
        "Unable to save settings. Check your browser storage."
      );
    }
  }

  return (
    <div className="pc-page min-h-screen bg-[#F7F7F0] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <style>{`
          .pc-page { background-color: #F7F7F0; }
          .pc-header { background-image: linear-gradient(to right, #103F35, #17836C); color: #ffffff; }
          .pc-header .pc-eyebrow { color: #D1FAE5; }
          .pc-header .pc-sub { color: #ECFDF5; }
          .pc-title { color: #173F32; }
          .pc-btn-primary { background-color: #12624D; color: #ffffff; }
          .pc-btn-primary:hover { background-color: #103F35; }
        `}</style>

        <div className="pc-header rounded-3xl bg-gradient-to-r from-[#103F35] to-[#17836C] p-6 text-white shadow-lg sm:p-8">
          <p className="pc-eyebrow text-xs font-bold uppercase tracking-[0.2em] text-emerald-100 sm:text-sm">
            PowerCare Administration
          </p>

          <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">
            Admin Settings
          </h1>

          <p className="pc-sub mt-2 text-sm leading-6 text-emerald-50 sm:text-base">
            Manage security, invoice emails, and inventory alerts.
          </p>
        </div>

        <div className="space-y-4">
          {settings.map((setting) => (
            <section
              key={setting.id}
              className="flex flex-col gap-5 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6"
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="pc-title text-xl font-bold text-[#173F32]">
                    {setting.title}
                  </h2>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      setting.enabled
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {setting.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>

                <p className="mt-2 text-sm leading-6 text-stone-600">
                  {setting.description}
                </p>

                <p className="mt-2 text-sm text-stone-500">
                  {setting.detail}
                </p>
              </div>

              <button
                type="button"
                onClick={() => toggleSetting(setting.id)}
                aria-pressed={setting.enabled}
                aria-label={`${setting.enabled ? "Disable" : "Enable"} ${setting.title}`}
                className={`rounded-xl px-5 py-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 ${
                  setting.enabled
                    ? "pc-btn-primary bg-[#12624D] font-bold text-white hover:bg-[#103F35]"
                    : "border border-stone-300 font-semibold text-stone-700 hover:bg-stone-50"
                }`}
              >
                {setting.enabled ? "Disable" : "Enable"}
              </button>
            </section>
          ))}
        </div>

        <div
          role="status"
          aria-live="polite"
          className="min-h-6 text-sm text-stone-600"
        >
          {message}
        </div>

        <p className="text-sm leading-6 text-stone-500">
          These controls currently save preferences in this browser.
          They do not yet activate the corresponding backend features.
        </p>
      </div>
    </div>
  );
}