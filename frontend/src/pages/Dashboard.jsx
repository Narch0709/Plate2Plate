import { useAuth } from "../AuthContext";
import Brand from "../components/Brand";

function Row({ k, v }) {
  return (
    <div className="flex justify-between gap-4 px-3 py-3">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-medium capitalize-first">{v}</dd>
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-md items-center justify-between px-5 py-3">
          <Brand className="text-xl" />
          <button onClick={logout} className="text-sm font-medium text-muted hover:text-ink">
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Account</p>
        <dl className="mt-2 divide-y divide-line rounded-[4px] border border-line bg-white text-[15px]">
          <Row k="Name" v={user.name} />
          <Row k="Email" v={user.email} />
          <Row k="Role" v={user.role.toUpperCase()} />
        </dl>

        {user.role === "ngo" && !user.is_verified && (
          <p className="mt-5 border-l-4 border-accent bg-white px-3 py-2 text-sm">
            Your NGO is awaiting admin approval. You can claim food once it is approved.
          </p>
        )}
      </main>
    </div>
  );
}