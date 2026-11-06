import { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { useLang } from "../context/LangContext";

export default function Notifications() {
  const { lang } = useLang();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replying, setReplying] = useState(null); // id being replied to

  useEffect(() => {
    apiClient.myNotifications()
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function markRead(id) {
    try {
      await apiClient.markNotificationRead(id);
      setNotifications((p) => p.map((n) => n.id === id ? { ...n, is_read: true } : n));
    } catch { /* ignore */ }
  }

  async function sendReply(id, reply) {
    setReplying(id);
    try {
      await apiClient.replyToNotification(id, reply);
      setNotifications((p) => p.map((n) =>
        n.id === id ? { ...n, user_reply: reply, is_read: true } : n
      ));
    } catch { /* ignore */ }
    finally { setReplying(null); }
  }

  async function markAllRead() {
    for (const n of notifications.filter((n) => !n.is_read)) {
      await markRead(n.id);
    }
  }

  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-cream-50">
            {lang === "am" ? "ከአስተዳዳሪ መልዕክቶች" : "Notifications"}
          </h1>
          {unread > 0 && (
            <p className="text-sm text-cream-400 mt-1">
              {unread} {lang === "am" ? "ያልተነበቡ" : "unread"}
            </p>
          )}
        </div>
        {unread > 0 && (
          <button className="btn-ghost text-xs px-3 py-1.5" onClick={markAllRead}>
            {lang === "am" ? "ሁሉንም አንብብ" : "Mark all as read"}
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-cream-300">{lang === "am" ? "በመጫን ላይ…" : "Loading…"}</p>
      ) : notifications.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-5xl mb-4">🔔</div>
          <p className="text-cream-400">
            {lang === "am" ? "መልዕክት የለም" : "No messages yet"}
          </p>
          <p className="text-xs text-cream-500 mt-2">
            {lang === "am"
              ? "አስተዳዳሪ ሽልማት ሲልኩ እዚህ ይታያሉ"
              : "Admin reward messages will appear here"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((n) => (
            <div key={n.id}
              className={`card p-5 transition ${!n.is_read ? "border-green-500/40 bg-green-500/5" : ""}`}>

              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-cream-50">{n.subject}</span>
                    {!n.is_read && !n.user_reply && (
                      <span className="pill bg-green-500/15 text-green-300 text-[10px]">
                        {lang === "am" ? "አዲስ" : "New"}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-cream-300 whitespace-pre-line leading-relaxed">
                    {n.message}
                  </p>
                  <p className="mt-3 text-xs text-cream-500">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
                {!n.is_read && !n.reply_options && (
                  <button className="btn-ghost px-2 py-1 text-xs shrink-0" onClick={() => markRead(n.id)}>
                    {lang === "am" ? "ተነቢቷል" : "Mark read"}
                  </button>
                )}
              </div>

              {/* Reply buttons — shown only when reply_options exist and user hasn't replied yet */}
              {n.reply_options && !n.user_reply && (
                <div className="mt-4 border-t border-ink-600 pt-4">
                  <p className="text-xs text-cream-400 mb-3">
                    {lang === "am" ? "መልስዎን ይምረጡ:" : "Choose your answer:"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {n.reply_options.map((opt) => (
                      <button
                        key={opt}
                        disabled={replying === n.id}
                        onClick={() => sendReply(n.id, opt)}
                        className="rounded-xl border border-ink-600 bg-ink-700 px-5 py-2.5 text-sm font-semibold text-cream-100 hover:border-green-500 hover:bg-green-500/15 hover:text-green-300 transition disabled:opacity-50"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Show reply if already replied */}
              {n.user_reply && (
                <div className="mt-4 border-t border-ink-600 pt-3 flex items-center gap-2">
                  <span className="text-xs text-cream-400">
                    {lang === "am" ? "መልስዎ:" : "Your answer:"}
                  </span>
                  <span className="pill bg-green-500/15 text-green-300 font-semibold">
                    {n.user_reply}
                  </span>
                  <span className="text-xs text-cream-500">
                    {n.replied_at ? new Date(n.replied_at).toLocaleString() : ""}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
