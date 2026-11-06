import { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { useLang } from "../context/LangContext";

export default function Referrals() {
  const { lang } = useLang();
  const [stats, setStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiClient.myReferralStats().then(setStats).catch(() => {});
    apiClient.myNotifications().then(setNotifications).catch(() => {});
  }, []);

  const baseUrl = window.location.origin;
  const refLink = stats?.referral_code
    ? `${baseUrl}/register?ref=${stats.referral_code}` : null;

  function copy() {
    if (!refLink) return;
    navigator.clipboard?.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function markRead(id) {
    try {
      await apiClient.markNotificationRead(id);
      setNotifications((p) => p.map((n) => n.id === id ? { ...n, is_read: true } : n));
    } catch { /* ignore */ }
  }

  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-cream-50 mb-6">
        {lang === "am" ? "ሪፈራል ፕሮግራም" : "Referral Program"}
      </h1>

      {/* Invite link */}
      <div className="card p-5 mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-cream-300 mb-3">
      {lang === "am" ? "የጋበዝ ሊንክ" : "Invitation Link"}
        </h2>
        {refLink ? (
          <>
            <div className="flex items-center gap-2">
              <input readOnly value={refLink}
                className="input flex-1 font-mono text-xs text-green-300" />
              <button className="btn-primary px-4 py-2.5 shrink-0" onClick={copy}>
                {copied ? "✓" : (lang === "am" ? "ቅዳ" : "Copy")}
              </button>
            </div>
            <p className="mt-2 text-xs text-cream-400">
              {lang === "am" ? "ኮድ: " : "Code: "}{stats.referral_code}
            </p>
          </>
        ) : (
          <p className="text-cream-400 text-sm">Loading…</p>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="card p-4 text-center">
            <div className="text-xs uppercase tracking-wider text-cream-400 mb-1">
              {lang === "am" ? "ጠቅላላ ጋበዙ" : "Total Invited"}
            </div>
            <div className="font-mono text-3xl font-bold text-cream-50">{stats.total_referrals}</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-xs uppercase tracking-wider text-cream-400 mb-1">
              {lang === "am" ? "ቲኬት የገዙ" : "Bought Ticket"}
            </div>
            <div className={`font-mono text-3xl font-bold ${stats.qualified_referrals >= stats.reward_threshold ? "text-yellow-300" : "text-green-300"}`}>
              {stats.qualified_referrals}
              {stats.qualified_referrals >= stats.reward_threshold && " 🔔"}
            </div>
          </div>
        </div>
      )}

      {stats && stats.qualified_referrals >= stats.reward_threshold && (
        <div className="mb-6 rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4 text-center">
          <p className="text-yellow-300 font-semibold">
            {lang === "am"
              ? "🎉 እንኳን ደስ አለዎት! ሽልማት ይጠብቁ — አስተዳዳሪ ቶሎ ያናግርዎታል።"
              : "🎉 Congratulations! You qualify for a reward. Admin will contact you soon."}
          </p>
        </div>
      )}

      {/* Notifications */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-cream-300 mb-3 flex items-center gap-2">
          {lang === "am" ? "ከአስተዳዳሪ መልዕክቶች" : "Messages from Admin"}
          {unread > 0 && (
            <span className="rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-bold text-ink-900">
              {unread}
            </span>
          )}
        </h2>
        {notifications.length === 0 ? (
          <div className="card p-6 text-center text-cream-400 text-sm">
            {lang === "am" ? "መልዕክት የለም" : "No messages yet"}
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div key={n.id} className={`card p-4 ${!n.is_read ? "border-green-500/40" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-cream-50">{n.subject}</span>
                      {!n.is_read && (
                        <span className="pill bg-green-500/15 text-green-300 text-[10px]">
                          {lang === "am" ? "አዲስ" : "New"}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-cream-300 whitespace-pre-line">{n.message}</p>
                    <p className="mt-2 text-xs text-cream-500">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!n.is_read && (
                    <button className="btn-ghost px-2 py-1 text-xs shrink-0"
                      onClick={() => markRead(n.id)}>
                      {lang === "am" ? "ተነቢቷል" : "Mark read"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
