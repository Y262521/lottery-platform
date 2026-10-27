import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";
import { useLang } from "../context/LangContext";

export default function Results() {
  const { t } = useLang();
  const [draws, setDraws] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.listDraws()
      .then((d) => { setDraws(d.filter((x) => x.status === "COMPLETED")); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-cream-50">{t("resultsTitle")}</h1>
        <p className="mt-1 text-cream-300">{t("resultsSub")}</p>
      </header>

      {loading ? (
        <p className="text-cream-300">{t("resultsTitle")}…</p>
      ) : draws.length === 0 ? (
        <div className="card p-8 text-center text-cream-300">{t("noCompletedDraws")}</div>
      ) : (
        <div className="space-y-4">
          {draws.map((d) => (
            <article key={d.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-cream-50">{d.title}</h2>
                  <p className="text-xs text-cream-400">
                    {t("drawn")} {new Date(d.completed_at || d.draw_at).toLocaleString()}
                  </p>
                </div>
                <span className="pill bg-green-500/15 text-green-300">{d.status}</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {(d.winning_numbers || []).map((n) => (
                  <span key={n} className="ball-gold">{n}</span>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                <span className="text-cream-300">
                  {d.ticket_count} {t("ticketsSold")} · {t("jackpot")}{" "}
                  <span className="font-mono text-green-300">${d.jackpot.toLocaleString()}</span>
                </span>
                <Link to={`/live/${d.id}`} className="text-green-300 hover:underline">
                  {t("verifyDraw")}
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
