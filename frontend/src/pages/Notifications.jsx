import { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { useLang } from "../context/LangContext";

export default function Notifications() {
  const { lang } = useLang();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

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

  async function markAllRead() {
    const unread = notifications.filter((n) => !n.is_read);
    for (const n of unread) {
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
            {lang === "am" ? "ሁሉንም እንደ ተነቢቷ ምልክት አድርግ" : "Mark all as read"}
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
        <div className="space-y-3">
          {notifications.map((n) => (
            <div key={n.id}
              className={`card p-5 transition ${!n.is_read ? "border-green-500/40 bg-green-500/5" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-cream-50">{n.subject}</span>
                    {!n.is_read && (
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
                {!n.is_read && (
                  <button
                    className="btn-ghost px-2 py-1 text-xs shrink-0"
                    onClick={() => markRead(n.id)}
                  >
                    {lang === "am" ? "ተነቢቷል" : "Mark read"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
