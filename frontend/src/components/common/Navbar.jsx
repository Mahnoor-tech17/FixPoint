import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import Logo from "./Logo";
import { getDashboardPath, getUserRole, isTokenValid } from "../../lib/local-storage";

const links = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/#services" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Become a Provider", href: "/#provider" },
  { label: "FAQ", href: "/#faq" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const loggedIn = isTokenValid();
  const dashboardPath = getDashboardPath(getUserRole());

  return (
    <header className="relative z-30 mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4 md:gap-6 lg:gap-8">
        <div className="shrink-0">
          <Logo />
        </div>

        <nav className="hidden items-center gap-4 md:flex lg:gap-6 xl:gap-8 text-xs font-semibold lg:text-sm">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="whitespace-nowrap transition hover:text-slate-500"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-3 md:flex">
          {loggedIn ? (
            <Link to={dashboardPath} className="btn-dark whitespace-nowrap">
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="whitespace-nowrap px-3 py-2 text-xs font-semibold hover:text-slate-500 lg:px-4 lg:text-sm"
              >
                Login
              </Link>
              <Link to="/register" className="btn-dark whitespace-nowrap text-xs lg:text-sm">
                Get Started
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-full bg-white p-2.5 shadow-sm md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setOpen(false)}
          />
          <div className="relative mx-4 mt-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-2xl">
            <div className="mb-2 flex items-center justify-between border-b border-gray-100 pb-3">
              <Logo />
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-soft"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col py-2">
              {links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-2xl px-4 py-3 text-sm font-semibold text-ink transition hover:bg-soft"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3">
              {loggedIn ? (
                <Link
                  to={dashboardPath}
                  onClick={() => setOpen(false)}
                  className="btn-dark w-full justify-center"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setOpen(false)}
                    className="btn-light w-full justify-center"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setOpen(false)}
                    className="btn-dark w-full justify-center"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
