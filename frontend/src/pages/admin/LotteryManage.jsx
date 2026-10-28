import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../../api/client";
import { useLang } from "../../context/LangContext";

export default function AdminLotteryManage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const [lottery, setLottery] = useState(null);
  const [result, setResult] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [winningNos, setWinningNos] = useState("");
  const [notes, setNotes] = useState("");
  const [videoFiles, setVideoFiles] = useState([]);
  const [proofFiles, setProofFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    setLottery(await apiClient.getLottery(id));
    apiClient.getResults(id).then(setResult).catch(() => {});
    apiClient.lotteryTickets(id).then(setTickets).catch(() => {});
  };

  useEffect(() => { load(); }, [id]);

  async function act(fn, label) {
    try { await fn(); setMsg(label + " ✓"); await load(); }
    catch (e) { setMsg(e.message); }
  }

  async function publishResults(e) {
    e.preventDefault();
    const nos = winningNos.split(",").map((s) => s.trim()).filter(Boolean);
    if (!nos.length) { setMsg(t("winningTicketNos")); return; }
    setBusy(true);
    try {
      const r = await apiClient.publishResults(id, { winning_ticket_nos: nos, notes });
      setResult(r);
      if (videoFiles.length > 0) {
        try {
          const fd = new FormData();
          videoFiles.forEach((f) => fd.append("files", f));
          await apiClient.uploadDrawVideos(id, fd);
        } catch (e) { console.warn("Video upload skipped:", e.message); }
      }
      if (proofFiles.length > 0) {
        try {
          const fd = new FormData();
          proofFiles.forEach((f) => fd.append("files", f));
          await apiClient.uploadProofImages(id, fd);
        } catch (e) { console.warn("Proof images skipped:", e.message); }
      }
      setMsg(t("resultsPublished"));
      await load();
    } catch (e) { setMsg(e.message); }
    finally { setBusy(false); }
  }

  if (!lottery) return <div className="mx-auto mt-24 max-w-4xl px-4 text-cream-300">{t("loading")}</div>;

  const confirmed = tickets.filter((tk) => ["CONFIRMED","WON","LOST"].includes(tk.status));
  const allVideos = result?.draw_video_urls?.length
    ? result.draw_video_urls
    : result?.draw_video_url ? [result.draw_video_url] : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <button onClick={() => navigate("/admin/lotteries")} className="mb-4 text-sm text-cream-300 hover:text-cream-100">
        {t("backToLotteries")}
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-cream-50">{lottery.title}</h1>
        <span className="pill bg-ink-600 text-cream-200">{lottery.status}</span>
      </div>

      {msg && <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/30 px-3 py-2 text-sm text-green-300">{msg}</div>}

      {/* Actions */}
      <div className="card p-5 mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-cream-300 mb-3">{t("actions")}</h2>
        <div className="flex flex-wrap gap-2">
          {lottery.status === "DRAFT" && (
            <button className="btn-primary" onClick={() => act(() => apiClient.publishLottery(id), t("publish"))}>{t("openSales")}</button>
          )}
          {lottery.status === "ACTIVE" && (
            <button className="btn-ghost" onClick={() => act(() => apiClient.closeLottery(id), t("closeSales"))}>{t("closeSales")}</button>
          )}
          {["DRAFT","ACTIVE","CLOSED"].includes(lottery.status) && (
            <button className="btn-danger" onClick={() => { if(confirm(t("cancelLottery") + "?")) act(() => apiClient.cancelLottery(id), t("cancel")); }}>{t("cancelLottery")}</button>
          )}
          <a href={`/lottery/${id}`} target="_blank" rel="noreferrer" className="btn-ghost text-xs">{t("viewPublicPage")}</a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Stat label={t("ticketsSold")} value={lottery.tickets_sold} />
        <Stat label={t("capacity")} value={lottery.total_tickets || t("unlimited")} />
        <Stat label={t("revenueLabel")} value={`ETB ${(lottery.tickets_sold * lottery.ticket_price).toLocaleString()}`} />
      </div>

      {/* Publish results */}
      {!result && (lottery.status === "CLOSED" || lottery.status === "ACTIVE") && (
        <form onSubmit={publishResults} className="card p-6 mb-6">
          <h2 className="text-lg font-bold text-cream-50 mb-4">{t("publishResults")}</h2>
          <div className="space-y-4">
            <div>
              <label className="label">{t("winningTicketNos")}</label>
              <input className="input font-mono" placeholder={t("winningPlaceholder")}
                value={winningNos} onChange={(e) => setWinningNos(e.target.value)} required />
            </div>
            <div>
              <label className="label">{t("notes")}</label>
              <textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">{t("drawVideoProofUpload")}</label>
                {videoFiles.length > 0 && (
                  <span className="text-xs text-green-300 font-medium">
                    {videoFiles.length} {lang === "am" ? "ቪዲዮዎች ተመርጠዋል" : "videos selected"}
                  </span>
                )}
              </div>
              <input
                type="file"
                accept="video/*"
                multiple
                className="input py-2"
                onChange={(e) => setVideoFiles(Array.from(e.target.files || []))}
              />
              {videoFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  {videoFiles.map((vf, i) => (
                    <div key={i} className="text-xs text-cream-300 truncate bg-ink-800 px-2 py-1 rounded">
                      📹 {vf.name} ({(vf.size / (1024 * 1024)).toFixed(1)} MB)
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="label">{t("photoEvidenceUpload")}</label>
              <input type="file" accept="image/*" multiple className="input py-2" onChange={(e) => setProofFiles([...e.target.files])} />
            </div>
          </div>
          <button className="btn-primary mt-5 w-full" disabled={busy}>
            {busy ? t("publishing") : t("publishResultsBtn")}
          </button>
        </form>
      )}

      {/* Published result summary */}
      {result && (
        <div className="card p-5 mb-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-green-300">{t("resultsPublished")}</h2>
          <div>
            <div className="text-xs text-cream-400 mb-2">{t("winningNumbers")}:</div>
            <div className="flex flex-wrap gap-2">
              {result.winning_ticket_nos.map((no) => (
                <span key={no} className="rounded-lg bg-green-600 px-3 py-1 font-mono text-sm text-ink-900 font-bold">{no}</span>
              ))}
            </div>
          </div>

          {/* Videos proof list */}
          <div className="pt-3 border-t border-ink-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-cream-300">{t("drawVideosProof")}</span>
              <label className="btn-ghost cursor-pointer px-3 py-1.5 text-xs inline-flex items-center gap-1.5">
                <span>+ {t("uploadVideo")}</span>
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length) return;
                    const fd = new FormData();
                    files.forEach((f) => fd.append("files", f));
                    try {
                      await apiClient.uploadDrawVideos(id, fd);
                      setMsg(t("uploadVideo") + " ✓");
                      await load();
                    } catch (err) { setMsg(err.message); }
                  }}
                />
              </label>
            </div>

            {allVideos.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {allVideos.map((vUrl, i) => (
                  <div key={i} className="rounded-xl overflow-hidden bg-ink-900 border border-ink-600">
                    <video
                      controls
                      src={vUrl}
                      className="w-full max-h-48 object-contain bg-black"
                    />
                    <div className="p-2 flex justify-between items-center text-[11px] text-cream-300">
                      <span>Video #{i + 1}</span>
                      <a href={vUrl} target="_blank" rel="noreferrer" className="text-green-300 hover:underline">{t("viewVideo")}</a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-cream-400">
                {lang === "am" ? "ገና የተጫነ ቪዲዮ የለም።" : "No draw videos uploaded yet."}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Ticket list */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-700">
          <h2 className="font-semibold text-cream-100">{t("confirmedTickets")} ({confirmed.length})</h2>
        </div>
        <div className="max-h-80 overflow-y-auto divide-y divide-ink-700">
          {confirmed.map((tk) => (
            <div key={tk.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
              <span className="font-mono text-cream-100">{tk.ticket_no}</span>
              <span className={`pill ${tk.status === "WON" ? "bg-green-600 text-ink-900" : tk.status === "LOST" ? "bg-ink-700 text-cream-400" : "bg-green-500/15 text-green-300"}`}>
                {tk.status}
              </span>
            </div>
          ))}
          {confirmed.length === 0 && (
            <div className="px-5 py-6 text-sm text-cream-400 text-center">{t("noConfirmedTickets")}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card p-4 text-center">
      <div className="text-xs uppercase tracking-wider text-cream-400">{label}</div>
      <div className="mt-1 font-mono font-bold text-green-300">{value}</div>
    </div>
  );
}
