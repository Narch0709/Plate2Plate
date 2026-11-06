import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../AuthContext";
import Brand from "./Brand";

const TABS = {
  donor: [
    { to: "/donor", label: "My listings", end: true },
    { to: "/donor/new", label: "Post food" },
  ],
  ngo: [],
  admin: [],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const tabs = TABS[user.role] || [];

  return (
    <div className="min-h-screen pb-16">
      <header className="sticky top-0 z-10 border-b border-line bg-white">
        <div className="mx-auto flex max-w-md items-center justify-between px-5 py-3">
          <Brand className="text-xl" />
          <button onClick={logout} className="text-sm font-medium text-muted hover:text-ink">
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 py-5">
        <Outlet />
      </main>

      {tabs.length > 1 && (
        <nav className="fixed inset-x-0 bottom-0 border-t border-line bg-white">
          <div
            className="mx-auto grid max-w-md"
            style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}
          >
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `-mt-px py-3.5 text-center text-sm font-semibold ${
                    isActive ? "border-t-2 border-brand text-brand" : "text-muted"
                  }`
                }
              >
                {t.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}