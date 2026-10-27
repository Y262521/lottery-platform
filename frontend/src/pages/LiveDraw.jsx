import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import Countdown from "../components/Countdown";
import DrawAnimation from "../components/DrawAnimation";

export default function LiveDraw() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [draw, setDraw] = useState(null);
  const [reveal, setReveal] = useState(null);
  const [clientSeed, setClientSeed] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await apiClient.getDraw(id);
      setDraw(d);
      if (d.status === "COMPLETED") {
        // If completed, fetch nothing extra; numbers are already on draw.
      }
    } catch (e) {
      setError(e.message);
    }
  }, [id]);

  useEffect(() => {
    load();
    // Pre-fill a demo client seed.
    setClientSeed(`community-${id}-${Date.now().toString(16).slice(-6)}`);
  }, [load, id]);

  async function runDraw() {
    setError("");
    setBusy(true);
    try {
      const r = await apiClient.runDraw(id, clientSeed || undefined);
      setReveal(r);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const numbers = draw?.winning_numbers || reveal?.winning_numbers || [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <button onClick={() => navigate(-1)} className="mb-4 text-sm text-cream-300 hover:text-cream-100">
        ← Back
      </button>

      {error && (
        <div className="mb-4 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-300">
          {error}
        </div>
      )}

      {draw && (
        <div className="card p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-cream-50">{draw.title}</h1>
              <p className="text-sm text-cream-300">
                Pick {draw.numbers_per_ticket} from {draw.number_min}–{draw.number_max}
              </p>
            </div>
            <span className={`pill ${
              draw.status === "COMPLETED"
                ? "bg-green-500/15 text-green-300"
                : draw.status === "FROZEN"
                ? "bg-ink-600 text-cream-200"
                : "bg-ink-700 text-cream-300"
            }`}>
              {draw.status}
            </span>
          </div>

          {/* Countdown when not yet completed */}
          {draw.status === "SCHEDULED" && (
            <div className="mt-6 flex items-center justify-between rounded-xl bg-ink-800 px-4 py-3">
              <span className="text-xs uppercase tracking-wider text-cream-400">Draws in</span>
              <Countdown to={draw.draw_at} className="text-green-400" />
            </div>
          )}

          {/* Admin controls */}
          {isAdmin && draw.status !== "COMPLETED" && draw.status !== "CANCELLED" && (
            <div className="mt-6 rounded-xl border border-ink-600 bg-ink-800/60 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-cream-300">
                Operator controls
              </h3>
              <p className="mt-1 text-xs text-cream-400">
                Freeze sales, then run the draw. A client seed is combined with the
                committed server seed to derive the result.
              </p>
              <label className="label mt-3" htmlFor="cseed">Client seed (public)</label>
              <input
                id="cseed"
                className="input"
                value={clientSeed}
                onChange={(e) => setClientSeed(e.target.value)}
                placeholder="e.g. a published block hash"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn-ghost" onClick={() => apiClient.freezeDraw(id).then(load).catch((e) => setError(e.message))}>
                  Freeze sales
                </button>
                <button className="btn-primary" disabled={busy} onClick={runDraw}>
                  {busy ? "Running…" : "Run draw"}
                </button>
              </div>
            </div>
          )}

          {/* Winning numbers / animation */}
          {numbers.length > 0 && (
            <div className="mt-8">
              <h2 className="text-center text-xs font-semibold uppercase tracking-wider text-cream-300">
                Winning numbers
              </h2>
              <div className="mt-6">
                <DrawAnimation numbers={numbers} />
              </div>
            </div>
          )}

          {/* Reveal & verification */}
          {(draw.status === "COMPLETED" || reveal) && (
            <VerifyPanel draw={draw} reveal={reveal} />
          )}
        </div>
      )}
    </div>
  );
}

function VerifyPanel({ draw, reveal }) {
  const serverSeed = reveal?.server_seed;
  const hash = reveal?.server_seed_hash || draw.server_seed_hash;
  const clientSeed = reveal?.client_seed;
  const nonce = reveal?.nonce ?? draw.id;
  const winning = reveal?.winning_numbers || draw.winning_numbers;

  const localHash = useMemo(() => {
    if (!serverSeed) return null;
    // Lightweight SHA-256 in the browser via SubtleCrypto.
    return null; // computed below in effect
  }, [serverSeed]);

  const [computed, setComputed] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!serverSeed) return;
      try {
        const buf = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(serverSeed)
        );
        const hex = Array.from(new Uint8Array(buf))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        if (!cancelled) setComputed(hex);
      } catch {
        if (!cancelled) setComputed("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [serverSeed]);

  const matches = computed && hash && computed === hash;

  return (
    <div className="mt-8 rounded-xl border border-ink-600 bg-ink-900 p-5 font-mono text-xs leading-relaxed">
      <h3 className="mb-3 font-sans text-xs font-semibold uppercase tracking-wider text-green-300">
        Provable fairness — verify this draw
      </h3>
      <Row label="published hash" value={hash ? `${hash.slice(0, 32)}…` : "—"} />
      <Row label="server seed (revealed)" value={serverSeed ? `${serverSeed.slice(0, 24)}…` : "hidden until reveal"} />
      <Row label="client seed" value={clientSeed || draw.client_seed || "—"} />
      <Row label="nonce" value={String(nonce)} />
      <Row label="winning numbers" value={winning?.join(", ") || "—"} />
      <Row
        label="SHA-256(server seed)"
        value={computed ? `${computed.slice(0, 32)}…` : "computing…"}
      />
      {serverSeed && (
        <div className={`mt-3 rounded-lg px-3 py-2 ${matches ? "bg-green-500/15 text-green-300" : "bg-ink-700 text-cream-300"}`}>
          {matches
            ? "✓ Hash matches the published commitment. This draw is verifiable."
            : computed === "error"
            ? "Could not compute hash locally."
            : "Verifying…"}
        </div>
      )}
      {!serverSeed && (
        <p className="mt-3 text-cream-400">
          The server seed stays hidden until the draw runs. After reveal, the
          values above let you recompute the result independently.
        </p>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-ink-700 py-1.5">
      <span className="text-cream-400">{label}</span>
      <span className="break-all text-right text-cream-100">{value}</span>
    </div>
  );
}
