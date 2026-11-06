import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import useLive from "../../hooks/useLive";
import useTick from "../../hooks/useTick";
import { timeLeft } from "../../lib/format";

export default function Available() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState(null);
  useTick();

  const load = useCallback(() => {
    api("/listings")
      .then((data) => {
        setItems(data);
        setError("");
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useLive((msg) => {
    if (msg.type === "listing_status") load();
  });

  async function claim(id) {
    setBusyId(id);
    setNotice("");
    try {
      await api(`/claims/listing/${id}`, { method: "POST" });
      setNotice("You have claimed this food.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
      load();
    }
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold">Available food</h1>
      <p className="mt-1 text-sm text-muted">Updates appear here as donors post, with no refresh needed.</p>

      {error && <p className="mt-4 border-l-4 border-accent bg-white px-3 py-2 text-sm">{error}</p>}
      {notice && <p className="mt-4 border-l-4 border-brand bg-white px-3 py-2 text-sm">{notice}</p>}

      {items === null && !error && <p className="mt-6 text-sm text-muted">Loading…</p>}
      {items && items.length === 0 && (
        <p className="mt-6 text-sm text-muted">Nothing is available right now. New listings will show up here.</p>
      )}

      <ul className="mt-4 space-y-3">
        {items?.map((l) => (
          <li key={l.id} className="border border-line bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-medium leading-snug">{l.title}</h3>
                <p className="mt-0.5 text-sm text-muted">
                  {l.quantity_servings} servings · {l.food_type}
                </p>
              </div>
              <span className="shrink-0 font-mono text-[13px] text-accent">{timeLeft(l.safe_until)}</span>
            </div>
            <p className="mt-2 text-sm text-muted">{l.address}</p>
            <div className="mt-3 flex justify-end border-t border-line pt-3">
              <button
                onClick={() => claim(l.id)}
                disabled={busyId === l.id}
                className="rounded-[4px] bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
              >
                {busyId === l.id ? "Claiming…" : "Claim"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}