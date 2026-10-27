import { useEffect, useState } from "react";
import { apiClient } from "../../api/client";
import { useLang } from "../../context/LangContext";

const STATUS_COLOR = {
  SUCCESS:  "bg-green-500/15 text-green-300",
  PENDING:  "bg-ink-600 text-cream-200",
  FAILED:   "bg-red-500/10 text-red-400",
  REFUNDED: "bg-ink-700 text-cream-400",
};

export default function AdminTransactions() {
  const { t } = useLang();
  const [txns, setTxns] = useState([]);
  const [msg, setMsg] = useState("");

  const load = () => apiClient.allTransactions().then(setTxns).catch(() => {});
  useEffect(() => { load(); }, []);

  async function confirm(id) {
    try { await apiClient.confirmPayment(id); setMsg(t("updated")); load(); }
    catch (e) { setMsg(e.message); }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-cream-50 mb-6">{t("transactions")}</h1>
      {msg && <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/30 px-3 py-2 text-sm text-green-300">{msg}</div>}

      <div className="overflow-x-auto rounded-xl border border-ink-600">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-800 text-cream-400">
            <tr>
              <th className="px-4 py-3">{t("txnId")}</th>
              <th className="px-4 py-3">{t("txnUser")}</th>
              <th className="px-4 py-3">{t("txnLottery")}</th>
              <th className="px-4 py-3">{t("txnAmount")}</th>
              <th className="px-4 py-3">{t("txnGateway")}</th>
              <th className="px-4 py-3">{t("txnStatus")}</th>
              <th className="px-4 py-3">{t("txnTickets")}</th>
              <th className="px-4 py-3">{t("txnDate")}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-700">
            {txns.map((tx) => (
              <tr key={tx.id} className="bg-ink-700/40">
                <td className="px-4 py-3 font-mono text-cream-400">#{tx.id}</td>
                <td className="px-4 py-3 text-cream-200">#{tx.user_id}</td>
                <td className="px-4 py-3 text-cream-200">#{tx.lottery_id}</td>
                <td className="px-4 py-3 font-mono text-green-300">ETB {tx.amount}</td>
                <td className="px-4 py-3 text-cream-200">{tx.gateway}</td>
                <td className="px-4 py-3"><span className={`pill ${STATUS_COLOR[tx.status] || "bg-ink-700 text-cream-400"}`}>{tx.status}</span></td>
                <td className="px-4 py-3 font-mono text-cream-200">{tx.tickets_count}</td>
                <td className="px-4 py-3 text-cream-400 text-xs">{new Date(tx.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  {tx.status === "PENDING" && tx.gateway === "BANK_TRANSFER" && (
                    <button className="btn-primary px-2 py-1 text-xs" onClick={() => confirm(tx.id)}>{t("confirmPayment")}</button>
                  )}
                </td>
              </tr>
            ))}
            {txns.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-cream-400">{t("noTransactions")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
