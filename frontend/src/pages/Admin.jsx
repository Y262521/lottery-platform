import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";

const emptyDraw = {
  title: "", ticket_price: 10, jackpot: 5000,
  numbers_per_ticket: 6, number_min: 1, number_max: 49,
  sales_close_at: "", draw_at: "",
};

function toLocalInput(iso) {
  const d = iso ? new Date(iso) : new Date(Date.now() + 60 * 60 * 1000);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60 * 1000).toISOString().slice(0, 16);
}

export default function Admin() {
  const { isAdmin } = useAuth();
  const { t } = useLang();
  const [tab, setTab] = useState("overview");
  const [metrics, setMetrics] = useState(null);
  const [draws, setDraws] = useState([]);
  const [users, setUsers] = useState([]);
  const [audit, setAudit] = useState([]);
  const [form, setForm] = useState({
    ...emptyDraw,
    sales_close_at: toLocalInput(null),
    draw_at: toLocalInput(new Date(Date.now() + 2 * 60 * 60 * 1000)),
  });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setMetrics(await apiClient.metrics());
      setDraws(await apiClient.listDraws());
      if (isAdmin) {
        setUsers(await apiClient.listUsers());
        setAudit(await apiClient.auditLogs());
      }
    } catch (e) { setMsg(e.message); }
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

  async function createDraw(e) {
    e.preventDefault(); setMsg(""); setBusy(true);
    try {
      const body = {
        ...form,
        ticket_price: Number(form.ticket_price), jackpot: Number(form.jackpot),
        numbers_per_ticket: Number(form.numbers_per_ticket),
        number_min: Number(form.number_min), number_max: Number(form.number_max),
        sales_close_at: new Date(form.sales_close_at).toISOString(),
        draw_at: new Date(form.draw_at).toISOString(),
      };
      await apiClient.createDraw(body);
      setForm({ ...emptyDraw, sales_close_at: toLocalInput(null), draw_at: toLocalInput(new Date(Date.now() + 2 * 60 * 60 * 1000)) });
      await load(); setMsg(t("createCommit") + " ✓");
    } catch (e) { setMsg(e.message); }
    finally { setBusy(false); }
  }

  async function action(drawId, fn, label) {
    try { await fn(drawId); await load(); setMsg(label + " ✓"); }
    catch (e) { setMsg(e.message); }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const tabs = ["overview", "draws", "create", ...(isAdmin ? ["users", "audit"] : [])];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-cream-50">{t("adminTitle")}</h1>
        <p className="mt-1 text-cream-300">{t("adminSub")}</p>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((tb) => (
          <button key={tb} onClick={() => setTab(tb)}
            className={`rounded-lg px-3 py-2 text-sm font-medium capitalize transition ${
              tab === tb ? "bg-green-600 text-ink-900" : "border border-ink-600 text-cream-300 hover:bg-ink-700"
            }`}>
            {t(tb) || tb}
          </button>
        ))}
      </div>

      {msg && (
        <div className="mb-4 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-300">{msg}</div>
      )}

      {tab === "overview" && metrics && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label={t("ticketSales")} value={`$${metrics.total_ticket_sales.toLocaleString()}`} />
          <Metric label={t("payouts")} value={`$${metrics.total_payouts.toLocaleString()}`} />
          <Metric label={t("ticketsSold")} value={metrics.tickets_sold} />
          <Metric label={t("winningTickets")} value={metrics.winning_tickets} />
          <Metric label={t("activeDraws")} value={metrics.active_draws} />
          <Metric label={t("completedDraws")} value={metrics.completed_draws} />
          <Metric label={t("users")} value={metrics.users} />
          <Metric label={t("houseMargin")} value={`$${(metrics.total_ticket_sales - metrics.total_payouts).toLocaleString()}`} />
        </div>
      )}

      {tab === "draws" && (
        <div className="overflow-hidden rounded-xl border border-ink-600">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-800 text-cream-400">
              <tr>
                <th className="px-4 py-3 font-medium">{t("title")}</th>
                <th className="px-4 py-3 font-medium">{t("status")}</th>
                <th className="px-4 py-3 font-medium">{t("ticketsSold")}</th>
                <th className="px-4 py-3 font-medium">{t("winning")}</th>
                <th className="px-4 py-3 font-medium text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700">
              {draws.map((d) => (
                <tr key={d.id} className="bg-ink-700/40">
                  <td className="px-4 py-3 text-cream-100">{d.title}</td>
                  <td className="px-4 py-3"><span className="pill bg-ink-600 text-cream-200">{d.status}</span></td>
                  <td className="px-4 py-3 font-mono text-cream-100">{d.ticket_count}</td>
                  <td className="px-4 py-3 font-mono text-green-300">{d.winning_numbers ? d.winning_numbers.join(", ") : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {d.status === "SCHEDULED" && (
                        <button className="btn-ghost px-2 py-1 text-xs"
                          onClick={() => action(d.id, apiClient.freezeDraw, t("freeze"))}>{t("freeze")}</button>
                      )}
                      {(d.status === "SCHEDULED" || d.status === "FROZEN") && (
                        <button className="btn-primary px-2 py-1 text-xs"
                          onClick={() => action(d.id, (x) => apiClient.runDraw(x), t("run"))}>{t("run")}</button>
                      )}
                      {d.status !== "COMPLETED" && d.status !== "CANCELLED" && (
                        <button className="btn-danger px-2 py-1 text-xs"
                          onClick={() => { if (confirm(`${t("cancel")} "${d.title}"?`)) action(d.id, apiClient.cancelDraw, t("cancel")); }}>
                          {t("cancel")}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {draws.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-cream-400">{t("noDrawsYet")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "create" && (
        <form onSubmit={createDraw} className="card max-w-2xl p-6">
          <h2 className="text-lg font-bold text-cream-50">{t("scheduleNewDraw")}</h2>
          <p className="mt-1 text-sm text-cream-300">{t("scheduleDesc")}</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label={t("title")} full><input className="input" required value={form.title} onChange={set("title")} /></Field>
            <Field label={t("ticketPrice")}><input className="input" type="number" min={0.01} step={0.01} required value={form.ticket_price} onChange={set("ticket_price")} /></Field>
            <Field label={t("jackpotAmt")}><input className="input" type="number" min={0} step={1} required value={form.jackpot} onChange={set("jackpot")} /></Field>
            <Field label={t("numbersPerTicket")}><input className="input" type="number" min={1} max={10} required value={form.numbers_per_ticket} onChange={set("numbers_per_ticket")} /></Field>
            <Field label={t("numberRange")}>
              <div className="flex items-center gap-2">
                <input className="input" type="number" min={0} required value={form.number_min} onChange={set("number_min")} />
                <span className="text-cream-400">–</span>
                <input className="input" type="number" min={1} required value={form.number_max} onChange={set("number_max")} />
              </div>
            </Field>
            <Field label={t("salesCloseAt")}><input className="input" type="datetime-local" required value={form.sales_close_at} onChange={set("sales_close_at")} /></Field>
            <Field label={t("drawAt")}><input className="input" type="datetime-local" required value={form.draw_at} onChange={set("draw_at")} /></Field>
          </div>
          <button className="btn-primary mt-6" disabled={busy}>{busy ? t("creating") : t("createCommit")}</button>
        </form>
      )}

      {tab === "users" && isAdmin && (
        <div className="overflow-hidden rounded-xl border border-ink-600">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-800 text-cream-400">
              <tr>
                <th className="px-4 py-3 font-medium">{t("user")}</th>
                <th className="px-4 py-3 font-medium">{t("role")}</th>
                <th className="px-4 py-3 font-medium">{t("status")}</th>
                <th className="px-4 py-3 font-medium text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700">
              {users.map((u) => (
                <tr key={u.id} className="bg-ink-700/40">
                  <td className="px-4 py-3"><div className="text-cream-100">{u.email}</div><div className="text-xs text-cream-400">{u.full_name}</div></td>
                  <td className="px-4 py-3">
                    <select className="input py-1 text-xs" value={u.role}
                      onChange={(e) => apiClient.updateUser(u.id, { role: e.target.value }).then(load)}>
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="AUDITOR">AUDITOR</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`pill ${u.is_active ? "bg-green-500/15 text-green-300" : "bg-ink-600 text-cream-400"}`}>
                      {u.is_active ? t("enable") : t("disable")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="btn-ghost px-2 py-1 text-xs"
                      onClick={() => apiClient.updateUser(u.id, { is_active: !u.is_active }).then(load)}>
                      {u.is_active ? t("disable") : t("enable")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "audit" && isAdmin && (
        <div className="overflow-hidden rounded-xl border border-ink-600">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-800 text-cream-400">
              <tr>
                <th className="px-4 py-3 font-medium">{t("when")}</th>
                <th className="px-4 py-3 font-medium">{t("actor")}</th>
                <th className="px-4 py-3 font-medium">{t("action")}</th>
                <th className="px-4 py-3 font-medium">{t("detail")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700">
              {audit.map((a) => (
                <tr key={a.id} className="bg-ink-700/40">
                  <td className="px-4 py-3 text-cream-400">{new Date(a.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-cream-300">{a.actor_id ?? t("system")}</td>
                  <td className="px-4 py-3 font-mono text-green-300">{a.action}</td>
                  <td className="px-4 py-3 text-cream-200">{a.detail || "—"}</td>
                </tr>
              ))}
              {audit.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-cream-400">{t("noAuditEntries")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-wider text-cream-400">{label}</div>
      <div className="mt-1 font-mono text-2xl font-bold text-green-300">{value}</div>
    </div>
  );
}

function Field({ label, children, full }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
