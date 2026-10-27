import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../api/client";
import { useLang } from "../../context/LangContext";

const STATUS_COLOR = {
  DRAFT:     "bg-ink-700 text-cream-400",
  ACTIVE:    "bg-green-500/15 text-green-300",
  CLOSED:    "bg-ink-600 text-cream-200",
  DRAWN:     "bg-green-700/30 text-green-300",
  CANCELLED: "bg-red-500/10 text-red-400",
};

function tStatus(t, s) { return t(`status${s}`) || s; }

export default function AdminLotteries() {
  const { t } = useLang();
  const [lotteries, setLotteries] = useState([]);
  const [filter, setFilter] = useState("");
  const [msg, setMsg] = useState("");

  const load = (f) => apiClient.listLotteries(f || undefined).then(setLotteries).catch(() => {});

  useEffect(() => { load(filter); }, [filter]);

  async function act(fn, label) {
    try { await fn(); setMsg(label + " ✓"); load(filter); }
    catch (e) { setMsg(e.message); }
  }

  const filters = ["", "DRAFT", "ACTIVE", "CLOSED", "DRAWN"];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-cream-50">{t("lotteries")}</h1>
        <div className="flex gap-2 flex-wrap">
          {filters.map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${filter === s ? "bg-green-600 text-ink-900" : "border border-ink-600 text-cream-300 hover:bg-ink-700"}`}>
              {s ? tStatus(t, s) : t("all")}
            </button>
          ))}
          <Link to="/admin/lotteries/new" className="btn-primary px-3 py-1.5 text-xs">{t("newLottery")}</Link>
        </div>
      </div>

      {msg && <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/30 px-3 py-2 text-sm text-green-300">{msg}</div>}

      <div className="overflow-hidden rounded-xl border border-ink-600">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-800 text-cream-400">
            <tr>
              <th className="px-4 py-3">{t("titleField")}</th>
              <th className="px-4 py-3">{t("status")}</th>
              <th className="px-4 py-3">{t("sold")}</th>
              <th className="px-4 py-3">{t("price")}</th>
              <th className="px-4 py-3">{t("drawAt")}</th>
              <th className="px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-700">
            {lotteries.map((l) => (
              <tr key={l.id} className="bg-ink-700/40">
                <td className="px-4 py-3 text-cream-100">{l.title}</td>
                <td className="px-4 py-3"><span className={`pill ${STATUS_COLOR[l.status]}`}>{tStatus(t, l.status)}</span></td>
                <td className="px-4 py-3 font-mono text-cream-200">{l.tickets_sold}{l.total_tickets ? `/${l.total_tickets}` : ""}</td>
                <td className="px-4 py-3 font-mono text-green-300">ETB {l.ticket_price}</td>
                <td className="px-4 py-3 text-cream-300">{new Date(l.draw_date).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5 flex-wrap">
                    <Link to={`/admin/lotteries/${l.id}`} className="btn-ghost px-2 py-1 text-xs">{t("manage")}</Link>
                    {l.status === "DRAFT" && (
                      <button className="btn-primary px-2 py-1 text-xs"
                        onClick={() => act(() => apiClient.publishLottery(l.id), t("publish"))}>{t("publish")}</button>
                    )}
                    {l.status === "DRAFT" && (
                      <button className="btn-danger px-2 py-1 text-xs"
                        onClick={() => { if(confirm("Delete this draft?")) act(() => apiClient.deleteLottery(l.id), "Deleted"); }}>
                        Delete
                      </button>
                    )}
                    {l.status === "ACTIVE" && (
                      <button className="btn-ghost px-2 py-1 text-xs"
                        onClick={() => act(() => apiClient.closeLottery(l.id), t("closeSales"))}>{t("closeSales")}</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {lotteries.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-cream-400">{t("noLotteries")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
