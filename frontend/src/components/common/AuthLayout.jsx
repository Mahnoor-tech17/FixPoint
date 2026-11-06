import { Check } from "lucide-react";
import Logo from "./Logo";

const points = [
  "Verified home service professionals",
  "Clear prices and real available time slots",
  "Secure online payments",
];

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="page-gradient hidden flex-col justify-between p-12 lg:flex">
        <Logo />

        <div>
          <h2 className="max-w-md text-5xl font-extrabold leading-[1.05] tracking-tight">
            Reliable home services, right at your doorstep.
          </h2>
          <ul className="mt-8 space-y-3">
            {points.map((point) => (
              <li key={point} className="flex items-center gap-3 text-sm font-medium">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-slate-500">© {new Date().getFullYear()} FixPoint</p>
      </div>

      <div className="flex items-center justify-center bg-white px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Logo className="mb-8 lg:hidden" />

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}

          <div className="mt-8">{children}</div>

          {footer && <div className="mt-6 text-center text-sm text-slate-500">{footer}</div>}
        </div>
      </div>
    </div>
  );
}