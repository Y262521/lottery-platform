import { useEffect, useState } from "react";
import { apiClient, mediaUrl } from "../../api/client";
import { useLang } from "../../context/LangContext";

const STATUS_COLOR = {
  SUCCESS:  "bg-green-500/15 text-green-300 border border-green-500/30",
  PENDING:  "bg-yellow-500/15 text-yellow-300 border border-yellow-500/30",
  FAILED:   "bg-red-500/10 text-red-400 border border-red-500/30",
  REFUNDED: "bg-ink-700 text-cream-400 border border-ink-600",
};

export default function AdminTransactions() {
  const { t, lang } = useLang();
  const [txns, setTxns] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [msg, setMsg] = useState("");
  const [expanded, setExpanded] = useState("all-pending");

  const load = () => apiClient.allTransactions().then(setTxns).catch(() => {});
  useEffect(() => { load(); }, []);

  async function confirm(id) {
    try {
      await apiClient.confirmPayment(id);
      setMsg(lang === "am" ? "ክፍያው ተረጋግጧል ✓" : "Payment confirmed successfully ✓");
      if (selectedTxn?.id === id) setSelectedTxn(null);
      load();
    } catch (e) {
      setMsg(e.message);
    }
  }

  async function reject(id) {
    if (!window.confirm(lang === "am" ? "ይህን ክፍያ ይሰርዙ?" : "Reject this payment?")) return;
    try {
      await apiClient.rejectPayment(id);
      setMsg(lang === "am" ? "ክፍያው ተሰርዟል" : "Payment rejected");
      if (selectedTxn?.id === id) setSelectedTxn(null);
      load();
    } catch (e) {
      setMsg(e.message);
    }
  }

  const pending = txns.filter((t) => t.status === "PENDING");
  const successCount = txns.filter((t) => t.status === "SUCCESS").length;
  const failedCount = txns.filter((t) => t.status === "FAILED").length;

  const q = search.trim().toLowerCase();
  const filteredTxns = txns.filter((tx) => {
    if (statusFilter !== "ALL" && tx.status !== statusFilter) return false;
    if (!q) return true;
    const idStr = String(tx.id);
    const userName = (tx.user_name || "").toLowerCase();
    const userPhone = (tx.user_phone || "").toLowerCase();
    const userEmail = (tx.user_email || "").toLowerCase();
    const drawTitle = (tx.lottery_title || "").toLowerCase();
    const ref = (tx.gateway_ref || tx.webhook_payload?.payment_reference || "").toLowerCase();
    const chosen = (tx.chosen_numbers || []).map(String).join(" ");
    const tickets = (tx.tickets || []).map((tk) => tk.ticket_no).join(" ").toLowerCase();
    return (
      idStr.includes(q) ||
      userName.includes(q) ||
      userPhone.includes(q) ||
      userEmail.includes(q) ||
      drawTitle.includes(q) ||
      ref.includes(q) ||
      chosen.includes(q) ||
      tickets.includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-cream-50">{t("transactions")}</h1>
          <p className="text-sm text-cream-300 mt-1">
            {lang === "am"
              ? "የተጠቃሚዎችን ክፍያ ያረጋግጡ እና የመረጧቸውን ቁጥሮች ዝርዝር ይመልከቱ"
              : "Review payments and view user-selected draw numbers"}
          </p>
        </div>
        <button
          onClick={load}
          className="btn-ghost text-xs self-start sm:self-auto flex items-center gap-1.5"
          title="Refresh transactions"
        >
          🔄 {lang === "am" ? "አድስ" : "Refresh"}
        </button>
      </div>

      {msg && (
        <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/30 px-3 py-2 text-sm text-green-300">
          {msg}
        </div>
      )}

      {/* Pending payments alert section */}
      {pending.length > 0 && statusFilter === "ALL" && (
        <div className="mb-8 bg-yellow-500/5 p-4 rounded-xl border border-yellow-500/20">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-yellow-300 mb-3 flex items-center gap-2">
            <span>⏳</span>
            <span>
              {lang === "am"
                ? `${pending.length} ያልተረጋገጠ ክፍያ ማረጋገጫ ያስፈልጋል`
                : `${pending.length} Pending Payment${pending.length > 1 ? "s" : ""} awaiting review`}
            </span>
          </h2>
          <div className="space-y-3">
            {pending.map((tx) => (
              <PendingCard
                key={tx.id}
                tx={tx}
                lang={lang}
                t={t}
                expanded={expanded === tx.id || expanded === "all-pending"}
                onExpand={() => setExpanded(expanded === tx.id ? null : tx.id)}
                onConfirm={() => confirm(tx.id)}
                onReject={() => reject(tx.id)}
                onViewDetails={() => setSelectedTxn(tx)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="mb-6 space-y-3 bg-ink-800/60 p-4 rounded-xl border border-ink-600">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-cream-400 pointer-events-none">
              🔍
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchTransactions")}
              className="input pl-9 pr-8 py-2 text-sm w-full"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-cream-400 hover:text-cream-200"
                title={t("clearSearch")}
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "ALL", label: t("tabAllTxns"), count: txns.length },
              { id: "PENDING", label: t("tabPendingTxns"), count: pending.length },
              { id: "SUCCESS", label: t("tabConfirmedTxns"), count: successCount },
              { id: "FAILED", label: t("tabRejectedTxns"), count: failedCount },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? "bg-green-600 text-ink-950 shadow-sm"
                    : "bg-ink-800 text-cream-300 hover:bg-ink-700 hover:text-cream-100 border border-ink-600"
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[11px] ${
                  statusFilter === tab.id ? "bg-ink-950/20 text-ink-950 font-bold" : "bg-ink-700 text-cream-400"
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-cream-400 px-1 pt-1">
          <span>
            {lang === "am" ? "የተገኙ ግብይቶች:" : "Found:"}{" "}
            <strong className="text-green-300 font-bold">{filteredTxns.length}</strong> / {txns.length}
          </span>
          {(search || statusFilter !== "ALL") && (
            <button
              onClick={() => { setSearch(""); setStatusFilter("ALL"); }}
              className="text-xs text-green-400 hover:underline font-medium"
            >
              ✕ {t("clearSearch")}
            </button>
          )}
        </div>
      </div>

      {/* Main Transactions Table */}
      <div className="overflow-x-auto rounded-xl border border-ink-600">
        <table className="w-full text-left text-sm min-w-[760px]">
          <thead className="bg-ink-800 text-cream-400">
            <tr>
              <th className="px-4 py-3">{t("txnId")}</th>
              <th className="px-4 py-3">{lang === "am" ? "ተጠቃሚ" : "User"}</th>
              <th className="px-4 py-3">{lang === "am" ? "እጣ" : "Draw"}</th>
              <th className="px-4 py-3">{t("txnAmount")}</th>
              <th className="px-4 py-3">{lang === "am" ? "የተመረጡ ቁጥሮች" : "Chosen Numbers"}</th>
              <th className="px-4 py-3">{lang === "am" ? "ዘዴ" : "Method"}</th>
              <th className="px-4 py-3">{t("txnStatus")}</th>
              <th className="px-4 py-3">{t("txnDate")}</th>
              <th className="px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-700">
            {filteredTxns.map((tx) => {
              const wp = tx.webhook_payload || {};
              const numbers = tx.chosen_numbers || [];
              return (
                <tr key={tx.id} className="bg-ink-700/40 hover:bg-ink-700/70 transition">
                  <td className="px-4 py-3 font-mono text-cream-400 font-semibold">
                    #{tx.id}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-cream-100 font-medium">
                      {tx.user_name || wp.sender_name || "—"}
                    </div>
                    <div className="text-xs text-cream-400 font-mono">
                      {tx.user_phone || wp.phone || (tx.user_email || `User #${tx.user_id}`)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-cream-200 font-medium line-clamp-1 max-w-[160px]">
                      {tx.lottery_title}
                    </div>
                    <div className="text-xs text-cream-400 font-mono">
                      Draw #{tx.lottery_id} · {tx.tickets_count} ticket(s)
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-green-300 font-bold">
                    ETB {tx.amount}
                  </td>
                  <td className="px-4 py-3">
                    {numbers.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {numbers.map((n) => (
                          <span
                            key={n}
                            className="pill bg-green-500/20 text-green-300 font-mono text-xs font-bold"
                          >
                            #{n}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-cream-400 italic">
                        {lang === "am" ? "አውቶማቲክ" : "Auto-assigned"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-cream-200 text-xs font-medium">
                      {wp.provider || wp.bank_or_wallet || tx.gateway}
                    </div>
                    <div className="text-[11px] text-cream-400 font-mono truncate max-w-[130px]" title={tx.gateway_ref || wp.payment_reference}>
                      {wp.payment_reference || tx.gateway_ref || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`pill ${STATUS_COLOR[tx.status] || "bg-ink-700 text-cream-400"}`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-cream-400 text-xs">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      <button
                        className="btn-ghost px-2.5 py-1 text-xs text-cream-200 hover:text-green-300 flex items-center gap-1"
                        onClick={() => setSelectedTxn(tx)}
                        title="View complete transaction details"
                      >
                        👁️ {t("viewDetails")}
                      </button>
                      {tx.status === "PENDING" && (
                        <>
                          <button
                            className="btn-primary px-2.5 py-1 text-xs font-bold"
                            onClick={() => confirm(tx.id)}
                            title="Confirm payment"
                          >
                            ✓
                          </button>
                          <button
                            className="btn-danger px-2.5 py-1 text-xs font-bold"
                            onClick={() => reject(tx.id)}
                            title="Reject payment"
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredTxns.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-cream-400">
                  <div className="text-3xl mb-2">🔍</div>
                  <p className="text-sm font-medium">{t("noTransactionsFound")}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Transaction Details Modal */}
      {selectedTxn && (
        <TransactionDetailsModal
          tx={selectedTxn}
          lang={lang}
          t={t}
          onClose={() => setSelectedTxn(null)}
          onConfirm={() => confirm(selectedTxn.id)}
          onReject={() => reject(selectedTxn.id)}
        />
      )}
    </div>
  );
}

function PendingCard({ tx, lang, onExpand, expanded, onConfirm, onReject, onViewDetails }) {
  const wp = tx.webhook_payload || {};
  const hasDetails = tx.webhook_payload && Object.keys(tx.webhook_payload).length > 0;
  const refDisplay = wp.payment_reference || tx.gateway_ref || (lang === "am" ? "አልተሰጠም (አማራጭ)" : "None (optional)");
  const numbers = tx.chosen_numbers || [];

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
          <div className="mt-1 text-sm text-cream-100 font-semibold">
            👤 {tx.user_name || wp.sender_name || "—"}{" "}
            <span className="text-xs text-cream-400 font-mono font-normal">
              ({tx.user_phone || wp.phone || `User #${tx.user_id}`})
            </span>
          </div>
          <div className="mt-1 text-xs text-cream-400 flex items-center gap-1.5 flex-wrap">
            <span>{tx.lottery_title || `Draw #${tx.lottery_id}`}</span>
            <span>·</span>
            <span>{tx.tickets_count} {lang === "am" ? "ቲኬቶች" : "ticket(s)"}</span>
            <span>·</span>
            <span>{lang === "am" ? "ማጣቀሻ:" : "Ref:"}</span>
            <span className="font-mono text-cream-200">{refDisplay}</span>
          </div>
          {numbers.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-cream-300">
                {lang === "am" ? "የተመረጡ ቁጥሮች:" : "Selected Numbers:"}
              </span>
              {numbers.map((n) => (
                <span key={n} className="pill bg-green-500/20 text-green-300 font-mono text-xs font-bold">
                  #{n}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <button className="btn-ghost px-2.5 py-1 text-xs" onClick={onViewDetails}>
            👁️ {lang === "am" ? "ሙሉ ዝርዝር" : "Full Details"}
          </button>
          <button className="btn-ghost px-2.5 py-1 text-xs" onClick={onExpand}>
            {expanded ? "▲" : "▼"}
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
        <div className="mt-4 rounded-xl bg-ink-800 p-4 text-sm space-y-2.5 border border-ink-700">
          {!hasDetails ? (
            <p className="text-cream-400 text-xs italic">
              {lang === "am"
                ? "ዝርዝር መረጃ አልተቀመጠም። ከዚህ ቀደም የቀረበ ክፍያ ሊሆን ይችላል።"
                : "No detail info saved."}
            </p>
          ) : (
            <>
              <Row label={lang === "am" ? "ማጣቀሻ" : "Reference"} value={refDisplay} />
              {numbers.length > 0 && (
                <Row
                  label={lang === "am" ? "የተመረጡ ቁጥሮች" : "Chosen Numbers"}
                  value={numbers.map((n) => `#${n}`).join(", ")}
                />
              )}
              <Row label={lang === "am" ? "ላኪ ስም" : "Sender Name"} value={wp.sender_name || tx.user_name} />
              <Row label={lang === "am" ? "ስልክ" : "Phone"} value={wp.phone || tx.user_phone} />
              <Row label={lang === "am" ? "መልዕክት" : "Message"} value={wp.message} />
              <Row label={lang === "am" ? "የቀረበ" : "Submitted"}
                value={wp.submitted_at ? new Date(wp.submitted_at).toLocaleString() : "—"} />
              {wp.screenshot_url && (
                <div className="pt-2">
                  <p className="text-cream-400 text-xs font-semibold mb-2">
                    {lang === "am" ? "የክፍያ ማረጋገጫ ስክሪንሾት:" : "Payment Proof Screenshot:"}
                  </p>
                  <a href={mediaUrl(wp.screenshot_url)} target="_blank" rel="noreferrer" className="inline-block w-full">
                    <img
                      src={mediaUrl(wp.screenshot_url)}
                      alt="proof"
                      className="max-h-72 w-full rounded-xl object-contain border border-ink-600 bg-ink-900/60 hover:opacity-90 transition"
                    />
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

function TransactionDetailsModal({ tx, lang, t, onClose, onConfirm, onReject }) {
  const wp = tx.webhook_payload || {};
  const numbers = tx.chosen_numbers || [];
  const tickets = tx.tickets || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
      <div className="card w-full max-w-2xl p-6 border-ink-500 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 border-b border-ink-700 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-cream-50 font-mono">
                Transaction #{tx.id}
              </h2>
              <span className={`pill ${STATUS_COLOR[tx.status] || "bg-ink-700 text-cream-400"}`}>
                {tx.status}
              </span>
            </div>
            <p className="text-xs text-cream-400 mt-1">
              {new Date(tx.created_at).toLocaleString()}
              {tx.verified_at && ` · Approved: ${new Date(tx.verified_at).toLocaleString()}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-cream-400 hover:text-cream-100 p-1 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5">
          {/* USER INFO */}
          <div className="bg-ink-800/80 p-4 rounded-xl border border-ink-700">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-green-300 mb-2">
              👤 {lang === "am" ? "የተጠቃሚ መረጃ" : "User Information"}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-cream-400 block">{lang === "am" ? "ሙሉ ስም:" : "Full Name:"}</span>
                <span className="text-cream-100 font-bold text-sm">{tx.user_name || wp.sender_name || "—"}</span>
              </div>
              <div>
                <span className="text-cream-400 block">{lang === "am" ? "ስልክ ቁጥር:" : "Phone:"}</span>
                <span className="text-cream-100 font-mono font-semibold text-sm">{tx.user_phone || wp.phone || "—"}</span>
              </div>
              <div>
                <span className="text-cream-400 block">Email:</span>
                <span className="text-cream-200 font-mono">{tx.user_email || "—"}</span>
              </div>
              <div>
                <span className="text-cream-400 block">{lang === "am" ? "የተጠቃሚ መለያ:" : "User ID:"}</span>
                <span className="text-cream-300 font-mono">#{tx.user_id}</span>
              </div>
            </div>
          </div>

          {/* CHOSEN NUMBERS */}
          <div className="bg-ink-800/80 p-4 rounded-xl border border-ink-700">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-green-300">
                🎯 {lang === "am" ? "የተመረጡ የዕጣ ቁጥሮች" : "Selected Draw Numbers"} ({numbers.length})
              </h3>
              <span className="text-xs text-cream-400">
                {tx.tickets_count} {lang === "am" ? "ቲኬቶች" : "tickets"}
              </span>
            </div>
            {numbers.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {numbers.map((n) => (
                  <span
                    key={n}
                    className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/40 text-green-300 font-mono text-sm font-bold shadow-sm"
                  >
                    Number #{n}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-cream-400 italic">
                {lang === "am" ? "ምንም ቁጥር አልተመረጠም (አውቶማቲክ የተሰጠ)።" : "No specific numbers chosen (auto-assigned)."}
              </p>
            )}

            {/* Issued tickets after approval */}
            {tickets.length > 0 && (
              <div className="mt-4 pt-3 border-t border-ink-700">
                <h4 className="text-xs font-semibold text-cream-300 mb-2">
                  🎟️ {lang === "am" ? "የተሰጡ ቲኬቶች ዝርዝር:" : "Confirmed Ticket Numbers:"}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {tickets.map((tk, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-ink-900 border border-ink-700">
                      <span className="font-mono text-cream-200 font-semibold">{tk.ticket_no}</span>
                      {tk.chosen_number !== null && tk.chosen_number !== undefined && (
                        <span className="pill bg-green-500/20 text-green-300 font-mono text-xs font-bold">
                          #{tk.chosen_number}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* PAYMENT DETAILS */}
          <div className="bg-ink-800/80 p-4 rounded-xl border border-ink-700 text-xs space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-green-300 mb-2">
              💳 {lang === "am" ? "የክፍያ ዝርዝር" : "Payment Information"}
            </h3>
            <Row label={lang === "am" ? "እጣ" : "Draw"} value={`${tx.lottery_title} (ID #${tx.lottery_id})`} />
            <Row label={lang === "am" ? "መጠን" : "Amount"} value={`ETB ${tx.amount}`} />
            <Row label={lang === "am" ? "ዘዴ" : "Payment Method"} value={wp.provider || wp.bank_or_wallet || tx.gateway} />
            <Row label={lang === "am" ? "የግብይት ማጣቀሻ" : "Payment Reference"} value={wp.payment_reference || tx.gateway_ref || "None"} />
            {wp.message && <Row label={lang === "am" ? "መልዕክት" : "User Note"} value={wp.message} />}
          </div>

          {/* SCREENSHOT PROOF */}
          {wp.screenshot_url && (
            <div className="bg-ink-800/80 p-4 rounded-xl border border-ink-700">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-green-300 mb-2">
                📸 {lang === "am" ? "የክፍያ ማረጋገጫ ስክሪንሾት" : "Payment Screenshot Proof"}
              </h3>
              <a
                href={mediaUrl(wp.screenshot_url)}
                target="_blank"
                rel="noreferrer"
                className="block text-center hover:opacity-90 transition"
              >
                <img
                  src={mediaUrl(wp.screenshot_url)}
                  alt="Proof"
                  className="max-h-80 mx-auto rounded-xl object-contain border border-ink-600 bg-ink-900"
                />
                <span className="text-[11px] text-green-400 mt-1 inline-block hover:underline">
                  🔍 {lang === "am" ? "ሙሉ ምስል ክፈት ↗" : "View full size image ↗"}
                </span>
              </a>
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-ink-700 flex flex-wrap items-center justify-between gap-3">
          <button type="button" className="btn-ghost text-xs" onClick={onClose}>
            {t("cancel")}
          </button>
          {tx.status === "PENDING" && (
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-danger text-xs px-3 py-1.5 font-bold"
                onClick={onReject}
              >
                ✕ {lang === "am" ? "ሰርዝ" : "Reject"}
              </button>
              <button
                type="button"
                className="btn-primary text-xs px-4 py-1.5 font-bold"
                onClick={onConfirm}
              >
                ✓ {lang === "am" ? "ክፍያ አረጋግጥ" : "Confirm Payment"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex flex-wrap sm:flex-nowrap justify-between gap-2 py-1 border-b border-ink-700/50 last:border-0">
      <span className="text-cream-400 text-xs">{label}</span>
      <span className="font-mono text-cream-100 text-xs break-all font-semibold">{value || "—"}</span>
    </div>
  );
}
