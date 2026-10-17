
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const SETTINGS_KEY = "powercare_admin_settings";
const LAST_ACTIVITY_KEY = "powercare_last_activity";
const TIMEOUT_MS = 30 * 60 * 1000;

function isTimeoutEnabled() {
  try {
    const settings = JSON.parse(
      localStorage.getItem(SETTINGS_KEY) || "[]"
    );

    const setting = settings.find(
      (item) => item.id === "sessionTimeout"
    );

    return setting ? Boolean(setting.enabled) : true;
  } catch {
    return true;
  }
}

export default function SessionTimeout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!localStorage.getItem("access_token")) return;

    if (!isTimeoutEnabled()) {
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      return;
    }

    const logout = () => {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("current_user");
      localStorage.removeItem(LAST_ACTIVITY_KEY);

      window.dispatchEvent(new Event("authChanged"));
      navigate("/login", { replace: true });
    };

    const now = Date.now();
    const lastActivity = Number(
      localStorage.getItem(LAST_ACTIVITY_KEY) || now
    );

    if (now - lastActivity >= TIMEOUT_MS) {
      logout();
      return;
    }

    localStorage.setItem(LAST_ACTIVITY_KEY, String(now));

    let timer;

    const resetTimer = () => {
      const last = Number(
        localStorage.getItem(LAST_ACTIVITY_KEY) || Date.now()
      );

      if (Date.now() - last >= TIMEOUT_MS) {
        logout();
        return;
      }

      const activityTime = Date.now();
      localStorage.setItem(
        LAST_ACTIVITY_KEY,
        String(activityTime)
      );

      clearTimeout(timer);
      timer = setTimeout(logout, TIMEOUT_MS);
    };

    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    events.forEach((event) =>
      window.addEventListener(event, resetTimer, { passive: true })
    );

    timer = setTimeout(logout, TIMEOUT_MS);

    const checkActivity = () => {
      if (
        Date.now() -
          Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0) >=
        TIMEOUT_MS
      ) {
        logout();
      }
    };

    const interval = window.setInterval(checkActivity, 15000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      events.forEach((event) =>
        window.removeEventListener(event, resetTimer)
      );
    };
  }, [navigate, location.pathname]);

  return children;
}
