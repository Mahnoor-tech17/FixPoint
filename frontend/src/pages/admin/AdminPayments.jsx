import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  TrendingUp, Clock, CheckCircle2, Loader2, User,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import StatusBadge from "../../components/common/StatusBadge";
import { httpClient, getErrorMessage } from "../../lib/http";

export default function AdminPayments() {
  const [data, setData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [markingPaid, setMarkingPaid] = useState({});

  const fetchData = async (pg = 1) => {
    try {
      setLoading(true);
      const res = await httpClient.get(`/admin/payments?page=${pg}&limit=20`);
      if (res.data?.success) {
        setData(res.data);
        setPayments(res.data.payments || []);
        setPagination(res.data.pagination || { page: 1, pages: 1, total: 0 });
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load payments"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(page); }, [page]);

  const handleMarkPaid = async (providerId, providerName) => {
    setMarkingPaid((prev) => ({ ...prev, [providerId]: true }));
    try {
      const res = await httpClient.put(`/admin/payments/providers/${providerId}/mark-paid`);
      if (res.data?.success) {
        toast.success(`Payout marked for ${providerName}`);
        fetchData(page);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to mark payout"));
    } finally {
      setMarkingPaid((prev) => ({ ...prev, [providerId]: false }));
    }
  };

  const summary = data?.summary;
  const providersPending = data?.providersPendingPayout || [];

  return (
    <AdminLayout title="Payments & Payouts">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-extrabold text-ink sm:text-2xl">Payments &amp; Payouts</h2>
          <p className="mt-1 text-sm text-slate-500">Commission income and pending provider payouts.</p>
        </div>

        {loading && !data ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-3xl border border-black/5 p-5 shadow-xs flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-pastel-mint">
                  <TrendingUp className="h-5 w-5 text-emerald-700" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold">Total Commission Earned</p>
                  <p className="text-xl font-extrabold text-emerald-700">
                    Rs {(summary?.totalCommissionEarned || 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-3xl border border-black/5 p-5 shadow-xs flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-pastel-yellow">
                  <Clock className="h-5 w-5 text-amber-700" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold">Pending Provider Payouts</p>
                  <p className="text-xl font-extrabold text-amber-700">
                    Rs {(summary?.totalPendingProviderPayouts || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Provider Payout List */}
            {providersPending.length > 0 && (
              <div className="bg-white rounded-3xl border border-black/5 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                  <h3 className="text-sm font-extrabold text-ink">Providers Awaiting Payout</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Pay these providers via bank, Easypaisa, or JazzCash and mark as paid.</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {providersPending.map((p) => (
                    <div key={p._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pastel-mint text-sm font-extrabold text-emerald-800">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-ink">{p.firstName} {p.lastName}</p>
                          <p className="text-xs text-slate-500">{p.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Pending</p>
                          <p className="text-sm font-extrabold text-amber-700">Rs {(p.pendingPayout || 0).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Total Paid</p>
                          <p className="text-sm font-semibold text-slate-700">Rs {(p.totalPaidOut || 0).toLocaleString()}</p>
                        </div>
                        <button
                          onClick={() => handleMarkPaid(p._id, `${p.firstName} ${p.lastName}`)}
                          disabled={markingPaid[p._id]}
                          className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {markingPaid[p._id] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          Mark Paid
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Payment Transactions */}
            <div className="bg-white rounded-3xl border border-black/5 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h3 className="text-sm font-extrabold text-ink">Recent Transactions</h3>
              </div>

              {payments.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-400">No transactions yet.</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50 text-left">
                          <th className="px-5 py-3 font-bold text-slate-500 uppercase tracking-wider">User</th>
                          <th className="px-5 py-3 font-bold text-slate-500 uppercase tracking-wider">Type</th>
                          <th className="px-5 py-3 font-bold text-slate-500 uppercase tracking-wider">Status</th>
                          <th className="px-5 py-3 font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                          <th className="px-5 py-3 font-bold text-slate-500 uppercase tracking-wider">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {payments.map((p) => (
                          <tr key={p._id} className="hover:bg-slate-50">
                            <td className="px-5 py-3 text-slate-700">
                              {p.user ? `${p.user.firstName} ${p.user.lastName}` : "—"}
                              {p.user?.email && (
                                <span className="block text-slate-400 text-[11px]">{p.user.email}</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-slate-700 capitalize">
                              {(p.type || "").replace(/_/g, " ")}
                            </td>
                            <td className="px-5 py-3">
                              <StatusBadge status={p.status} />
                            </td>
                            <td className="px-5 py-3 text-right font-semibold text-slate-700">
                              Rs {(p.amount || 0).toLocaleString()}
                            </td>
                            <td className="px-5 py-3 text-slate-500">
                              {new Date(p.createdAt).toLocaleDateString("en-PK")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {pagination.pages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-slate-100">
                      <p className="text-xs text-slate-400">{pagination.total} total transactions</p>
                      <div className="flex gap-2">
                        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                          className="rounded-full px-4 py-1.5 text-xs font-semibold border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                          Prev
                        </button>
                        <span className="text-xs text-slate-500 self-center">{page} / {pagination.pages}</span>
                        <button onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}
                          className="rounded-full px-4 py-1.5 text-xs font-semibold border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
