import { useCallback, useState, useEffect } from "react";
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
  CheckCircle2,
} from "lucide-react";
import CustomerLayout from "../../components/customer/CustomerLayout";
import StatusBadge from "../../components/common/StatusBadge";
import Modal from "../../components/common/Modal";
import { httpClient, getErrorMessage } from "../../lib/http";

function CountdownBadge({ target }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    if (!target) return;
    const tick = () => {
      const diff = new Date(target) - Date.now();
      if (diff <= 0) { setRemaining("Expired"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setRemaining(`${h}h ${m}m remaining`);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [target]);

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-800">
      <Clock className="h-3 w-3" /> {remaining}
    </span>
  );
}

export default function CustomerBookings() {
  const [scope, setScope] = useState("upcoming");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cancel modal
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  // No-show modal
  const [noShowBooking, setNoShowBooking] = useState(null);
  const [noShowSubmitting, setNoShowSubmitting] = useState(false);
  const [now] = useState(() => Date.now());
  const [customerNoShowWaitMinutes, setCustomerNoShowWaitMinutes] = useState(60);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await httpClient.get(`/customer/bookings?scope=${scope}`);
      if (res.data?.success) {
        setBookings(res.data.bookings || []);
        setCustomerNoShowWaitMinutes(res.data.customerNoShowWaitMinutes ?? 60);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load bookings"));
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void Promise.resolve().then(fetchBookings);
  }, [fetchBookings]);

  const handleConfirmCancel = async () => {
    if (!cancelModalBooking) return;
    setCancelSubmitting(true);
    try {
      const res = await httpClient.post(`/customer/bookings/${cancelModalBooking._id}/cancel`, {
        reason: cancelReason.trim() || "Customer requested cancellation",
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

  const handleNoShow = async () => {
    if (!noShowBooking) return;
    setNoShowSubmitting(true);
    try {
      const res = await httpClient.post(`/customer/bookings/${noShowBooking._id}/no-show`);
      if (res.data?.success) {
        toast.success("No-show reported. Full refund initiated.");
        setNoShowBooking(null);
        fetchBookings();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to report no-show"));
    } finally {
      setNoShowSubmitting(false);
    }
  };

  const canReportNoShow = (booking) => {
    if (!["confirmed", "on_the_way"].includes(booking.status)) return false;
    if (!booking.date || !booking.slotStart) return false;
    // PKT is UTC+5; slot time must be > 60 min ago
    const [h, m] = booking.slotStart.split(":").map(Number);
    const [year, month, day] = booking.date.split("-").map(Number);
    const slotStartUtc = Date.UTC(year, month - 1, day, h - 5, m);
    const diff = (now - slotStartUtc) / 60000;
    return diff >= customerNoShowWaitMinutes;
  };

  const TABS = [
    { key: "upcoming", label: "Upcoming" },
    { key: "awaiting", label: "Awaiting" },
    { key: "past", label: "Past" },
    { key: "all", label: "All" },
  ];

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

          <div className="flex flex-wrap gap-1 rounded-full bg-slate-100 p-1 self-start sm:self-auto border border-slate-200">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setScope(tab.key)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                  scope === tab.key ? "bg-white text-ink shadow-xs" : "text-slate-500 hover:text-ink"
                }`}
              >
                {tab.label}
              </button>
            ))}
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
                : scope === "awaiting"
                ? "No bookings awaiting provider response."
                : "No past bookings recorded in your history."}
            </p>
            {(scope === "upcoming" || scope === "all") && (
              <div className="mt-6">
                <Link to="/customer/search" className="btn-dark">
                  Find &amp; Book a Provider
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const isConfirmed = booking.status === "confirmed";
              const isAwaitingProvider = booking.status === "awaiting_provider";
              const isCompleted = booking.status === "completed";
              const isRejectedOrExpired = ["rejected", "expired"].includes(booking.status);
              const prov = booking.provider;
              const showNoShow = canReportNoShow(booking);

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
                        {booking.category && (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 uppercase">
                            {booking.category}
                          </span>
                        )}
                        {isAwaitingProvider && booking.respondBy && (
                          <CountdownBadge target={booking.respondBy} />
                        )}
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
                          {prov?.phone && (isConfirmed || isCompleted) && (
                            <p className="text-xs text-slate-600 flex items-center gap-1 font-mono mt-0.5">
                              <Phone className="h-3 w-3 text-slate-400" />
                              <a href={`tel:${prov.phone}`} className="hover:underline">
                                {prov.phone}
                              </a>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Services */}
                      {booking.items?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {booking.items.map((item, i) => (
                            <span key={i} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              {item.title}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Date, Time & Pricing */}
                      <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-ink">
                        <span className="flex items-center gap-1.5 text-slate-700">
                          <Calendar className="h-4 w-4 text-slate-400" /> {booking.date}
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-700">
                          <Clock className="h-4 w-4 text-slate-400" /> {booking.slotStart}
                          {booking.slotEnd ? ` – ${booking.slotEnd}` : ""}
                        </span>
                        {booking.total && (
                          <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl">
                            <DollarSign className="h-3.5 w-3.5" />
                            Rs {booking.total.toLocaleString()}
                          </span>
                        )}
                      </div>

                      {/* Awaiting Provider — card hold note */}
                      {isAwaitingProvider && (
                        <div className="rounded-2xl bg-blue-50 border border-blue-200 px-4 py-3 flex items-start gap-2">
                          <CreditCard className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-blue-800 leading-relaxed">
                            Your card is held for Rs {booking.total?.toLocaleString() ?? "—"}. You will only be charged if the provider accepts.
                          </p>
                        </div>
                      )}

                      {/* Rejected/Expired — choose another provider */}
                      {isRejectedOrExpired && prov?._id && (
                        <Link
                          to={`/customer/providers/${prov._id}?serviceIds=${(booking.items || []).map((i) => i.serviceId).join(",")}&date=${booking.date}`}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"
                        >
                          <ArrowRight className="h-3.5 w-3.5" /> Choose Another Provider
                        </Link>
                      )}

                      {/* Address */}
                      {booking.address?.line && (
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
                      <Link
                        to={`/customer/bookings/${booking._id}`}
                        className="inline-flex items-center justify-center gap-1.5 rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                      >
                        View Details
                      </Link>

                      {(isAwaitingProvider || isConfirmed) && (
                        <button
                          type="button"
                          onClick={() => setCancelModalBooking(booking)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          {isAwaitingProvider ? "Cancel Request" : "Cancel Booking"}
                        </button>
                      )}

                      {showNoShow && (
                        <button
                          type="button"
                          onClick={() => setNoShowBooking(booking)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-orange-200 bg-white px-4 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-50 transition"
                        >
                          <AlertCircle className="h-3.5 w-3.5" /> Provider Didn&apos;t Arrive
                        </button>
                      )}

                      {isCompleted && (
                        <Link
                          to={`/customer/reviews?bookingId=${booking._id}`}
                          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-pastel-mint border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-800 hover:opacity-90 transition"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Leave Review
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Cancellation Modal */}
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
                  <p className="font-bold">Cancellation Policy</p>
                  <p className="mt-0.5 leading-relaxed text-amber-800">
                    {cancelModalBooking.status === "awaiting_provider"
                      ? "Your card hold will be released immediately — you will not be charged."
                      : "Free cancellation if more than 24 hours before the slot. After that, the platform commission (20%) is retained."}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Reason (optional)
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

        {/* No-Show Modal */}
        {noShowBooking && (
          <Modal
            isOpen={Boolean(noShowBooking)}
            onClose={() => !noShowSubmitting && setNoShowBooking(null)}
            title="Report Provider No-Show"
          >
            <div className="space-y-4">
              <div className="rounded-2xl bg-orange-50 p-4 border border-orange-200 text-orange-900 text-xs flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Reporting a no-show will trigger a <strong>full refund</strong> to your card and the provider will receive a penalty. Only use this if the provider has genuinely not arrived.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNoShowBooking(null)}
                  disabled={noShowSubmitting}
                  className="rounded-full px-5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleNoShow}
                  disabled={noShowSubmitting}
                  className="rounded-full bg-orange-600 px-5 py-2 text-xs font-bold text-white hover:bg-orange-700 flex items-center gap-2"
                >
                  {noShowSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                    </>
                  ) : (
                    "Confirm No-Show"
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
