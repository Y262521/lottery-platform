import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const [email, setEmail] = useState("admin@lottery.local");
  const [password, setPassword] = useState("admin12345");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await login(email, password);
      navigate(user.role === "ADMIN" ? "/admin" : from, { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-md px-4">
      <div className="card p-8">
        <h1 className="text-2xl font-bold text-cream-50">Sign in</h1>
        <p className="mt-1 text-sm text-cream-300">
          Welcome back. Your wallet and tickets are waiting.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" className="input" type="email" required
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" className="input" type="password" required
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          {error && (
            <div className="rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-300">
              {error}
            </div>
          )}

          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-cream-300">
          New here?{" "}
          <Link to="/register" className="font-semibold text-green-300 hover:underline">
            Create an account
          </Link>
        </p>

        <div className="mt-6 rounded-lg border border-ink-600 bg-ink-800 p-3 text-xs text-cream-400">
          <span className="font-semibold text-green-300">Demo admin</span> credentials
          are pre-filled. Regular users can register to get a sign-up bonus.
        </div>
      </div>
    </div>
  );
}
