import { useState } from "react";
import { api } from "../api";
import Timeline from "./Timeline";

export default function HandoverPanel({ claim, status, track }) {
  const [code, setCode] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const ngoName = claim.ngo.org_name || claim.ngo.name;
  const canGenerate = ["claimed", "in_transit"].includes(status);

  async function generate() {
    setBusy(true);
    setError("");
    try {
      setCode(await api(`/claims/${claim.id}/otp`, { method: "POST" }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 border-t border-line pt-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Collected by</p>
      <p className="mt-0.5 font-medium">{ngoName}</p>

      <div className="mt-3">
        <Timeline status={status} />
      </div>

      {status === "in_transit" && (
        <p className="mt-3 font-mono text-[13px]">
          {track?.distance_km != null
            ? `${track.distance_km} km away · about ${track.eta_minutes} min`
            : "Waiting for the NGO location…"}
        </p>
      )}

      {canGenerate && (
        <div className="mt-4 border border-line bg-paper p-3">
          {code ? (
            <>
              <p className="text-xs text-muted">
                Handover code. Share it with the NGO volunteer only when they arrive.
              </p>
              <p className="mt-1 font-mono text-3xl font-medium tracking-[0.3em]">{code.otp}</p>
              <p className="mt-1 text-xs text-muted">
                Valid until{" "}
                {new Date(code.expires_at).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">Generate a handover code when the volunteer arrives.</p>
          )}
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
          <button
            onClick={generate}
            disabled={busy}
            className="mt-3 rounded-[4px] border border-brand px-4 py-2 text-sm font-semibold text-brand disabled:opacity-60"
          >
            {code ? "Generate a new code" : "Generate handover code"}
          </button>
        </div>
      )}
    </div>
  );
}