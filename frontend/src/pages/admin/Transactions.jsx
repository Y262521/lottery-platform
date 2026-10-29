import { useEffect, useState } from "react";
import { apiClient, mediaUrl } from "../../api/client";
import { useLang } from "../../context/LangContext";

const STATUS_COLOR = {
  SUCCESS:  "bg-green-500/15 text-green-300",
  PENDING:  "bg-yellow-500/15 text-yellow-300",
  FAILED:   "bg-red-500/10 text-red-400",
  REFUNDED: "bg-ink-700 text-cream-400",
};

function tStatus(t, s) { return t(`status${s}`) || s; }

export default function AdminTransactions() {
  const { t, lang } = useLang();
  const [txns, setTxns] = useState([]);
  const [msg, setMsg] = useState("");
  // Pending cards start expanded by default
  const [expanded, setExpanded] = useState("all-pending");

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
                expanded={expanded === tx.id || expanded === "all-pending"}
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
              <th className="px-4 py-3">{lang === "am" ? "እጣ" : "Draw"}</th>
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
                <td className="px-4 py-3 text-cream-200">
                  {tx.webhook_payload?.provider || tx.webhook_payload?.bank_or_wallet || tx.gateway}
                </td>
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
  const hasDetails = tx.webhook_payload && Object.keys(tx.webhook_payload).length > 0;
  const refDisplay = wp.payment_reference || tx.gateway_ref || (lang === "am" ? "አልተሰጠም (አማራጭ)" : "None (optional)");

  return (
    <div className="card border-yellow-500/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-cream-100 font-bold">#{tx.id}</span>
            <span className="pill bg-yellow-500/15 text-yellow-300">PENDING</span>
            <span className="text-cream-300 text-sm font-medium">
              {wp.provider || wp.bank_or_wallet || tx.gateway}
            </span>
            <span className="font-mono text-green-300 text-sm font-bold">ETB {tx.amount}</span>
          </div>
          <div className="mt-1.5 text-xs text-cream-400 flex items-center gap-1.5 flex-wrap">
            <span>{lang === "am" ? "እጣ" : "Draw"} #{tx.lottery_id}</span>
            <span>·</span>
            <span>{tx.tickets_count} {lang === "am" ? "ቲኬቶች" : "ticket(s)"}</span>
            <span>·</span>
            <span>{lang === "am" ? "ማጣቀሻ:" : "Ref:"}</span>
            <span className="font-mono text-cream-200">{refDisplay}</span>
          </div>
          {wp.chosen_numbers && wp.chosen_numbers.length > 0 && (
            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-cream-400">{lang === "am" ? "የተመረጡ ቁጥሮች:" : "Chosen Numbers:"}</span>
              {wp.chosen_numbers.map((n) => (
                <span key={n} className="pill bg-green-500/20 text-green-300 font-mono text-xs font-bold">
                  #{n}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn-ghost px-2.5 py-1 text-xs" onClick={onExpand}>
            {expanded ? "▲" : "▼"} {lang === "am" ? "ዝርዝር" : "Details"}
          </button>
          <button className="btn-primary px-3 py-1.5 text-xs font-bold" onClick={onConfirm}>
            ✓ {lang === "am" ? "አረጋግጥ" : "Confirm"}
          </button>
          <button className="btn-danger px-3 py-1.5 text-xs font-bold" onClick={onReject}>
            ✕ {lang === "am" ? "ሰርዝ" : "Reject"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 rounded-xl bg-ink-800 p-4 text-sm space-y-2.5">
          {!hasDetails ? (
            <p className="text-cream-400 text-xs italic">
              {lang === "am"
                ? "ዝርዝር መረጃ አልተቀመጠም። ከዚህ ቀደም የቀረበ ክፍያ ሊሆን ይችላል።"
                : "No detail info saved. This may be an older submission. Check your Telebirr/bank directly."}
            </p>
          ) : (
            <>
              <Row label={lang === "am" ? "ማጣቀሻ" : "Reference"} value={refDisplay} />
              {wp.chosen_numbers && wp.chosen_numbers.length > 0 && (
                <Row
                  label={lang === "am" ? "የተመረጡ ቁጥሮች" : "Chosen Numbers"}
                  value={wp.chosen_numbers.map((n) => `#${n}`).join(", ")}
                />
              )}
              <Row label={lang === "am" ? "ላኪ" : "Sender"} value={wp.sender_name} />
              <Row label={lang === "am" ? "ስልክ" : "Phone"} value={wp.phone} />
              <Row label={lang === "am" ? "መልዕክት" : "Message"} value={wp.message} />
              <Row label={lang === "am" ? "የቀረበ" : "Submitted"}
                value={wp.submitted_at ? new Date(wp.submitted_at).toLocaleString() : "—"} />
              {wp.screenshot_url && (
                <div className="pt-2">
                  <p className="text-cream-400 text-xs font-semibold mb-2">{lang === "am" ? "የክፍያ ማረጋገጫ ስክሪንሾት:" : "Payment Proof Screenshot:"}</p>
                  <a href={mediaUrl(wp.screenshot_url)} target="_blank" rel="noreferrer" className="inline-block w-full">
                    <img src={mediaUrl(wp.screenshot_url)} alt="proof"
                      className="max-h-72 w-full rounded-xl object-contain border border-ink-600 bg-ink-900/60 hover:opacity-90 transition" />
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex flex-wrap sm:flex-nowrap justify-between gap-2 py-1 border-b border-ink-700/50 last:border-0">
      <span className="text-cream-400 text-xs sm:text-sm">{label}</span>
      <span className="font-mono text-cream-100 text-xs sm:text-sm break-all font-semibold">{value || "—"}</span>
    </div>
  );
}
