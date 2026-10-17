
import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    setMessage("");
    setMessageType("");

    if (!email.trim()) {
      setMessage("Please enter your email address.");
      setMessageType("error");
      return;
    }

    if (!password) {
      setMessage("Please enter your password.");
      setMessageType("error");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Authenticate user
      const response = await fetch("/api/auth/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(
          data.detail || "Invalid email or password."
        );
        setMessageType("error");
        return;
      }

      if (!data.access || !data.refresh) {
        setMessage(
          "Login response did not contain the required tokens."
        );
        setMessageType("error");
        return;
      }

      // Step 2: Save authentication tokens
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);

      // Step 3: Get logged-in user's information
      const userResponse = await fetch("/api/auth/me/", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${data.access}`,
        },
      });

      const userData = await userResponse
        .json()
        .catch(() => ({}));

      if (!userResponse.ok) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("current_user");

        window.dispatchEvent(new Event("authChanged"));

        setMessage(
          userData.detail ||
            "Login succeeded, but user details could not be loaded."
        );
        setMessageType("error");
        return;
      }

      // Step 4: Save user information
      localStorage.setItem(
        "current_user",
        JSON.stringify(userData)
      );

      // Step 5: Update Navbar login state
      window.dispatchEvent(new Event("authChanged"));

      // Step 6: Redirect according to the user's role
      const role = String(userData.role || "")
        .trim()
        .toLowerCase();

      let destination = "";

      if (role === "admin") {
        destination = "/admin/dashboard";
      } else if (role === "staff") {
        destination = "/staff/dashboard";
      } else if (role === "customer") {
        destination = "/customer/dashboard";
      }

      if (!destination) {
        setMessage(
          `Login succeeded, but the user role is not recognized: ${
            userData.role || "missing"
          }.`
        );
        setMessageType("error");
        return;
      }

      setMessage("Login successful!");
      setMessageType("success");

      navigate(destination, { replace: true });
    } catch (error) {
      console.error("Login error:", error);

      setMessage(
        "Unable to connect to server. Please try again."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setMessage(
      "Please contact the administrator to reset your password."
    );
    setMessageType("info");
  };

  return (
    <div className="min-h-screen bg-white px-3 py-3 sm:px-5 sm:py-5 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-2xl border border-white/40 bg-[#7DE8DE] shadow-2xl sm:rounded-3xl">
        <div className="grid grid-cols-1 md:grid-cols-2">

          {/* LEFT SIDE - POWERCARE BRANDING */}
          <div className="relative flex min-h-[560px] items-center justify-center overflow-hidden bg-gradient-to-br from-[#064f52] via-[#087a78] to-[#22c8c4] px-6 py-10 sm:min-h-[620px] sm:px-10 md:min-h-[680px] md:px-8 lg:px-12">
            <div className="absolute -left-20 -top-20 h-56 w-56 rounded-full bg-white/10" />
            <div className="absolute -bottom-28 -right-24 h-72 w-72 rounded-full bg-cyan-200/20" />
            <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-3xl" />

            <div className="relative z-10 flex w-full max-w-lg flex-col items-center text-center text-white">
              <div className="flex w-full justify-center">
                <img
                  src="/powercare-logo.png"
                  alt="PowerCare Inverter Battery Service"
                  className="h-auto w-[290px] object-contain sm:w-[350px] md:w-[300px] lg:w-[360px]"
                />
              </div>

              <p className="mt-7 max-w-md text-sm leading-6 text-white/90 sm:text-base">
                Reliable inverter and battery service management
                for customers, technicians and service teams.
              </p>

              <div className="mt-7 flex w-full items-center justify-center sm:mt-9">
                <img
                  src="/powercare-inverter.png"
                  alt="PowerCare inverter and battery"
                  className="h-auto w-[175px] object-contain drop-shadow-2xl sm:w-[215px] md:w-[200px] lg:w-[235px]"
                />
              </div>

              <div className="mt-8 grid w-full max-w-sm grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-xl border border-white/15 bg-white/10 px-2 py-3 backdrop-blur-md">
                  <p className="text-xs font-semibold sm:text-sm">
                    Service
                  </p>
                </div>

                <div className="rounded-xl border border-white/15 bg-white/10 px-2 py-3 backdrop-blur-md">
                  <p className="text-xs font-semibold sm:text-sm">
                    Warranty
                  </p>
                </div>

                <div className="rounded-xl border border-white/15 bg-white/10 px-2 py-3 backdrop-blur-md">
                  <p className="text-xs font-semibold sm:text-sm">
                    Support
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE - LOGIN FORM */}
          <div className="flex items-center justify-center bg-[#F5FFFE] px-6 py-10 sm:px-10 sm:py-12 md:px-8 lg:px-12">
            <div className="w-full max-w-md rounded-3xl bg-[#CFFAF4] p-6 shadow-xl backdrop-blur-sm sm:p-8">

              <div className="mb-7 sm:mb-8">
                <div className="mb-4 inline-flex rounded-xl bg-[#e5fbf9] px-3 py-2">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#087a78]">
                    Secure Access
                  </span>
                </div>

                <h2 className="text-2xl font-bold text-gray-800 sm:text-3xl">
                  Welcome Back
                </h2>

                <p className="mt-2 text-sm text-gray-500 sm:text-base">
                  Login to your PowerCare account
                </p>
              </div>

              <form
                onSubmit={handleLogin}
                className="space-y-5"
                noValidate
              >
                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Email Address
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    autoComplete="email"
                    required
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[#087a78] focus:ring-4 focus:ring-[#d8f7f5] sm:text-base"
                  />
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-gray-700"
                  >
                    Password
                  </label>

                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3.5 pr-12 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[#087a78] focus:ring-4 focus:ring-[#d8f7f5] sm:text-base"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((previous) => !previous)
                      }
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-500 transition hover:bg-[#e9fbfa] hover:text-[#087a78] focus:outline-none focus:ring-2 focus:ring-[#bdebea]"
                    >
                      {showPassword ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 3l18 18"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M10.58 10.58a2 2 0 102.83 2.83"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9.88 4.24A9.8 9.8 0 0112 4c5 0 9 8 9 8a16.7 16.7 0 01-3.02 4.31"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6.61 6.61C4.16 8.42 3 12 3 12s4 8 9 8c1.62 0 3.07-.46 4.36-1.15"
                          />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.46 12C3.73 7.94 7.52 5 12 5s8.27 2.94 9.54 7c-1.27 4.06-5.06 7-9.54 7s-8.27-2.94-9.54-7z"
                          />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Forgot Password */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm font-semibold text-[#087a78] transition hover:text-[#064f52] hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-[#087a78] to-[#16aaa5] px-4 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:from-[#064f52] hover:to-[#087a78] focus:outline-none focus:ring-4 focus:ring-[#c9f3f1] disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
                >
                  {loading ? "Logging in..." : "Login"}
                </button>

                {/* Register */}
                <div className="pt-1 text-center">
                  <p className="text-sm text-gray-500">
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => navigate("/register")}
                      className="font-semibold text-[#087a78] hover:text-[#064f52] hover:underline"
                    >
                      Create Customer Account
                    </button>
                  </p>
                </div>

                {/* Messages */}
                {message && (
                  <div
                    role="alert"
                    aria-live="polite"
                    className={`rounded-xl px-4 py-3 text-center text-sm font-medium ${
                      messageType === "success"
                        ? "bg-green-50 text-green-700"
                        : messageType === "info"
                        ? "bg-cyan-50 text-cyan-700"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {message}
                  </div>
                )}
              </form>

              <p className="mt-8 text-center text-xs text-gray-400 sm:mt-10">
                © {new Date().getFullYear()} PowerCare Inverter Battery Service
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
