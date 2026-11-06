import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  Search,
  Filter,
  XCircle,
  AlertCircle,
  User,
  Shield,
  Download,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import StatusBadge from "../../components/common/StatusBadge";
import Spinner from "../../components/common/Spinner";
import EmptyState from "../../components/common/EmptyState";
import Pagination from "../../components/common/Pagination";
import Modal from "../../components/common/Modal";
import { httpClient, getErrorMessage } from "../../lib/http";

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  // Cancel modal
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  const fetchBookings = () => {
    setLoading(true);
    let query = `/bookings?page=${page}&limit=10`;
    if (statusFilter) query += `&status=${statusFilter}`;
    if (search.trim()) query += `&search=${encodeURIComponent(search.trim())}`;

    httpClient
      .get(query)
      .then((res) => {
        if (res.data?.success) {
          setBookings(res.data.bookings || []);
          setPages(res.data.pages || 1);
        }
      })
      .catch((err) => {
        toast.error(getErrorMessage(err, "Failed to load bookings"));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBookings();
  }, [statusFilter, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchBookings();
  };

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim() || cancelReason.trim().length < 3) {
      toast.error("Please provide a reason of at least 3 characters.");
      return;
    }

    setCancelLoading(true);
    try {
      const res = await httpClient.put(`/bookings/${cancelModalBooking._id}/status`, {
        status: "cancelled",
        reason: cancelReason.trim(),
      });
      if (res.data?.success) {
        toast.success("Booking cancelled by administrator.");
        setCancelModalBooking(null);
        fetchBookings();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to cancel booking"));
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <AdminLayout title="Bookings Oversight">
      <div className="space-y-6">
        {/* Header & Filter Controls */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs font-bold rounded-2xl border border-gray-200 px-3 py-2.5 bg-white focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No-Show</option>
            </select>
          </div>

          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-2 w-full md:w-80"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search ID, customer, service..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#111111]"
              />
            </div>
            <button type="submit" className="btn-dark text-xs px-4 py-2">
              Filter
            </button>
          </form>
        </div>

        {/* Bookings Table */}
        {loading ? (
          <div className="py-20 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : bookings.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No bookings found"
            description="There are currently no bookings matching your filter criteria."
          />
        ) : (
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                  <th className="pb-3">Booking ID</th>
                  <th className="pb-3">Service</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Provider</th>
                  <th className="pb-3">Date & Time</th>
                  <th className="pb-3">Price</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bookings.map((b) => {
                  const canCancel = ["pending", "confirmed"].includes(b.status);
                  return (
                    <tr key={b._id} className="hover:bg-gray-50/60 transition">
                      <td className="py-4 font-bold text-ink">{b.bookingId}</td>
                      <td className="py-4 font-semibold text-ink">{b.serviceTitle}</td>
                      <td className="py-4 text-gray-700">
                        {b.customerId?.firstName} {b.customerId?.lastName}
                      </td>
                      <td className="py-4 text-gray-700">
                        {b.providerId?.firstName} {b.providerId?.lastName}
                      </td>
                      <td className="py-4 text-gray-500">
                        {b.date} • {b.startTime}
                      </td>
                      <td className="py-4 font-bold text-ink">
                        PKR {b.priceSnapshot}
                      </td>
                      <td className="py-4">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="py-4 text-right">
                        {canCancel && (
                          <button
                            type="button"
                            onClick={() => {
                              setCancelModalBooking(b);
                              setCancelReason("");
                            }}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-[11px] transition"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <Pagination page={page} pages={pages} onPageChange={setPage} />
          </div>
        )}

        {/* ADMIN CANCEL MODAL */}
        <Modal
          isOpen={Boolean(cancelModalBooking)}
          onClose={() => setCancelModalBooking(null)}
          title="Admin Booking Cancellation"
        >
          <div className="space-y-4">
            <p className="text-xs text-gray-600">
              As an Administrator, you can cancel booking{" "}
              <span className="font-bold text-ink">
                {cancelModalBooking?.bookingId}
              </span>
              . Both customer and provider will receive an email.
            </p>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                Cancellation Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="State the administrative reason for cancelling this booking..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full text-xs rounded-xl border border-gray-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-[#111111]"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setCancelModalBooking(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-100 text-gray-600"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelLoading}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {cancelLoading ? "Cancelling..." : "Confirm Admin Cancellation"}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
}
