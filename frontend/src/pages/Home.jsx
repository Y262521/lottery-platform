import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { useLang } from "../context/LangContext";
import Countdown from "../components/Countdown";

export default function Home() {
  const { t } = useLang();
  const [draws, setDraws] = useState([]);

  useEffect(() => {
    apiClient.listDraws().then(setDraws).catch(() => {});
  }, []);

  const next = draws.find((d) => d.status === "SCHEDULED");

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <section className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <span className="pill bg-green-500/15 text-green-300">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            {t("heroTag")}
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-tight text-cream-50 sm:text-5xl">
            {t("heroTitle")}{" "}
            <span className="bg-gradient-to-r from-green-300 to-green-500 bg-clip-text text-transparent">
              {t("heroTitleAccent")}
            </span>
          </h1>
          <p className="mt-4 max-w-md text-cream-300">{t("heroDesc")}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/draws" className="btn-primary">{t("browseLive")}</Link>
            <Link to="/results" className="btn-ghost">{t("pastResults")}</Link>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <Stat label={t("numbersAuditable")} value="100%" />
            <Stat label={t("serverSeed")} value="256-bit" />
            <Stat label="RNG" value="CSPRNG" />
          </div>
        </div>

        <div className="card animate-fadeIn p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-cream-300">
              {t("nextDraw")}
            </h2>
            <span className="pill bg-ink-600 text-cream-300">
              {next ? next.status : "—"}
            </span>
          </div>
          {next ? (
            <>
              <h3 className="mt-4 text-2xl font-bold text-cream-50">{next.title}</h3>
              <div className="mt-1 text-cream-300">
                {t("pickExactly")} {next.numbers_per_ticket} · {next.number_min}–{next.number_max} ·
                <span className="ml-1 font-mono text-green-300">${next.ticket_price.toFixed(2)}</span>
              </div>
              <div className="mt-6 rounded-xl bg-ink-800 p-4 text-center">
                <div className="text-xs uppercase tracking-wider text-cream-400">{t("salesCloseIn")}</div>
                <Countdown to={next.sales_close_at} className="mt-1 text-3xl text-green-400" />
              </div>
              {next.jackpot > 0 && (
                <div className="mt-4 flex items-center justify-between rounded-xl border border-ink-600 bg-ink-800/60 p-4">
                  <span className="text-cream-300">{t("jackpot")}</span>
                  <span className="font-mono text-xl font-bold text-green-300">
                    ${next.jackpot.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="mt-4 flex gap-3">
                <Link to={`/draws/${next.id}`} className="btn-primary flex-1">{t("buyTickets")}</Link>
                <Link to={`/live/${next.id}`} className="btn-ghost flex-1">{t("watchLive")}</Link>
              </div>
              <div className="mt-4 break-all rounded-lg bg-ink-900 p-3 font-mono text-[10px] leading-relaxed text-cream-400">
                <span className="text-green-300">commit:</span>{" "}
                {next.server_seed_hash?.slice(0, 40)}…
              </div>
            </>
          ) : (
            <p className="mt-6 text-cream-300">{t("noScheduledDraws")}</p>
          )}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-xl font-bold text-cream-50">{t("provableFairness")}</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Step n="1" title={t("commit")}>{t("commitDesc")}</Step>
          <Step n="2" title={t("draw")}>{t("drawDesc")}</Step>
          <Step n="3" title={t("revealVerify")}>{t("revealDesc")}</Step>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-ink-600 bg-ink-700/50 p-3">
      <div className="font-mono text-lg font-bold text-green-300">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-cream-400">{label}</div>
    </div>
  );
}

function Step({ n, title, children }) {
  return (
    <div className="card p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-600 font-mono font-bold text-ink-900">
        {n}
      </div>
      <h3 className="mt-3 font-semibold text-cream-50">{title}</h3>
      <p className="mt-2 text-sm text-cream-300">{children}</p>
    </div>
  );
}
