import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  DollarSign,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import StatusBadge from "../../components/common/StatusBadge";
import { httpClient, getErrorMessage } from "../../lib/http";

const TYPE_LABELS = {
  provider_registration: "Registration Fee",
  booking_fee: "Booking Fee",
};

const STATUS_STYLES = {
  paid: "bg-emerald-100 text-emerald-900",
  pending: "bg-amber-100 text-amber-900",
  failed: "bg-rose-100 text-rose-900",
  refunded: "bg-slate-100 text-slate-700",
};

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [totals, setTotals] = useState({ registrationFees: 0, bookingFees: 0, refunds: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  // Filters
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const fetchPayments = async (pg = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(pg),
        limit: "20",
        ...(filterType !== "all" && { type: filterType }),
        ...(filterStatus !== "all" && { status: filterStatus }),
      });
      const res = await httpClient.get(`/admin/payments?${params.toString()}`);
      if (res.data?.success) {
        setPayments(res.data.payments || []);
        setPagination({
          page: res.data.pagination?.page || 1,
          pages: res.data.pagination?.pages || 1,
          total: res.data.pagination?.total || 0,
        });
        setTotals(res.data.totals || { registrationFees: 0, bookingFees: 0, refunds: 0, totalRevenue: 0 });
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load payments"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments(1);
  }, [filterType, filterStatus]);

  const formatPKR = (n) => `Rs ${(n || 0).toLocaleString()}`;

  return (
    <AdminLayout title="Payments">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-ink sm:text-2xl">Platform Payments</h2>
            <p className="mt-1 text-sm text-slate-500">
              View all Stripe payment transactions — registration fees and booking fees.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fetchPayments(pagination.page)}
            className="btn-dark self-start sm:self-auto flex items-center gap-2 text-xs py-2 px-4"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>

        {/* Revenue Totals Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl bg-pastel-mint p-6 border border-emerald-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase text-emerald-800">Total Revenue</span>
              <DollarSign className="h-4 w-4 text-emerald-700" />
            </div>
            <p className="text-2xl font-extrabold text-ink">{formatPKR(totals.totalRevenue)}</p>
            <p className="text-xs text-emerald-700 mt-1">Net (fees - refunds)</p>
          </div>

          <div className="rounded-3xl bg-pastel-blue p-6 border border-blue-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase text-blue-800">Registration Fees</span>
              <CheckCircle2 className="h-4 w-4 text-blue-700" />
            </div>
            <p className="text-2xl font-extrabold text-ink">{formatPKR(totals.registrationFees)}</p>
            <p className="text-xs text-blue-700 mt-1">Provider Rs 500 fees collected</p>
          </div>

          <div className="rounded-3xl bg-pastel-yellow p-6 border border-amber-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase text-amber-800">Booking Fees</span>
              <CreditCard className="h-4 w-4 text-amber-700" />
            </div>
            <p className="text-2xl font-extrabold text-ink">{formatPKR(totals.bookingFees)}</p>
            <p className="text-xs text-amber-700 mt-1">Customer Rs 100 fees collected</p>
          </div>

          <div className="rounded-3xl bg-pastel-pink p-6 border border-rose-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase text-rose-800">Total Refunds</span>
              <XCircle className="h-4 w-4 text-rose-700" />
            </div>
            <p className="text-2xl font-extrabold text-ink">{formatPKR(totals.refunds)}</p>
            <p className="text-xs text-rose-700 mt-1">Refunded to customers</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="rounded-3xl bg-white p-5 shadow-xs border border-black/5 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold uppercase text-slate-500">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-ink"
            >
              <option value="all">All Types</option>
              <option value="provider_registration">Registration Fee</option>
              <option value="booking_fee">Booking Fee</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold uppercase text-slate-500">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-ink"
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          <span className="ml-auto text-xs text-slate-400">
            {pagination.total} transaction{pagination.total !== 1 ? "s" : ""} found
          </span>
        </div>

        {/* Payments Table */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 w-full animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : payments.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-xs border border-black/5">
            <CreditCard className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-lg font-bold text-ink">No payments found</h3>
            <p className="mt-1 text-sm text-slate-500">
              No transactions match the current filters.
            </p>
          </div>
        ) : (
          <div className="rounded-3xl bg-white shadow-xs border border-black/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Type</th>
                    <th className="px-5 py-4">User</th>
                    <th className="px-5 py-4">Amount</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Booking</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((pmt) => {
                    const user = pmt.user;
                    const booking = pmt.booking;
                    return (
                      <tr key={pmt._id} className="hover:bg-slate-50 transition">
                        <td className="px-5 py-4 text-xs text-slate-500 font-mono whitespace-nowrap">
                          {new Date(pmt.createdAt).toLocaleDateString("en-PK", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                          <br />
                          <span className="text-[10px] text-slate-400">
                            {new Date(pmt.createdAt).toLocaleTimeString("en-PK", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              pmt.type === "provider_registration"
                                ? "bg-blue-100 text-blue-900"
                                : "bg-amber-100 text-amber-900"
                            }`}
                          >
                            {TYPE_LABELS[pmt.type] || pmt.type}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          {user ? (
                            <div>
                              <p className="font-semibold text-ink text-xs">
                                {user.firstName} {user.lastName}
                              </p>
                              <p className="text-[11px] text-slate-400">{user.email}</p>
                              <span
                                className={`text-[10px] font-bold uppercase rounded px-1 py-0.5 ${
                                  user.role === "PROVIDER"
                                    ? "bg-blue-50 text-blue-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {user.role}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Unknown user</span>
                          )}
                        </td>

                        <td className="px-5 py-4 font-extrabold text-ink whitespace-nowrap">
                          Rs {(pmt.amount || 0).toLocaleString()}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${
                              STATUS_STYLES[pmt.status] || "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {pmt.status}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-xs text-slate-500">
                          {booking ? (
                            <div>
                              <p className="font-mono text-[11px] text-slate-400">
                                #{booking.bookingId || booking._id?.slice(-6)?.toUpperCase()}
                              </p>
                              <p className="text-xs text-slate-600">
                                {booking.date}
                                {booking.slotStart ? ` @ ${booking.slotStart}` : ""}
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
                <span className="text-xs text-slate-500">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pagination.page <= 1}
                    onClick={() => fetchPayments(pagination.page - 1)}
                    className="rounded-full px-4 py-1.5 text-xs font-bold text-ink border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={pagination.page >= pagination.pages}
                    onClick={() => fetchPayments(pagination.page + 1)}
                    className="rounded-full px-4 py-1.5 text-xs font-bold text-ink border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
