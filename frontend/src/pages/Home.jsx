import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient, mediaUrl } from "../api/client";
import { useLang } from "../context/LangContext";

const STATUS_BADGE = {
  ACTIVE: "bg-green-500/20 text-green-300",
  DRAWN:  "bg-ink-600 text-cream-300",
  CLOSED: "bg-ink-700 text-cream-400",
};

function tStatus(t, s) { return t(`status${s}`) || s; }

// Simple countdown hook — returns {h, m, s, done}
function useCountdown(targetIso) {
  const calc = () => {
    const diff = new Date(targetIso).getTime() - Date.now();
    if (diff <= 0) return { h: 0, m: 0, s: 0, done: true };
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1_000);
    return { h, m, s, done: false };
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

function pad(n) { return String(n).padStart(2, "0"); }

export default function Home() {
  const { t } = useLang();
  const [lotteries, setLotteries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.listLotteries().then(setLotteries).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const now = Date.now();

  // "Coming soon" = ACTIVE status but sales_open_at is in the future
  const comingSoon = lotteries.filter(
    (l) => l.status === "ACTIVE" && l.sales_open_at && new Date(l.sales_open_at).getTime() > now
  );
  // Truly open = ACTIVE and sales are already open
  const active = lotteries.filter(
    (l) => l.status === "ACTIVE" && (!l.sales_open_at || new Date(l.sales_open_at).getTime() <= now)
  );
  const past = lotteries.filter((l) => l.status === "DRAWN");

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

      {/* Coming Soon */}
      {comingSoon.length > 0 && (
        <>
          <h2 className="mb-5 text-xl font-bold text-cream-50">
            {t("lang") === "am" ? "በቅርብ ጊዜ የሚመጣ" : "Coming Soon"}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-12">
            {comingSoon.map((l) => <ComingSoonCard key={l.id} lottery={l} />)}
          </div>
        </>
      )}

      {/* Active lotteries */}
      <h2 className="mb-5 text-xl font-bold text-cream-50">{t("draws")}</h2>
      {loading ? (
        <p className="text-cream-300">{t("loading")}</p>
      ) : active.length === 0 && comingSoon.length === 0 ? (
        <div className="card p-10 text-center text-cream-300">{t("noOpenDraws")}</div>
      ) : active.length === 0 ? (
        <div className="card p-6 text-center text-cream-400 text-sm">
          {t("lang") === "am"
            ? "አሁን ክፍት ዕጣ የለም። ከላይ ያሉትን ቀጣይ ዕጣዎች ይመልከቱ።"
            : "No open lotteries right now. Check the upcoming ones above."}
        </div>
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

// ── Coming Soon card ──────────────────────────────────────────────────────────
function ComingSoonCard({ lottery: l }) {
  const { t, lang } = useLang();
  const countdown = useCountdown(l.sales_open_at);

  if (!l?.id) return null;

  return (
    <article className="card flex flex-col overflow-hidden border-green-500/30">
      {/* Cover image */}
      {l.cover_image_url ? (
        <img
          src={mediaUrl(l.cover_image_url)}
          alt={l.title}
          className="h-44 w-full object-cover opacity-60"
          loading="lazy"
          onError={(e) => { e.target.style.display = "none"; }}
        />
      ) : (
        <div className="h-44 w-full flex items-center justify-center bg-ink-800 text-5xl opacity-60">
          🎟️
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-bold text-cream-50 leading-tight">{l.title}</h3>
          <span className="pill shrink-0 bg-yellow-500/15 text-yellow-300">
            {lang === "am" ? "በቅርብ" : "Soon"}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-cream-300">{l.prize_description}</p>

        {/* Countdown */}
        <div className="mt-4 rounded-xl bg-ink-800 px-4 py-3 text-center">
          {countdown.done ? (
            <p className="text-green-300 text-sm font-semibold">
              {lang === "am" ? "አሁን ክፍት ነው!" : "Now open! Refresh the page."}
            </p>
          ) : (
            <>
              <p className="text-xs uppercase tracking-wider text-cream-400 mb-1">
                {lang === "am" ? "ሽያጭ ይከፈታል" : "Sales open in"}
              </p>
              <div className="flex items-center justify-center gap-2 font-mono text-2xl font-bold text-green-300">
                <span>{pad(countdown.h)}</span>
                <span className="text-cream-400">:</span>
                <span>{pad(countdown.m)}</span>
                <span className="text-cream-400">:</span>
                <span>{pad(countdown.s)}</span>
              </div>
              <p className="text-[10px] text-cream-500 mt-1">
                {new Date(l.sales_open_at).toLocaleString()}
              </p>
            </>
          )}
        </div>

        <div className="mt-auto pt-3 flex items-center justify-between text-sm">
          <span className="text-cream-300">{t("ticket")}</span>
          <span className="font-mono font-bold text-green-300">
            ETB {l.ticket_price.toLocaleString()}
          </span>
        </div>

        <div className="mt-3 w-full rounded-xl border border-ink-600 bg-ink-700 px-4 py-2.5 text-center text-sm text-cream-400">
          {lang === "am" ? "ሽያጭ እስካሁን አልተከፈተም" : "Sales not yet open"}
        </div>
      </div>
    </article>
  );
}

// ── Normal lottery card ───────────────────────────────────────────────────────
function LotteryCard({ lottery: l }) {
  const { t, lang } = useLang();
  const badge = STATUS_BADGE[l.status] || "bg-ink-700 text-cream-400";

  if (!l?.id) return null;

  const href = l.status === "DRAWN" ? `/lottery/${l.id}/results` : `/lottery/${l.id}`;

  return (
    <Link to={href}>
      <article className="card flex flex-col overflow-hidden transition hover:border-green-500/50 hover:shadow-glow">
        {l.cover_image_url ? (
          <img
            src={mediaUrl(l.cover_image_url)}
            alt={l.title}
            className="h-44 w-full object-cover"
            loading="lazy"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
          />
        ) : null}
        <div
          style={{ display: l.cover_image_url ? "none" : "flex" }}
          className="h-44 w-full items-center justify-center bg-ink-800 text-5xl"
        >
          🎟️
        </div>
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
