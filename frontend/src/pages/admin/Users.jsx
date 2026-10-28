import { useEffect, useState } from "react";
import { apiClient } from "../../api/client";
import { useLang } from "../../context/LangContext";

export default function AdminUsers() {
  const { t } = useLang();
  const [users, setUsers] = useState([]);
  const [msg, setMsg] = useState("");

  const load = () => apiClient.listUsers().then(setUsers).catch(() => {});
  useEffect(() => { load(); }, []);

  async function update(id, body) {
    try { await apiClient.updateUser(id, body); setMsg(t("updated")); load(); }
    catch (e) { setMsg(e.message); }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold text-cream-50 mb-6">{t("usersTitle")}</h1>
      {msg && <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/30 px-3 py-2 text-sm text-green-300">{msg}</div>}

      <div className="overflow-hidden rounded-xl border border-ink-600">
        <table className="w-full text-left text-sm">
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
            {users.map((u) => (
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
                  <button className="btn-ghost px-2 py-1 text-xs"
                    onClick={() => update(u.id, { is_active: !u.is_active })}>
                    {u.is_active ? t("disable") : t("enable")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
