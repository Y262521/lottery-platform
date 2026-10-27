import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import NumberPicker from "../components/NumberPicker";
import Countdown from "../components/Countdown";

export default function BuyTickets() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [draw, setDraw] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [selected, setSelected] = useState([]);
  const [tickets, setTickets] = useState([]); // cart of selected sets
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setDraw(await apiClient.getDraw(id));
      if (user) setWallet(await apiClient.myWallet());
    } catch (e) {
      setError(e.message);
    }
  }, [id, user]);

  useEffect(() => {
    load();
  }, [load]);

  function toggle(n) {
    setSelected((cur) => {
      if (cur.includes(n)) return cur.filter((x) => x !== n);
      if (cur.length >= draw.numbers_per_ticket) return cur;
      return [...cur, n];
    });
  }

  async function quickPick() {
    try {
      const nums = await apiClient.quickPick(id);
      setSelected(nums);
    } catch (e) {
      setError(e.message);
    }
  }

  function addToCart() {
    setError("");
    if (selected.length !== draw.numbers_per_ticket) {
      setError(`Pick exactly ${draw.numbers_per_ticket} numbers.`);
      return;
    }
    setTickets((cur) => [...cur, [...selected].sort((a, b) => a - b)]);
    setSelected([]);
  }

  function removeTicket(i) {
    setTickets((cur) => cur.filter((_, idx) => idx !== i));
  }

  const total = tickets.length * (draw?.ticket_price || 0);

  async function purchase() {
    setError("");
    if (!user) {
      navigate("/login", { state: { from: { pathname: `/draws/${id}` } } });
      return;
    }
    setBusy(true);
    try {
      for (const nums of tickets) {
        await apiClient.buyTicket({ draw_id: Number(id), numbers: nums });
      }
      setTickets([]);
      setWallet(await apiClient.myWallet());
      setDraw(await apiClient.getDraw(id));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!draw) {
    return <div className="mx-auto mt-24 max-w-6xl px-4 text-cream-300">Loading…</div>;
  }

  const open = draw.status === "SCHEDULED";
  const canAfford = wallet ? wallet.balance >= total : false;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <button onClick={() => navigate("/draws")} className="mb-4 text-sm text-cream-300 hover:text-cream-100">
        ← Back to draws
      </button>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Picker */}
        <section className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-cream-50">{draw.title}</h1>
              <p className="text-sm text-cream-300">
                Pick {draw.numbers_per_ticket} from {draw.number_min}–{draw.number_max} ·
                ${draw.ticket_price.toFixed(2)} per ticket
              </p>
            </div>
            <span className={`pill ${open ? "bg-green-500/15 text-green-300" : "bg-ink-600 text-cream-300"}`}>
              {draw.status}
            </span>
          </div>

          {open && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-ink-800 px-4 py-3">
              <span className="text-xs uppercase tracking-wider text-cream-400">Sales close in</span>
              <Countdown to={draw.sales_close_at} className="text-green-400" />
            </div>
          )}

          <div className="mt-6">
            <NumberPicker
              min={draw.number_min}
              max={draw.number_max}
              count={draw.numbers_per_ticket}
              selected={selected}
              onToggle={open ? toggle : () => {}}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={quickPick} disabled={!open}>
              Quick pick
            </button>
            <button className="btn-ghost" onClick={() => setSelected([])} disabled={!open || !selected.length}>
              Clear
            </button>
            <button className="btn-primary ml-auto" onClick={addToCart} disabled={!open}>
              Add ticket
            </button>
          </div>
        </section>

        {/* Cart + wallet */}
        <section className="card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-cream-300">Your cart</h2>

          {user && wallet && (
            <div className="mt-3 flex items-center justify-between rounded-xl bg-ink-800 px-4 py-3">
              <span className="text-xs text-cream-400">Wallet balance</span>
              <span className="font-mono text-green-300">${wallet.balance.toFixed(2)}</span>
            </div>
          )}

          <div className="mt-4 space-y-2">
            {tickets.length === 0 && (
              <p className="text-sm text-cream-400">No tickets yet. Add some numbers above.</p>
            )}
            {tickets.map((nums, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-ink-600 bg-ink-800/60 p-2">
                <div className="flex flex-wrap gap-1.5">
                  {nums.map((n) => (
                    <span key={n} className="ball h-8 w-8 text-sm">{n}</span>
                  ))}
                </div>
                <button onClick={() => removeTicket(i)} className="px-2 text-cream-400 hover:text-green-300" aria-label="Remove">
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-ink-600 pt-4">
            <span className="text-cream-300">Total</span>
            <span className="font-mono text-xl font-bold text-cream-50">${total.toFixed(2)}</span>
          </div>

          {error && (
            <div className="mt-3 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-300">
              {error}
            </div>
          )}

          <button
            className="btn-primary mt-4 w-full"
            disabled={busy || !tickets.length || !canAfford || !open}
            onClick={purchase}
          >
            {busy ? "Processing…" : user ? `Buy ${tickets.length} ticket${tickets.length > 1 ? "s" : ""}` : "Sign in to buy"}
          </button>

          {user && !canAfford && tickets.length > 0 && (
            <p className="mt-2 text-center text-xs text-cream-400">
              Insufficient balance.{" "}
              <a className="text-green-300 hover:underline" href="/wallet">Top up your wallet</a>.
            </p>
          )}
          {!open && (
            <p className="mt-2 text-center text-xs text-cream-400">Sales are closed for this draw.</p>
          )}

          <div className="mt-4 break-all rounded-lg bg-ink-900 p-2 font-mono text-[10px] text-cream-400">
            <div><span className="text-green-300">commit:</span> {draw.server_seed_hash?.slice(0, 32)}…</div>
          </div>
        </section>
      </div>
    </div>
  );
}
