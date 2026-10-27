import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../api/client";
import { useLang } from "../../context/LangContext";

function toISO(local) {
  return local ? new Date(local).toISOString() : undefined;
}

export default function AdminLotteryForm() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [form, setForm] = useState({
    title: "", description: "", prize_description: "",
    ticket_price: 50, total_tickets: "", max_per_user: 10,
    draw_date: "", sales_open_at: "", sales_close_at: "",
  });
  const [coverFile, setCoverFile] = useState(null);
  const [prizeFiles, setPrizeFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const body = {
        ...form,
        ticket_price: Number(form.ticket_price),
        total_tickets: form.total_tickets ? Number(form.total_tickets) : null,
        max_per_user: Number(form.max_per_user),
        draw_date: toISO(form.draw_date),
        sales_open_at: toISO(form.sales_open_at) || null,
        sales_close_at: toISO(form.sales_close_at) || null,
      };
      const lottery = await apiClient.createLottery(body);
      // Upload images after creation — non-fatal if Cloudinary not configured
      if (coverFile) {
        try {
          const fd = new FormData(); fd.append("file", coverFile);
          await apiClient.uploadCover(lottery.id, fd);
        } catch (e) {
          console.warn("Cover upload skipped:", e.message);
        }
      }
      if (prizeFiles.length > 0) {
        try {
          const fd = new FormData();
          prizeFiles.forEach((f) => fd.append("files", f));
          await apiClient.uploadPrizeImages(lottery.id, fd);
        } catch (e) {
          console.warn("Prize images upload skipped:", e.message);
        }
      }
      navigate(`/admin/lotteries/${lottery.id}`);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-cream-50 mb-6">{t("createLottery")}</h1>
      <form onSubmit={submit} className="card p-6 space-y-4">
        <Field label={t("titleField")}><input className="input" required value={form.title} onChange={set("title")} /></Field>
        <Field label={t("description")}><textarea className="input min-h-[80px]" value={form.description} onChange={set("description")} /></Field>
        <Field label={t("prizeDescription")}><textarea className="input min-h-[80px]" required value={form.prize_description} onChange={set("prize_description")} /></Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label={t("ticketPrice")}><input className="input" type="number" min={1} required value={form.ticket_price} onChange={set("ticket_price")} /></Field>
          <Field label={t("totalTickets")}><input className="input" type="number" min={1} value={form.total_tickets} onChange={set("total_tickets")} /></Field>
          <Field label={t("maxTicketsPerUser")}><input className="input" type="number" min={1} required value={form.max_per_user} onChange={set("max_per_user")} /></Field>
          <Field label={t("drawDateField")}><input className="input" type="datetime-local" required value={form.draw_date} onChange={set("draw_date")} /></Field>
          <Field label={t("salesOpenAt")}><input className="input" type="datetime-local" value={form.sales_open_at} onChange={set("sales_open_at")} /></Field>
          <Field label={t("salesCloseAt")}><input className="input" type="datetime-local" value={form.sales_close_at} onChange={set("sales_close_at")} /></Field>
        </div>

        <Field label={t("coverImage")}><input type="file" accept="image/*" className="input py-2" onChange={(e) => setCoverFile(e.target.files[0])} /></Field>
        <Field label={t("prizeImages")}><input type="file" accept="image/*" multiple className="input py-2" onChange={(e) => setPrizeFiles([...e.target.files])} /></Field>

        {error && <div className="rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-300">{error}</div>}

        <div className="flex gap-3 pt-2">
          <button className="btn-primary flex-1" disabled={busy}>{busy ? t("creating") : t("createDraft")}</button>
          <button type="button" className="btn-ghost" onClick={() => navigate("/admin/lotteries")}>{t("cancel")}</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return <div><label className="label">{label}</label>{children}</div>;
}
