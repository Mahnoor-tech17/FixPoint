import { Link } from "react-router-dom";
import { Wrench } from "lucide-react";

export default function Logo({ className = "" }) {
  return (
    <Link
      to="/"
      className={`flex items-center gap-2 text-xl font-extrabold tracking-tight ${className}`}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-white">
        <Wrench className="h-5 w-5" />
      </span>
      FixPoint
    </Link>
  );
}