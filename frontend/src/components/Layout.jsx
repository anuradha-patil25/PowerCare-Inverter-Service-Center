
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

const links = [
  { label: "Home", path: "/" },
  { label: "Products", path: "/products" },
  { label: "Services", path: "/services" },
  { label: "Warranty", path: "/warranty" },
  { label: "Cart", path: "/cart" },
];

export default function Layout() {
  const location = useLocation();

  const [isLoggedIn, setIsLoggedIn] = useState(() =>
    Boolean(localStorage.getItem("access_token"))
  );

  useEffect(() => {
    const checkLogin = () => {
      setIsLoggedIn(
        Boolean(localStorage.getItem("access_token"))
      );
    };

    checkLogin();

    window.addEventListener("storage", checkLogin);
    window.addEventListener("focus", checkLogin);
    window.addEventListener("authChanged", checkLogin);

    return () => {
      window.removeEventListener("storage", checkLogin);
      window.removeEventListener("focus", checkLogin);
      window.removeEventListener("authChanged", checkLogin);
    };
  }, [location.pathname]);

  const navLinkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive
        ? "bg-[#00A89D] text-white"
        : "text-white hover:bg-white/10 hover:text-[#8DE7DF]"
    }`;

  return (
    <div className="min-h-screen bg-[#F3FAF8] text-stone-900">
      <header className="border-b border-[#0B3435] bg-[#082F30]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <NavLink to="/" aria-label="PowerCare Home">
            <img
              src="/powercare-logo.png"
              alt="PowerCare Inverter Service Center"
              className="h-10 w-auto object-contain"
            />
          </NavLink>

          <nav className="flex flex-wrap items-center gap-2">
            {links.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={navLinkClass}
              >
                {item.label}
              </NavLink>
            ))}

            {isLoggedIn ? (
              <NavLink
                to="/customer/dashboard"
                className={navLinkClass}
              >
                My Dashboard
              </NavLink>
            ) : (
              <NavLink
                to="/login"
                className={navLinkClass}
              >
                Login
              </NavLink>
            )}
          </nav>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="mt-12 border-t border-teal-100 bg-white px-5 py-6 text-center text-sm text-stone-500">
        &copy; {new Date().getFullYear()} PowerCare Inverter Service Center
      </footer>
    </div>
  );
}
