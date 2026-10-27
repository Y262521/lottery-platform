import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";
import { useLang } from "../context/LangContext";

// Map ticket status → style
const TICKET_STYLE = {
  CONFIRMED:       { pill: "bg-green-500/15 text-green-300",  icon: "✓" },
  WON:             { pill: "bg-green-600 text-ink-900",       icon: "🏆" },
  LOST:            { pill: "bg-ink-700 text-cream-400",       icon: "✗" },
  PENDING_PAYMENT: { pill: "bg-yellow-500/15 text-yellow-300",icon: "⏳" },
  CANCELLED:       { pill: "bg-red-500/10 text-red-400",      icon: "✗" },
};

// Map payment status → style + label key
const PMT_STYLE = {
  PENDING: {
    bar:  "border-yellow-500/40 bg-yellow-500/10",
    text: "text-yellow-300",
    key:  "paymentInProgress",
    icon: "⏳",
  },
  SUCCESS: {
    bar:  "border-green-500/40 bg-green-500/10",
    text: "text-green-300",
    key:  "paymentConfirmedLbl",
    icon: "✓",
  },
  FAILED: {
    bar:  "border-red-500/40 bg-red-500/10",
    text: "text-red-300",
    key:  "paymentRejected",
    icon: "✗",
  },
};

function tStatus(t, status) {
  return t(`status${status}`) || status;
}

export default function MyTickets() {
  const { t, lang } = useLang();
  const [tickets, setTickets] = useState([]);
  const [payments, setPayments] = useState([]);
  const [lotteries, setLotteries] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.myTickets().catch(() => []),
      apiClient.myPayments().catch(() => []),
      apiClient.listLotteries().catch(() => []),
    ]).then(([tks, pmts, lots]) => {
      setTickets(tks);
      setPayments(pmts);
      // Build lottery lookup map
      const map = {};
      lots.forEach((l) => { map[l.id] = l; });
      setLotteries(map);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-cream-300">{t("loading")}</div>;
  }

  // Group tickets by lottery_id
  const byLottery = {};
  tickets.forEach((tk) => {
    if (!byLottery[tk.lottery_id]) byLottery[tk.lottery_id] = [];
    byLottery[tk.lottery_id].push(tk);
  });

  // Group payments by lottery_id
  const pmtByLottery = {};
  payments.forEach((pm) => {
    if (!pmtByLottery[pm.lottery_id]) pmtByLottery[pm.lottery_id] = [];
    pmtByLottery[pm.lottery_id].push(pm);
  });

  // All lottery IDs the user has interacted with
  const allLotteryIds = [...new Set([
    ...Object.keys(byLottery).map(Number),
    ...Object.keys(pmtByLottery).map(Number),
  ])];

  if (allLotteryIds.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <Header t={t} />
        <div className="card p-8 text-center text-cream-300">
          {t("noTickets")}{" "}
          <Link to="/" className="text-green-300 hover:underline">{t("browseDesc")}</Link>.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
      <Header t={t} />

      <div className="space-y-8">
        {allLotteryIds.map((lid) => {
          const lottery = lotteries[lid];
          const lotteryTickets = byLottery[lid] || [];
          const lotteryPayments = pmtByLottery[lid] || [];

          return (
            <section key={lid} className="card overflow-hidden">
              {/* Lottery header */}
              <div className="flex items-center justify-between gap-3 border-b border-ink-600 px-5 py-4">
                <div className="flex items-center gap-3 min-w-0">
                  {lottery?.cover_image_url && (
                    <img src={lottery.cover_image_url} alt=""
                      className="h-10 w-10 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="min-w-0">
                    <h2 className="font-bold text-cream-50 truncate">
                      {lottery?.title || `${t("lottery")} #${lid}`}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      {lottery && (
                        <span className={`pill text-[10px] ${getStatusPill(lottery.status)}`}>
                          {tStatus(t, lottery.status)}
                        </span>
                      )}
                      <span className="text-xs text-cream-400">
                        ETB {lottery?.ticket_price || "—"} / {t("ticket")}
                      </span>
                    </div>
                  </div>
                </div>
                {lottery && (
                  <Link
                    to={lottery.status === "DRAWN" ? `/lottery/${lid}/results` : `/lottery/${lid}`}
                    className="btn-ghost px-3 py-1.5 text-xs shrink-0"
                  >
                    {lottery.status === "DRAWN" ? t("verifyDraw") : t("buyTickets")}
                  </Link>
                )}
              </div>

              {/* Payment status banners */}
              {lotteryPayments.map((pm) => {
                const style = PMT_STYLE[pm.gateway_status] || PMT_STYLE.PENDING;
                return (
                  <div key={pm.id}
                    className={`flex items-center justify-between gap-3 border-b border-ink-700 px-5 py-3 ${style.bar}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{style.icon}</span>
                      <div>
                        <span className={`text-sm font-semibold ${style.text}`}>
                          {t(style.key)}
                        </span>
                        <div className="text-xs text-cream-400 mt-0.5">
                          {pm.gateway} · ETB {pm.amount} · {pm.tickets_count} {lang === "am" ? "ቲኬቶች" : "ticket(s)"}
                          {pm.gateway_ref && <> · <span className="font-mono">{pm.gateway_ref}</span></>}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-cream-400 shrink-0">
                      {new Date(pm.created_at).toLocaleDateString()}
                    </span>
                  </div>
                );
              })}

              {/* Tickets list */}
              {lotteryTickets.length === 0 && lotteryPayments.length > 0 ? (
                <div className="px-5 py-4 text-sm text-cream-400">
                  {lang === "am"
                    ? "ክፍያ ሲረጋገጥ ቲኬቶቹ ይታያሉ።"
                    : "Tickets will appear here once payment is confirmed."}
                </div>
              ) : lotteryTickets.length === 0 ? (
                <div className="px-5 py-4 text-sm text-cream-400">{t("noTicketsForLottery")}</div>
              ) : (
                <div className="divide-y divide-ink-700">
                  {lotteryTickets.map((tk) => {
                    const style = TICKET_STYLE[tk.status] || TICKET_STYLE.PENDING_PAYMENT;
                    return (
                      <div key={tk.id}
                        className="flex items-center justify-between gap-3 px-5 py-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-cream-50">{tk.ticket_no}</span>
                            {tk.chosen_number && (
                              <span className="pill bg-green-500/15 text-green-300 text-[10px]">
                                #{tk.chosen_number}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-cream-400 mt-0.5">
                            {new Date(tk.created_at).toLocaleDateString()}
                            {tk.confirmed_at && tk.confirmed_at !== tk.created_at &&
                              ` · ${lang === "am" ? "ተረጋግጧል" : "confirmed"} ${new Date(tk.confirmed_at).toLocaleDateString()}`}
                          </div>
                        </div>
                        <span className={`pill ${style.pill}`}>
                          {style.icon} {tStatus(t, tk.status)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Header({ t }) {
  return (
    <header className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-cream-50">{t("myTicketsTitle")}</h1>
        <p className="mt-1 text-cream-300 text-sm">{t("myTicketsSub")}</p>
      </div>
      <Link to="/" className="btn-ghost text-xs px-3 py-1.5">{t("home")}</Link>
    </header>
  );
}

function getStatusPill(status) {
  const map = {
    DRAFT:     "bg-ink-700 text-cream-400",
    ACTIVE:    "bg-green-500/15 text-green-300",
    CLOSED:    "bg-ink-600 text-cream-200",
    DRAWN:     "bg-green-700/30 text-green-300",
    CANCELLED: "bg-red-500/10 text-red-400",
  };
  return map[status] || "bg-ink-700 text-cream-300";
}
