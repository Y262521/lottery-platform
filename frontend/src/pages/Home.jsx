import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient, mediaUrl } from "../api/client";
import { useLang } from "../context/LangContext";

const STATUS_BADGE = {  ACTIVE: "bg-green-500/20 text-green-300",
  DRAWN:  "bg-ink-600 text-cream-300",
  CLOSED: "bg-ink-700 text-cream-400",
};

function tStatus(t, s) { return t(`status${s}`) || s; }

function pad(n) { return String(n).padStart(2, "0"); }

function useCountdown(targetIso) {
  const calc = () => {
    const diff = new Date(targetIso).getTime() - Date.now();
    if (diff <= 0) return { h: 0, m: 0, s: 0, done: true };
    return {
      h: Math.floor(diff / 3_600_000),
      m: Math.floor((diff % 3_600_000) / 60_000),
      s: Math.floor((diff % 60_000) / 1_000),
      done: false,
    };
  };
  const [val, setVal] = useState(calc);
  useEffect(() => {
    if (val.done) return;
    const id = setInterval(() => {
      const next = calc();
      setVal(next);
      if (next.done) clearInterval(id);
    }, 1_000);
    return () => clearInterval(id);
  }, [targetIso, val.done]);
  return val;
}

export default function Home() {
  const { t, lang } = useLang();
  const [lotteries, setLotteries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.listLotteries()
      .then(setLotteries)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const now = Date.now();
  const active   = lotteries.filter((l) => l.status === "ACTIVE" && (!l.sales_open_at || new Date(l.sales_open_at).getTime() <= now));
  const upcoming = lotteries.filter((l) => l.status === "ACTIVE" && l.sales_open_at && new Date(l.sales_open_at).getTime() > now);
  const past     = lotteries.filter((l) => l.status === "DRAWN");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {/* Hero */}
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

      {/* ── Active draws ── */}
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

      {/* ── Upcoming / Coming Soon ── */}
      {upcoming.length > 0 && (
        <div className="mt-14">
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-xl font-bold text-cream-50">
              {lang === "am" ? "ቀጣይ ዕጣዎች" : "Upcoming Draws"}
            </h2>
            <span className="pill bg-yellow-500/15 text-yellow-300">
              {lang === "am" ? "በቅርብ ጊዜ" : "Coming Soon"}
            </span>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((l) => <UpcomingCard key={l.id} lottery={l} />)}
          </div>
        </div>
      )}

      {/* ── Past draws ── */}
      {past.length > 0 && (
        <div className="mt-14">
          <h2 className="mb-5 text-xl font-bold text-cream-50">{t("pastFrozen")}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((l) => <LotteryCard key={l.id} lottery={l} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Active lottery card ───────────────────────────────────────────────────────
function LotteryCard({ lottery: l }) {
  const { t, lang } = useLang();
  const badge = STATUS_BADGE[l.status] || "bg-ink-700 text-cream-400";
  if (!l?.id) return null;
  const href = l.status === "DRAWN" ? `/lottery/${l.id}/results` : `/lottery/${l.id}`;

  return (
    <Link to={href}>
      <article className="card flex flex-col overflow-hidden transition hover:border-green-500/50 hover:shadow-glow">
        <CoverImage url={l.cover_image_url} title={l.title} />
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
              <span className="font-mono text-green-300">{l.total_tickets - l.tickets_sold}</span>
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

// ── Upcoming / Coming Soon card ───────────────────────────────────────────────
function UpcomingCard({ lottery: l }) {
  const { lang } = useLang();
  if (!l?.id) return null;

  return (
    <article className="card flex flex-col overflow-hidden border-yellow-500/20">
      <div className="relative">
        <CoverImage url={l.cover_image_url} title={l.title} dim />
        {/* Coming Soon overlay badge */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="rounded-full bg-ink-900/80 px-4 py-1.5 text-sm font-bold text-yellow-300 backdrop-blur-sm border border-yellow-500/30">
            {lang === "am" ? "በቅርብ ጊዜ" : "Coming Soon"}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-bold text-cream-50 leading-tight">{l.title}</h3>
          <span className="pill shrink-0 bg-yellow-500/15 text-yellow-300">
            {lang === "am" ? "ቀጣይ" : "Soon"}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-cream-300">{l.prize_description}</p>

        {/* Sales open date */}
        <div className="mt-4 rounded-xl bg-ink-800 px-4 py-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-cream-400 mb-1">
            {lang === "am" ? "ሽያጭ የሚከፈትበት ቀን" : "Sales open on"}
          </p>
          <p className="text-sm font-semibold text-yellow-300">
            {new Date(l.sales_open_at).toLocaleString()}
          </p>
        </div>

        <div className="mt-auto pt-3 flex items-center justify-between text-sm">
          <span className="text-cream-300">
            {lang === "am" ? "ዋጋ" : "Price"}
          </span>
          <span className="font-mono font-bold text-green-300">
            ETB {l.ticket_price.toLocaleString()}
          </span>
        </div>

        {/* Disabled Coming Soon button */}
        <div className="mt-3 w-full rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-2.5 text-center text-sm font-semibold text-yellow-300">
          {lang === "am" ? "በቅርብ ጊዜ" : "Coming Soon"}
        </div>
      </div>
    </article>
  );
}

// ── Shared cover image ────────────────────────────────────────────────────────
function CoverImage({ url, title, dim = false }) {
  return url ? (
    <img
      src={mediaUrl(url)}
      alt={title}
      className={`h-96 w-full object-cover${dim ? " opacity-60" : ""}`}
      loading="lazy"
      onError={(e) => {
        e.target.replaceWith(Object.assign(document.createElement("div"), {
          className: "h-96 w-full flex items-center justify-center bg-ink-800 text-5xl",
          textContent: "🎟️",
        }));
      }}
    />
  ) : (
    <div className="h-96 w-full flex items-center justify-center bg-ink-800 text-5xl">
      🎟️
    </div>
  );
}
