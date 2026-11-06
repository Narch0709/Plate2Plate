import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import Brand from "../components/Brand";

const field =
  "mt-1 w-full rounded-[4px] border border-line bg-white px-3 py-2.5 text-[15px] outline-none focus:border-brand focus:ring-1 focus:ring-brand";
const label = "block text-[11px] font-semibold uppercase tracking-wider text-muted";

const ROLES = [
  { value: "donor", title: "Donor", text: "Hotel, caterer or host with surplus food" },
  { value: "ngo", title: "NGO", text: "Organisation that collects and distributes food" },
];

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "donor",
    org_name: "",
    address: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        await register({
          ...form,
          org_name: form.org_name || null,
          address: form.address || null,
        });
      }
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-md px-5 pb-10 pt-10">
      <Brand />
      <p className="mt-1 text-sm text-muted">Surplus food, routed to NGOs that need it.</p>

      <h1 className="mt-10 font-serif text-3xl font-semibold">
        {mode === "login" ? "Log in" : "Create your account"}
      </h1>

      <form onSubmit={submit} className="mt-6 space-y-5">
        {mode === "register" && (
          <>
            <fieldset>
              <legend className={label}>Registering as</legend>
              <div className="mt-1 divide-y divide-line rounded-[4px] border border-line bg-white">
                {ROLES.map((r) => (
                  <label key={r.value} className="flex cursor-pointer items-start gap-3 px-3 py-3">
                    <input
                      type="radio"
                      name="role"
                      value={r.value}
                      checked={form.role === r.value}
                      onChange={set("role")}
                      className="mt-1 accent-brand"
                    />
                    <span>
                      <span className="block text-[15px] font-medium">{r.title}</span>
                      <span className="block text-sm text-muted">{r.text}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label className={label}>Your name</label>
              <input className={field} value={form.name} onChange={set("name")} required />
            </div>
            <div>
              <label className={label}>
                {form.role === "ngo" ? "NGO name" : "Organisation (optional)"}
              </label>
              <input
                className={field}
                value={form.org_name}
                onChange={set("org_name")}
                required={form.role === "ngo"}
              />
            </div>
            <div>
              <label className={label}>Address</label>
              <input className={field} value={form.address} onChange={set("address")} />
            </div>
          </>
        )}

        <div>
          <label className={label}>Email</label>
          <input type="email" className={field} value={form.email} onChange={set("email")} required />
        </div>
        <div>
          <label className={label}>Password</label>
          <input
            type="password"
            className={field}
            value={form.password}
            onChange={set("password")}
            minLength={8}
            required
          />
        </div>

        {error && (
          <p className="border-l-4 border-danger bg-white px-3 py-2 text-sm text-danger">{error}</p>
        )}

        <button
          disabled={busy}
          className="w-full rounded-[4px] bg-brand py-3 text-[15px] font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        {mode === "login" ? "New to Plate2Plate? " : "Already registered? "}
        <button
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
          className="font-semibold text-brand underline"
        >
          {mode === "login" ? "Create an account" : "Log in"}
        </button>
      </p>
    </div>
  );
}