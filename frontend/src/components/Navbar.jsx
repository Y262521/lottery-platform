import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const { lang, toggle, t } = useLang();
  const navigate = useNavigate();

  const link = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive ? "bg-ink-600 text-cream-50" : "text-cream-300 hover:bg-ink-700 hover:text-cream-100"
    }`;

  return (
    <header className="sticky top-0 z-30 border-b border-ink-600 bg-ink-900/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <NavLink to="/" className="flex items-center gap-2.5">
          <img
            src="/Logo.png"
            alt="Logo"
            className="h-9 w-9 shrink-0 rounded-xl object-contain"
            onError={(e) => {
              // Fallback to text badge if image fails to load
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
          />
          <span
            style={{ display: "none" }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-600 font-mono font-bold text-ink-900 shadow-glow text-xs"
          >
            {lang === "am" ? "ዮ" : "YO"}
          </span>
          <span className="flex flex-col leading-none min-w-0">
            <span className="text-sm font-bold tracking-tight text-cream-50 truncate">{t("brandName")}</span>
            <span className="text-[10px] uppercase tracking-widest text-cream-400">{t("brandSub")}</span>
          </span>
        </NavLink>

        <div className="hidden items-center gap-1 md:flex">
          <NavLink to="/" end className={link}>{t("home")}</NavLink>
          {user && <NavLink to="/my-tickets" className={link}>{t("myTickets")}</NavLink>}
          {user && <NavLink to="/profile" className={link}>{t("profile")}</NavLink>}
          {isAdmin && <NavLink to="/admin" className={link}>{t("admin")}</NavLink>}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="rounded-lg border border-ink-600 px-2.5 py-1.5 text-xs font-semibold text-cream-300 hover:bg-ink-700 transition"
          >
            {lang === "en" ? "አማ" : "EN"}
          </button>
          {user ? (
            <>
              <NavLink
                to="/profile"
                className="hidden text-xs text-cream-300 hover:text-green-300 sm:flex items-center gap-1.5 transition"
                title={t("profile")}
              >
                <span className="h-2 w-2 rounded-full bg-green-500" />
                {user.email || user.phone || user.full_name}
              </NavLink>
              <button
                onClick={() => { logout(); navigate("/login"); }}
                className="btn-ghost px-3 py-1.5 text-xs"
              >
                {t("signOut")}
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="btn-ghost px-3 py-1.5 text-xs">{t("signIn")}</NavLink>
              <NavLink to="/register" className="btn-primary px-3 py-1.5 text-xs">{t("getStarted")}</NavLink>
            </>
          )}
        </div>
      </nav>

      {/* Mobile nav */}
      <div className="flex gap-1 overflow-x-auto border-t border-ink-700 px-3 py-2 md:hidden">
        <NavLink to="/" end className={link}>{t("home")}</NavLink>
        {user && <NavLink to="/my-tickets" className={link}>{t("myTickets")}</NavLink>}
        {user && <NavLink to="/profile" className={link}>{t("profile")}</NavLink>}
        {isAdmin && <NavLink to="/admin" className={link}>{t("admin")}</NavLink>}
      </div>
    </header>
  );
}
