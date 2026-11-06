import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../api/client";
import { useLang } from "../../context/LangContext";

export default function AdminReferrals() {
  const { lang } = useLang();
  const [leaderboard, setLeaderboard] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  // Send notification modal state
  const [modal, setModal] = useState(null); // { user_id, full_name }
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [lb, al] = await Promise.all([
        apiClient.referralLeaderboard(),
        apiClient.referralAlerts(),
      ]);
      setLeaderboard(lb);
      setAlerts(al.users || []);
    } catch (e) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openModal(user) {
    setModal(user);
    setSubject(lang === "am"
      ? "🎉 ሽልማት — ቲኬት ወይም ገንዘብ ይቀበሉ!"
      : "🎉 Reward — Claim your prize!");
    setMessage(lang === "am"
      ? `ሰላም ${user.full_name}!\n\n${user.qualified_referrals} ሰዎችን ወደ ዮናስ እና ሮቤል ኦንላይን እጣ ጋብዘዋል። እንኳን ደስ አለዎት!\n\nሽልማትዎን ለመቀበል ያናግሩን።`
      : `Hello ${user.full_name}!\n\nYou have successfully referred ${user.qualified_referrals} users. Congratulations!\n\nPlease contact us to claim your reward.`
    );
  }

  async function sendNotification(e) {
    e.preventDefault();
    if (!modal) return;
    setSending(true);
    try {
      await apiClient.sendRewardNotification({
        user_id: modal.user_id,
        subject,
        message,
      });
      setMsg(lang === "am" ? "መልዕክት ተልኳል ✓" : "Notification sent ✓");
      setModal(null);
      await load();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold text-cream-50 mb-2">
        {lang === "am" ? "ሪፈራል ሪፖርት" : "Referral Report"}
      </h1>
      <p className="text-sm text-cream-300 mb-6">
        {lang === "am"
          ? "5 ወይም ከዚያ በላይ ሰዎችን ጋብዘው ቲኬት ለገዙ ሰዎች ሽልማት ይላኩ"
          : "Send reward messages to users who invited 5+ people who bought tickets"}
      </p>

      {msg && (
        <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/30 px-3 py-2 text-sm text-green-300">
          {msg}
        </div>
      )}

      {/* Alert banner */}
      {alerts.length > 0 && (
        <div className="mb-6 rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🔔</span>
            <span className="font-semibold text-yellow-300">
              {lang === "am"
                ? `${alerts.length} ተጠቃሚ ሽልማት ይገባቸዋል!`
                : `${alerts.length} user${alerts.length > 1 ? "s" : ""} deserve a reward!`}
            </span>
          </div>
          <div className="space-y-2">
            {alerts.map((u) => (
              <div key={u.user_id}
                className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg bg-ink-800 px-4 py-3 gap-2">
                <div>
                  <span className="font-semibold text-cream-50">{u.full_name}</span>
                  <span className="ml-2 text-sm text-cream-400">{u.phone}</span>
                  <span className="ml-2 pill bg-yellow-500/15 text-yellow-300">
                    {u.qualified_referrals} {lang === "am" ? "ሰዎች" : "referrals"}
                  </span>
                  {/* Reward account */}
                  {u.reward_account && (u.reward_account.telebirr_phone || u.reward_account.bank_account) && (
                    <div className="mt-1 text-xs text-cream-400">
                      {u.reward_account.telebirr_phone && <span>📱 {u.reward_account.telebirr_phone}</span>}
                      {u.reward_account.bank_account && <span className="ml-3">🏦 {u.reward_account.bank_name} — {u.reward_account.bank_account} ({u.reward_account.bank_holder})</span>}
                    </div>
                  )}
                </div>
                <button className="btn-primary px-3 py-1.5 text-xs shrink-0" onClick={() => openModal(u)}>
                  {lang === "am" ? "ሽልማት ላክ" : "Send Reward"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <h2 className="text-sm font-semibold uppercase tracking-wider text-cream-300 mb-3">
        {lang === "am" ? "ሁሉም ሪፈሮሎች" : "All Referrers"}
      </h2>

      {loading ? (
        <p className="text-cream-300">Loading…</p>
      ) : leaderboard.length === 0 ? (
        <div className="card p-8 text-center text-cream-400">
          {lang === "am" ? "ገና ሪፈራል የለም" : "No referrals yet"}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-ink-600">
          <table className="w-full text-left text-sm">
            <thead className="bg-ink-800 text-cream-400">
              <tr>
                <th className="px-4 py-3">{lang === "am" ? "ተጠቃሚ" : "User"}</th>
                <th className="px-4 py-3">{lang === "am" ? "ኮድ" : "Code"}</th>
                <th className="px-4 py-3">{lang === "am" ? "ጠቅላላ" : "Total"}</th>
                <th className="px-4 py-3">{lang === "am" ? "ቲኬት ገዙ" : "Bought ticket"}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700">
              {leaderboard.map((u) => (
                <tr key={u.user_id} className={`bg-ink-700/40 ${u.has_reward_alert ? "border-l-2 border-yellow-500" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="text-cream-100 font-medium">{u.full_name}</div>
                    <div className="text-xs text-cream-400">{u.phone}</div>
                    {/* Reward account */}
                    {u.reward_account && (u.reward_account.telebirr_phone || u.reward_account.bank_account) ? (
                      <div className="mt-1 text-xs text-green-300">
                        {u.reward_account.telebirr_phone && <span>📱 {u.reward_account.telebirr_phone} </span>}
                        {u.reward_account.bank_account && <span>🏦 {u.reward_account.bank_name} {u.reward_account.bank_account}</span>}
                      </div>
                    ) : (
                      <div className="mt-1 text-xs text-cream-500 italic">
                        {lang === "am" ? "አካዉንት አልተሞላም" : "No reward account set"}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-green-300">{u.referral_code || "—"}</td>
                  <td className="px-4 py-3 font-mono text-cream-200">{u.total_referrals}</td>
                  <td className="px-4 py-3">
                    <span className={`pill ${u.has_reward_alert ? "bg-yellow-500/15 text-yellow-300" : "bg-green-500/15 text-green-300"}`}>
                      {u.qualified_referrals}
                      {u.has_reward_alert && " 🔔"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="btn-primary px-2 py-1 text-xs"
                      onClick={() => openModal(u)}
                    >
                      {lang === "am" ? "ልክ" : "Notify"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Send notification modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/80 backdrop-blur-sm px-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-cream-50 mb-1">
              {lang === "am" ? "መልዕክት ላክ" : "Send Reward Notification"}
            </h2>
            <p className="text-sm text-cream-300 mb-4">
              {lang === "am" ? "ወደ" : "To:"} <span className="font-semibold text-green-300">{modal.full_name}</span>
            </p>
            <form onSubmit={sendNotification} className="space-y-3">
              {/* Reward type selector */}
              <div>
                <label className="label">{lang === "am" ? "የሽልማት አይነት" : "Reward Type"}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button"
                    onClick={() => {
                      setSubject(lang === "am" ? "🎟️ ነፃ ቲኬት ሽልማት" : "🎟️ Free Ticket Reward");
                      setMessage(lang === "am"
                        ? `ሰላም ${modal.full_name}!\n\nለሚቀጥለው ዕጣ 1 ነፃ ቲኬት አሸንፈዋል! ያናግሩን።`
                        : `Hello ${modal.full_name}!\n\nYou have won 1 free ticket for the next draw! Please contact us to claim.`);
                    }}
                    className="rounded-xl border border-ink-600 p-3 text-center text-sm text-cream-300 hover:border-green-500 hover:bg-green-500/10 transition">
                    🎟️ {lang === "am" ? "ነፃ ቲኬት" : "Free Ticket"}
                  </button>
                  <button type="button"
                    onClick={() => {
                      const acct = modal.reward_account || {};
                      const acctInfo = acct.telebirr_phone
                        ? `Telebirr: ${acct.telebirr_phone}`
                        : acct.bank_account
                          ? `${acct.bank_name} — ${acct.bank_account}`
                          : (lang === "am" ? "አካዉንት አልተሞላም" : "No account set");
                      setSubject(lang === "am" ? "💰 ገንዘብ ሽልማት" : "💰 Cash Reward");
                      setMessage(lang === "am"
                        ? `ሰላም ${modal.full_name}!\n\nሽልማትዎ ወደ አካዉንትዎ ተልኳል።\n${acctInfo}\n\nደህና ይሁኑ!`
                        : `Hello ${modal.full_name}!\n\nYour cash reward has been sent to your account.\n${acctInfo}\n\nThank you!`);
                    }}
                    className="rounded-xl border border-ink-600 p-3 text-center text-sm text-cream-300 hover:border-yellow-500 hover:bg-yellow-500/10 transition">
                    💰 {lang === "am" ? "ገንዘብ" : "Cash"}
                  </button>
                </div>
                {modal.reward_account && (modal.reward_account.telebirr_phone || modal.reward_account.bank_account) ? (
                  <div className="mt-2 rounded-lg bg-ink-800 px-3 py-2 text-xs text-green-300">
                    {lang === "am" ? "አካዉንት:" : "Account:"}{" "}
                    {modal.reward_account.telebirr_phone && <span>📱 {modal.reward_account.telebirr_phone} </span>}
                    {modal.reward_account.bank_account && <span>🏦 {modal.reward_account.bank_name} — {modal.reward_account.bank_account} ({modal.reward_account.bank_holder})</span>}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-yellow-300">
                    ⚠️ {lang === "am" ? "ተጠቃሚ አካዉንት አላስቀመጠም" : "User has not set a reward account yet"}
                  </p>
                )}
              </div>
              <div>
                <label className="label">{lang === "am" ? "ርዕስ" : "Subject"}</label>
                <input className="input" required value={subject}
                  onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div>
                <label className="label">{lang === "am" ? "መልዕክት" : "Message"}</label>
                <textarea className="input min-h-[120px]" required value={message}
                  onChange={(e) => setMessage(e.target.value)} />
              </div>
              <div className="flex gap-3 pt-2">
                <button className="btn-primary flex-1" disabled={sending}>
                  {sending
                    ? (lang === "am" ? "በመላክ ላይ…" : "Sending…")
                    : (lang === "am" ? "ላክ" : "Send")}
                </button>
                <button type="button" className="btn-ghost" onClick={() => setModal(null)}>
                  {lang === "am" ? "ሰርዝ" : "Cancel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
