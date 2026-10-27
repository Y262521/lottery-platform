import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../api/client";

export default function DrawResults() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lottery, setLottery] = useState(null);
  const [result, setResult] = useState(null);
  const [winners, setWinners] = useState([]);

  useEffect(() => {
    apiClient.getLottery(id).then(setLottery).catch(() => {});
    apiClient.getResults(id).then(setResult).catch(() => {});
    apiClient.getWinners(id).then(setWinners).catch(() => {});
  }, [id]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <button onClick={() => navigate("/")} className="mb-4 text-sm text-cream-300 hover:text-cream-100">
        ← Home
      </button>

      <h1 className="text-3xl font-bold text-cream-50">{lottery?.title}</h1>
      <p className="mt-1 text-cream-300">Draw results & verification</p>

      {!result ? (
        <div className="mt-8 card p-8 text-center text-cream-300">
          Results have not been published yet.
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* Winning ticket numbers */}
          <div className="card p-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-cream-300 mb-4">
              Winning Ticket Numbers
            </h2>
            <div className="flex flex-wrap gap-3">
              {result.winning_ticket_nos.map((no) => (
                <span key={no} className="rounded-xl bg-green-600 px-4 py-2 font-mono font-bold text-ink-900 shadow-glow">
                  {no}
                </span>
              ))}
            </div>
            {result.notes && (
              <p className="mt-4 text-sm text-cream-300">{result.notes}</p>
            )}
            <p className="mt-3 text-xs text-cream-400">
              Published {new Date(result.published_at).toLocaleString()}
            </p>
          </div>

          {/* Draw video */}
          {result.draw_video_url && (
            <div className="card p-6">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-cream-300 mb-4">
                Draw Video Proof
              </h2>
              <video controls className="w-full rounded-xl" src={result.draw_video_url}>
                Your browser doesn't support video.
              </video>
            </div>
          )}

          {/* Proof images */}
          {result.proof_image_urls?.length > 0 && (
            <div className="card p-6">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-cream-300 mb-4">
                Photo Evidence
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {result.proof_image_urls.map((url, i) => (
                  <img key={i} src={url} alt={`Proof ${i+1}`}
                    className="rounded-xl object-cover aspect-video" loading="lazy" />
                ))}
              </div>
            </div>
          )}

          {/* Winners */}
          {winners.length > 0 && (
            <div className="card p-6">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-cream-300 mb-4">
                Winners
              </h2>
              <ul className="space-y-2">
                {winners.map((w) => (
                  <li key={w.ticket_no} className="flex items-center gap-3">
                    <span className="text-2xl">🏆</span>
                    <span className="font-mono text-green-300">{w.ticket_no}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
