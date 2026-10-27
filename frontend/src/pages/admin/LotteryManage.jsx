import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../../api/client";

export default function AdminLotteryManage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lottery, setLottery] = useState(null);
  const [result, setResult] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [winningNos, setWinningNos] = useState("");
  const [notes, setNotes] = useState("");
  const [videoFile, setVideoFile] = useState(null);
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
    if (!nos.length) { setMsg("Enter at least one winning ticket number"); return; }
    setBusy(true);
    try {
      const r = await apiClient.publishResults(id, { winning_ticket_nos: nos, notes });
      setResult(r); setMsg("Results published ✓");

      if (videoFile) {
        const fd = new FormData(); fd.append("file", videoFile);
        await apiClient.uploadDrawVideo(id, fd);
        setMsg("Results + video uploaded ✓");
      }
      if (proofFiles.length > 0) {
        const fd = new FormData();
        proofFiles.forEach((f) => fd.append("files", f));
        await apiClient.uploadProofImages(id, fd);
      }
      await load();
    } catch (e) { setMsg(e.message); }
    finally { setBusy(false); }
  }

  if (!lottery) return <div className="mx-auto mt-24 max-w-4xl px-4 text-cream-300">Loading…</div>;

  const confirmed = tickets.filter((t) => t.status === "CONFIRMED" || t.status === "WON" || t.status === "LOST");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <button onClick={() => navigate("/admin/lotteries")} className="mb-4 text-sm text-cream-300 hover:text-cream-100">
        ← Lotteries
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-cream-50">{lottery.title}</h1>
        <span className="pill bg-ink-600 text-cream-200">{lottery.status}</span>
      </div>

      {msg && <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/30 px-3 py-2 text-sm text-green-300">{msg}</div>}

      {/* Lifecycle actions */}
      <div className="card p-5 mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-cream-300 mb-3">Actions</h2>
        <div className="flex flex-wrap gap-2">
          {lottery.status === "DRAFT" && (
            <button className="btn-primary" onClick={() => act(() => apiClient.publishLottery(id), "Published")}>
              Publish (Open Sales)
            </button>
          )}
          {lottery.status === "ACTIVE" && (
            <button className="btn-ghost" onClick={() => act(() => apiClient.closeLottery(id), "Sales closed")}>
              Close Ticket Sales
            </button>
          )}
          {["DRAFT","ACTIVE","CLOSED"].includes(lottery.status) && (
            <button className="btn-danger" onClick={() => { if(confirm("Cancel this lottery?")) act(() => apiClient.cancelLottery(id), "Cancelled"); }}>
              Cancel Lottery
            </button>
          )}
          <a href={`/lottery/${id}`} target="_blank" rel="noreferrer" className="btn-ghost text-xs">
            View Public Page ↗
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Stat label="Tickets Sold" value={lottery.tickets_sold} />
        <Stat label="Capacity" value={lottery.total_tickets || "Unlimited"} />
        <Stat label="Revenue" value={`ETB ${(lottery.tickets_sold * lottery.ticket_price).toLocaleString()}`} />
      </div>

      {/* Publish results */}
      {!result && (lottery.status === "CLOSED" || lottery.status === "ACTIVE") && (
        <form onSubmit={publishResults} className="card p-6 mb-6">
          <h2 className="text-lg font-bold text-cream-50 mb-4">Publish Draw Results</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Winning Ticket Numbers (comma-separated) *</label>
              <input className="input font-mono" placeholder="LP001-00042, LP001-00107"
                value={winningNos} onChange={(e) => setWinningNos(e.target.value)} required />
            </div>
            <div>
              <label className="label">Notes (optional)</label>
              <textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div>
              <label className="label">Draw Video Proof (optional)</label>
              <input type="file" accept="video/*" className="input py-2"
                onChange={(e) => setVideoFile(e.target.files[0])} />
            </div>
            <div>
              <label className="label">Photo Evidence (optional)</label>
              <input type="file" accept="image/*" multiple className="input py-2"
                onChange={(e) => setProofFiles([...e.target.files])} />
            </div>
          </div>
          <button className="btn-primary mt-5 w-full" disabled={busy}>
            {busy ? "Publishing…" : "Publish Results & Notify Winners"}
          </button>
        </form>
      )}

      {/* Published result summary */}
      {result && (
        <div className="card p-5 mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-green-300 mb-3">Results Published ✓</h2>
          <div className="flex flex-wrap gap-2">
            {result.winning_ticket_nos.map((no) => (
              <span key={no} className="rounded-lg bg-green-600 px-3 py-1 font-mono text-sm text-ink-900">{no}</span>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            {!result.draw_video_url && (
              <label className="btn-ghost cursor-pointer px-3 py-1.5 text-xs">
                Upload Video
                <input type="file" accept="video/*" className="hidden" onChange={async (e) => {
                  const fd = new FormData(); fd.append("file", e.target.files[0]);
                  try { await apiClient.uploadDrawVideo(id, fd); setMsg("Video uploaded ✓"); await load(); }
                  catch (err) { setMsg(err.message); }
                }} />
              </label>
            )}
            {result.draw_video_url && (
              <a href={result.draw_video_url} target="_blank" rel="noreferrer" className="btn-ghost px-3 py-1.5 text-xs">
                View Video ↗
              </a>
            )}
          </div>
        </div>
      )}

      {/* Ticket list */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-700">
          <h2 className="font-semibold text-cream-100">Confirmed Tickets ({confirmed.length})</h2>
        </div>
        <div className="max-h-80 overflow-y-auto divide-y divide-ink-700">
          {confirmed.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
              <span className="font-mono text-cream-100">{t.ticket_no}</span>
              <span className={`pill ${t.status === "WON" ? "bg-green-600 text-ink-900" : t.status === "LOST" ? "bg-ink-700 text-cream-400" : "bg-green-500/15 text-green-300"}`}>
                {t.status}
              </span>
            </div>
          ))}
          {confirmed.length === 0 && (
            <div className="px-5 py-6 text-sm text-cream-400 text-center">No confirmed tickets yet.</div>
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
