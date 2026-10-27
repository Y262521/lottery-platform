import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";

const GATEWAYS = [
  { value: "TELEBIRR",      label: "Telebirr",      icon: "📱" },
  { value: "BANK_TRANSFER", label: "Bank Transfer",  icon: "🏦" },
];

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-green-600/20 text-green-300 hover:bg-green-600/40 transition"
    >
      {copied ? "✓" : "Copy"}
    </button>
  );
}

export default function LotteryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, lang } = useLang();

  const [lottery, setLottery] = useState(null);
  const [accounts, setAccounts] = useState(null);
  const [step, setStep] = useState("select"); // select | pay | confirm | done
  const [quantity, setQuantity] = useState(1);
  const [gateway, setGateway] = useState("TELEBIRR");
  const [reference, setReference] = useState("");
  const [senderName, setSenderName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [txnId, setTxnId] = useState(null);

  useEffect(() => {
    apiClient.getLottery(id).then(setLottery).catch(() => navigate("/", { replace: true }));
    apiClient.paymentAccounts().then(setAccounts).catch(() => {});
  }, [id, navigate]);

  const total = lottery ? (lottery.ticket_price * quantity).toLocaleString() : "0";
  const isOpen = lottery?.status === "ACTIVE";

  async function goToPay() {
    if (!user) { navigate("/login", { state: { from: { pathname: `/lottery/${id}` } } }); return; }
    setError("");
    setStep("pay");
  }

  async function submitPayment() {
    if (!reference.trim()) { setError(lang === "am" ? "ማጣቀሻ ቁጥር ያስፈልጋል" : "Payment reference is required"); return; }
    if (!senderName.trim()) { setError(lang === "am" ? "ስም ያስፈልጋል" : "Sender name is required"); return; }
    setError(""); setBusy(true);
    try {
      const txn = await apiClient.submitPayment({
        lottery_id: Number(id),
        quantity,
        gateway,
        payment_reference: reference.trim(),
        sender_name: senderName.trim(),
        phone: phone || undefined,
      });
      setTxnId(txn.id);
      setStep("done");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!lottery) return <div className="mx-auto mt-24 max-w-4xl px-4 text-cream-300">{t("loading")}</div>;

  const remaining = lottery.total_tickets ? lottery.total_tickets - lottery.tickets_sold : null;
  const acct = accounts || {};

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <button onClick={() => step === "pay" ? setStep("select") : navigate("/")}
        className="mb-4 text-sm text-cream-300 hover:text-cream-100">{t("back")}</button>

      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        {/* Left: lottery info */}
        <div>
          {lottery.cover_image_url && (
            <img src={lottery.cover_image_url} alt={lottery.title}
              className="mb-6 w-full rounded-2xl object-cover max-h-72" />
          )}
          <h1 className="text-3xl font-bold text-cream-50">{lottery.title}</h1>
          {lottery.description && <p className="mt-3 text-cream-300 leading-relaxed">{lottery.description}</p>}

          <div className="mt-6 card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-cream-300 mb-3">{t("prize")}</h2>
            <p className="text-cream-100 leading-relaxed">{lottery.prize_description}</p>
            {lottery.prize_image_urls?.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {lottery.prize_image_urls.map((url, i) => (
                  <img key={i} src={url} alt="" className="rounded-xl object-cover aspect-square" loading="lazy" />
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <Stat label={t("ticket")} value={`ETB ${lottery.ticket_price.toLocaleString()}`} />
            <Stat label={t("drawDate")} value={new Date(lottery.draw_date).toLocaleDateString()} />
            {remaining !== null
              ? <Stat label={t("remaining")} value={remaining} />
              : <Stat label={t("ticketsSold")} value={lottery.tickets_sold} />}
          </div>
        </div>

        {/* Right: payment panel */}
        <div className="card p-6 self-start">

          {/* ── STEP: done ── */}
          {step === "done" && (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-xl font-bold text-cream-50">
                {lang === "am" ? "ክፍያ ቀርቧል!" : "Payment Submitted!"}
              </h2>
              <p className="mt-3 text-cream-300 text-sm">
                {lang === "am"
                  ? "አስተዳዳሪ ክፍያዎን ሲያረጋግጥ ቲኬቶቹ ይላካሉ። ማጣቀሻ ቁጥርዎን ያስቀምጡ።"
                  : "Admin will verify your payment and issue your tickets. Keep your reference number safe."}
              </p>
              <div className="mt-4 rounded-xl bg-ink-800 p-3 font-mono text-green-300">
                {lang === "am" ? "ማጣቀሻ:" : "Reference:"} {reference}
              </div>
              <p className="mt-3 text-xs text-cream-400">
                {lang === "am" ? "የእኔ ቲኬቶች ውስጥ ሁኔታ ይከታተሉ" : "Track status in My Tickets"}
              </p>
              <button className="btn-primary mt-4 w-full" onClick={() => navigate("/my-tickets")}>
                {t("viewMyTickets")}
              </button>
            </div>
          )}

          {/* ── STEP: select quantity + method ── */}
          {step === "select" && (
            <>
              <h2 className="text-lg font-bold text-cream-50 mb-4">{t("buyTickets")}</h2>

              {!isOpen && (
                <div className="mb-4 rounded-lg bg-ink-700 px-4 py-3 text-sm text-cream-300">
                  {lottery.status === "DRAWN"
                    ? <a href={`/lottery/${id}/results`} className="text-green-300 hover:underline">{t("viewResults")}</a>
                    : t("salesClosed")}
                </div>
              )}

              {isOpen && (
                <>
                  {/* Quantity */}
                  <div className="mb-5">
                    <label className="label">{t("quantity")}</label>
                    <div className="flex items-center gap-3">
                      <button className="btn-ghost h-10 w-10 text-xl"
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
                      <span className="font-mono text-2xl text-cream-50 w-10 text-center">{quantity}</span>
                      <button className="btn-ghost h-10 w-10 text-xl"
                        onClick={() => setQuantity(q => Math.min(lottery.max_per_user, q + 1))}>+</button>
                    </div>
                    <p className="mt-1 text-xs text-cream-400">{t("maxPerUser")} {lottery.max_per_user}</p>
                  </div>

                  {/* Payment method */}
                  <div className="mb-5">
                    <label className="label">{t("paymentMethod")}</label>
                    <div className="grid grid-cols-2 gap-2">
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

                  <div className="flex items-center justify-between mb-4 border-t border-ink-600 pt-4">
                    <span className="text-cream-300">{t("total")}</span>
                    <span className="font-mono text-xl font-bold text-cream-50">ETB {total}</span>
                  </div>

                  <button className="btn-primary w-full" onClick={goToPay}>
                    {user
                      ? (lang === "am" ? `ቀጥል → ክፍያ (${quantity} ቲኬት)` : `Continue → Pay (${quantity} ticket${quantity > 1 ? "s" : ""})`)
                      : t("signInToBuy")}
                  </button>
                </>
              )}
            </>
          )}

          {/* ── STEP: pay — show account + reference form ── */}
          {step === "pay" && (
            <>
              <h2 className="text-lg font-bold text-cream-50 mb-1">
                {lang === "am" ? "ክፍያ ያካሂዱ" : "Make Payment"}
              </h2>
              <p className="text-xs text-cream-400 mb-4">
                {lang === "am"
                  ? `ETB ${total} ወደ ታች ወደ አለው አካዉንት ያስተላልፉ`
                  : `Transfer ETB ${total} to the account below`}
              </p>

              {/* Account details box */}
              {gateway === "TELEBIRR" && (
                <AccountBox
                  icon="📱"
                  title="Telebirr"
                  rows={[
                    { label: lang === "am" ? "ቁጥር" : "Number", value: acct.telebirr_number || "—" },
                    { label: lang === "am" ? "ስም" : "Name",   value: acct.telebirr_name   || "—" },
                  ]}
                />
              )}
              {gateway === "BANK_TRANSFER" && (
                <>
                  {acct.cbe_number && (
                    <AccountBox
                      icon="🏦"
                      title={lang === "am" ? "ንግድ ባንክ (CBE)" : "Commercial Bank of Ethiopia (CBE)"}
                      rows={[
                        { label: lang === "am" ? "አካዉንት" : "Account", value: acct.cbe_number },
                        { label: lang === "am" ? "ስም" : "Name",       value: acct.cbe_name   },
                      ]}
                    />
                  )}
                  {acct.awash_number && (
                    <AccountBox
                      icon="🏦"
                      title={lang === "am" ? "አዋሽ ባንክ" : "Awash Bank"}
                      rows={[
                        { label: lang === "am" ? "አካዉንት" : "Account", value: acct.awash_number },
                        { label: lang === "am" ? "ስም" : "Name",       value: acct.awash_name   },
                      ]}
                    />
                  )}
                </>
              )}

              {/* Reference form */}
              <div className="mt-5 space-y-3">
                <div>
                  <label className="label">
                    {gateway === "TELEBIRR"
                      ? (lang === "am" ? "Telebirr ማጣቀሻ ቁጥር *" : "Telebirr Transaction Reference *")
                      : (lang === "am" ? "የባንክ ማጣቀሻ / ደረሰኝ ቁጥር *" : "Bank Reference / Slip Number *")}
                  </label>
                  <input className="input font-mono" placeholder="e.g. TXN1234567890"
                    value={reference} onChange={(e) => setReference(e.target.value)} />
                </div>
                <div>
                  <label className="label">
                    {lang === "am" ? "የላኪ ስም *" : "Sender Name (as on transfer) *"}
                  </label>
                  <input className="input" placeholder={lang === "am" ? "ስምዎ" : "Your name"}
                    value={senderName} onChange={(e) => setSenderName(e.target.value)} />
                </div>
                <div>
                  <label className="label">
                    {lang === "am" ? "ስልክ ቁጥር (አማራጭ)" : "Phone Number (optional)"}
                  </label>
                  <input className="input" type="tel" placeholder="+251..."
                    value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>

              {error && (
                <div className="mt-3 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-300">
                  {error}
                </div>
              )}

              <div className="mt-2 rounded-lg bg-ink-800 px-3 py-2 text-xs text-cream-400">
                {lang === "am"
                  ? "ክፍያ ካደረጉ በኋላ ማጣቀሻ ቁጥሩን ያስገቡ። አስተዳዳሪ ሲያረጋግጥ ቲኬቶቹ ይላካሉ።"
                  : "After transferring, enter the reference number. Admin will verify and issue your tickets."}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-ink-600 pt-3">
                <span className="text-cream-300">{t("total")}</span>
                <span className="font-mono text-lg font-bold text-cream-50">ETB {total}</span>
              </div>

              <button className="btn-primary mt-3 w-full" disabled={busy} onClick={submitPayment}>
                {busy
                  ? (lang === "am" ? "በማስገባት ላይ…" : "Submitting…")
                  : (lang === "am" ? "ክፍያ አስረከብ" : "Submit Payment Reference")}
              </button>
              <button className="btn-ghost mt-2 w-full" onClick={() => setStep("select")}>
                {lang === "am" ? "← ተመለስ" : "← Back"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AccountBox({ icon, title, rows }) {
  return (
    <div className="rounded-xl border border-ink-600 bg-ink-800 p-4 mb-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icon}</span>
        <span className="font-semibold text-cream-100">{title}</span>
      </div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between py-1 text-sm border-b border-ink-700 last:border-0">
          <span className="text-cream-400">{r.label}</span>
          <span className="flex items-center font-mono text-cream-50">
            {r.value}
            {r.value && r.value !== "—" && <CopyButton value={r.value} />}
          </span>
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card p-3 text-center">
      <div className="text-xs uppercase tracking-wider text-cream-400">{label}</div>
      <div className="mt-1 font-mono font-bold text-green-300">{value}</div>
    </div>
  );
}
