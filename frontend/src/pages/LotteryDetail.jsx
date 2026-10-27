import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";

const GATEWAYS = [
  { value: "CHAPA",         label: "Chapa",         icon: "💳" },
  { value: "TELEBIRR",      label: "Telebirr",       icon: "📱" },
  { value: "BANK_TRANSFER", label: "Bank Transfer",  icon: "🏦" },
];

export default function LotteryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLang();

  const [lottery, setLottery] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [gateway, setGateway] = useState("CHAPA");
  const [phone, setPhone] = useState(user?.phone || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient.getLottery(id).then(setLottery).catch(() => navigate("/", { replace: true }));
  }, [id, navigate]);

  async function handleBuy() {
    if (!user) { navigate("/login", { state: { from: { pathname: `/lottery/${id}` } } }); return; }
    setError(""); setBusy(true);
    try {
      const resp = await apiClient.initiatePayment({ lottery_id: Number(id), quantity, gateway, phone: phone || undefined });
      if (resp.checkout_url) {
        window.location.href = resp.checkout_url;   // Chapa hosted checkout
      } else if (resp.ussd_push) {
        navigate(`/payment/callback?txn=${resp.transaction_id}&status=pending`);
      } else {
        // Bank transfer — show instructions
        navigate(`/payment/callback?txn=${resp.transaction_id}&gateway=BANK_TRANSFER`);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!lottery) return <div className="mx-auto mt-24 max-w-4xl px-4 text-cream-300">Loading…</div>;

  const remaining = lottery.total_tickets ? lottery.total_tickets - lottery.tickets_sold : null;
  const total = (lottery.ticket_price * quantity).toLocaleString();
  const isOpen = lottery.status === "ACTIVE";

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <button onClick={() => navigate("/")} className="mb-4 text-sm text-cream-300 hover:text-cream-100">
        ← {t("home")}
      </button>

      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        {/* Left: info */}
        <div>
          {lottery.cover_image_url && (
            <img src={lottery.cover_image_url} alt={lottery.title}
              className="mb-6 w-full rounded-2xl object-cover max-h-72" />
          )}
          <h1 className="text-3xl font-bold text-cream-50">{lottery.title}</h1>
          {lottery.description && (
            <p className="mt-3 text-cream-300 leading-relaxed">{lottery.description}</p>
          )}

          <div className="mt-6 card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-cream-300 mb-3">Prize</h2>
            <p className="text-cream-100 leading-relaxed">{lottery.prize_description}</p>
            {lottery.prize_image_urls?.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {lottery.prize_image_urls.map((url, i) => (
                  <img key={i} src={url} alt={`Prize ${i+1}`}
                    className="rounded-xl object-cover aspect-square" loading="lazy" />
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <Stat label={t("ticket")} value={`ETB ${lottery.ticket_price.toLocaleString()}`} />
            <Stat label={t("drawAt")} value={new Date(lottery.draw_date).toLocaleDateString()} />
            {remaining !== null
              ? <Stat label="Remaining" value={remaining} />
              : <Stat label={t("ticketsSold")} value={lottery.tickets_sold} />
            }
          </div>
        </div>

        {/* Right: buy panel */}
        <div className="card p-6 self-start">
          <h2 className="text-lg font-bold text-cream-50 mb-4">{t("buyTickets")}</h2>

          {!isOpen && (
            <div className="mb-4 rounded-lg bg-ink-700 px-4 py-3 text-sm text-cream-300">
              {lottery.status === "DRAWN"
                ? <><a href={`/lottery/${id}/results`} className="text-green-300 hover:underline">View draw results →</a></>
                : "Ticket sales are closed."}
            </div>
          )}

          {isOpen && (
            <>
              {/* Quantity */}
              <div className="mb-4">
                <label className="label">Quantity</label>
                <div className="flex items-center gap-3">
                  <button className="btn-ghost h-10 w-10 text-xl"
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
                  <span className="font-mono text-2xl text-cream-50 w-10 text-center">{quantity}</span>
                  <button className="btn-ghost h-10 w-10 text-xl"
                    onClick={() => setQuantity(q => Math.min(lottery.max_per_user, q + 1))}>+</button>
                </div>
                <p className="mt-1 text-xs text-cream-400">Max {lottery.max_per_user} per user</p>
              </div>

              {/* Gateway */}
              <div className="mb-4">
                <label className="label">Payment method</label>
                <div className="grid grid-cols-3 gap-2">
                  {GATEWAYS.map((g) => (
                    <button key={g.value} onClick={() => setGateway(g.value)}
                      className={`rounded-xl border p-3 text-center text-sm font-medium transition ${
                        gateway === g.value
                          ? "border-green-500 bg-green-500/15 text-green-300"
                          : "border-ink-600 text-cream-300 hover:border-ink-500"
                      }`}>
                      <div className="text-2xl mb-1">{g.icon}</div>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {gateway === "TELEBIRR" && (
                <div className="mb-4">
                  <label className="label">Telebirr Phone</label>
                  <input className="input" placeholder="+251..." value={phone}
                    onChange={(e) => setPhone(e.target.value)} />
                </div>
              )}

              {gateway === "BANK_TRANSFER" && (
                <div className="mb-4 rounded-lg bg-ink-800 p-3 text-xs text-cream-300">
                  After clicking Buy, you'll receive bank account details.
                  Your tickets are confirmed once an admin verifies your transfer.
                </div>
              )}

              {error && (
                <div className="mb-3 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-300">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between mb-3">
                <span className="text-cream-300">Total</span>
                <span className="font-mono text-xl font-bold text-cream-50">ETB {total}</span>
              </div>

              <button className="btn-primary w-full" disabled={busy} onClick={handleBuy}>
                {busy ? "Processing…" : user ? `Buy ${quantity} ticket${quantity > 1 ? "s" : ""}` : "Sign in to buy"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card p-3">
      <div className="text-xs uppercase tracking-wider text-cream-400">{label}</div>
      <div className="mt-1 font-mono font-bold text-green-300">{value}</div>
    </div>
  );
}
