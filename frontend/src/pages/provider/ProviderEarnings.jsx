import React, { useState, useEffect } from "react";
import { DollarSign, CheckCircle2, TrendingUp, Calendar, ArrowUpRight } from "lucide-react";
import ProviderLayout from "../../components/provider/ProviderLayout";
import Spinner from "../../components/common/Spinner";
import EmptyState from "../../components/common/EmptyState";
import { httpClient } from "../../lib/http";

export default function ProviderEarnings() {
  const [loading, setLoading] = useState(true);
  const [completedBookings, setCompletedBookings] = useState([]);
  const [stats, setStats] = useState({
    grossRevenue: 0,
    jobCount: 0,
    averageOrder: 0,
    netEarnings: 0,
  });

  useEffect(() => {
    setLoading(true);
    httpClient
      .get("/bookings?status=completed&limit=200")
      .then((res) => {
        if (res.data?.success) {
          const list = res.data.bookings || [];
          setCompletedBookings(list);

          const gross = list.reduce((sum, b) => sum + (b.priceSnapshot || 0), 0);
          const count = list.length;
          const aov = count > 0 ? Math.round(gross / count) : 0;
          // Platform takes approx 10%
          const net = Math.round(gross * 0.9);

          setStats({
            grossRevenue: gross,
            jobCount: count,
            averageOrder: aov,
            netEarnings: net,
          });
        }
      })
      .catch((err) => console.error("Error loading earnings:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ProviderLayout title="Earnings & Finance">
      <div className="space-y-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-ink">Earnings Overview</h2>
            <p className="text-xs text-gray-500">
              Track your revenue from all completed home service jobs.
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-pastel-mint text-emerald-900 border border-emerald-200">
            Payment Mode: Cash / Direct Transfer
          </span>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">
              Gross Revenue
            </span>
            <span className="text-2xl font-black text-ink mt-1 block">
              PKR {stats.grossRevenue}
            </span>
            <span className="text-[10px] text-gray-400 mt-1 block">
              From {stats.jobCount} completed jobs
            </span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">
              Jobs Completed
            </span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">
              {stats.jobCount}
            </span>
            <span className="text-[10px] text-gray-400 mt-1 block">
              Verified finishes
            </span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">
              Average Order Value
            </span>
            <span className="text-2xl font-black text-ink mt-1 block">
              PKR {stats.averageOrder}
            </span>
            <span className="text-[10px] text-gray-400 mt-1 block">
              Per booking average
            </span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block">
              Estimated Net (90%)
            </span>
            <span className="text-2xl font-black text-emerald-700 mt-1 block">
              PKR {stats.netEarnings}
            </span>
            <span className="text-[10px] text-gray-400 mt-1 block">
              After 10% platform share
            </span>
          </div>
        </div>

        {/* Completed Bookings Ledger */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-ink mb-6">Completed Jobs Ledger</h3>

          {loading ? (
            <div className="py-16 flex justify-center">
              <Spinner size="lg" />
            </div>
          ) : completedBookings.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="No completed earnings yet"
              description="Revenue will start accumulating once your booked appointments are completed."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Booking ID</th>
                    <th className="pb-3">Service</th>
                    <th className="pb-3">Client</th>
                    <th className="pb-3 text-right">Amount (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {completedBookings.map((b) => (
                    <tr key={b._id} className="hover:bg-gray-50/60 transition">
                      <td className="py-4 text-gray-500 font-medium">{b.date}</td>
                      <td className="py-4 font-bold text-ink">{b.bookingId}</td>
                      <td className="py-4 font-semibold text-ink">{b.serviceTitle}</td>
                      <td className="py-4 text-gray-600">
                        {b.customerId?.firstName} {b.customerId?.lastName}
                      </td>
                      <td className="py-4 text-right font-black text-ink">
                        PKR {b.priceSnapshot}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ProviderLayout>
  );
}
