import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";

const STATUS_STYLE = {
  CONFIRMED:       "bg-green-500/15 text-green-300",
  WON:             "bg-green-600 text-ink-900",
  LOST:            "bg-ink-700 text-cream-400",
  PENDING_PAYMENT: "bg-ink-600 text-cream-300",
  CANCELLED:       "bg-ink-800 text-cream-400",
};

export default function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.myTickets().then(setTickets).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-cream-50">My Tickets</h1>
          <p className="mt-1 text-cream-300">All your lottery entries.</p>
        </div>
        <Link to="/" className="btn-ghost">Browse Lotteries</Link>
      </header>

      {loading ? (
        <p className="text-cream-300">Loading…</p>
      ) : tickets.length === 0 ? (
        <div className="card p-8 text-center text-cream-300">
          No tickets yet.{" "}
          <Link to="/" className="text-green-300 hover:underline">Browse lotteries</Link>.
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <article key={t.id} className="card flex flex-wrap items-center justify-between gap-4 p-4">
              <div>
                <div className="font-mono text-lg font-bold text-cream-50">{t.ticket_no}</div>
                <div className="text-xs text-cream-400 mt-0.5">
                  {new Date(t.created_at).toLocaleDateString()}
                  {t.confirmed_at && ` · Confirmed ${new Date(t.confirmed_at).toLocaleDateString()}`}
                </div>
              </div>
              <span className={`pill ${STATUS_STYLE[t.status] || "bg-ink-700 text-cream-300"}`}>
                {t.status.replace(/_/g, " ")}
              </span>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
