import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import { apiClient } from "../api/client";

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const { lang, toggle, setLang, t } = useLang();
  const navigate = useNavigate();

  const link = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive ? "bg-ink-600 text-cream-50" : "text-cream-300 hover:bg-ink-700 hover:text-cream-100"
    }`;

  return (
    <header className="sticky top-0 z-30 border-b border-ink-600 bg-ink-900/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3">
        <NavLink to="/" className="flex items-center gap-2 min-w-0">
          <img
            src="/Logo.png"
            alt="Logo"
            className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 rounded-xl object-contain"
            onError={(e) => {
              // Fallback to text badge if image fails to load
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
          />
          <span
            style={{ display: "none" }}
            className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-green-600 font-mono font-bold text-ink-900 shadow-glow text-xs"
          >
            {lang === "am" ? "ዮ" : "YO"}
          </span>
          <span className="flex flex-col leading-none min-w-0">
            <span className="text-xs sm:text-sm font-bold tracking-tight text-cream-50 truncate">{t("brandName")}</span>
            <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-cream-400 truncate">{t("brandSub")}</span>
          </span>
        </NavLink>

        <div className="hidden items-center gap-1 md:flex">
          <NavLink to="/" end className={link}>{t("home")}</NavLink>
          <NavLink to="/organizers" className={link}>{t("organizers")}</NavLink>
          {user && <NavLink to="/my-tickets" className={link}>{t("myTickets")}</NavLink>}
          {isAdmin && <NavLink to="/admin" className={link}>{t("admin")}</NavLink>}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Language Switcher */}
          <div className="flex items-center rounded-xl border border-ink-600 bg-ink-800/90 p-0.5 text-xs shadow-inner">
            <button
              type="button"
              onClick={() => (setLang ? setLang("en") : (lang !== "en" && toggle()))}
              className={`flex items-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-2.5 py-1 font-semibold transition ${
                lang === "en"
                  ? "bg-green-600 text-ink-950 font-bold shadow-sm"
                  : "text-cream-300 hover:text-cream-100 hover:bg-ink-700/60"
              }`}
              title="Switch to English"
            >
              <span className="text-sm">🌐</span>
              <span>English</span>
            </button>
            <span className="text-ink-500 px-0.5 sm:px-1 font-bold select-none">|</span>
            <button
              type="button"
              onClick={() => (setLang ? setLang("am") : (lang !== "am" && toggle()))}
              className={`flex items-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-2.5 py-1 font-semibold transition ${
                lang === "am"
                  ? "bg-green-600 text-ink-950 font-bold shadow-sm"
                  : "text-cream-300 hover:text-cream-100 hover:bg-ink-700/60"
              }`}
              title="ወደ አማርኛ ይቀይሩ"
            >
              <span className="text-sm">🇪🇹</span>
              <span>አማርኛ</span>
            </button>
          </div>
          {user ? (
            <div className="flex items-center gap-1 sm:gap-1.5">
              <NotificationBell lang={lang} />
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  `flex items-center gap-1 sm:gap-1.5 rounded-lg border px-2 sm:px-2.5 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? "border-green-500/50 bg-green-500/15 text-green-300"
                      : "border-ink-600 bg-ink-800 text-cream-200 hover:border-ink-500 hover:text-green-300"
                  }`
                }
                title={t("profile")}
              >                <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                <span>👤 {t("profile")}</span>
                <span className="hidden lg:inline text-cream-400 font-normal">
                  ({user.full_name || user.phone || user.email})
                </span>
              </NavLink>
              <button
                onClick={() => { logout(); navigate("/login"); }}
                className="btn-ghost px-2 sm:px-2.5 py-1.5 text-xs text-red-300/80 hover:text-red-300"
              >
                {t("signOut")}
              </button>
            </div>
          ) : (
            <>
              <NavLink to="/login" className="btn-ghost px-2.5 sm:px-3 py-1.5 text-xs">{t("signIn")}</NavLink>
              <NavLink to="/register" className="btn-primary px-2.5 sm:px-3 py-1.5 text-xs">{t("getStarted")}</NavLink>
            </>
          )}
        </div>
      </nav>

      {/* Mobile nav */}
      <div className="flex gap-1 overflow-x-auto border-t border-ink-700 px-3 py-2 md:hidden">
        <NavLink to="/" end className={link}>{t("home")}</NavLink>
        <NavLink to="/organizers" className={link}>{t("organizers")}</NavLink>
        {user && <NavLink to="/my-tickets" className={link}>{t("myTickets")}</NavLink>}
        {user && <NavLink to="/profile" className={link}>{t("profile")}</NavLink>}
        {isAdmin && <NavLink to="/admin" className={link}>{t("admin")}</NavLink>}
      </div>
    </header>
  );
}

function NotificationBell({ lang }) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    apiClient.myNotifications()
      .then((ns) => setUnread(ns.filter((n) => !n.is_read).length))
      .catch(() => {});
  }, []);

  return (
    <NavLink
      to="/notifications"
      className="relative flex items-center justify-center h-8 w-8 rounded-lg border border-ink-600 bg-ink-800 text-cream-300 hover:text-green-300 hover:border-ink-500 transition"
      title={lang === "am" ? "መልዕክቶች" : "Notifications"}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-600 text-[9px] font-bold text-ink-900">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </NavLink>
  );
}
