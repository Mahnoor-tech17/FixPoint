import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LogOut, Menu, X } from "lucide-react";
import Logo from "./Logo";
import { clearAuth, getUser, getUserRole } from "../../lib/local-storage";

export default function DashboardLayout({ title, navItems, children }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const user = getUser();
  const role = getUserRole();
  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase();

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-6 py-6">
        <Logo />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-4">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-full px-4 py-3 text-sm font-semibold transition ${
                isActive ? "bg-ink text-white" : "text-slate-600 hover:bg-soft"
              }`
            }
          >
            <Icon className="h-5 w-5" /> {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-full px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
        >
          <LogOut className="h-5 w-5" /> Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-soft lg:flex">
      <aside className="hidden w-64 shrink-0 bg-white lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-6 text-slate-500"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 px-4 py-4 sm:px-8">
          <button
            onClick={() => setOpen(true)}
            className="rounded-full bg-white p-2.5 shadow-sm lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">{title}</h1>

          <div className="ml-auto flex items-center gap-3">

            <div className="flex items-center gap-3 rounded-full bg-white py-1.5 pl-1.5 pr-4 shadow-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">
                {initials || "U"}
              </span>
              <div className="hidden text-left leading-tight sm:block">
                <p className="text-sm font-semibold">{user?.firstName}</p>
                <p className="text-[11px] uppercase tracking-wide text-slate-400">{role}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pb-10 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
