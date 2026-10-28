import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";

function EyeIcon({ open }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

export default function Register() {
  const { login } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  const [form, setForm] = useState({ full_name: "", phone: "", email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!form.phone.trim()) {
      setError("Phone number is required");
      return;
    }
    if (form.password.length < 8) {
      setError(t("atLeast8"));
      return;
    }
    setBusy(true);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() ? form.email.trim() : undefined,
        password: form.password,
      };
      await apiClient.register(payload);
      await login(form.phone.trim() || form.email.trim(), form.password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(typeof err.message === "string" ? err.message : t("registrationFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-md px-4">
      <div className="card p-8">
        <h1 className="text-2xl font-bold text-cream-50">{t("createAccountTitle")}</h1>
        <p className="mt-1 text-sm text-cream-300">{t("createAccountSub")}</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="label">{t("fullName")}</label>
            <input
              className="input"
              required
              placeholder="e.g. Abebe Balcha"
              value={form.full_name}
              onChange={set("full_name")}
            />
          </div>

          <div>
            <label className="label">{t("phone")}</label>
            <input
              className="input"
              type="tel"
              required
              placeholder="09... or +251..."
              value={form.phone}
              onChange={set("phone")}
            />
          </div>

          <div>
            <label className="label">{t("email")}</label>
            <input
              className="input"
              type="email"
              placeholder="name@example.com"
              value={form.email}
              onChange={set("email")}
            />
          </div>

          <div>
            <label className="label">{t("password")}</label>
            <div className="relative">
              <input
                className="input pr-10"
                type={showPw ? "text" : "password"}
                required
                minLength={8}
                value={form.password}
                onChange={set("password")}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-400 hover:text-cream-100 transition"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                <EyeIcon open={showPw} />
              </button>
            </div>
            <p className="mt-1 text-xs text-cream-400">{t("atLeast8")}</p>
          </div>

          {error && (
            <div className="rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-300">
              {error}
            </div>
          )}

          <button className="btn-primary w-full" disabled={busy}>
            {busy ? t("creating") : t("createAccountTitle")}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-cream-300">
          {t("alreadyHave")}{" "}
          <Link to="/login" className="font-semibold text-green-300 hover:underline">
            {t("signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
