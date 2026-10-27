import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import Countdown from "../components/Countdown";
import DrawAnimation from "../components/DrawAnimation";

export default function LiveDraw() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { t } = useLang();

  const [draw, setDraw] = useState(null);
  const [reveal, setReveal] = useState(null);
  const [clientSeed, setClientSeed] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setDraw(await apiClient.getDraw(id)); }
    catch (e) { setError(e.message); }
  }, [id]);

  useEffect(() => {
    load();
    setClientSeed(`community-${id}-${Date.now().toString(16).slice(-6)}`);
  }, [load, id]);

  async function runDraw() {
    setError(""); setBusy(true);
    try {
      const r = await apiClient.runDraw(id, clientSeed || undefined);
      setReveal(r); await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  const numbers = draw?.winning_numbers || reveal?.winning_numbers || [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <button onClick={() => navigate(-1)} className="mb-4 text-sm text-cream-300 hover:text-cream-100">← {t("backToDraws")}</button>

      {error && (
        <div className="mb-4 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-300">{error}</div>
      )}

      {draw && (
        <div className="card p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-cream-50">{draw.title}</h1>
              <p className="text-sm text-cream-300">
                {t("pickExactly")} {draw.numbers_per_ticket} · {draw.number_min}–{draw.number_max}
              </p>
            </div>
            <span className={`pill ${draw.status === "COMPLETED" ? "bg-green-500/15 text-green-300" : "bg-ink-700 text-cream-300"}`}>
              {draw.status}
            </span>
          </div>

          {draw.status === "SCHEDULED" && (
            <div className="mt-6 flex items-center justify-between rounded-xl bg-ink-800 px-4 py-3">
              <span className="text-xs uppercase tracking-wider text-cream-400">{t("runDraw")}</span>
              <Countdown to={draw.draw_at} className="text-green-400" />
            </div>
          )}

          {isAdmin && draw.status !== "COMPLETED" && draw.status !== "CANCELLED" && (
            <div className="mt-6 rounded-xl border border-ink-600 bg-ink-800/60 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-cream-300">{t("operatorControls")}</h3>
              <label className="label mt-3" htmlFor="cseed">{t("clientSeed")}</label>
              <input id="cseed" className="input" value={clientSeed}
                onChange={(e) => setClientSeed(e.target.value)} />
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn-ghost"
                  onClick={() => apiClient.freezeDraw(id).then(load).catch((e) => setError(e.message))}>
                  {t("freezeSales")}
                </button>
                <button className="btn-primary" disabled={busy} onClick={runDraw}>
                  {busy ? t("running") : t("runDraw")}
                </button>
              </div>
            </div>
          )}

          {numbers.length > 0 && (
            <div className="mt-8">
              <h2 className="text-center text-xs font-semibold uppercase tracking-wider text-cream-300">
                {t("winningNumbers")}
              </h2>
              <div className="mt-6"><DrawAnimation numbers={numbers} /></div>
            </div>
          )}

          {(draw.status === "COMPLETED" || reveal) && (
            <VerifyPanel draw={draw} reveal={reveal} t={t} />
          )}
        </div>
      )}
    </div>
  );
}

function VerifyPanel({ draw, reveal, t }) {
  const serverSeed = reveal?.server_seed;
  const hash = reveal?.server_seed_hash || draw.server_seed_hash;
  const clientSeed = reveal?.client_seed || draw.client_seed;
  const nonce = reveal?.nonce ?? draw.id;
  const winning = reveal?.winning_numbers || draw.winning_numbers;
  const [computed, setComputed] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!serverSeed) return;
      try {
        const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(serverSeed));
        const hex = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
        if (!cancelled) setComputed(hex);
      } catch { if (!cancelled) setComputed("error"); }
    })();
    return () => { cancelled = true; };
  }, [serverSeed]);

  const matches = computed && hash && computed === hash;

  return (
    <div className="mt-8 rounded-xl border border-ink-600 bg-ink-900 p-5 font-mono text-xs leading-relaxed">
      <h3 className="mb-3 font-sans text-xs font-semibold uppercase tracking-wider text-green-300">
        {t("provableFairness")}
      </h3>
      <Row label={t("publishedHash")} value={hash ? `${hash.slice(0, 32)}…` : "—"} />
      <Row label={t("serverSeedRevealed")} value={serverSeed ? `${serverSeed.slice(0, 24)}…` : t("seedHidden").split(".")[0]} />
      <Row label={t("clientSeed")} value={clientSeed || "—"} />
      <Row label={t("nonce")} value={String(nonce)} />
      <Row label={t("winningNumbers")} value={winning?.join(", ") || "—"} />
      <Row label="SHA-256(server seed)" value={computed ? `${computed.slice(0, 32)}…` : t("computing")} />
      {serverSeed && (
        <div className={`mt-3 rounded-lg px-3 py-2 ${matches ? "bg-green-500/15 text-green-300" : "bg-ink-700 text-cream-300"}`}>
          {matches ? t("hashMatches") : computed === "error" ? "Error" : t("computing")}
        </div>
      )}
      {!serverSeed && <p className="mt-3 text-cream-400">{t("seedHidden")}</p>}
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
