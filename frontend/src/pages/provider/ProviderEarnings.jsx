import { useState, useEffect } from "react";
import { toast } from "sonner";
import { TrendingUp, Clock, CheckCircle2, Banknote, Info, Loader2 } from "lucide-react";
import ProviderLayout from "../../components/provider/ProviderLayout";
import { httpClient, getErrorMessage } from "../../lib/http";

function SummaryCard({ icon: Icon, label, value, colorClass = "text-ink" }) {
  return (
    <div className="bg-white rounded-3xl border border-black/5 p-5 shadow-xs flex items-center gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-pastel-mint">
        <Icon className={`h-5 w-5 ${colorClass}`} />
      </div>
      <div>
        <p className="text-xs text-slate-500 font-semibold">{label}</p>
        <p className={`text-xl font-extrabold ${colorClass}`}>{value}</p>
      </div>
    </div>
  );
}

export default function ProviderEarnings() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  const fetchEarnings = async (p = 1) => {
    try {
      const res = await httpClient.get(`/provider/earnings?page=${p}&limit=15`);
      if (res.data?.success) {
        setSummary(res.data.summary);
        setBookings(res.data.bookings || []);
        setPagination(res.data.pagination || { total: 0, pages: 1 });
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load earnings"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void Promise.resolve().then(() => fetchEarnings(page)); }, [page]);

  return (
    <ProviderLayout title="My Earnings">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-extrabold text-ink sm:text-2xl">Earnings Overview</h2>
          <p className="mt-1 text-sm text-slate-500">
            Your share from completed jobs. Admin pays out manually via bank / Easypaisa / JazzCash.
          </p>
        </div>

        {loading && !summary ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard icon={TrendingUp} label="Total Earned" value={`Rs ${(summary?.totalEarned || 0).toLocaleString()}`} colorClass="text-emerald-700" />
              <SummaryCard icon={Clock} label="Pending Payout" value={`Rs ${(summary?.pendingPayout || 0).toLocaleString()}`} colorClass="text-amber-700" />
              <SummaryCard icon={Banknote} label="Total Paid Out" value={`Rs ${(summary?.totalPaidOut || 0).toLocaleString()}`} colorClass="text-blue-700" />
              <SummaryCard icon={CheckCircle2} label="Completed Jobs" value={summary?.completedJobs || 0} colorClass="text-ink" />
            </div>

            {/* Info Note */}
            <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 flex items-start gap-3">
              <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800 leading-relaxed">
                All earnings pass through the FixPoint platform. Admin reviews pending payouts and transfers your share via bank, Easypaisa, or JazzCash.
                A <strong>20% platform commission</strong> is deducted from each booking total.
              </p>
            </div>

            {/* Completed Bookings Table */}
            <div className="rounded-3xl bg-white border border-black/5 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h3 className="text-sm font-extrabold text-ink">Completed Jobs</h3>
              </div>

              {bookings.length === 0 ? (
                <div className="p-10 text-center text-sm text-slate-400">No completed jobs yet.</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50 text-left">
                          <th className="px-5 py-3 font-bold text-slate-500 uppercase tracking-wider">ID</th>
                          <th className="px-5 py-3 font-bold text-slate-500 uppercase tracking-wider">Date</th>
                          <th className="px-5 py-3 font-bold text-slate-500 uppercase tracking-wider">Services</th>
                          <th className="px-5 py-3 font-bold text-slate-500 uppercase tracking-wider text-right">Total</th>
                          <th className="px-5 py-3 font-bold text-slate-500 uppercase tracking-wider text-right">Commission</th>
                          <th className="px-5 py-3 font-bold text-slate-500 uppercase tracking-wider text-right text-emerald-700">Your Share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bookings.map((b) => (
                          <tr key={b._id} className="hover:bg-slate-50 transition">
                            <td className="px-5 py-3 font-mono font-bold text-slate-500">
                              #{b.bookingId || b._id?.slice(-6).toUpperCase()}
                            </td>
                            <td className="px-5 py-3 text-slate-700">
                              {b.date}
                              <span className="text-slate-400 ml-1">{b.slotStart}</span>
                            </td>
                            <td className="px-5 py-3 text-slate-700 max-w-[180px] truncate">
                              {(b.items || []).map((i) => i.title).join(", ") || "—"}
                            </td>
                            <td className="px-5 py-3 text-right font-semibold text-slate-700">
                              Rs {(b.total || 0).toLocaleString()}
                            </td>
                            <td className="px-5 py-3 text-right text-rose-600 font-semibold">
                              −Rs {(b.commissionAmount || 0).toLocaleString()}
                            </td>
                            <td className="px-5 py-3 text-right font-extrabold text-emerald-700">
                              Rs {(b.providerAmount || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {pagination.pages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-slate-100">
                      <p className="text-xs text-slate-400">{pagination.total} total jobs</p>
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
    </ProviderLayout>
  );
}
