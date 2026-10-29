import { useEffect, useState } from "react";
import { apiClient } from "../../api/client";
import { useLang } from "../../context/LangContext";

export default function AdminUsers() {
  const { t, lang } = useLang();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [msg, setMsg] = useState("");
  const [resetModalUser, setResetModalUser] = useState(null);
  const [newPw, setNewPw] = useState("");
  const [resetBusy, setResetBusy] = useState(false);

  const load = () => apiClient.listUsers().then(setUsers).catch(() => {});
  useEffect(() => { load(); }, []);

  const q = search.trim().toLowerCase();
  const filteredUsers = users.filter((u) => {
    if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
    if (!q) return true;
    const fullName = (u.full_name || "").toLowerCase();
    const phone = (u.phone || "").toLowerCase();
    const email = (u.email || "").toLowerCase();
    const id = (u.id || "").toLowerCase();
    return (
      fullName.includes(q) ||
      phone.includes(q) ||
      email.includes(q) ||
      id.includes(q)
    );
  });

  async function update(id, body) {
    try { await apiClient.updateUser(id, body); setMsg(t("updated")); load(); }
    catch (e) { setMsg(e.message); }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (!newPw || newPw.length < 6) return;
    setResetBusy(true);
    try {
      await apiClient.resetUserPassword(resetModalUser.id, newPw);
      setMsg(`${t("passwordResetSuccess")} (${resetModalUser.full_name})`);
      setResetModalUser(null);
      setNewPw("");
    } catch (err) {
      setMsg(err.message);
    } finally {
      setResetBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-cream-50">{t("usersTitle")}</h1>
          <p className="text-xs text-cream-400 mt-1">
            {users.length} {t("usersTitle").toLowerCase()}
          </p>
        </div>
        <button
          onClick={load}
          className="btn-ghost text-xs self-start sm:self-auto flex items-center gap-1.5"
          title="Refresh users list"
        >
          🔄 {lang === "am" ? "አድስ" : "Refresh"}
        </button>
      </div>

      {msg && <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/30 px-3 py-2 text-sm text-green-300">{msg}</div>}

      {/* Search & Filter Bar */}
      <div className="mb-6 space-y-3 bg-ink-800/60 p-4 rounded-xl border border-ink-600">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-cream-400 pointer-events-none">
              🔍
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchUsers")}
              className="input pl-9 pr-8 py-2 text-sm w-full"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-cream-400 hover:text-cream-200"
                title={t("clearSearch")}
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {["ALL", "USER", "ADMIN", "AUDITOR"].map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setRoleFilter(role)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
                  roleFilter === role
                    ? "bg-green-600 text-ink-950 shadow-sm"
                    : "bg-ink-800 text-cream-300 hover:bg-ink-700 hover:text-cream-100 border border-ink-600"
                }`}
              >
                {role === "ALL" ? t("allRoles") : role}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-cream-400 px-1 pt-1">
          <span>
            {lang === "am" ? "የተገኙ:" : "Found:"}{" "}
            <strong className="text-green-300 font-bold">{filteredUsers.length}</strong> / {users.length}
          </span>
          {(search || roleFilter !== "ALL") && (
            <button
              onClick={() => { setSearch(""); setRoleFilter("ALL"); }}
              className="text-xs text-green-400 hover:underline font-medium"
            >
              ✕ {t("clearSearch")}
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink-600">
        <table className="w-full text-left text-sm min-w-[620px]">
          <thead className="bg-ink-800 text-cream-400">
            <tr>
              <th className="px-4 py-3">{t("userCol")}</th>
              <th className="px-4 py-3">{t("phone")}</th>
              <th className="px-4 py-3">{t("roleCol")}</th>
              <th className="px-4 py-3">{t("statusCol")}</th>
              <th className="px-4 py-3">{t("joinedCol")}</th>
              <th className="px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-700">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-cream-400">
                  <div className="text-3xl mb-2">🔍</div>
                  <p className="text-sm font-medium">{t("noUsersFound")}</p>
                  {(search || roleFilter !== "ALL") && (
                    <button
                      type="button"
                      onClick={() => { setSearch(""); setRoleFilter("ALL"); }}
                      className="mt-3 inline-flex items-center gap-1 text-xs text-green-400 hover:underline font-semibold"
                    >
                      ✕ {t("clearSearch")}
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
              <tr key={u.id} className="bg-ink-700/40">
                <td className="px-4 py-3">
                  <div className="text-cream-100">{u.email || u.phone || "—"}</div>
                  <div className="text-xs text-cream-400">{u.full_name}</div>
                </td>
                <td className="px-4 py-3 text-cream-300">{u.phone || "—"}</td>
                <td className="px-4 py-3">
                  <select className="input py-1 text-xs" value={u.role}
                    onChange={(e) => update(u.id, { role: e.target.value })}>
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="AUDITOR">AUDITOR</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className={`pill ${u.is_active ? "bg-green-500/15 text-green-300" : "bg-ink-700 text-cream-400"}`}>
                    {u.is_active ? t("active") : t("disabled")}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-cream-400">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                    <button
                      className="btn-ghost px-2 py-1 text-xs text-yellow-300 hover:text-yellow-200"
                      onClick={() => { setResetModalUser(u); setNewPw(""); }}
                      title={t("resetPassword")}
                    >
                      🔑 {t("resetPassword")}
                    </button>
                    <button
                      className="btn-ghost px-2 py-1 text-xs"
                      onClick={() => update(u.id, { is_active: !u.is_active })}
                    >
                      {u.is_active ? t("disable") : t("enable")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reset Password Modal */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="card w-full max-w-md p-6 border-yellow-500/30">
            <h3 className="text-lg font-bold text-cream-50 mb-2">
              🔑 {t("resetPassword")}
            </h3>
            <p className="text-sm text-cream-300 mb-4">
              {t("enterNewPassword")}{" "}
              <strong className="text-green-300">{resetModalUser.full_name}</strong> ({resetModalUser.phone || resetModalUser.email})
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <input
                  type="text"
                  required
                  minLength={6}
                  placeholder={lang === "am" ? "አዲስ የይለፍ ቃል (ቢያንስ 6 ፊደላት)" : "New password (min 6 chars)"}
                  className="input font-mono"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  className="btn-ghost text-xs"
                  onClick={() => setResetModalUser(null)}
                  disabled={resetBusy}
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs"
                  disabled={resetBusy || newPw.length < 6}
                >
                  {resetBusy ? t("saving") : t("resetPassword")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
