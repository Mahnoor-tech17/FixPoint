export default function StatusBadge({ status, className = "" }) {
  const normalized = (status || "").toLowerCase().replace(/[-\s]/g, "_");

  const STYLES = {
    pending: "bg-pastel-yellow text-amber-900 border-amber-200",
    pending_verification: "bg-pastel-yellow text-amber-900 border-amber-200",
    confirmed: "bg-pastel-blue text-blue-900 border-blue-200",
    approved: "bg-pastel-mint text-emerald-900 border-emerald-200",
    completed: "bg-pastel-mint text-emerald-900 border-emerald-200",
    active: "bg-pastel-mint text-emerald-900 border-emerald-200",
    cancelled: "bg-slate-100 text-slate-700 border-slate-200",
    rejected: "bg-pastel-pink text-rose-900 border-rose-200",
    no_show: "bg-pastel-peach text-orange-950 border-orange-200",
    blocked: "bg-rose-100 text-rose-900 border-rose-200",
    open: "bg-pastel-blue text-blue-900 border-blue-200",
    in_review: "bg-pastel-yellow text-amber-900 border-amber-200",
    resolved: "bg-pastel-mint text-emerald-900 border-emerald-200",
  };

  const LABELS = {
    pending: "Pending",
    pending_verification: "Under Review",
    confirmed: "Confirmed",
    approved: "Approved",
    completed: "Completed",
    active: "Active",
    cancelled: "Cancelled",
    rejected: "Rejected",
    no_show: "No-show",
    blocked: "Blocked",
    open: "Open",
    in_review: "In Review",
    resolved: "Resolved",
  };

  const style = STYLES[normalized] || "bg-soft text-slate-700 border-black/5";
  const label = LABELS[normalized] || status || "Unknown";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold tracking-tight capitalize ${style} ${className}`}
    >
      {label}
    </span>
  );
}
