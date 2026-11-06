import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api";
import { useAuth } from "../../AuthContext";

const FOOD_TYPES = [
  "Cooked meals",
  "Bakery items",
  "Fruits and vegetables",
  "Packaged food",
  "Beverages",
  "Other",
];
const WINDOWS = [1, 2, 3, 4, 6, 8];

const field =
  "mt-1 w-full rounded-[4px] border border-line bg-white px-3 py-2.5 text-[15px] outline-none focus:border-brand focus:ring-1 focus:ring-brand";
const label = "block text-[11px] font-semibold uppercase tracking-wider text-muted";

export default function PostFood() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    food_type: FOOD_TYPES[0],
    quantity_servings: "",
    description: "",
    address: user.address || "",
  });
  const [hours, setHours] = useState(4);
  const [coords, setCoords] = useState(null);
  const [locMsg, setLocMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  function captureLocation() {
    if (!navigator.geolocation) {
      setLocMsg("This browser cannot share its location.");
      return;
    }
    setLocMsg("Getting location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocMsg("Location captured");
      },
      () => setLocMsg("Could not get the location. You can still post with the address."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/listings", {
        method: "POST",
        body: {
          title: form.title,
          food_type: form.food_type,
          description: form.description || null,
          quantity_servings: Number(form.quantity_servings),
          address: form.address,
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
          safe_until: new Date(Date.now() + hours * 3600 * 1000).toISOString(),
        },
      });
      navigate("/donor");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold">Post surplus food</h1>

      <form onSubmit={submit} className="mt-5 space-y-5">
        <div>
          <label className={label}>What is being donated</label>
          <input
            className={field}
            placeholder="For example, Wedding dinner leftovers"
            value={form.title}
            onChange={set("title")}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Food type</label>
            <select className={field} value={form.food_type} onChange={set("food_type")}>
              {FOOD_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Servings</label>
            <input
              type="number"
              min="1"
              className={field}
              value={form.quantity_servings}
              onChange={set("quantity_servings")}
              required
            />
          </div>
        </div>

        <div>
          <label className={label}>Notes (optional)</label>
          <textarea className={field} rows={2} value={form.description} onChange={set("description")} />
        </div>

        <div>
          <label className={label}>Pickup address</label>
          <input className={field} value={form.address} onChange={set("address")} required />
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={captureLocation}
              className="rounded-[4px] border border-brand px-3 py-1.5 text-sm font-semibold text-brand"
            >
              Use my current location
            </button>
            <span className="text-sm text-muted">{locMsg}</span>
          </div>
        </div>

        <div>
          <label className={label}>Safe to eat for</label>
          <div className="mt-1 grid grid-cols-6 gap-1.5">
            {WINDOWS.map((h) => (
              <button
                type="button"
                key={h}
                onClick={() => setHours(h)}
                className={`rounded-[4px] border py-2 text-sm font-medium ${
                  hours === h ? "border-brand bg-brand text-white" : "border-line bg-white"
                }`}
              >
                {h}h
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted">
            After this time the listing is hidden from NGOs automatically.
          </p>
        </div>

        {error && (
          <p className="border-l-4 border-danger bg-white px-3 py-2 text-sm text-danger">{error}</p>
        )}

        <button
          disabled={busy}
          className="w-full rounded-[4px] bg-brand py-3 text-[15px] font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {busy ? "Posting…" : "Post food"}
        </button>
      </form>
    </div>
  );
}