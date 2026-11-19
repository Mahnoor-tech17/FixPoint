export default function StatusBadge({ status, className = "" }) {
  const normalized = (status || "").toLowerCase().replace(/[-\s]/g, "_");

  const STYLES = {
    pending: "bg-pastel-yellow text-amber-900 border-amber-200",
    pending_payment: "bg-pastel-yellow text-amber-900 border-amber-200",
    pending_verification: "bg-pastel-yellow text-amber-900 border-amber-200",
    awaiting_provider: "bg-blue-100 text-blue-900 border-blue-200",
    confirmed: "bg-pastel-blue text-blue-900 border-blue-200",
    on_the_way: "bg-purple-100 text-purple-900 border-purple-200",
    in_progress: "bg-indigo-100 text-indigo-900 border-indigo-200",
    approved: "bg-pastel-mint text-emerald-900 border-emerald-200",
    completed: "bg-pastel-mint text-emerald-900 border-emerald-200",
    active: "bg-pastel-mint text-emerald-900 border-emerald-200",
    cancelled: "bg-slate-100 text-slate-700 border-slate-200",
    rejected: "bg-pastel-pink text-rose-900 border-rose-200",
    expired: "bg-slate-100 text-slate-600 border-slate-200",
    provider_no_show: "bg-pastel-peach text-orange-950 border-orange-200",
    customer_no_show: "bg-pastel-peach text-orange-950 border-orange-200",
    no_show: "bg-pastel-peach text-orange-950 border-orange-200",
    blocked: "bg-rose-100 text-rose-900 border-rose-200",
    open: "bg-pastel-blue text-blue-900 border-blue-200",
    in_review: "bg-pastel-yellow text-amber-900 border-amber-200",
    resolved: "bg-pastel-mint text-emerald-900 border-emerald-200",
    authorized: "bg-pastel-yellow text-amber-900 border-amber-200",
    captured: "bg-pastel-mint text-emerald-900 border-emerald-200",
    released: "bg-slate-100 text-slate-700 border-slate-200",
    refunded: "bg-slate-100 text-slate-700 border-slate-200",
  };

  const LABELS = {
    pending: "Pending",
    pending_payment: "Payment Pending",
    pending_verification: "Under Review",
    awaiting_provider: "Awaiting Provider",
    confirmed: "Confirmed",
    on_the_way: "On The Way",
    in_progress: "In Progress",
    approved: "Approved",
    completed: "Completed",
    active: "Active",
    cancelled: "Cancelled",
    rejected: "Rejected",
    expired: "Expired",
    provider_no_show: "Provider No-Show",
    customer_no_show: "Customer No-Show",
    no_show: "No-Show",
    blocked: "Blocked",
    open: "Open",
    in_review: "In Review",
    resolved: "Resolved",
    authorized: "Authorized",
    captured: "Captured",
    released: "Released",
    refunded: "Refunded",
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
