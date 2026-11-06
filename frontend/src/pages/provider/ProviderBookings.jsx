import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  Phone,
  MapPin,
  User,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  DollarSign,
  Loader2,
  Lock,
} from "lucide-react";
import ProviderLayout from "../../components/provider/ProviderLayout";
import StatusBadge from "../../components/common/StatusBadge";
import Modal from "../../components/common/Modal";
import { httpClient, getErrorMessage } from "../../lib/http";

export default function ProviderBookings() {
  const [scope, setScope] = useState("upcoming"); // "upcoming" | "past" | "all"
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Action modal for status changes
  const [actionModal, setActionModal] = useState(null); // { booking, action: "complete" | "no-show" | "cancel", title }
  const [cancelReason, setCancelReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await httpClient.get(`/provider/bookings?scope=${scope}`);
      if (res.data?.success) {
        setBookings(res.data.bookings || []);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load bookings"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [scope]);

  const handleOpenAction = (booking, action, title) => {
    setActionModal({ booking, action, title });
    setCancelReason("");
  };

  const handleConfirmAction = async () => {
    if (!actionModal) return;

    setActionLoading(true);
    try {
      if (actionModal.action === "cancel") {
        if (!cancelReason.trim()) {
          toast.error("Please enter a cancellation reason.");
          setActionLoading(false);
          return;
        }
        const res = await httpClient.post(
          `/provider/bookings/${actionModal.booking._id}/cancel`,
          { reason: cancelReason.trim() }
        );
        if (res.data?.success) {
          toast.success("Booking cancelled and Rs 200 booking fee refunded to customer.");
          setActionModal(null);
          fetchBookings();
        }
      } else {
        const targetStatus = actionModal.action === "complete" ? "completed" : "no-show";
        const res = await httpClient.put(
          `/provider/bookings/${actionModal.booking._id}/status`,
          { status: targetStatus }
        );
        if (res.data?.success) {
          toast.success(
            `Booking marked as ${targetStatus === "completed" ? "Completed" : "No-Show"}.`
          );
          setActionModal(null);
          fetchBookings();
        }
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Action failed"));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <ProviderLayout title="Bookings">
      <div className="space-y-6">
        {/* Header & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-ink sm:text-2xl">Client Appointments</h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage your upcoming service visits and update appointment statuses.
            </p>
          </div>

          <div className="flex rounded-full bg-slate-100 p-1 self-start sm:self-auto border border-slate-200">
            <button
              type="button"
              onClick={() => setScope("upcoming")}
              className={`rounded-full px-5 py-2 text-xs font-bold transition ${
                scope === "upcoming"
                  ? "bg-white text-ink shadow-xs"
                  : "text-slate-500 hover:text-ink"
              }`}
            >
              Upcoming
            </button>
            <button
              type="button"
              onClick={() => setScope("past")}
              className={`rounded-full px-5 py-2 text-xs font-bold transition ${
                scope === "past"
                  ? "bg-white text-ink shadow-xs"
                  : "text-slate-500 hover:text-ink"
              }`}
            >
              Past / Completed
            </button>
            <button
              type="button"
              onClick={() => setScope("all")}
              className={`rounded-full px-5 py-2 text-xs font-bold transition ${
                scope === "all"
                  ? "bg-white text-ink shadow-xs"
                  : "text-slate-500 hover:text-ink"
              }`}
            >
              All
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 w-full animate-pulse rounded-3xl bg-slate-100" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-xs border border-black/5">
            <Clock className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-lg font-bold text-ink">No bookings found</h3>
            <p className="mt-1 text-sm text-slate-500">
              {scope === "upcoming"
                ? "You have no upcoming appointment bookings scheduled at this time."
                : "No past bookings recorded in your history."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const isConfirmed = booking.status === "confirmed";
              const isCompleted = booking.status === "completed";
              const hasCustomerContact = Boolean(booking.customerPhone && booking.address);

              return (
                <div
                  key={booking._id}
                  className="rounded-3xl bg-white p-6 shadow-xs border border-black/5 transition hover:shadow-md sm:p-7"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                    {/* Left: Booking Details */}
                    <div className="space-y-4 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono text-xs font-bold text-slate-400">
                          #{booking.bookingId || booking._id?.slice(-6).toUpperCase()}
                        </span>
                        <StatusBadge status={booking.status} />
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          {booking.category}
                        </span>
                      </div>

                      {/* Date, Time & Estimated Price */}
                      <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-ink">
                        <span className="flex items-center gap-1.5 text-slate-700">
                          <Calendar className="h-4 w-4 text-slate-400" /> {booking.date}
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-700">
                          <Clock className="h-4 w-4 text-slate-400" /> {booking.slotStart} – {booking.slotEnd}
                        </span>
                        <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl">
                          <DollarSign className="h-3.5 w-3.5" />
                          Est: Rs {booking.estimatedPrice?.toLocaleString()}
                        </span>
                      </div>

                      {/* Customer Info (Privacy Protected) */}
                      <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-bold text-ink">
                          <User className="h-4 w-4 text-slate-400" />
                          {booking.customerName}
                        </div>

                        {hasCustomerContact ? (
                          <>
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                              <Phone className="h-3.5 w-3.5 text-slate-400" />
                              <a href={`tel:${booking.customerPhone}`} className="hover:underline font-mono">
                                {booking.customerPhone}
                              </a>
                            </div>

                            <div className="flex items-start gap-2 text-xs text-slate-600">
                              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <span>
                                {booking.address?.line}
                                {booking.address?.area ? `, ${booking.address.area}` : ""}
                                {booking.address?.city ? `, ${booking.address.city}` : ""}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-slate-400 italic">
                            <Lock className="h-3.5 w-3.5" />
                            Contact phone and full address are hidden until the booking fee is paid and confirmed.
                          </div>
                        )}

                        {booking.notes && (
                          <div className="flex items-start gap-2 text-xs text-slate-600 pt-1 border-t border-slate-200/60">
                            <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="italic">Note: "{booking.notes}"</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
                      {isConfirmed && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenAction(booking, "complete", "Mark as Completed")
                            }
                            className="btn-dark text-xs py-2 px-4 flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Mark completed
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleOpenAction(booking, "no-show", "Mark as No-Show")
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                          >
                            <AlertCircle className="h-4 w-4 text-amber-500" /> No-show
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleOpenAction(
                                booking,
                                "cancel",
                                "Cancel Booking & Refund Customer"
                              )
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
                          >
                            <XCircle className="h-4 w-4" /> Cancel (Refund Rs 200)
                          </button>
                        </>
                      )}

                      {isCompleted && (
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full self-start lg:self-end">
                          <CheckCircle2 className="h-4 w-4" /> Service Completed
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Action Confirmation Modal */}
        {actionModal && (
          <Modal
            isOpen={Boolean(actionModal)}
            onClose={() => !actionLoading && setActionModal(null)}
            title={actionModal.title}
          >
            <div className="space-y-4">
              {actionModal.action === "cancel" ? (
                <>
                  <p className="text-sm text-slate-600">
                    Cancelling this booking will immediately refund the Rs 200 booking fee to the customer via Stripe. Please provide a brief cancellation reason:
                  </p>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                      Reason for cancellation *
                    </label>
                    <textarea
                      rows={3}
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="e.g. Unforeseen emergency, tools unavailable..."
                      className="input-field text-sm"
                    />
                  </div>
                </>
              ) : actionModal.action === "complete" ? (
                <p className="text-sm text-slate-600">
                  Are you sure you want to mark this appointment as completed? Ensure you have collected the agreed service payment directly from the customer.
                </p>
              ) : (
                <p className="text-sm text-slate-600">
                  Are you sure you want to mark this booking as no-show? Only select this if the customer was not present at the appointment location.
                </p>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  disabled={actionLoading}
                  className="rounded-full px-5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAction}
                  disabled={actionLoading}
                  className={
                    actionModal.action === "cancel"
                      ? "rounded-full bg-red-600 px-5 py-2 text-xs font-bold text-white hover:bg-red-700 flex items-center gap-2"
                      : "btn-dark text-xs py-2 px-5 flex items-center gap-2"
                  }
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                    </>
                  ) : (
                    "Confirm"
                  )}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </ProviderLayout>
  );
}