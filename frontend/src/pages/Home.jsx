import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";
import { useLang } from "../context/LangContext";

const STATUS_BADGE = {
  ACTIVE: "bg-green-500/20 text-green-300",
  DRAWN:  "bg-ink-600 text-cream-300",
  CLOSED: "bg-ink-700 text-cream-400",
};

function tStatus(t, s) { return t(`status${s}`) || s; }

export default function Home() {
  const { t } = useLang();
  const [lotteries, setLotteries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.listLotteries().then(setLotteries).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const active = lotteries.filter((l) => l.status === "ACTIVE");
  const past   = lotteries.filter((l) => l.status === "DRAWN");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Hero — no tag pill, clean heading */}
      <section className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-cream-50 sm:text-5xl">
          {t("heroTitle")}{" "}
          <span className="bg-gradient-to-r from-green-300 to-green-500 bg-clip-text text-transparent">
            {t("heroTitleAccent")}
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-cream-300 text-base sm:text-lg">
          {t("heroDesc")}
        </p>
      </section>

      {/* Active lotteries */}
      <h2 className="mb-5 text-xl font-bold text-cream-50">{t("draws")}</h2>
      {loading ? (
        <p className="text-cream-300">{t("loading")}</p>
      ) : active.length === 0 ? (
        <div className="card p-10 text-center text-cream-300">{t("noOpenDraws")}</div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((l) => <LotteryCard key={l.id} lottery={l} />)}
        </div>
      )}

      {/* Past draws */}
      {past.length > 0 && (
        <>
          <h2 className="mb-5 mt-14 text-xl font-bold text-cream-50">{t("pastFrozen")}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((l) => <LotteryCard key={l.id} lottery={l} />)}
          </div>
        </>
      )}
    </div>
  );
}

function LotteryCard({ lottery: l }) {
  const { t, lang } = useLang();
  const badge = STATUS_BADGE[l.status] || "bg-ink-700 text-cream-400";

  // Guard: if id is missing for any reason, don't render a broken link
  if (!l?.id) return null;

  const href = l.status === "DRAWN" ? `/lottery/${l.id}/results` : `/lottery/${l.id}`;

  return (
    <Link to={href}>
      <article className="card flex flex-col overflow-hidden transition hover:border-green-500/50 hover:shadow-glow">
        {l.cover_image_url ? (
          <img src={l.cover_image_url} alt={l.title}
            className="h-44 w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-44 w-full items-center justify-center bg-ink-800 text-5xl">🎟️</div>
        )}
        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-bold text-cream-50 leading-tight">{l.title}</h3>
            <span className={`pill shrink-0 ${badge}`}>{tStatus(t, l.status)}</span>
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-cream-300">{l.prize_description}</p>
          <div className="mt-auto pt-4 flex items-center justify-between text-sm">
            <span className="text-cream-300">{t("ticket")}</span>
            <span className="font-mono font-bold text-green-300">
              ETB {l.ticket_price.toLocaleString()}
            </span>
          </div>
          {l.total_tickets && (
            <div className="mt-2 text-xs text-cream-400">
              {lang === "am" ? "ቀሪ:" : "Remaining:"}{" "}
              <span className="font-mono text-green-300">
                {l.total_tickets - l.tickets_sold}
              </span>
              {" / "}{l.total_tickets}
            </div>
          )}
          <div className="mt-3 btn-primary w-full text-center">
            {l.status === "DRAWN" ? t("verifyDraw") : t("buyTickets")}
          </div>
        </div>
      </article>
    </Link>
  );
}
