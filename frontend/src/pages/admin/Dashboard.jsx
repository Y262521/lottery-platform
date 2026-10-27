import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../api/client";
import { useLang } from "../../context/LangContext";

export default function AdminDashboard() {
  const { t } = useLang();
  const [metrics, setMetrics] = useState(null);

  useEffect(() => { apiClient.metrics().then(setMetrics).catch(() => {}); }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-cream-50">{t("adminTitle")}</h1>
        <Link to="/admin/lotteries/new" className="btn-primary">{t("newLottery")}</Link>
      </div>

      {metrics && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Metric label={t("revenue")} value={metrics.total_revenue.toLocaleString()} />
          <Metric label={t("ticketsSold")} value={metrics.tickets_sold} />
          <Metric label={t("winningTickets")} value={metrics.winning_tickets} />
          <Metric label={t("activeLotteries")} value={metrics.active_lotteries} />
          <Metric label={t("users")} value={metrics.total_users} />
          <Metric label={t("pendingPayments")} value={metrics.pending_payments} highlight={metrics.pending_payments > 0} />
        </div>
      )}

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <NavCard to="/admin/lotteries" icon="🎟️" title={t("lotteries")} desc={t("manageDesc")} />
        <NavCard to="/admin/transactions" icon="💰" title={t("transactions")} desc={t("transactionsDesc")} />
        <NavCard to="/admin/users" icon="👥" title={t("users")} desc={t("usersDesc")} />
      </div>
    </div>
  );
}

function Metric({ label, value, highlight }) {
  return (
    <div className={`card p-4 ${highlight ? "border-green-500/50" : ""}`}>
      <div className="text-xs uppercase tracking-wider text-cream-400">{label}</div>
      <div className={`mt-1 font-mono text-2xl font-bold ${highlight ? "text-green-300" : "text-cream-50"}`}>{value}</div>
    </div>
  );
}

function NavCard({ to, icon, title, desc }) {
  return (
    <Link to={to} className="card p-6 hover:border-green-500/50 transition">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="font-bold text-cream-50">{title}</h3>
      <p className="mt-1 text-sm text-cream-300">{desc}</p>
    </Link>
  );
}
