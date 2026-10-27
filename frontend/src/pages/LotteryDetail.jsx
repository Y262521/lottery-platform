import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";

const GATEWAYS = [
  { value: "TELEBIRR",      label: "Telebirr",     icon: "📱" },
  { value: "BANK_TRANSFER", label: "Bank Transfer", icon: "🏦" },
];

function CopyBtn({ value }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-green-600/20 text-green-300 hover:bg-green-600/40 transition"
    >{copied ? "✓" : "Copy"}</button>
  );
}

export default function LotteryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, lang } = useLang();

  // Guard against empty/undefined id (e.g. /lottery//)
  useEffect(() => {
    if (!id || id === "undefined") {
      navigate("/", { replace: true });
    }
  }, [id, navigate]);

  const [lottery, setLottery]           = useState(null);
  const [accounts, setAccounts]         = useState({});
  const [takenNums, setTakenNums]       = useState([]);
  // steps: select → pick (if range defined) → pay → done
  const [step, setStep]                 = useState("select");
  const [quantity, setQuantity]         = useState(1);
  const [selectedNums, setSelectedNums] = useState([]);   // chosen ticket numbers
  const [gateway, setGateway]           = useState("TELEBIRR");
  const [reference, setReference]       = useState("");
  const [senderName, setSenderName]     = useState("");
  const [phone, setPhone]               = useState("");
  const [message, setMessage]           = useState("");
  const [screenshot, setScreenshot]     = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [busy, setBusy]                 = useState(false);
  const [error, setError]               = useState("");
  const fileRef = useRef();

  const hasNumberRange = lottery?.ticket_number_max != null;

  useEffect(() => {
    apiClient.getLottery(id).then(setLottery).catch(() => navigate("/", { replace: true }));
    apiClient.paymentAccounts().then(setAccounts).catch(() => {});
    apiClient.takenNumbers(id).then((r) => setTakenNums(r.taken || [])).catch(() => {});
    if (user) { setSenderName(user.full_name || ""); setPhone(user.phone || ""); }
  }, [id, navigate, user]);

  function handleScreenshot(e) {
    const file = e.target.files[0];
    if (!file) return;
    setScreenshot(file);
    const reader = new FileReader();
    reader.onload = (ev) => setScreenshotPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  function toggleNum(n) {
    setSelectedNums((cur) => {
      if (cur.includes(n)) return cur.filter((x) => x !== n);
      if (cur.length >= quantity) return cur; // max reached
      return [...cur, n];
    });
  }

  function goToPickOrPay() {
    if (!user) { navigate("/login", { state: { from: { pathname: `/lottery/${id}` } } }); return; }
    setError("");
    if (hasNumberRange) {
      setStep("pick");
    } else {
      setStep("pay");
    }
  }

  function goToPay() {
    if (hasNumberRange && selectedNums.length !== quantity) {
      setError(lang === "am"
        ? `${quantity} ቁጥሮች ይምረጡ`
        : `Please select exactly ${quantity} number${quantity > 1 ? "s" : ""}`);
      return;
    }
    setError("");
    setStep("pay");
  }

  async function submitPayment() {
    if (!reference.trim()) { setError(lang === "am" ? "ማጣቀሻ ቁጥር ያስፈልጋል" : "Payment reference is required"); return; }
    if (!senderName.trim()) { setError(lang === "am" ? "ስም ያስፈልጋል" : "Sender name is required"); return; }
    setError(""); setBusy(true);
    try {
      const fd = new FormData();
      fd.append("lottery_id", String(lottery.id));
      fd.append("quantity", String(quantity));
      fd.append("gateway", gateway);
      fd.append("payment_reference", reference.trim());
      fd.append("sender_name", senderName.trim());
      fd.append("phone", phone || "");
      fd.append("message", message || "");
      if (selectedNums.length > 0) fd.append("chosen_numbers", selectedNums.join(","));
      if (screenshot) fd.append("screenshot", screenshot);
      await apiClient.submitPayment(fd);
      setStep("done");
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  if (!lottery) return <div className="flex min-h-[60vh] items-center justify-center text-cream-300">{t("loading")}</div>;

  const remaining = lottery.total_tickets ? lottery.total_tickets - lottery.tickets_sold : null;
  const total = (lottery.ticket_price * quantity).toLocaleString();
  const isOpen = lottery.status === "ACTIVE";
  const acct = accounts;

  // Back button logic
  function handleBack() {
    if (step === "pay" && hasNumberRange) return setStep("pick");
    if (step === "pay" || step === "pick") return setStep("select");
    navigate("/");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <button onClick={handleBack}
        className="mb-4 flex items-center gap-1 text-sm text-cream-300 hover:text-cream-100">{t("back")}</button>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* ── Left: lottery info ── */}
        <div>
          {lottery.cover_image_url && (
            <img src={lottery.cover_image_url} alt={lottery.title}
              className="mb-5 w-full rounded-2xl object-cover max-h-64 sm:max-h-80" />
          )}
          <h1 className="text-2xl sm:text-3xl font-bold text-cream-50">{lottery.title}</h1>
          {lottery.description && <p className="mt-2 text-cream-300 leading-relaxed text-sm">{lottery.description}</p>}

          <div className="mt-5 card p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-cream-300 mb-2">{t("prize")}</h2>
            <p className="text-cream-100 leading-relaxed text-sm">{lottery.prize_description}</p>
            {lottery.prize_image_urls?.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {lottery.prize_image_urls.map((url, i) => (
                  <img key={i} src={url} alt="" className="rounded-xl object-cover aspect-square" loading="lazy" />
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat label={t("ticket")} value={`ETB ${lottery.ticket_price.toLocaleString()}`} />
            <Stat label={t("drawDate")} value={new Date(lottery.draw_date).toLocaleDateString()} />
            {remaining !== null ? <Stat label={t("remaining")} value={remaining} />
              : <Stat label={t("ticketsSold")} value={lottery.tickets_sold} />}
          </div>
        </div>

        {/* ── Right: steps panel ── */}
        <div className="card p-5 self-start">

          {/* DONE */}
          {step === "done" && (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-xl font-bold text-cream-50">{t("paymentSubmitted")}</h2>
              <p className="mt-3 text-cream-300 text-sm">{t("paymentSubmittedDesc")}</p>
              <div className="mt-4 rounded-xl bg-ink-800 p-3 font-mono text-green-300 text-sm break-all">
                {t("referenceLabel")} {reference}
              </div>
              {selectedNums.length > 0 && (
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {selectedNums.map((n) => (
                    <span key={n} className="rounded-lg bg-green-600 px-3 py-1 font-mono font-bold text-ink-900">{n}</span>
                  ))}
                </div>
              )}
              <p className="mt-3 text-xs text-cream-400">{t("trackTickets")}</p>
              <button className="btn-primary mt-4 w-full" onClick={() => navigate("/my-tickets")}>
                {t("viewMyTickets")}
              </button>
            </div>
          )}

          {/* SELECT: quantity + gateway */}
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
                  <div className="mb-5">
                    <label className="label">{t("quantity")}</label>
                    <div className="flex items-center gap-4">
                      <button className="btn-ghost h-10 w-10 text-xl rounded-lg"
                        onClick={() => { setQuantity(q => Math.max(1, q - 1)); setSelectedNums([]); }}>−</button>
                      <span className="font-mono text-2xl text-cream-50 w-8 text-center">{quantity}</span>
                      <button className="btn-ghost h-10 w-10 text-xl rounded-lg"
                        onClick={() => { setQuantity(q => Math.min(lottery.max_per_user, q + 1)); setSelectedNums([]); }}>+</button>
                      <span className="text-xs text-cream-400">max {lottery.max_per_user}</span>
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className="label">{t("paymentMethod")}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {GATEWAYS.map((g) => (
                        <button key={g.value} onClick={() => setGateway(g.value)}
                          className={`rounded-xl border p-3 text-center text-sm font-medium transition ${
                            gateway === g.value ? "border-green-500 bg-green-500/15 text-green-300" : "border-ink-600 text-cream-300"
                          }`}>
                          <div className="text-2xl mb-1">{g.icon}</div>
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-ink-600 pt-4 mb-4">
                    <span className="text-cream-300">{t("total")}</span>
                    <span className="font-mono text-xl font-bold text-cream-50">ETB {total}</span>
                  </div>

                  <button className="btn-primary w-full py-3" onClick={goToPickOrPay}>
                    {user
                      ? hasNumberRange
                        ? (lang === "am" ? `ቀጥል → ቁጥር ይምረጡ` : `Continue → Pick Numbers`)
                        : (lang === "am" ? `ቀጥል → ክፍያ (${quantity})` : `Continue → Pay (${quantity})`)
                      : t("signInToBuy")}
                  </button>
                </>
              )}
            </>
          )}

          {/* PICK: ticket number grid */}
          {step === "pick" && hasNumberRange && (
            <>
              <h2 className="text-lg font-bold text-cream-50 mb-1">
                {lang === "am" ? "ቁጥርዎን ይምረጡ" : "Pick Your Numbers"}
              </h2>
              <p className="text-xs text-cream-400 mb-4">
                {lang === "am"
                  ? `${quantity} ቁጥሮች ይምረጡ • ${selectedNums.length}/${quantity} ተመርጧል`
                  : `Select ${quantity} number${quantity > 1 ? "s" : ""} • ${selectedNums.length}/${quantity} selected`}
              </p>

              {/* Legend */}
              <div className="flex items-center gap-4 mb-4 text-xs text-cream-400">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-4 w-4 rounded bg-green-600" />
                  {lang === "am" ? "ተመርጧል" : "Selected"}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-4 w-4 rounded bg-ink-600" />
                  {lang === "am" ? "ዝግጁ" : "Available"}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-4 w-4 rounded bg-red-900/60 border border-red-500/30" />
                  {lang === "am" ? "ተወስዷል" : "Taken"}
                </span>
              </div>

              {/* Number grid */}
              <NumberGrid
                min={lottery.ticket_number_min || 1}
                max={lottery.ticket_number_max}
                taken={takenNums}
                selected={selectedNums}
                maxSelect={quantity}
                onToggle={toggleNum}
                lang={lang}
              />

              {error && (
                <div className="mt-3 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-300">{error}</div>
              )}

              <button className="btn-primary mt-4 w-full py-3" onClick={goToPay}
                disabled={selectedNums.length !== quantity}>
                {lang === "am"
                  ? `ቀጥል → ክፍያ (${quantity} ቲኬት)`
                  : `Continue → Pay (${quantity} ticket${quantity > 1 ? "s" : ""})`}
              </button>
            </>
          )}

          {/* PAY: account details + reference form */}
          {step === "pay" && (
            <>
              <h2 className="text-lg font-bold text-cream-50 mb-1">{t("makePayment")}</h2>
              <p className="text-xs text-cream-400 mb-3">
                {(t("transferTo") || "").replace("{amount}", total)}
              </p>

              {/* Show chosen numbers summary */}
              {selectedNums.length > 0 && (
                <div className="mb-4 rounded-xl bg-ink-800 p-3">
                  <p className="text-xs text-cream-400 mb-2">{lang === "am" ? "የተመረጡ ቁጥሮች:" : "Your chosen numbers:"}</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedNums.map((n) => (
                      <span key={n} className="rounded-lg bg-green-600 px-3 py-1.5 font-mono font-bold text-ink-900">
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Account boxes */}
              {gateway === "TELEBIRR" && (
                <AccountBox icon="📱" title="Telebirr" rows={[
                  { label: lang === "am" ? "ቁጥር" : "Number", value: acct.telebirr_number || "—" },
                  { label: lang === "am" ? "ስም"   : "Name",   value: acct.telebirr_name   || "—" },
                ]} />
              )}
              {gateway === "BANK_TRANSFER" && (
                <>
                  {acct.cbe_number && <AccountBox icon="🏦"
                    title={lang === "am" ? "ንግድ ባንክ (CBE)" : "Commercial Bank of Ethiopia"}
                    rows={[
                      { label: lang === "am" ? "አካዉንት" : "Account", value: acct.cbe_number },
                      { label: lang === "am" ? "ስም"    : "Name",    value: acct.cbe_name },
                    ]} />}
                  {acct.awash_number && <AccountBox icon="🏦"
                    title={lang === "am" ? "አዋሽ ባንክ" : "Awash Bank"}
                    rows={[
                      { label: lang === "am" ? "አካዉንት" : "Account", value: acct.awash_number },
                      { label: lang === "am" ? "ስም"    : "Name",    value: acct.awash_name },
                    ]} />}
                </>
              )}

              <div className="mt-4 space-y-3">
                <Field label={gateway === "TELEBIRR" ? t("telebirrRef") : t("bankRef")}>
                  <input className="input font-mono" placeholder="e.g. TXN1234567890"
                    value={reference} onChange={e => setReference(e.target.value)} />
                </Field>
                <Field label={t("senderName")}>
                  <input className="input" placeholder={t("senderNamePh")}
                    value={senderName} onChange={e => setSenderName(e.target.value)} />
                </Field>
                <Field label={t("phoneLbl")}>
                  <input className="input" type="tel" placeholder="+251..."
                    value={phone} onChange={e => setPhone(e.target.value)} />
                </Field>
                <Field label={t("messageLbl")}>
                  <textarea className="input min-h-[56px] resize-none" placeholder={t("messagePh")}
                    value={message} onChange={e => setMessage(e.target.value)} />
                </Field>

                {/* Screenshot upload */}
                <Field label={t("screenshotLbl")}>
                  <div onClick={() => fileRef.current?.click()}
                    className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 cursor-pointer transition ${
                      screenshotPreview ? "border-green-500/50" : "border-ink-600 hover:border-green-500/40"
                    }`}>
                    {screenshotPreview ? (
                      <>
                        <img src={screenshotPreview} alt="proof" className="max-h-40 w-full rounded-lg object-contain" />
                        <p className="mt-1 text-xs text-green-300">{lang === "am" ? "ይቀይሩ" : "Click to change"}</p>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl">📸</span>
                        <p className="mt-1 text-sm text-cream-300">{lang === "am" ? "ስክሪንሾት ይስቀሉ" : "Upload screenshot"}</p>
                        <p className="text-xs text-cream-400">{t("screenshotHelp")}</p>
                      </>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleScreenshot} />
                  </div>
                </Field>
              </div>

              {error && (
                <div className="mt-3 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-300">{error}</div>
              )}

              <div className="mt-3 rounded-lg bg-ink-800 px-3 py-2 text-xs text-cream-400">{t("afterTransfer")}</div>

              <div className="flex items-center justify-between border-t border-ink-600 pt-3 mt-3">
                <span className="text-cream-300">{t("total")}</span>
                <span className="font-mono text-lg font-bold text-cream-50">ETB {total}</span>
              </div>

              <button className="btn-primary mt-3 w-full py-3" disabled={busy} onClick={submitPayment}>
                {busy ? t("submitting") : t("submitRef")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Ticket number grid ──────────────────────────────────────────────────────

function NumberGrid({ min, max, taken, selected, maxSelect, onToggle, lang }) {
  const nums = Array.from({ length: max - min + 1 }, (_, i) => i + min);
  const done = selected.length >= maxSelect;

  return (
    <div className="max-h-72 overflow-y-auto rounded-xl border border-ink-600 bg-ink-800 p-3">
      <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(44px, 1fr))" }}>
        {nums.map((n) => {
          const isTaken    = taken.includes(n);
          const isSelected = selected.includes(n);
          const isDisabled = isTaken || (!isSelected && done);

          return (
            <button
              key={n}
              type="button"
              disabled={isDisabled}
              onClick={() => !isTaken && onToggle(n)}
              title={isTaken ? (lang === "am" ? "ቀደም ብሎ ተወስዷል" : "Already taken") : ""}
              className={[
                "flex h-11 w-full items-center justify-center rounded-lg font-mono text-sm font-bold transition select-none",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400/50",
                isTaken
                  ? "bg-red-900/40 text-red-400/60 border border-red-500/20 cursor-not-allowed line-through"
                  : isSelected
                    ? "bg-green-600 text-ink-900 shadow-glow scale-105"
                    : isDisabled
                      ? "bg-ink-700 text-cream-500 cursor-not-allowed opacity-40"
                      : "bg-ink-600 text-cream-100 hover:bg-ink-500 cursor-pointer",
              ].join(" ")}
              aria-pressed={isSelected}
              aria-label={isTaken
                ? `${n} ${lang === "am" ? "ቀደም ብሎ ተወስዷል" : "taken"}`
                : `${n}`}
            >
              {n}
              {isTaken && <span className="absolute text-[8px] -mt-5 text-red-400" aria-hidden>✗</span>}
            </button>
          );
        })}
      </div>
      {nums.length === 0 && (
        <p className="text-center text-cream-400 py-4 text-sm">
          {lang === "am" ? "የቁጥር ክልል አልተዘጋጀም" : "No number range configured"}
        </p>
      )}
    </div>
  );
}

// ── Helper components ───────────────────────────────────────────────────────

function AccountBox({ icon, title, rows }) {
  return (
    <div className="rounded-xl border border-green-500/30 bg-ink-800 p-4 mb-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icon}</span>
        <span className="font-semibold text-cream-100 text-sm">{title}</span>
      </div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between py-1.5 text-sm border-b border-ink-700 last:border-0">
          <span className="text-cream-400">{r.label}</span>
          <span className="flex items-center font-mono text-cream-50">
            {r.value}
            {r.value && r.value !== "—" && <CopyBtn value={r.value} />}
          </span>
        </div>
      ))}
    </div>
  );
}

function Field({ label, children }) {
  return <div><label className="label">{label}</label>{children}</div>;
}

function Stat({ label, value }) {
  return (
    <div className="card p-3 text-center">
      <div className="text-[10px] sm:text-xs uppercase tracking-wider text-cream-400">{label}</div>
      <div className="mt-1 font-mono text-sm font-bold text-green-300 break-all">{value}</div>
    </div>
  );
}
