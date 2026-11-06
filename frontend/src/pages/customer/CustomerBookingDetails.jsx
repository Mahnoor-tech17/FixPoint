import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  XCircle,
  Star,
  FileText,
  User,
} from "lucide-react";
import CustomerLayout from "../../components/customer/CustomerLayout";
import StatusBadge from "../../components/common/StatusBadge";
import Spinner from "../../components/common/Spinner";
import Modal from "../../components/common/Modal";
import StarRating from "../../components/common/StarRating";
import { httpClient, getErrorMessage } from "../../lib/http";

export default function CustomerBookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cancel modal state
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  // Review modal state
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  const fetchDetails = () => {
    setLoading(true);
    httpClient
      .get(`/bookings/${id}`)
      .then((res) => {
        if (res.data?.success) {
          setBooking(res.data.booking);
        }
      })
      .catch((err) => {
        toast.error(getErrorMessage(err, "Failed to load booking details"));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleCancelBooking = async () => {
    if (!cancelReason.trim() || cancelReason.trim().length < 3) {
      toast.error("Please provide a reason of at least 3 characters.");
      return;
    }
    setCancelLoading(true);
    try {
      const res = await httpClient.put(`/bookings/${booking._id}/cancel`, {
        reason: cancelReason.trim(),
      });
      if (res.data?.success) {
        toast.success("Booking cancelled successfully.");
        setCancelOpen(false);
        fetchDetails();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to cancel booking."));
    } finally {
      setCancelLoading(false);
    }
  };

  const handleReviewBooking = async () => {
    setReviewLoading(true);
    try {
      const res = await httpClient.post("/reviews", {
        bookingId: booking._id,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      if (res.data?.success) {
        toast.success("Review submitted! Thank you.");
        setReviewOpen(false);
        fetchDetails();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to submit review."));
    } finally {
      setReviewLoading(false);
    }
  };

  if (loading) {
    return (
      <CustomerLayout title="Booking Details">
        <div className="py-20 flex justify-center">
          <Spinner size="lg" />
        </div>
      </CustomerLayout>
    );
  }

  if (!booking) {
    return (
      <CustomerLayout title="Booking Details">
        <div className="p-8 bg-white rounded-3xl border border-gray-100 text-center">
          <h2 className="text-lg font-bold text-ink mb-2">Booking Not Found</h2>
          <Link to="/customer/bookings" className="btn-dark text-xs px-4 py-2">
            Back to Bookings
          </Link>
        </div>
      </CustomerLayout>
    );
  }

  const isPending = booking.status === "pending";
  const isConfirmed = booking.status === "confirmed";
  const isCompleted = booking.status === "completed";
  const isCancelled = booking.status === "cancelled";
  const canCancel = isPending || isConfirmed;

  return (
    <CustomerLayout title={`Booking ${booking.bookingId}`}>
      <div className="space-y-6 max-w-4xl">
        {/* Back Link */}
        <Link
          to="/customer/bookings"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-ink transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to all bookings
        </Link>

        {/* Status Header Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl sm:text-2xl font-black text-ink">
                {booking.bookingId}
              </h2>
              <StatusBadge status={booking.status} />
            </div>
            <p className="text-xs text-gray-500">
              Placed on {new Date(booking.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canCancel && (
              <button
                type="button"
                onClick={() => setCancelOpen(true)}
                className="px-4 py-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-bold transition flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                Cancel Booking
              </button>
            )}

            {isCompleted && !booking.reviewed && (
              <button
                type="button"
                onClick={() => setReviewOpen(true)}
                className="btn-dark text-xs px-4 py-2 flex items-center gap-1.5"
              >
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                Rate & Review
              </button>
            )}
          </div>
        </div>

        {/* Cancellation Notice (if cancelled) */}
        {isCancelled && (
          <div className="p-5 rounded-3xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
            <div className="flex items-center gap-2 font-bold text-rose-900">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              This booking was cancelled by the {booking.cancelledBy || "system"}
            </div>
            {booking.cancelReason && (
              <p className="pl-6 text-rose-700">Reason: "{booking.cancelReason}"</p>
            )}
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Info (2 cols) */}
          <div className="md:col-span-2 space-y-6">
            {/* Service & Schedule Card */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
                Service & Appointment Details
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <span className="text-xs text-gray-500">Service</span>
                  <span className="text-sm font-bold text-ink">
                    {booking.serviceTitle}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <span className="text-xs text-gray-500">Category</span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-pastel-yellow text-ink uppercase">
                    {booking.categorySlug?.replace("-", " ")}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <span className="text-xs text-gray-500">Scheduled Date</span>
                  <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {booking.date}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <span className="text-xs text-gray-500">Time Window</span>
                  <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {booking.startTime} - {booking.endTime} ({booking.durationMinutes} mins)
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-gray-500">Price Snapshot</span>
                  <span className="text-lg font-black text-ink">
                    PKR {booking.priceSnapshot}
                  </span>
                </div>
              </div>
            </div>

            {/* Destination Address Card */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
                Service Address & Contact
              </h3>

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-ink">
                    {booking.customerStreet}
                  </p>
                  <p className="text-xs text-gray-500">{booking.customerCity}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="text-xs font-semibold text-ink">
                  {booking.customerPhone}
                </span>
              </div>

              {booking.notes && (
                <div className="pt-2 border-t border-gray-100 text-xs text-gray-500 italic">
                  Note: "{booking.notes}"
                </div>
              )}
            </div>

            {/* Reschedule History (if any) */}
            {booking.rescheduleHistory?.length > 0 && (
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">
                  Reschedule History
                </h3>
                <div className="space-y-2">
                  {booking.rescheduleHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="text-xs text-gray-600 flex items-center justify-between p-2.5 bg-gray-50 rounded-xl"
                    >
                      <span>
                        Changed from {item.previousDate} ({item.previousStartTime})
                      </span>
                      <span className="text-gray-400 text-[10px]">
                        {new Date(item.rescheduledAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Provider Card (1 col) */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
                Assigned Provider
              </h3>

              <div className="flex items-center gap-4">
                {booking.providerId?.profilePhoto ? (
                  <img
                    src={booking.providerId.profilePhoto}
                    alt={booking.providerId.firstName}
                    className="w-16 h-16 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-pastel-mint flex items-center justify-center font-black text-ink text-lg">
                    {booking.providerId?.firstName?.[0]}
                    {booking.providerId?.lastName?.[0]}
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-bold text-ink">
                    {booking.providerId?.firstName} {booking.providerId?.lastName}
                  </h4>
                  <p className="text-xs text-gray-500 capitalize">
                    {booking.providerId?.serviceCategory?.replace("-", " ")}
                  </p>
                  <StarRating
                    rating={booking.providerId?.rating?.average || 5}
                    size="sm"
                    showValue
                  />
                </div>
              </div>

              {/* Provider Contact Number (Privacy check: only if confirmed or completed) */}
              <div className="pt-3 border-t border-gray-100">
                {booking.providerId?.phone ? (
                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs text-emerald-800">
                    <span className="font-bold block mb-1">Direct Phone Contact:</span>
                    <a
                      href={`tel:${booking.providerId.phone}`}
                      className="font-black text-sm text-emerald-950 underline"
                    >
                      {booking.providerId.phone}
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">
                    Provider phone number will be displayed once the booking is confirmed.
                  </p>
                )}
              </div>

              <Link
                to={`/providers/${booking.providerId?._id}`}
                className="w-full btn-dark justify-center text-xs py-2.5 block text-center mt-2"
              >
                View Full Profile
              </Link>
            </div>
          </div>
        </div>

        {/* CANCEL MODAL */}
        <Modal
          isOpen={cancelOpen}
          onClose={() => setCancelOpen(false)}
          title="Cancel Booking"
        >
          <div className="space-y-4">
            <p className="text-xs text-gray-600">
              Are you sure you want to cancel booking{" "}
              <span className="font-bold text-ink">{booking.bookingId}</span>?
            </p>
            <textarea
              rows={3}
              placeholder="State your reason for cancellation..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full text-xs rounded-xl border border-gray-200 p-3"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setCancelOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-100"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={cancelLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white"
              >
                {cancelLoading ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </Modal>

        {/* REVIEW MODAL */}
        <Modal
          isOpen={reviewOpen}
          onClose={() => setReviewOpen(false)}
          title="Rate & Review"
        >
          <div className="space-y-4">
            <div className="flex flex-col items-center">
              <StarRating
                rating={reviewRating}
                interactive
                onChange={setReviewRating}
                size="lg"
              />
            </div>
            <textarea
              rows={3}
              placeholder="Write your review..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              className="w-full text-xs rounded-xl border border-gray-200 p-3"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setReviewOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReviewBooking}
                disabled={reviewLoading}
                className="btn-dark text-xs px-5 py-2 font-bold"
              >
                {reviewLoading ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </CustomerLayout>
  );
}
