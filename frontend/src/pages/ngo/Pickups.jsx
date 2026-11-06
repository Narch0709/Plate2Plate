import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import useLive from "../../hooks/useLive";
import useShareLocation from "../../hooks/useShareLocation";
import StatusChip from "../../components/StatusChip";
import Timeline from "../../components/Timeline";
import { shortDate } from "../../lib/format";

const label = "block text-[11px] font-semibold uppercase tracking-wider text-muted";

function PickupCard({ claim, onChange }) {
  const l = claim.listing;
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState(false);

  useShareLocation({
    claimId: claim.id,
    enabled: l.status === "in_transit",
    demo,
    latitude: l.latitude,
    longitude: l.longitude,
  });

  async function act(path, body) {
    setBusy(true);
    setError("");
    try {
      await api(`/claims/${claim.id}/${path}`, { method: "POST", body });
      setOtp("");
      onChange();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function cancelClaim() {
    if (window.confirm("Cancel this pickup? The food goes back to other NGOs.")) act("cancel");
  }

  const primary =
    "rounded-[4px] bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60";

  return (
    <li className="border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium leading-snug">{l.title}</h3>
          <p className="mt-0.5 text-sm text-muted">
            {l.quantity_servings} servings · {l.food_type}
          </p>
        </div>
        <StatusChip status={l.status} />
      </div>
      <p className="mt-2 text-sm">
        <span className="text-muted">Pickup from</span> {l.donor.org_name || l.donor.name}
      </p>
      <p className="text-sm text-muted">{l.address}</p>

      <div className="mt-4 border-t border-line pt-4">
        <Timeline status={l.status} />
      </div>

      {error && (
        <p className="mt-3 border-l-4 border-danger bg-white px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <div className="mt-4 space-y-3 border-t border-line pt-4">
        {l.status === "claimed" && (
          <button onClick={() => act("start")} disabled={busy} className={primary}>
            Start pickup
          </button>
        )}

        {l.status === "in_transit" && (
          <>
            <p className="text-sm text-muted">
              Your location is being shared with the donor while you are on the way.
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={demo}
                onChange={(e) => setDemo(e.target.checked)}
                className="accent-brand"
              />
              Demo mode: simulate a driver instead of using GPS
            </label>
            <div>
              <label className={label}>Handover code from the donor</label>
              <div className="mt-1 flex gap-2">
                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="w-full rounded-[4px] border border-line bg-white px-3 py-2.5 font-mono text-lg tracking-[0.3em] outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
                <button
                  onClick={() => act("verify-pickup", { otp })}
                  disabled={busy || otp.length !== 6}
                  className={primary}
                >
                  Verify
                </button>
              </div>
            </div>
          </>
        )}

        {l.status === "picked_up" && (
          <button onClick={() => act("deliver")} disabled={busy} className={primary}>
            Mark as delivered
          </button>
        )}

        {["claimed", "in_transit"].includes(l.status) && (
          <button onClick={cancelClaim} disabled={busy} className="text-sm font-semibold text-danger">
            Cancel pickup
          </button>
        )}
      </div>
    </li>
  );
}

export default function Pickups() {
  const [claims, setClaims] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api("/claims/mine")
      .then(setClaims)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useLive((msg) => {
    if (msg.type === "listing_status") load();
  });

  const active = claims?.filter((c) => c.status === "active") ?? [];
  const past = claims?.filter((c) => c.status !== "active") ?? [];

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold">Your pickups</h1>

      {error && <p className="mt-4 border-l-4 border-accent bg-white px-3 py-2 text-sm">{error}</p>}
      {claims === null && !error && <p className="mt-6 text-sm text-muted">Loading…</p>}
      {claims && active.length === 0 && (
        <p className="mt-6 text-sm text-muted">No active pickups. Claim food from the Available tab.</p>
      )}

      <ul className="mt-4 space-y-3">
        {active.map((c) => (
          <PickupCard key={c.id} claim={c} onChange={load} />
        ))}
      </ul>

      {past.length > 0 && (
        <>
          <p className={`${label} mt-8`}>Past pickups</p>
          <ul className="mt-2 divide-y divide-line border border-line bg-white">
            {past.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-3">
                <div>
                  <p className="text-sm font-medium">{c.listing.title}</p>
                  <p className="text-xs text-muted">{shortDate(c.claimed_at)}</p>
                </div>
                <StatusChip status={c.status === "cancelled" ? "cancelled" : c.listing.status} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}