import { useEffect, useState } from "react";
import { apiClient } from "../../api/client";

const STATUS_COLOR = {
  SUCCESS: "bg-green-500/15 text-green-300",
  PENDING: "bg-ink-600 text-cream-200",
  FAILED:  "bg-red-500/10 text-red-400",
  REFUNDED:"bg-ink-700 text-cream-400",
};

export default function AdminTransactions() {
  const [txns, setTxns] = useState([]);
  const [msg, setMsg] = useState("");

  const load = () => apiClient.allTransactions().then(setTxns).catch(() => {});

  useEffect(() => { load(); }, []);

  async function confirm(id) {
    try { await apiClient.confirmPayment(id); setMsg("Payment confirmed ✓"); load(); }
    catch (e) { setMsg(e.message); }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-cream-50 mb-6">Transactions</h1>
      {msg && <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/30 px-3 py-2 text-sm text-green-300">{msg}</div>}

      <div className="overflow-hidden rounded-xl border border-ink-600">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-800 text-cream-400">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Lottery</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Gateway</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Tickets</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-700">
            {txns.map((t) => (
              <tr key={t.id} className="bg-ink-700/40">
                <td className="px-4 py-3 font-mono text-cream-400">#{t.id}</td>
                <td className="px-4 py-3 text-cream-200">#{t.user_id}</td>
                <td className="px-4 py-3 text-cream-200">#{t.lottery_id}</td>
                <td className="px-4 py-3 font-mono text-green-300">ETB {t.amount}</td>
                <td className="px-4 py-3 text-cream-200">{t.gateway}</td>
                <td className="px-4 py-3">
                  <span className={`pill ${STATUS_COLOR[t.status] || "bg-ink-700 text-cream-400"}`}>{t.status}</span>
                </td>
                <td className="px-4 py-3 font-mono text-cream-200">{t.tickets_count}</td>
                <td className="px-4 py-3 text-cream-400 text-xs">{new Date(t.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  {t.status === "PENDING" && t.gateway === "BANK_TRANSFER" && (
                    <button className="btn-primary px-2 py-1 text-xs" onClick={() => confirm(t.id)}>
                      Confirm
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {txns.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-cream-400">No transactions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
