import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  Phone,
  MapPin,
  AlertCircle,
  CreditCard,
  XCircle,
  ArrowRight,
  Loader2,
  DollarSign,
  User,
  ShieldCheck,
} from "lucide-react";
import CustomerLayout from "../../components/customer/CustomerLayout";
import StatusBadge from "../../components/common/StatusBadge";
import Modal from "../../components/common/Modal";
import { httpClient, getErrorMessage } from "../../lib/http";

export default function CustomerBookings() {
  const [scope, setScope] = useState("upcoming"); // "upcoming" | "past" | "all"
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cancel modal
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  // Pay pending modal
  const [payingBookingId, setPayingBookingId] = useState(null);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await httpClient.get(`/customer/bookings?scope=${scope}`);
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

  const handlePayNow = async (bookingId) => {
    try {
      setPayingBookingId(bookingId);
      const res = await httpClient.post(`/customer/bookings/${bookingId}/pay`);
      if (res.data?.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      } else {
        toast.error("Could not resume checkout session.");
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Payment failed"));
    } finally {
      setPayingBookingId(null);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalBooking) return;

    setCancelSubmitting(true);
    try {
      const res = await httpClient.post(`/customer/bookings/${cancelModalBooking._id}/cancel`, {
        reason: cancelReason.trim(),
      });
      if (res.data?.success) {
        toast.success(res.data.message || "Booking cancelled.");
        setCancelModalBooking(null);
        fetchBookings();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Cancellation failed"));
    } finally {
      setCancelSubmitting(false);
    }
  };

  return (
    <CustomerLayout title="My Bookings">
      <div className="space-y-6">
        {/* Header & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-ink sm:text-2xl">Service Appointments</h2>
            <p className="mt-1 text-sm text-slate-500">
              Track your confirmed visits, held slots, and past services.
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
            <Calendar className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-lg font-bold text-ink">No bookings found</h3>
            <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
              {scope === "upcoming"
                ? "You don't have any upcoming service bookings. Need help at home?"
                : "No past bookings recorded in your history."}
            </p>
            {scope === "upcoming" && (
              <div className="mt-6">
                <Link to="/customer/search" className="btn-dark">
                  Find & Book a Provider
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const isConfirmed = booking.status === "confirmed";
              const isPendingPayment = booking.status === "pending_payment";
              const isCompleted = booking.status === "completed";
              const prov = booking.provider;

              return (
                <div
                  key={booking._id}
                  className="rounded-3xl bg-white p-6 shadow-xs border border-black/5 transition hover:shadow-md sm:p-7"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                    {/* Left: Provider & Slot Details */}
                    <div className="space-y-4 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono text-xs font-bold text-slate-400">
                          #{booking.bookingId || booking._id?.slice(-6).toUpperCase()}
                        </span>
                        <StatusBadge status={booking.status} />
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 uppercase">
                          {booking.category}
                        </span>
                      </div>

                      {/* Provider Info */}
                      <div className="flex items-center gap-3">
                        {prov?.profilePhoto ? (
                          <img
                            src={prov.profilePhoto}
                            alt={prov.firstName}
                            className="h-12 w-12 rounded-2xl object-cover border border-slate-100"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pastel-mint text-base font-extrabold text-ink">
                            {prov?.firstName?.[0]}
                            {prov?.lastName?.[0]}
                          </div>
                        )}
                        <div>
                          <p className="text-base font-bold text-ink">
                            {prov ? `${prov.firstName} ${prov.lastName}` : "Service Provider"}
                          </p>
                          {prov?.phone && (
                            <p className="text-xs text-slate-600 flex items-center gap-1 font-mono mt-0.5">
                              <Phone className="h-3 w-3 text-slate-400" />
                              <a href={`tel:${prov.phone}`} className="hover:underline">
                                {prov.phone}
                              </a>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Date, Time & Pricing */}
                      <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-ink">
                        <span className="flex items-center gap-1.5 text-slate-700">
                          <Calendar className="h-4 w-4 text-slate-400" /> {booking.date}
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-700">
                          <Clock className="h-4 w-4 text-slate-400" /> {booking.slotStart} – {booking.slotEnd}
                        </span>
                        <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl">
                          <DollarSign className="h-3.5 w-3.5" />
                          Est. Charges: Rs {booking.estimatedPrice?.toLocaleString()} (pay provider)
                        </span>
                      </div>

                      {/* Address */}
                      {booking.address && (
                        <div className="flex items-start gap-2 text-xs text-slate-500">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span>
                            {booking.address.line}
                            {booking.address.area ? `, ${booking.address.area}` : ""}
                            {booking.address.city ? `, ${booking.address.city}` : ""}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
                      {isPendingPayment && (
                        <button
                          type="button"
                          onClick={() => handlePayNow(booking._id)}
                          disabled={payingBookingId === booking._id}
                          className="btn-primary text-xs py-2 px-5 flex items-center justify-center gap-2"
                        >
                          {payingBookingId === booking._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CreditCard className="h-4 w-4" />
                          )}
                          Pay Rs 200 Fee Now
                        </button>
                      )}

                      {isConfirmed && (
                        <button
                          type="button"
                          onClick={() => setCancelModalBooking(booking)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Cancel Booking
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Cancellation Confirmation Modal */}
        {cancelModalBooking && (
          <Modal
            isOpen={Boolean(cancelModalBooking)}
            onClose={() => !cancelSubmitting && setCancelModalBooking(null)}
            title="Cancel Booking"
          >
            <div className="space-y-4">
              <div className="rounded-2xl bg-amber-50 p-4 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Important Cancellation Policy:</p>
                  <p className="mt-0.5 leading-relaxed text-amber-800">
                    Bookings can only be cancelled at least 24 hours prior to the scheduled slot.
                    The Rs 200 platform booking fee is non-refundable upon customer cancellation.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Reason for cancellation (optional)
                </label>
                <textarea
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Schedule conflict, problem solved..."
                  className="input-field text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCancelModalBooking(null)}
                  disabled={cancelSubmitting}
                  className="rounded-full px-5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Keep Booking
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={cancelSubmitting}
                  className="rounded-full bg-red-600 px-5 py-2 text-xs font-bold text-white hover:bg-red-700 flex items-center gap-2"
                >
                  {cancelSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Cancelling...
                    </>
                  ) : (
                    "Confirm Cancellation"
                  )}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </CustomerLayout>
  );
}