import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  Calendar,
  DollarSign,
  Layers,
  Plus,
  ShieldAlert,
  BarChart3,
  UserCheck,
  Users,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import { getErrorMessage, httpClient } from "../../lib/http";
import { getUser } from "../../lib/local-storage";

export default function AdminDashboard() {
  const adminUser = getUser();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    httpClient
      .get("/admin/stats")
      .then((res) => setStats(res.data.stats))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout title="Admin Dashboard">
      {/* Welcome Banner */}
      <div className="mb-6 rounded-3xl bg-pastel-yellow p-6 sm:p-8 border border-black/5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="inline-block rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider text-ink mb-2">
              Administrator Portal
            </span>
            <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              Welcome back, {adminUser?.firstName || "Admin"}!
            </h2>
            <p className="mt-1 text-sm text-slate-700 max-w-lg">
              Manage platform categories, bookings, verify providers, and monitor platform performance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link to="/admin/providers" className="btn-dark text-xs sm:text-sm">
              <Plus className="h-4 w-4" /> Invite provider
            </Link>
            <Link
              to="/admin/provider-requests"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-xs sm:text-sm font-semibold text-ink shadow-xs hover:bg-ink hover:text-white transition"
            >
              <UserCheck className="h-4 w-4" /> Review requests
              {stats?.pendingRequests > 0 && (
                <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  {stats.pendingRequests}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-600 border border-red-100">
          {error}
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Pending Requests */}
        <Link
          to="/admin/provider-requests"
          className="flex min-h-44 flex-col justify-between rounded-3xl p-6 bg-pastel-blue border border-black/5 hover:border-black/15 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-blue-900 shadow-xs">
              <Clock className="h-5 w-5" />
            </span>
            <span className="flex items-center gap-1 text-xs font-bold text-blue-900 group-hover:translate-x-1 transition-transform">
              Review <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
          <div>
            <p className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
              {loading ? "..." : stats?.pendingRequests ?? 0}
            </p>
            <div className="mt-1 flex items-center justify-between">
              <p className="text-sm font-bold text-ink">Pending verification</p>
              {stats?.pendingRequests > 0 && (
                <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  Action needed
                </span>
              )}
            </div>
          </div>
        </Link>

        {/* Platform Bookings */}
        <Link
          to="/admin/bookings"
          className="flex min-h-44 flex-col justify-between rounded-3xl p-6 bg-pastel-mint border border-black/5 hover:border-black/15 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-emerald-900 shadow-xs">
              <Calendar className="h-5 w-5" />
            </span>
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-900 group-hover:translate-x-1 transition-transform">
              View All <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
          <div>
            <p className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
              {loading ? "..." : stats?.totalBookings ?? 0}
            </p>
            <p className="mt-1 text-sm font-bold text-ink">Total platform bookings</p>
          </div>
        </Link>

        {/* Platform Revenue */}
        <Link
          to="/admin/reports"
          className="flex min-h-44 flex-col justify-between rounded-3xl p-6 bg-pastel-yellow border border-black/5 hover:border-black/15 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-amber-900 shadow-xs">
              <DollarSign className="h-5 w-5" />
            </span>
            <span className="flex items-center gap-1 text-xs font-bold text-amber-900 group-hover:translate-x-1 transition-transform">
              Reports <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink">
              PKR {loading ? "..." : stats?.totalRevenue ?? 0}
            </p>
            <p className="mt-1 text-sm font-bold text-ink">Completed job revenue</p>
          </div>
        </Link>

        {/* Total Customers */}
        <Link
          to="/admin/users"
          className="flex min-h-44 flex-col justify-between rounded-3xl p-6 bg-white border border-gray-100 shadow-sm hover:border-gray-300 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-50 text-gray-700">
              <Users className="h-5 w-5" />
            </span>
            <span className="flex items-center gap-1 text-xs font-bold text-gray-500 group-hover:translate-x-1 transition-transform">
              Users <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
          <div>
            <p className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
              {loading ? "..." : stats?.totalCustomers ?? 0}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-700">Registered customers</p>
          </div>
        </Link>

        {/* Approved Providers */}
        <Link
          to="/admin/providers"
          className="flex min-h-44 flex-col justify-between rounded-3xl p-6 bg-pastel-lime border border-black/5 hover:border-black/15 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-lime-900 shadow-xs">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <span className="flex items-center gap-1 text-xs font-bold text-lime-900 group-hover:translate-x-1 transition-transform">
              Providers <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
          <div>
            <p className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
              {loading ? "..." : stats?.approvedProviders ?? 0}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-700">Approved providers</p>
          </div>
        </Link>

        {/* Total Categories */}
        <Link
          to="/admin/categories"
          className="flex min-h-44 flex-col justify-between rounded-3xl p-6 bg-pastel-teal border border-black/5 hover:border-black/15 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-teal-900 shadow-xs">
              <Layers className="h-5 w-5" />
            </span>
            <span className="flex items-center gap-1 text-xs font-bold text-teal-900 group-hover:translate-x-1 transition-transform">
              Manage <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
          <div>
            <p className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
              {loading ? "..." : stats?.totalCategories ?? 0}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-700">Service categories</p>
          </div>
        </Link>
      </div>
    </AdminLayout>
  );
}
