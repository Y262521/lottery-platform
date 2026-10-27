import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import Countdown from "../components/Countdown";

export default function Home() {
  const [draws, setDraws] = useState([]);

  useEffect(() => {
    apiClient.listDraws().then(setDraws).catch(() => {});
  }, []);

  const next = draws.find((d) => d.status === "SCHEDULED");

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* Hero */}
      <section className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <span className="pill bg-green-500/15 text-green-300">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            Commit-reveal provable fairness
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-tight text-cream-50 sm:text-5xl">
            A lottery you can{" "}
            <span className="bg-gradient-to-r from-green-300 to-green-500 bg-clip-text text-transparent">
              actually trust
            </span>
          </h1>
          <p className="mt-4 max-w-md text-cream-300">
            Every draw is decided by a cryptographically secure seed whose hash is
            published <em>before</em> sales close. After the draw we reveal the seed
            so you can verify the result yourself. No black boxes, no do-overs.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/draws" className="btn-primary">
              Browse live draws
            </Link>
            <Link to="/results" className="btn-ghost">
              Past results
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <Stat label="Numbers auditable" value="100%" />
            <Stat label="Server seed" value="256-bit" />
            <Stat label="RNG" value="CSPRNG" />
          </div>
        </div>

        {/* Next-draw card */}
        <div className="card animate-fadeIn p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-cream-300">
              Next draw
            </h2>
            <span className="pill bg-ink-600 text-cream-300">
              {next ? next.status : "—"}
            </span>
          </div>
          {next ? (
            <>
              <h3 className="mt-4 text-2xl font-bold text-cream-50">{next.title}</h3>
              <div className="mt-1 text-cream-300">
                Pick {next.numbers_per_ticket} from {next.number_min}–{next.number_max} ·
                <span className="ml-1 font-mono text-green-300">
                  ${next.ticket_price.toFixed(2)}
                </span>
              </div>
              <div className="mt-6 rounded-xl bg-ink-800 p-4 text-center">
                <div className="text-xs uppercase tracking-wider text-cream-400">
                  Sales close in
                </div>
                <Countdown to={next.sales_close_at} className="mt-1 text-3xl text-green-400" />
              </div>
              {next.jackpot > 0 && (
                <div className="mt-4 flex items-center justify-between rounded-xl border border-ink-600 bg-ink-800/60 p-4">
                  <span className="text-cream-300">Jackpot</span>
                  <span className="font-mono text-xl font-bold text-green-300">
                    ${next.jackpot.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="mt-4 flex gap-3">
                <Link to={`/draws/${next.id}`} className="btn-primary flex-1">
                  Buy tickets
                </Link>
                <Link to={`/live/${next.id}`} className="btn-ghost flex-1">
                  Watch live
                </Link>
              </div>
              <div className="mt-4 break-all rounded-lg bg-ink-900 p-3 font-mono text-[10px] leading-relaxed text-cream-400">
                <span className="text-green-300">commit:</span>{" "}
                {next.server_seed_hash?.slice(0, 40)}…
              </div>
            </>
          ) : (
            <p className="mt-6 text-cream-300">
              No scheduled draws right now. An admin can create one from the
              dashboard.
            </p>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="mt-16">
        <h2 className="text-xl font-bold text-cream-50">How provable fairness works</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Step n="1" title="Commit">
            Before sales open we generate a secret 256-bit seed and publish its
            SHA-256 hash. The seed stays hidden, but the hash is public.
          </Step>
          <Step n="2" title="Draw">
            At draw time we add a public client seed. The winning numbers come
            from a Fisher-Yates shuffle driven by HMAC(seed, client). The seed is
            locked in, so the operator can’t reroll.
          </Step>
          <Step n="3" title="Reveal & verify">
            After the draw we publish the seed. Anyone can check{" "}
            <span className="font-mono text-green-300">SHA-256(seed) == hash</span> and
            recompute the winning numbers themselves.
          </Step>
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
