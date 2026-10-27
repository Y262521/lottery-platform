import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    full_name: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      await apiClient.register(form);
      // Auto-login after registration.
      await login(form.email, form.password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-md px-4">
      <div className="card p-8">
        <h1 className="text-2xl font-bold text-cream-50">Create account</h1>
        <p className="mt-1 text-sm text-cream-300">
          New players get a $100 demo bonus in the wallet to start buying tickets.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="name">Full name</label>
            <input id="name" className="input" required
              value={form.full_name} onChange={set("full_name")} />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" className="input" type="email" required
              value={form.email} onChange={set("email")} />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" className="input" type="password" required minLength={8}
              value={form.password} onChange={set("password")} />
            <p className="mt-1 text-xs text-cream-400">At least 8 characters.</p>
          </div>

          {error && (
            <div className="rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-300">
              {error}
            </div>
          )}

          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-cream-300">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-green-300 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
