import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import { apiClient } from "../api/client";

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

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const { t, lang } = useLang();

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        full_name: user.full_name || "",
        phone: user.phone || "",
        email: user.email || "",
      }));
    }
  }, [user]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function cancelEdit() {
    setIsEditing(false);
    setError("");
    if (user) {
      setForm((f) => ({
        ...f,
        full_name: user.full_name || "",
        phone: user.phone || "",
        email: user.email || "",
        current_password: "",
        new_password: "",
        confirm_password: "",
      }));
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setMsg("");

    if (!form.phone.trim()) {
      setError(lang === "am" ? "ስልክ ቁጥር ያስፈልጋል" : "Phone number is required");
      return;
    }

    if (form.new_password) {
      if (form.new_password.length < 8) {
        setError(t("atLeast8"));
        return;
      }
      if (form.new_password !== form.confirm_password) {
        setError(t("passwordsDoNotMatch"));
        return;
      }
      if (!form.current_password) {
        setError(lang === "am" ? "የአሁኑን የይለፍ ቃል ያስገቡ" : "Please enter your current password");
        return;
      }
    }

    setBusy(true);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() ? form.email.trim() : null,
      };

      if (form.new_password) {
        payload.current_password = form.current_password;
        payload.new_password = form.new_password;
      }

      await apiClient.updateProfile(payload);
      await refreshUser();
      setMsg(t("profileUpdated"));
      setIsEditing(false);
      setForm((f) => ({
        ...f,
        current_password: "",
        new_password: "",
        confirm_password: "",
      }));
    } catch (err) {
      setError(typeof err.message === "string" ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="card p-6 sm:p-8">
        {/* Profile Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-ink-600">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-green-700 text-2xl font-bold text-ink-950 shadow-glow">
              {(user?.full_name || "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-cream-50">{user?.full_name}</h1>
              <p className="text-sm text-cream-400">
                {user?.phone || user?.email} ·{" "}
                <span className="pill bg-green-500/20 text-green-300 uppercase text-[10px] font-bold">
                  {user?.role}
                </span>
              </p>
            </div>
          </div>

          <div>
            {!isEditing ? (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(true);
                  setError("");
                  setMsg("");
                }}
                className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
              >
                <span>✏️</span>
                <span>{t("editProfileBtn")}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={cancelEdit}
                className="btn-ghost text-xs px-3 py-1.5 text-cream-400 hover:text-cream-200"
              >
                {t("cancelEdit")}
              </button>
            )}
          </div>
        </div>

        {/* Global Feedback */}
        {msg && (
          <div className="mb-6 rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-300">
            {msg}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* ── View Mode: Read-Only Info ── */}
        {!isEditing ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-green-300 mb-3">
                {t("personalInfo")}
              </h2>
              <div className="rounded-xl border border-ink-600 bg-ink-800/60 divide-y divide-ink-700">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 text-sm gap-1">
                  <span className="text-cream-400">{t("memberFullName")}</span>
                  <span className="font-semibold text-cream-50">{user?.full_name || "—"}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 text-sm gap-1">
                  <span className="text-cream-400">{t("memberPhone")}</span>
                  <span className="font-mono font-semibold text-cream-50">{user?.phone || "—"}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 text-sm gap-1">
                  <span className="text-cream-400">{t("memberEmail")}</span>
                  <span className="text-cream-50">{user?.email || <span className="text-cream-500 italic">{t("notProvided")}</span>}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 text-sm gap-1">
                  <span className="text-cream-400">{t("memberRole")}</span>
                  <span className="font-mono text-green-300 font-semibold">{user?.role}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 text-sm gap-1">
                  <span className="text-cream-400">{t("password")}</span>
                  <span className="text-cream-400 font-mono tracking-widest">••••••••••••</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(true);
                  setError("");
                  setMsg("");
                }}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2"
              >
                <span>✏️</span>
                <span>{t("editProfileBtn")}</span>
              </button>
            </div>
          </div>
        ) : (
          /* ── Edit Mode: Form ── */
          <form onSubmit={submit} className="space-y-6">
            {/* Section: Personal Info */}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-green-300 mb-4">
                {t("personalInfo")}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="label">{t("fullName")} *</label>
                  <input
                    className="input"
                    required
                    value={form.full_name}
                    onChange={set("full_name")}
                  />
                </div>

                <div>
                  <label className="label">{t("phone")} *</label>
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
              </div>
            </div>

            {/* Section: Change Password */}
            <div className="pt-4 border-t border-ink-700">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-cream-300 mb-1">
                {t("changePassword")}
              </h2>
              <p className="text-xs text-cream-400 mb-4">
                {lang === "am"
                  ? "የይለፍ ቃል መቀየር ካልፈለጉ ክፍት ይተዉት።"
                  : "Leave blank if you do not wish to change your password."}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="label">{t("currentPassword")}</label>
                  <div className="relative">
                    <input
                      className="input pr-10"
                      type={showCurrentPw ? "text" : "password"}
                      autoComplete="current-password"
                      value={form.current_password}
                      onChange={set("current_password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-400 hover:text-cream-100 transition"
                    >
                      <EyeIcon open={showCurrentPw} />
                    </button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">{t("newPassword")}</label>
                    <div className="relative">
                      <input
                        className="input pr-10"
                        type={showNewPw ? "text" : "password"}
                        autoComplete="new-password"
                        value={form.new_password}
                        onChange={set("new_password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-cream-400 hover:text-cream-100 transition"
                      >
                        <EyeIcon open={showNewPw} />
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] text-cream-400">{t("atLeast8")}</p>
                  </div>

                  <div>
                    <label className="label">{t("confirmNewPassword")}</label>
                    <input
                      className="input"
                      type={showNewPw ? "text" : "password"}
                      autoComplete="new-password"
                      value={form.confirm_password}
                      onChange={set("confirm_password")}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button type="submit" className="btn-primary flex-1 py-3" disabled={busy}>
                {busy ? t("saving") : t("saveChanges")}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="btn-ghost px-5 py-3 text-cream-300 hover:text-cream-100"
              >
                {t("cancelEdit")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
