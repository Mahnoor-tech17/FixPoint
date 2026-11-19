import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  AlertCircle,
  ArrowLeft,
  XCircle,
  Star,
  CreditCard,
  Truck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
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

  // No-show state
  const [noShowLoading, setNoShowLoading] = useState(false);

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
      // Use customer route if awaiting_provider or normal bookings route
      const endpoint =
        booking.status === "awaiting_provider"
          ? `/customer/bookings/${booking._id}/cancel`
          : `/bookings/${booking._id}/cancel`;
      const res = await httpClient.post
        ? await httpClient.post(endpoint, { reason: cancelReason.trim() }).catch(() => httpClient.put(endpoint, { reason: cancelReason.trim() }))
        : await httpClient.put(`/bookings/${booking._id}/cancel`, { reason: cancelReason.trim() });
      if (res.data?.success) {
        toast.success("Booking cancelled successfully. Any card hold has been released.");
        setCancelOpen(false);
        fetchDetails();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to cancel booking."));
    } finally {
      setCancelLoading(false);
    }
  };

  const handleProviderNoShow = async () => {
    if (!window.confirm("Confirm that the service provider did not arrive? A full refund will be initiated.")) {
      return;
    }
    setNoShowLoading(true);
    try {
      const res = await httpClient.post(`/customer/bookings/${booking._id}/no-show`);
      if (res.data?.success) {
        toast.success("Provider reported as no-show. Full refund initiated.");
        fetchDetails();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to report no-show."));
    } finally {
      setNoShowLoading(false);
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

  const isAwaiting = booking.status === "awaiting_provider";
  const isPendingPayment = booking.status === "pending_payment";
  const isConfirmed = booking.status === "confirmed";
  const isOnTheWay = booking.status === "on_the_way";
  const isInProgress = booking.status === "in_progress";
  const isCompleted = booking.status === "completed";
  const isCancelled = booking.status === "cancelled";
  const isRejected = booking.status === "rejected";
  const isExpired = booking.status === "expired";
  const isProviderNoShow = booking.status === "provider_no_show";
  const isCustomerNoShow = booking.status === "customer_no_show";

  const canCancel = isAwaiting || isPendingPayment || isConfirmed;

  // Check if provider no show button can be enabled (1 hour past slotStart in PKT)
  const canReportNoShow = (() => {
    if (booking.status !== "confirmed") return false;
    try {
      const now = new Date();
      const slotTimeStr = booking.slotStart || booking.startTime || "09:00";
      const [hours, mins] = slotTimeStr.split(":").map(Number);
      const bookingStart = new Date(`${booking.date}T${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:00`);
      // 1 hour after start
      const oneHourPast = new Date(bookingStart.getTime() + 60 * 60 * 1000);
      return now >= oneHourPast;
    } catch {
      return false;
    }
  })();

  const providerObj = booking.provider || booking.providerId;
  const items = booking.items?.length > 0 ? booking.items : [
    {
      title: booking.serviceTitle || "Service",
      price: booking.total || booking.priceSnapshot || booking.price || 0,
      durationMinutes: booking.durationMinutes || 60,
    },
  ];
  const totalAmount = booking.total || booking.priceSnapshot || booking.price || 0;
  const startTime = booking.slotStart || booking.startTime || "";
  const endTime = booking.slotEnd || booking.endTime || "";
  const street = booking.address?.line || booking.customerStreet || "";
  const city = booking.address?.city || booking.customerCity || "";
  const area = booking.address?.area || booking.customerArea || "";
  const phone = booking.phone || booking.customerPhone || "";

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
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h2 className="text-xl sm:text-2xl font-black text-ink">
                {booking.bookingId}
              </h2>
              <StatusBadge status={booking.status} />
              {booking.paymentStatus && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase tracking-wider">
                  Payment: {booking.paymentStatus}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Placed on {new Date(booking.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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

            {canReportNoShow && (
              <button
                type="button"
                onClick={handleProviderNoShow}
                disabled={noShowLoading}
                className="px-4 py-2 rounded-xl bg-amber-500 text-white hover:bg-amber-600 text-xs font-bold transition flex items-center gap-1.5"
              >
                <AlertTriangle className="w-4 h-4" />
                {noShowLoading ? "Reporting..." : "Provider Did Not Arrive"}
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

        {/* Informative Status Callouts */}
        {isAwaiting && (
          <div className="p-5 rounded-3xl bg-blue-50 border border-blue-100 text-xs text-blue-900 flex items-start gap-3">
            <CreditCard className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sm text-blue-950">
                Card Hold Active (Rs {totalAmount.toLocaleString()})
              </p>
              <p className="text-blue-800 leading-relaxed">
                Your card has an authorization hold for Rs {totalAmount.toLocaleString()}. 
                The amount will <strong>only be charged</strong> once the provider accepts your booking. 
                If the provider rejects or does not respond within the deadline, the hold is automatically released and no charge is made.
              </p>
              {booking.respondBy && (
                <p className="text-blue-700 font-semibold pt-1">
                  Provider response deadline: {new Date(booking.respondBy).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(booking.respondBy).toLocaleDateString()})
                </p>
              )}
            </div>
          </div>
        )}

        {isOnTheWay && (
          <div className="p-5 rounded-3xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-3">
            <Truck className="w-5 h-5 text-amber-600 shrink-0 animate-bounce" />
            <div>
              <p className="font-bold text-sm text-amber-950">Provider is on the way!</p>
              <p className="text-amber-800">The provider has departed and is heading to your service address.</p>
            </div>
          </div>
        )}

        {isInProgress && (
          <div className="p-5 rounded-3xl bg-purple-50 border border-purple-200 text-xs text-purple-900 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0" />
            <div>
              <p className="font-bold text-sm text-purple-950">Work in Progress</p>
              <p className="text-purple-800">The provider has arrived and is currently performing the requested services.</p>
            </div>
          </div>
        )}

        {(isRejected || isExpired || isProviderNoShow) && (
          <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-3">
            <div className="flex items-center gap-2 font-bold text-sm text-rose-950">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              {isRejected && "Booking Request Declined"}
              {isExpired && "Booking Request Expired (No Provider Response)"}
              {isProviderNoShow && "Provider Marked as No-Show"}
            </div>
            <p className="text-rose-800 leading-relaxed">
              {isRejected && "The service provider was unavailable to accept this request. Your card hold was automatically released, and nothing was charged."}
              {isExpired && "The provider did not accept within the 2-hour window. The slot and card hold have been released automatically."}
              {isProviderNoShow && "A full refund has been initiated to your original payment method."}
              {booking.rejectionReason && (
                <span className="block mt-1 font-semibold">Reason: "{booking.rejectionReason}"</span>
              )}
            </p>
            <div className="pt-2">
              <Link
                to="/customer/search"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-ink text-white font-bold text-xs hover:bg-neutral-800 transition"
              >
                <RotateCcw className="w-4 h-4" />
                Choose Another Provider
              </Link>
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="p-5 rounded-3xl bg-neutral-100 border border-neutral-200 text-xs text-neutral-800 space-y-1">
            <div className="flex items-center gap-2 font-bold text-neutral-900">
              <AlertCircle className="w-4 h-4 text-neutral-600" />
              This booking was cancelled by the {booking.cancelledBy || "system"}
            </div>
            {booking.cancelReason && (
              <p className="pl-6 text-neutral-700">Reason: "{booking.cancelReason}"</p>
            )}
          </div>
        )}

        {isCustomerNoShow && (
          <div className="p-5 rounded-3xl bg-neutral-100 border border-neutral-200 text-xs text-neutral-800 space-y-1">
            <div className="flex items-center gap-2 font-bold text-neutral-900">
              <AlertCircle className="w-4 h-4 text-neutral-600" />
              Appointment marked as customer no-show
            </div>
            <p className="pl-6 text-neutral-700">
              The provider waited at your location. 80% was refunded to your card and the 20% platform fee was retained.
            </p>
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Info (2 cols) */}
          <div className="md:col-span-2 space-y-6">
            {/* Services Cart List Card */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
                Booked Services ({items.length})
              </h3>

              <div className="divide-y divide-gray-100">
                {items.map((item, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-ink">{item.title}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {item.durationMinutes} minutes
                      </p>
                    </div>
                    <span className="text-sm font-black text-ink">
                      PKR {item.price?.toLocaleString()}
                    </span>
                  </div>
                ))}

                <div className="pt-4 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </span>
                  <span className="text-xl font-black text-ink">
                    PKR {totalAmount?.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Schedule & Appointment Details */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
                Appointment Schedule
              </h3>

              <div className="space-y-3">
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
                    {startTime} - {endTime} ({booking.durationMinutes || 60} mins)
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-gray-500">Payment Status</span>
                  <span className="text-xs font-bold uppercase px-2.5 py-1 rounded bg-slate-100 text-slate-800">
                    {booking.paymentStatus || "pending"}
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
                    {street || "Address provided"}
                  </p>
                  <p className="text-xs text-gray-500">{area ? `${area}, ` : ""}{city}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="text-xs font-semibold text-ink">
                  {phone || "No phone provided"}
                </span>
              </div>

              {booking.notes && (
                <div className="pt-2 border-t border-gray-100 text-xs text-gray-500 italic">
                  Note: "{booking.notes}"
                </div>
              )}
            </div>
          </div>

          {/* Provider Card (1 col) */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
                Assigned Provider
              </h3>

              <div className="flex items-center gap-4">
                {providerObj?.profilePhoto ? (
                  <img
                    src={providerObj.profilePhoto}
                    alt={providerObj.firstName}
                    className="w-16 h-16 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-pastel-mint flex items-center justify-center font-black text-ink text-lg">
                    {providerObj?.firstName?.[0] || "P"}
                    {providerObj?.lastName?.[0] || ""}
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-bold text-ink">
                    {providerObj?.firstName} {providerObj?.lastName}
                  </h4>
                  <p className="text-xs text-gray-500 capitalize">
                    {providerObj?.serviceCategory?.replace("-", " ") || "Home Services"}
                  </p>
                  <StarRating
                    rating={providerObj?.rating?.average || 5}
                    size="sm"
                    showValue
                  />
                </div>
              </div>

              {/* Provider Contact Number (Privacy check: only if confirmed or later) */}
              <div className="pt-3 border-t border-gray-100">
                {providerObj?.phone ? (
                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs text-emerald-800">
                    <span className="font-bold block mb-1">Direct Phone Contact:</span>
                    <a
                      href={`tel:${providerObj.phone}`}
                      className="font-black text-sm text-emerald-950 underline"
                    >
                      {providerObj.phone}
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">
                    Provider phone number will be displayed once the booking is confirmed.
                  </p>
                )}
              </div>

              {providerObj?._id && (
                <Link
                  to={`/customer/providers/${providerObj._id}`}
                  className="w-full btn-dark justify-center text-xs py-2.5 block text-center mt-2"
                >
                  Book More Services
                </Link>
              )}
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
              {isAwaiting && " Since this is awaiting provider confirmation, your card hold will be released immediately."}
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
