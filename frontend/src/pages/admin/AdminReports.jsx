import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  DollarSign,
  Award,
  PieChart,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import Spinner from "../../components/common/Spinner";
import StarRating from "../../components/common/StarRating";
import { httpClient, getErrorMessage } from "../../lib/http";

export default function AdminReports() {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    httpClient
      .get("/admin/reports")
      .then((res) => {
        if (res.data?.success) {
          setReports(res.data.reports);
        }
      })
      .catch((err) => {
        toast.error(getErrorMessage(err, "Failed to load reports"));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const response = await httpClient.get("/admin/reports/export-csv", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `fixpoint-bookings-${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success("CSV file downloaded successfully!");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to export CSV"));
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Reports & Analytics">
        <div className="py-20 flex justify-center">
          <Spinner size="lg" />
        </div>
      </AdminLayout>
    );
  }

  const statusCounts = reports?.statusCounts || {};
  const categoryCounts = reports?.categoryCounts || [];
  const topProviders = reports?.topProviders || [];
  const bookingsDaily = reports?.bookingsDaily || [];

  return (
    <AdminLayout title="Reports & Analytics">
      <div className="space-y-8">
        {/* Header with Export CTA */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-ink">Platform Performance Reports</h2>
            <p className="text-xs text-gray-500">
              Overview of booking velocity, gross revenue, category volumes, and top-rated providers.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exporting}
            className="btn-dark text-xs px-5 py-2.5 flex items-center gap-2 font-bold"
          >
            <Download className="w-4 h-4" />
            {exporting ? "Generating CSV..." : "Export Bookings CSV"}
          </button>
        </div>

        {/* Status Distribution Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { key: "pending", label: "Pending", color: "text-amber-600", bg: "bg-amber-50" },
            { key: "confirmed", label: "Confirmed", color: "text-blue-600", bg: "bg-blue-50" },
            { key: "completed", label: "Completed", color: "text-emerald-600", bg: "bg-emerald-50" },
            { key: "cancelled", label: "Cancelled", color: "text-rose-600", bg: "bg-rose-50" },
            { key: "no_show", label: "No-Show", color: "text-gray-600", bg: "bg-gray-100" },
          ].map((item) => (
            <div
              key={item.key}
              className={`p-4 rounded-2xl ${item.bg} border border-black/5`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                {item.label}
              </span>
              <span className={`text-2xl font-black ${item.color} mt-1 block`}>
                {statusCounts[item.key] || 0}
              </span>
            </div>
          ))}
        </div>

        {/* Category Performance & Top Providers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Breakdown */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
              Category Volume & Revenue
            </h3>

            {categoryCounts.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No bookings recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {categoryCounts.map((cat) => (
                  <div
                    key={cat._id}
                    className="p-4 rounded-2xl bg-gray-50 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-ink uppercase">
                        {cat._id?.replace("-", " ")}
                      </span>
                      <span className="text-[11px] text-gray-500 block">
                        {cat.count} total bookings
                      </span>
                    </div>
                    <span className="text-sm font-black text-ink">
                      PKR {cat.revenue}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top 5 Providers */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
              Top Rated Providers
            </h3>

            {topProviders.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No approved providers yet.</p>
            ) : (
              <div className="space-y-3">
                {topProviders.map((p, i) => (
                  <div
                    key={p._id}
                    className="p-3.5 rounded-2xl bg-gray-50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-ink text-white text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <div>
                        <span className="text-xs font-bold text-ink block">
                          {p.firstName} {p.lastName}
                        </span>
                        <span className="text-[10px] text-gray-400 capitalize">
                          {p.serviceCategory?.replace("-", " ")}
                        </span>
                      </div>
                    </div>

                    <StarRating
                      rating={p.rating?.average || 5}
                      reviewCount={p.rating?.count || 0}
                      size="sm"
                      showValue
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 30 Days Bookings Activity Table */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">
            Daily Booking Activity (Last 30 Days)
          </h3>

          {bookingsDaily.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No booking activity in the last 30 days.</p>
          ) : (
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Total Placed</th>
                    <th className="pb-3">Completed</th>
                    <th className="pb-3 text-right">Revenue (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bookingsDaily.map((d) => (
                    <tr key={d._id} className="hover:bg-gray-50/60 transition">
                      <td className="py-3 font-semibold text-ink">{d._id}</td>
                      <td className="py-3 font-bold text-ink">{d.count}</td>
                      <td className="py-3 text-emerald-600 font-bold">
                        {d.completedCount}
                      </td>
                      <td className="py-3 text-right font-black text-ink">
                        PKR {d.revenue}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
