import { useEffect, useState } from "react";
import { apiClient } from "../../api/client";
import { useLang } from "../../context/LangContext";

const STATUS_COLOR = {
  SUCCESS:  "bg-green-500/15 text-green-300",
  PENDING:  "bg-yellow-500/15 text-yellow-300",
  FAILED:   "bg-red-500/10 text-red-400",
  REFUNDED: "bg-ink-700 text-cream-400",
};

export default function AdminTransactions() {
  const { t, lang } = useLang();
  const [txns, setTxns] = useState([]);
  const [msg, setMsg] = useState("");
  const [expanded, setExpanded] = useState(null);

  const load = () => apiClient.allTransactions().then(setTxns).catch(() => {});
  useEffect(() => { load(); }, []);

  async function confirm(id) {
    try { await apiClient.confirmPayment(id); setMsg(lang === "am" ? "ተረጋግጧል ✓" : "Confirmed ✓"); load(); }
    catch (e) { setMsg(e.message); }
  }

  async function reject(id) {
    if (!window.confirm(lang === "am" ? "ይህን ክፍያ ይሰርዙ?" : "Reject this payment?")) return;
    try { await apiClient.rejectPayment(id); setMsg(lang === "am" ? "ተሰርዟል" : "Rejected"); load(); }
    catch (e) { setMsg(e.message); }
  }

  const pending = txns.filter((t) => t.status === "PENDING");
  const others  = txns.filter((t) => t.status !== "PENDING");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-cream-50 mb-2">{t("transactions")}</h1>
      <p className="text-sm text-cream-300 mb-6">
        {lang === "am"
          ? "ያልተረጋገጡ ክፍያዎችን ያረጋግጡ ወይም ይሰርዙ"
          : "Review pending payments and confirm or reject them"}
      </p>

      {msg && (
        <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/30 px-3 py-2 text-sm text-green-300">{msg}</div>
      )}

      {/* Pending — shown first, prominently */}
      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-yellow-300 mb-3">
            {lang === "am" ? `${pending.length} ያልተረጋገጠ ክፍያ` : `${pending.length} Pending Payment${pending.length > 1 ? "s" : ""}`}
          </h2>
          <div className="space-y-3">
            {pending.map((tx) => (
              <PendingCard key={tx.id} tx={tx} lang={lang} t={t}
                expanded={expanded === tx.id}
                onExpand={() => setExpanded(expanded === tx.id ? null : tx.id)}
                onConfirm={() => confirm(tx.id)}
                onReject={() => reject(tx.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* All transactions table */}
      <h2 className="text-sm font-semibold uppercase tracking-wider text-cream-300 mb-3">
        {lang === "am" ? "ሁሉም ግብይቶች" : "All Transactions"}
      </h2>
      <div className="overflow-x-auto rounded-xl border border-ink-600">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-800 text-cream-400">
            <tr>
              <th className="px-4 py-3">{t("txnId")}</th>
              <th className="px-4 py-3">{lang === "am" ? "ተጠቃሚ" : "User"}</th>
              <th className="px-4 py-3">{lang === "am" ? "ሎተሪ" : "Lottery"}</th>
              <th className="px-4 py-3">{t("txnAmount")}</th>
              <th className="px-4 py-3">{lang === "am" ? "ዘዴ" : "Method"}</th>
              <th className="px-4 py-3">{lang === "am" ? "ማጣቀሻ" : "Reference"}</th>
              <th className="px-4 py-3">{t("txnStatus")}</th>
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
                <td className="px-4 py-3 font-mono text-cream-300 text-xs">{tx.gateway_ref || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`pill ${STATUS_COLOR[tx.status] || "bg-ink-700 text-cream-400"}`}>{tx.status}</span>
                </td>
                <td className="px-4 py-3 text-cream-400 text-xs">{new Date(tx.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  {tx.status === "PENDING" && (
                    <div className="flex gap-1.5 justify-end">
                      <button className="btn-primary px-2 py-1 text-xs" onClick={() => confirm(tx.id)}>
                        {lang === "am" ? "አረጋግጥ" : "Confirm"}
                      </button>
                      <button className="btn-danger px-2 py-1 text-xs" onClick={() => reject(tx.id)}>
                        {lang === "am" ? "ሰርዝ" : "Reject"}
                      </button>
                    </div>
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

function PendingCard({ tx, lang, onExpand, expanded, onConfirm, onReject }) {
  const wp = tx.webhook_payload || {};
  return (
    <div className="card border-yellow-500/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-cream-100">#{tx.id}</span>
            <span className="pill bg-yellow-500/15 text-yellow-300">PENDING</span>
            <span className="text-cream-300 text-sm">{tx.gateway}</span>
          </div>
          <div className="mt-1 text-xs text-cream-400">
            {lang === "am" ? "ሎተሪ" : "Lottery"} #{tx.lottery_id} ·
            <span className="font-mono text-green-300 ml-1">ETB {tx.amount}</span> ·
            {tx.tickets_count} {lang === "am" ? "ቲኬቶች" : "ticket(s)"}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost px-2 py-1 text-xs" onClick={onExpand}>
            {expanded ? "▲" : "▼"} {lang === "am" ? "ዝርዝር" : "Details"}
          </button>
          <button className="btn-primary px-3 py-1.5 text-xs" onClick={onConfirm}>
            ✓ {lang === "am" ? "አረጋግጥ" : "Confirm"}
          </button>
          <button className="btn-danger px-3 py-1.5 text-xs" onClick={onReject}>
            ✕ {lang === "am" ? "ሰርዝ" : "Reject"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 rounded-xl bg-ink-800 p-4 text-sm space-y-2">
          <Row label={lang === "am" ? "ማጣቀሻ" : "Reference"} value={tx.gateway_ref} />
          <Row label={lang === "am" ? "ላኪ" : "Sender"} value={wp.sender_name} />
          <Row label={lang === "am" ? "ስልክ" : "Phone"} value={wp.phone} />
          <Row label={lang === "am" ? "የቀረበ" : "Submitted"} value={wp.submitted_at ? new Date(wp.submitted_at).toLocaleString() : "—"} />
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-cream-400">{label}</span>
      <span className="font-mono text-cream-100">{value || "—"}</span>
    </div>
  );
}
