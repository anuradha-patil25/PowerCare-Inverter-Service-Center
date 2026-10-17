import { NavLink, Link, useNavigate } from "react-router-dom";

function Header() {
  const navigate = useNavigate();

  const accessToken = localStorage.getItem("access_token");
  const currentUser = localStorage.getItem("current_user");

  let user = null;

  try {
    user = currentUser ? JSON.parse(currentUser) : null;
  } catch {
    user = null;
  }

  // Only the current page gets the active background.
  const getNavClass = ({ isActive }) =>
    [
      "rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200",
      isActive
        ? "bg-[#CFFAF4] text-[#0F7775] shadow-sm"
        : "text-white hover:bg-white/15 hover:text-[#CFFAF4]",
    ].join(" ");

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("current_user");

    // Preserve the cart session.
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-teal-800 bg-gradient-to-r from-[#0F7775] to-[#159C98] shadow-md">
      <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-4 px-5 lg:px-8">

        {/* PowerCare Logo */}
        <Link
          to="/"
          className="flex shrink-0 items-center"
          aria-label="PowerCare Home"
        >
          <img
            src="/powercare-logo.png"
            alt="PowerCare Inverter Service Center"
            className="h-14 w-auto object-contain"
          />
        </Link>

        {/* Navigation */}
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-2 lg:flex"
        >
          <NavLink to="/" end className={getNavClass}>
            Home
          </NavLink>

          <NavLink to="/products" className={getNavClass}>
            Products
          </NavLink>

          <NavLink to="/services" className={getNavClass}>
            Services
          </NavLink>

          <NavLink to="/warranty" className={getNavClass}>
            Warranty
          </NavLink>

          <NavLink to="/cart" className={getNavClass}>
            Cart
          </NavLink>

          {accessToken && user?.role === "customer" && (
            <NavLink
              to="/customer/dashboard"
              className={getNavClass}
            >
              Dashboard
            </NavLink>
          )}

          {!accessToken ? (
            <NavLink
              to="/login"
              className={({ isActive }) =>
                [
                  "ml-2 rounded-xl px-5 py-2.5 text-sm font-bold transition",
                  isActive
                    ? "bg-white text-[#0F7775] ring-2 ring-[#CFFAF4]"
                    : "bg-[#CFFAF4] text-[#0F7775] hover:bg-white",
                ].join(" ")
              }
            >
              Login
            </NavLink>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              className="ml-2 rounded-xl border border-[#CFFAF4] bg-transparent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#CFFAF4] hover:text-[#0F7775]"
            >
              Logout
            </button>
          )}
        </nav>

        {/* Mobile Login / Logout */}
        <div className="lg:hidden">
          {!accessToken ? (
            <Link
              to="/login"
              className="rounded-xl bg-[#CFFAF4] px-4 py-2.5 text-sm font-bold text-[#0F7775]"
            >
              Login
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-[#CFFAF4] bg-transparent px-4 py-2.5 text-sm font-bold text-white hover:bg-[#CFFAF4] hover:text-[#0F7775]"
            >
              Logout
            </button>
          )}
        </div>

      </div>
    </header>
  );
}

export default Header;