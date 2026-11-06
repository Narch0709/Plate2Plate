import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import useLive from "../../hooks/useLive";
import useTick from "../../hooks/useTick";
import StatusChip from "../../components/StatusChip";
import HandoverPanel from "../../components/HandoverPanel";
import { shortDate, timeLeft } from "../../lib/format";

const ACTIVE = ["available", "claimed", "in_transit"];
const WITH_PANEL = ["claimed", "in_transit", "picked_up"];

export default function MyListings() {
  const [items, setItems] = useState(null);
  const [claims, setClaims] = useState([]);
  const [tracks, setTracks] = useState({});
  const [error, setError] = useState("");
  useTick();

  const load = useCallback(() => {
    api("/listings/mine")
      .then(setItems)
      .catch((e) => setError(e.message));
    api("/claims/incoming")
      .then(setClaims)
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useLive((msg) => {
    if (msg.type === "listing_status") load();
    if (msg.type === "location") setTracks((t) => ({ ...t, [msg.claim_id]: msg }));
  });

  const activeClaimFor = (listingId) =>
    claims.find((c) => c.listing_id === listingId && c.status === "active");

  async function cancel(id) {
    if (!window.confirm("Cancel this listing?")) return;
    try {
      await api(`/listings/${id}/cancel`, { method: "POST" });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="font-serif text-2xl font-semibold">My listings</h1>
        <Link to="/donor/new" className="text-sm font-semibold text-brand underline">
          Post food
        </Link>
      </div>

      {error && (
        <p className="mt-4 border-l-4 border-danger bg-white px-3 py-2 text-sm text-danger">{error}</p>
      )}

      {items === null && <p className="mt-6 text-sm text-muted">Loading…</p>}
      {items && items.length === 0 && (
        <p className="mt-6 text-sm text-muted">
          You have not posted any food yet. Surplus food you list here is shown to verified NGOs straight away.
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {items?.map((l) => {
          const claim = activeClaimFor(l.id);
          return (
            <li key={l.id} className="border border-line bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium leading-snug">{l.title}</h3>
                  <p className="mt-0.5 text-sm text-muted">
                    {l.quantity_servings} servings · {l.food_type}
                  </p>
                </div>
                <StatusChip status={l.status} />
              </div>
              <p className="mt-2 text-sm text-muted">{l.address}</p>

              {claim && WITH_PANEL.includes(l.status) && (
                <HandoverPanel claim={claim} status={l.status} track={tracks[claim.id]} />
              )}

              <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                <span className="font-mono text-[13px] text-accent">
                  {ACTIVE.includes(l.status) ? timeLeft(l.safe_until) : shortDate(l.created_at)}
                </span>
                {["available", "claimed"].includes(l.status) && (
                  <button onClick={() => cancel(l.id)} className="text-sm font-semibold text-danger">
                    Cancel
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}