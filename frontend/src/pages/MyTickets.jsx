import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";
import { useLang } from "../context/LangContext";

const STATUS_STYLE = {
  ACTIVE: "bg-green-500/15 text-green-300",
  WIN: "bg-green-600 text-ink-900",
  LOSE: "bg-ink-700 text-cream-400",
  REFUNDED: "bg-ink-600 text-cream-200",
};

export default function MyTickets() {
  const { t } = useLang();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.myTickets().then(setTickets).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-cream-50">{t("myTicketsTitle")}</h1>
          <p className="mt-1 text-cream-300">{t("myTicketsSub")}</p>
        </div>
        <Link to="/draws" className="btn-ghost">{t("browseLive")}</Link>
      </header>

      {loading ? (
        <p className="text-cream-300">{t("myTicketsTitle")}…</p>
      ) : tickets.length === 0 ? (
        <div className="card p-8 text-center text-cream-300">
          {t("noTickets")}{" "}
          <Link to="/draws" className="text-green-300 hover:underline">{t("buyFirst")}</Link>.
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t_) => (
            <article key={t_.id} className="card flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="flex flex-wrap items-center gap-2">
                {t_.numbers.map((n) => (
                  <span key={n} className="ball h-9 w-9 text-sm">{n}</span>
                ))}
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-cream-300">
                  {t("draw_")}{" "}
                  <Link to={`/live/${t_.draw_id}`} className="font-mono text-green-300 hover:underline">
                    #{t_.draw_id}
                  </Link>
                </span>
                {t_.matched_count != null && (
                  <span className="text-cream-300">
                    {t("matched")} <span className="font-mono text-cream-100">{t_.matched_count}</span>
                  </span>
                )}
                {t_.prize > 0 && (
                  <span className="font-mono text-green-300">+${t_.prize.toFixed(2)}</span>
                )}
                <span className={`pill ${STATUS_STYLE[t_.status]}`}>{t_.status}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
