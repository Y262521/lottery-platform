import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";
import Countdown from "../components/Countdown";

const STATUS_STYLE = {
  SCHEDULED: "bg-green-500/15 text-green-300",
  FROZEN: "bg-ink-600 text-cream-200",
  COMPLETED: "bg-ink-700 text-cream-400",
  CANCELLED: "bg-ink-800 text-cream-400",
};

export default function Draws() {
  const [draws, setDraws] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setDraws(await apiClient.listDraws());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <div className="mx-auto mt-24 max-w-6xl px-4 text-cream-300">Loading draws…</div>;
  }

  const open = draws.filter((d) => d.status === "SCHEDULED");
  const closed = draws.filter((d) => d.status !== "SCHEDULED");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-cream-50">Draws</h1>
        <p className="mt-1 text-cream-300">Open draws you can enter right now.</p>
      </header>

      {open.length === 0 && (
        <div className="card p-8 text-center text-cream-300">
          No draws are open for ticket sales. Check back soon.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {open.map((d) => (
          <article key={d.id} className="card flex flex-col p-5">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-bold text-cream-50">{d.title}</h2>
              <span className={`pill ${STATUS_STYLE[d.status]}`}>{d.status}</span>
            </div>
            <p className="mt-1 text-sm text-cream-300">
              Pick {d.numbers_per_ticket} from {d.number_min}–{d.number_max}
            </p>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-ink-800 px-4 py-3">
              <span className="text-xs uppercase tracking-wider text-cream-400">
                Sales close
              </span>
              <Countdown to={d.sales_close_at} className="text-green-400" />
            </div>

            <div className="mt-3 flex justify-between text-sm">
              <span className="text-cream-300">Ticket</span>
              <span className="font-mono text-cream-50">${d.ticket_price.toFixed(2)}</span>
            </div>
            {d.jackpot > 0 && (
              <div className="mt-1 flex justify-between text-sm">
                <span className="text-cream-300">Jackpot</span>
                <span className="font-mono text-green-300">
                  ${d.jackpot.toLocaleString()}
                </span>
              </div>
            )}
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-cream-300">Tickets sold</span>
              <span className="font-mono text-cream-100">{d.ticket_count}</span>
            </div>

            <div className="mt-5 flex gap-2">
              <Link to={`/draws/${d.id}`} className="btn-primary flex-1">Buy tickets</Link>
              <Link to={`/live/${d.id}`} className="btn-ghost flex-1">Watch</Link>
            </div>

            <div className="mt-4 break-all rounded-lg bg-ink-900 p-2 font-mono text-[10px] text-cream-400">
              commit {d.server_seed_hash?.slice(0, 32)}…
            </div>
          </article>
        ))}
      </div>

      {closed.length > 0 && (
        <>
          <h2 className="mb-4 mt-12 text-lg font-semibold text-cream-200">
            Past & frozen draws
          </h2>
          <div className="overflow-hidden rounded-xl border border-ink-600">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-800 text-cream-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Draw</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Winning</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-700">
                {closed.map((d) => (
                  <tr key={d.id} className="bg-ink-700/40">
                    <td className="px-4 py-3 text-cream-100">{d.title}</td>
                    <td className="px-4 py-3">
                      <span className={`pill ${STATUS_STYLE[d.status]}`}>{d.status}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-green-300">
                      {d.winning_numbers ? d.winning_numbers.join(", ") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/live/${d.id}`} className="text-green-300 hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
