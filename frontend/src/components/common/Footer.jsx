import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-sm text-slate-500">
              Book trusted cleaners, electricians, plumbers, carpenters and
              painters at your doorstep.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3">
            <div>
              <p className="font-bold">Explore</p>
              <ul className="mt-3 space-y-2 text-slate-500">
                <li><a href="/#services" className="hover:text-ink">Services</a></li>
                <li><a href="/#how-it-works" className="hover:text-ink">How it works</a></li>
                <li><a href="/#faq" className="hover:text-ink">FAQ</a></li>
              </ul>
            </div>
            <div>
              <p className="font-bold">Account</p>
              <ul className="mt-3 space-y-2 text-slate-500">
                <li><a href="/login" className="hover:text-ink">Login</a></li>
                <li><a href="/register" className="hover:text-ink">Sign up</a></li>
              </ul>
            </div>
            <div>
              <p className="font-bold">Providers</p>
              <ul className="mt-3 space-y-2 text-slate-500">
                <li><a href="/#provider" className="hover:text-ink">Become a provider</a></li>
                <li><a href="/login" className="hover:text-ink">Provider login</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-black/10 pt-6 text-sm text-slate-500">
          © {new Date().getFullYear()} FixPoint. All rights reserved.
        </div>
      </div>
    </footer>
  );
}