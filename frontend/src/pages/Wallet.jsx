import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { useLang } from "../context/LangContext";

const TXN_STYLE = {
  DEPOSIT: "text-green-300",
  BONUS: "text-green-300",
  TICKET_PURCHASE: "text-cream-200",
  PAYOUT: "text-green-300",
  REFUND: "text-cream-200",
};

export default function Wallet() {
  const { t } = useLang();
  const [wallet, setWallet] = useState(null);
  const [txns, setTxns] = useState([]);
  const [amount, setAmount] = useState(50);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setWallet(await apiClient.myWallet());
      setTxns(await apiClient.transactions());
    } catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function deposit() {
    setError("");
    setBusy(true);
    try {
      await apiClient.deposit(Number(amount));
      await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-cream-50">{t("walletTitle")}</h1>
        <p className="mt-1 text-cream-300">{t("walletSub")}</p>
      </header>

      <div className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
        <section className="card p-6">
          <div className="rounded-xl bg-gradient-to-br from-green-700 to-ink-800 p-5">
            <div className="text-xs uppercase tracking-wider text-cream-200">{t("availableBalance")}</div>
            <div className="mt-1 font-mono text-4xl font-bold text-cream-50">
              ${wallet ? wallet.balance.toFixed(2) : "—"}
            </div>
          </div>

          <div className="mt-5">
            <label className="label" htmlFor="amount">{t("topUp")}</label>
            <div className="flex gap-2">
              <input id="amount" type="number" min={1} max={100000} className="input"
                value={amount} onChange={(e) => setAmount(e.target.value)} />
              <button className="btn-primary" disabled={busy} onClick={deposit}>
                {busy ? "…" : t("add")}
              </button>
            </div>
            <p className="mt-2 text-xs text-cream-400">{t("demoDeposit")}</p>
          </div>

          {error && (
            <div className="mt-3 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-300">
              {error}
            </div>
          )}
        </section>

        <section className="card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-cream-300">{t("transactions")}</h2>
          {txns.length === 0 ? (
            <p className="mt-4 text-sm text-cream-400">{t("noTransactions")}</p>
          ) : (
            <ul className="mt-4 divide-y divide-ink-700">
              {txns.map((tx) => (
                <li key={tx.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm text-cream-100">
                      {tx.type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                    </div>
                    <div className="text-xs text-cream-400">
                      {new Date(tx.created_at).toLocaleString()}
                      {tx.reference ? ` · ${tx.reference}` : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-mono ${TXN_STYLE[tx.type] || "text-cream-100"}`}>
                      {tx.amount >= 0 ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
                    </div>
                    <div className="text-xs text-cream-400">{t("walletBalance")} ${tx.balance_after.toFixed(2)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
