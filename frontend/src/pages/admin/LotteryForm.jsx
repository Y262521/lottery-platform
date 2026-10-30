import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../api/client";
import { useLang } from "../../context/LangContext";

function toISO(local) {
  return local ? new Date(local).toISOString() : undefined;
}

function getDefaultDrawDate() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(18, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminLotteryForm() {
  const navigate = useNavigate();
  const { t, lang, tError } = useLang();
  const coverInputRef = useRef(null);
  const prizeInputRef = useRef(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    prize_description: "",
    ticket_price: 50,
    total_tickets: "",
    draw_date: getDefaultDrawDate(),
    sales_open_at: "",
    sales_close_at: "",
    ticket_number_min: "1",
    ticket_number_max: "",
  });

  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [prizeFiles, setPrizeFiles] = useState([]);
  const [prizePreviews, setPrizePreviews] = useState([]);
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function handleCoverChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  function removeCover() {
    setCoverFile(null);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(null);
    if (coverInputRef.current) coverInputRef.current.value = "";
  }

  function handlePrizeImagesChange(e) {
    const newFiles = Array.from(e.target.files || []);
    if (!newFiles.length) return;

    const newPreviews = newFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      id: Math.random().toString(36).substring(2, 9),
    }));

    setPrizeFiles((prev) => [...prev, ...newFiles]);
    setPrizePreviews((prev) => [...prev, ...newPreviews]);
  }

  function removePrizeImage(indexToRemove) {
    setPrizePreviews((prev) => {
      const removed = prev[indexToRemove];
      if (removed?.url) URL.revokeObjectURL(removed.url);
      return prev.filter((_, idx) => idx !== indexToRemove);
    });
    setPrizeFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    setStatusText(lang === "am" ? "እጣ በመፍጠር ላይ…" : "Creating draw…");
    try {
      const body = {
        ...form,
        ticket_price: Number(form.ticket_price),
        total_tickets: form.total_tickets ? Number(form.total_tickets) : null,
        max_per_user: 1000000000,
        draw_date: toISO(form.draw_date),
        sales_open_at: toISO(form.sales_open_at) || null,
        sales_close_at: toISO(form.sales_close_at) || null,
        ticket_number_min: form.ticket_number_min ? Number(form.ticket_number_min) : 1,
        ticket_number_max: form.ticket_number_max ? Number(form.ticket_number_max) : null,
      };

      const lottery = await apiClient.createLottery(body);

      // Upload cover image
      if (coverFile) {
        setStatusText(lang === "am" ? "የሽፋን ምስል በመጫን ላይ…" : "Uploading cover image…");
        try {
          const fd = new FormData();
          fd.append("file", coverFile);
          await apiClient.uploadCover(lottery.id, fd);
        } catch (e) {
          console.warn("Cover upload skipped:", e.message);
        }
      }

      // Upload multiple prize images
      if (prizeFiles.length > 0) {
        setStatusText(lang === "am" ? "የሽልማት ምስሎችን በመጫን ላይ…" : "Uploading prize photos…");
        try {
          const fd = new FormData();
          prizeFiles.forEach((f) => fd.append("files", f));
          await apiClient.uploadPrizeImages(lottery.id, fd);
        } catch (e) {
          console.warn("Prize images upload skipped:", e.message);
        }
      }

      navigate(`/admin/lotteries/${lottery.id}`);
    } catch (e) {
      setError(tError(e));
    } finally {
      setBusy(false);
      setStatusText("");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-cream-50 mb-6">{t("createLottery")}</h1>
      <form onSubmit={submit} className="card p-6 space-y-4">
        <Field label={t("titleField")}>
          <input className="input" required value={form.title} onChange={set("title")} />
        </Field>

        <Field label={t("description")}>
          <textarea className="input min-h-[80px]" value={form.description} onChange={set("description")} />
        </Field>

        <Field label={t("prizeDescription")}>
          <textarea className="input min-h-[80px]" required value={form.prize_description} onChange={set("prize_description")} />
        </Field>

        {/* ── Draw Date — prominent highlighted box with quick set presets ── */}
        <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <label className="label mb-0 font-bold text-green-300">
              📅 {t("drawDateField")}
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-cream-400 mr-1">{lang === "am" ? "ፈጣን ምርጫ:" : "Quick set:"}</span>
              {[
                { label: "+3d", days: 3 },
                { label: "+7d", days: 7 },
                { label: "+14d", days: 14 },
                { label: "+30d", days: 30 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + preset.days);
                    d.setHours(18, 0, 0, 0);
                    const pad = (n) => String(n).padStart(2, "0");
                    const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                    setForm((f) => ({ ...f, draw_date: dateStr }));
                  }}
                  className="rounded-md border border-green-500/30 bg-ink-800 px-2 py-0.5 text-[11px] text-green-300 hover:bg-green-500/20 transition"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          <input
            className="input border-green-500/60 bg-ink-900 font-semibold text-green-300 text-base py-2.5"
            type="datetime-local"
            required
            value={form.draw_date}
            onChange={set("draw_date")}
          />
          <p className="mt-1.5 text-xs text-cream-300">
            {lang === "am"
              ? "የዕጣ የሚወጣበትን ቀን እና ሰዓት ይምረጡ። ከታተመም በኋላ በማንኛውም ጊዜ ማስተካከል ይችላሉ።"
              : "Select the scheduled date and time when the draw will take place. Can be edited anytime."}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t("ticketPrice")}>
            <input className="input" type="number" min={1} required value={form.ticket_price} onChange={set("ticket_price")} />
          </Field>
          <Field label={t("totalTickets")}>
            <input className="input" type="number" min={1} placeholder={t("unlimited")} value={form.total_tickets} onChange={set("total_tickets")} />
          </Field>
          <Field label={t("salesOpenAt")}>
            <input className="input" type="datetime-local" value={form.sales_open_at} onChange={set("sales_open_at")} />
          </Field>
          <Field label={t("salesCloseAt")}>
            <input className="input" type="datetime-local" value={form.sales_close_at} onChange={set("sales_close_at")} />
          </Field>
        </div>

        {/* ── Cover Image with live preview ── */}
        <div>
          <label className="label">{t("coverImage")}</label>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="input py-2"
            onChange={handleCoverChange}
          />
          {coverPreview && (
            <div className="mt-3 relative inline-block rounded-xl overflow-hidden border border-green-500/40 bg-ink-800">
              <img
                src={coverPreview}
                alt="Cover preview"
                className="h-36 w-64 object-cover"
              />
              <button
                type="button"
                onClick={removeCover}
                className="absolute top-2 right-2 rounded-full bg-red-600/90 text-white p-1 hover:bg-red-700 transition text-xs shadow-md"
                title={t("remove")}
              >
                ✕
              </button>
              <div className="px-2 py-1 text-[11px] text-cream-300 truncate max-w-[250px]">
                {coverFile?.name}
              </div>
            </div>
          )}
        </div>

        {/* ── Multiple Prize Images with visual gallery preview ── */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label mb-0">{t("prizeImages")}</label>
            {prizePreviews.length > 0 && (
              <span className="text-xs text-green-300 font-medium">
                {prizePreviews.length} {lang === "am" ? "ምስሎች ተመርጠዋል" : "photos selected"}
              </span>
            )}
          </div>
          <input
            ref={prizeInputRef}
            type="file"
            accept="image/*"
            multiple
            className="input py-2"
            onChange={handlePrizeImagesChange}
          />

          {prizePreviews.length > 0 && (
            <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-3">
              {prizePreviews.map((p, idx) => (
                <div key={p.id || idx} className="relative group rounded-xl overflow-hidden border border-ink-600 bg-ink-800">
                  <img
                    src={p.url}
                    alt={`Prize preview ${idx + 1}`}
                    className="aspect-square w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePrizeImage(idx)}
                    className="absolute top-1.5 right-1.5 rounded-full bg-red-600/90 text-white w-6 h-6 flex items-center justify-center hover:bg-red-700 transition text-xs shadow-md"
                    title={t("remove")}
                  >
                    ✕
                  </button>
                  <div className="px-1.5 py-0.5 text-[10px] text-cream-400 truncate bg-ink-900/80">
                    {p.file?.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {statusText && (
          <div className="rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-300">
            {statusText}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button className="btn-primary flex-1" disabled={busy}>
            {busy ? (statusText || t("creating")) : t("createDraft")}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => navigate("/admin/lotteries")}
          >
            {t("cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return <div><label className="label">{label}</label>{children}</div>;
}
