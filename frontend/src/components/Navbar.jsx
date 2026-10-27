import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function StatusDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
    </span>
  );
}

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const linkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive
        ? "bg-ink-600 text-cream-50"
        : "text-cream-300 hover:bg-ink-700 hover:text-cream-100"
    }`;

  return (
    <header className="sticky top-0 z-30 border-b border-ink-600 bg-ink-900/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <NavLink to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-600 font-mono font-bold text-ink-900 shadow-glow">
            E
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-sm font-bold tracking-tight text-cream-50">Emerald Draw</span>
            <span className="text-[10px] uppercase tracking-widest text-cream-400">
              Provably Fair
            </span>
          </span>
        </NavLink>

        <div className="hidden items-center gap-1 md:flex">
          <NavLink to="/" end className={linkClass}>
            Home
          </NavLink>
          <NavLink to="/draws" className={linkClass}>
            Draws
          </NavLink>
          <NavLink to="/results" className={linkClass}>
            Results
          </NavLink>
          {user && (
            <NavLink to="/tickets" className={linkClass}>
              My Tickets
            </NavLink>
          )}
          {user && (
            <NavLink to="/wallet" className={linkClass}>
              Wallet
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/admin" className={linkClass}>
              Admin
            </NavLink>
          )}
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden items-center gap-2 text-xs text-cream-300 sm:flex">
                <StatusDot />
                {user.email}
                <span className="rounded-md bg-ink-700 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-green-300">
                  {user.role}
                </span>
              </span>
              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="btn-ghost px-3 py-1.5 text-xs"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="btn-ghost px-3 py-1.5 text-xs">
                Sign in
              </NavLink>
              <NavLink to="/register" className="btn-primary px-3 py-1.5 text-xs">
                Get started
              </NavLink>
            </>
          )}
        </div>
      </nav>

      {/* mobile nav row */}
      <div className="flex gap-1 overflow-x-auto border-t border-ink-700 px-3 py-2 md:hidden">
        <NavLink to="/" end className={linkClass}>Home</NavLink>
        <NavLink to="/draws" className={linkClass}>Draws</NavLink>
        <NavLink to="/results" className={linkClass}>Results</NavLink>
        {user && <NavLink to="/tickets" className={linkClass}>Tickets</NavLink>}
        {user && <NavLink to="/wallet" className={linkClass}>Wallet</NavLink>}
        {isAdmin && <NavLink to="/admin" className={linkClass}>Admin</NavLink>}
      </div>
    </header>
  );
}
