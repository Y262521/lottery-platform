import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import NumberPicker from "../components/NumberPicker";
import Countdown from "../components/Countdown";

export default function BuyTickets() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLang();

  const [draw, setDraw] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [selected, setSelected] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setDraw(await apiClient.getDraw(id));
      if (user) setWallet(await apiClient.myWallet());
    } catch (e) { setError(e.message); }
  }, [id, user]);

  useEffect(() => { load(); }, [load]);

  function toggle(n) {
    setSelected((cur) => {
      if (cur.includes(n)) return cur.filter((x) => x !== n);
      if (cur.length >= draw.numbers_per_ticket) return cur;
      return [...cur, n];
    });
  }

  async function quickPick() {
    try { setSelected(await apiClient.quickPick(id)); }
    catch (e) { setError(e.message); }
  }

  function addToCart() {
    setError("");
    if (selected.length !== draw.numbers_per_ticket) {
      setError(`${t("pickExactly")} ${draw.numbers_per_ticket} ${t("numbers")}.`);
      return;
    }
    setTickets((cur) => [...cur, [...selected].sort((a, b) => a - b)]);
    setSelected([]);
  }

  function removeTicket(i) { setTickets((cur) => cur.filter((_, idx) => idx !== i)); }

  const total = tickets.length * (draw?.ticket_price || 0);

  async function purchase() {
    setError("");
    if (!user) { navigate("/login", { state: { from: { pathname: `/draws/${id}` } } }); return; }
    setBusy(true);
    try {
      for (const nums of tickets) await apiClient.buyTicket({ draw_id: Number(id), numbers: nums });
      setTickets([]);
      setWallet(await apiClient.myWallet());
      setDraw(await apiClient.getDraw(id));
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  if (!draw) return <div className="mx-auto mt-24 max-w-6xl px-4 text-cream-300">{t("buyTickets")}…</div>;

  const open = draw.status === "SCHEDULED";
  const canAfford = wallet ? wallet.balance >= total : false;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <button onClick={() => navigate("/draws")} className="mb-4 text-sm text-cream-300 hover:text-cream-100">
        {t("backToDraws")}
      </button>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-cream-50">{draw.title}</h1>
              <p className="text-sm text-cream-300">
                {t("pickExactly")} {draw.numbers_per_ticket} · {draw.number_min}–{draw.number_max} ·
                ${draw.ticket_price.toFixed(2)} {t("perTicket")}
              </p>
            </div>
            <span className={`pill ${open ? "bg-green-500/15 text-green-300" : "bg-ink-600 text-cream-300"}`}>
              {draw.status}
            </span>
          </div>

          {open && (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-ink-800 px-4 py-3">
              <span className="text-xs uppercase tracking-wider text-cream-400">{t("salesCloseIn")}</span>
              <Countdown to={draw.sales_close_at} className="text-green-400" />
            </div>
          )}

          <div className="mt-6">
            <NumberPicker
              min={draw.number_min} max={draw.number_max}
              count={draw.numbers_per_ticket} selected={selected}
              onToggle={open ? toggle : () => {}}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={quickPick} disabled={!open}>{t("quickPick")}</button>
            <button className="btn-ghost" onClick={() => setSelected([])} disabled={!open || !selected.length}>{t("clear")}</button>
            <button className="btn-primary ml-auto" onClick={addToCart} disabled={!open}>{t("addTicket")}</button>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-cream-300">{t("yourCart")}</h2>

          {user && wallet && (
            <div className="mt-3 flex items-center justify-between rounded-xl bg-ink-800 px-4 py-3">
              <span className="text-xs text-cream-400">{t("walletBalance")}</span>
              <span className="font-mono text-green-300">${wallet.balance.toFixed(2)}</span>
            </div>
          )}

          <div className="mt-4 space-y-2">
            {tickets.length === 0 && (
              <p className="text-sm text-cream-400">{t("noTicketsYet")}</p>
            )}
            {tickets.map((nums, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-ink-600 bg-ink-800/60 p-2">
                <div className="flex flex-wrap gap-1.5">
                  {nums.map((n) => <span key={n} className="ball h-8 w-8 text-sm">{n}</span>)}
                </div>
                <button onClick={() => removeTicket(i)} className="px-2 text-cream-400 hover:text-green-300">✕</button>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-ink-600 pt-4">
            <span className="text-cream-300">{t("total")}</span>
            <span className="font-mono text-xl font-bold text-cream-50">${total.toFixed(2)}</span>
          </div>

          {error && (
            <div className="mt-3 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-300">
              {error}
            </div>
          )}

          <button className="btn-primary mt-4 w-full"
            disabled={busy || !tickets.length || !canAfford || !open} onClick={purchase}>
            {busy ? t("processing") : user
              ? `${t("buyTickets")} (${tickets.length})`
              : t("signInToBuy")}
          </button>

          {user && !canAfford && tickets.length > 0 && (
            <p className="mt-2 text-center text-xs text-cream-400">
              {t("insufficientBalance")}{" "}
              <a className="text-green-300 hover:underline" href="/wallet">{t("topUpWallet")}</a>.
            </p>
          )}
          {!open && <p className="mt-2 text-center text-xs text-cream-400">{t("salesClosed")}</p>}

          <div className="mt-4 break-all rounded-lg bg-ink-900 p-2 font-mono text-[10px] text-cream-400">
            <span className="text-green-300">commit:</span> {draw.server_seed_hash?.slice(0, 32)}…
          </div>
        </section>
      </div>
    </div>
  );
}
