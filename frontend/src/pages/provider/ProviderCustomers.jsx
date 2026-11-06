import React, { useState, useEffect } from "react";
import { User, Phone, Calendar, Search } from "lucide-react";
import ProviderLayout from "../../components/provider/ProviderLayout";
import Spinner from "../../components/common/Spinner";
import EmptyState from "../../components/common/EmptyState";
import { httpClient } from "../../lib/http";

export default function ProviderCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    httpClient
      .get("/bookings?limit=200")
      .then((res) => {
        if (res.data?.success) {
          const bookings = res.data.bookings || [];

          // Group by customer
          const map = new Map();
          bookings.forEach((b) => {
            const cId = b.customerId?._id || b.customerId;
            if (!cId) return;

            if (!map.has(cId)) {
              map.set(cId, {
                id: cId,
                name: `${b.customerId?.firstName || "Customer"} ${b.customerId?.lastName || ""}`.trim(),
                phone: b.customerPhone || "N/A",
                bookingsCount: 0,
                lastBookingDate: b.date,
              });
            }

            const item = map.get(cId);
            item.bookingsCount += 1;
            if (b.date > item.lastBookingDate) {
              item.lastBookingDate = b.date;
            }
          });

          setCustomers(Array.from(map.values()));
        }
      })
      .catch((err) => console.error("Error loading customers:", err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ProviderLayout title="Client Roster">
      <div className="space-y-6">
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-ink">My Customers</h2>
            <p className="text-xs text-gray-500">
              Clients who have booked services with you.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search client by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#111111]"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={User}
            title="No customers yet"
            description="Clients will appear here once you receive and accept service bookings."
          />
        ) : (
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                  <th className="pb-3">Client Name</th>
                  <th className="pb-3">Contact Phone</th>
                  <th className="pb-3">Total Bookings</th>
                  <th className="pb-3 text-right">Last Booking Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/60 transition">
                    <td className="py-4 font-bold text-ink flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-pastel-mint flex items-center justify-center font-bold text-xs text-ink">
                        {c.name?.[0]}
                      </div>
                      {c.name}
                    </td>
                    <td className="py-4 font-semibold text-emerald-700">
                      <a href={`tel:${c.phone}`} className="hover:underline">
                        {c.phone}
                      </a>
                    </td>
                    <td className="py-4 font-bold text-ink">
                      {c.bookingsCount} {c.bookingsCount === 1 ? "job" : "jobs"}
                    </td>
                    <td className="py-4 text-right text-gray-500 font-medium">
                      {c.lastBookingDate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ProviderLayout>
  );
}
