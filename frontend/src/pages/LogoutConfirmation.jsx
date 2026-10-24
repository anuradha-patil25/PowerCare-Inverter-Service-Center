
import { useLocation, useNavigate } from "react-router-dom";

export default function LogoutConfirmation() {
  const navigate = useNavigate();
  const location = useLocation();

  // Remember the page from which the user chose to log out.
  const returnTo = location.state?.from || "/";

  const handleCancel = () => {
    navigate(returnTo, { replace: true });
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");

    // Notify components that login status has changed.
    window.dispatchEvent(new Event("authChanged"));

    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-[75vh] items-center justify-center bg-[#F3FAF8] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-[#D5E7E2] bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#DDF5EF] text-3xl text-[#0F766E]">
          ↪
        </div>

        <h1 className="text-2xl font-bold text-[#082F30]">
          PowerCare
        </h1>

        <h2 className="mt-4 text-xl font-semibold text-stone-800">
          Are you sure you want to log out?
        </h2>

        <p className="mt-3 text-sm leading-6 text-stone-500">
          You can cancel and continue working, or log out
          of your account securely.
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 rounded-lg border border-[#0F766E] px-5 py-3 font-semibold text-[#0F766E] transition hover:bg-[#E7F6F2]"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex-1 rounded-lg bg-[#0F766E] px-5 py-3 font-semibold text-white transition hover:bg-[#0B5F59]"
          >
            Yes, Logout
          </button>
        </div>

        <p className="mt-6 text-xs text-stone-400">
          PowerCare Inverter Service Center
        </p>
      </div>
    </div>
  );
}
