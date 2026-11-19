import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Calendar, Clock, MapPin, User, AlertCircle,
  CheckCircle2, XCircle, FileText, DollarSign, Loader2, Truck, Wrench,
} from "lucide-react";
import ProviderLayout from "../../components/provider/ProviderLayout";
import StatusBadge from "../../components/common/StatusBadge";
import Modal from "../../components/common/Modal";
import { httpClient, getErrorMessage } from "../../lib/http";

function CountdownBadge({ target }) {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    if (!target) return;
    const tick = () => {
      const diff = new Date(target) - Date.now();
      if (diff <= 0) { setRemaining("Deadline passed"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setRemaining(`${h}h ${m}m to respond`);
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

export default function ProviderBookings() {
  const [scope, setScope] = useState("awaiting");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Action modals
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);

  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState({});

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

  useEffect(() => { fetchBookings(); }, [scope]);

  const withLoading = (id) => ({ set: (v) => setActionLoading((prev) => ({ ...prev, [id]: v })), get: actionLoading[id] });

  const handleAccept = async (booking) => {
    const L = withLoading(`accept_${booking._id}`);
    L.set(true);
    try {
      const res = await httpClient.post(`/provider/bookings/${booking._id}/accept`);
      if (res.data?.success) {
        toast.success("Booking accepted! Payment captured.");
        fetchBookings();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to accept booking"));
    } finally {
      L.set(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setRejectLoading(true);
    try {
      const res = await httpClient.post(`/provider/bookings/${rejectModal._id}/reject`, {
        reason: rejectReason.trim() || "Provider unavailable",
      });
      if (res.data?.success) {
        toast.success("Booking rejected and customer notified.");
        setRejectModal(null);
        fetchBookings();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to reject booking"));
    } finally {
      setRejectLoading(false);
    }
  };

  const handleStatusUpdate = async (booking, endpoint, successMsg) => {
    const L = withLoading(`${endpoint}_${booking._id}`);
    L.set(true);
    try {
      const res = await httpClient.put(`/provider/bookings/${booking._id}/${endpoint}`);
      if (res.data?.success) {
        toast.success(successMsg);
        fetchBookings();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Action failed"));
    } finally {
      L.set(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelModal) return;
    if (!cancelReason.trim()) { toast.error("Please provide a cancellation reason"); return; }
    setCancelLoading(true);
    try {
      const res = await httpClient.post(`/provider/bookings/${cancelModal._id}/cancel`, {
        reason: cancelReason.trim(),
      });
      if (res.data?.success) {
        toast.success("Booking cancelled.");
        setCancelModal(null);
        fetchBookings();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Cancellation failed"));
    } finally {
      setCancelLoading(false);
    }
  };

  const TABS = [
    { key: "awaiting", label: "Awaiting Response" },
    { key: "upcoming", label: "Upcoming" },
    { key: "past", label: "Past" },
    { key: "all", label: "All" },
  ];

  return (
    <ProviderLayout title="My Bookings">
      <div className="space-y-6">
        {/* Header & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-ink sm:text-2xl">Job Requests & Bookings</h2>
            <p className="mt-1 text-sm text-slate-500">Manage incoming requests and track your jobs.</p>
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
            <p className="mt-1 text-sm text-slate-500">
              {scope === "awaiting" ? "No pending job requests right now." : "No bookings in this category."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const isAwaiting = booking.status === "awaiting_provider";
              const isConfirmed = booking.status === "confirmed";
              const isOnTheWay = booking.status === "on_the_way";
              const isInProgress = booking.status === "in_progress";

              return (
                <div
                  key={booking._id}
                  className="rounded-3xl bg-white p-6 shadow-xs border border-black/5 sm:p-7"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                    {/* Left */}
                    <div className="space-y-4 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono text-xs font-bold text-slate-400">
                          #{booking.bookingId || booking._id?.slice(-6).toUpperCase()}
                        </span>
                        <StatusBadge status={booking.status} />
                        {isAwaiting && booking.respondBy && (
                          <CountdownBadge target={booking.respondBy} />
                        )}
                      </div>

                      {/* Customer */}
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pastel-mint text-sm font-extrabold text-ink shrink-0">
                          <User className="h-5 w-5 text-emerald-700" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-ink">{booking.customerName || "Customer"}</p>
                          {booking.customerPhone && (
                            <p className="text-xs text-slate-500 font-mono">
                              <a href={`tel:${booking.customerPhone}`} className="hover:underline">
                                {booking.customerPhone}
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
                              {item.title} — Rs {(item.price || 0).toLocaleString()}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Date & Total */}
                      <div className="flex flex-wrap items-center gap-4 text-sm font-semibold">
                        <span className="flex items-center gap-1.5 text-slate-700">
                          <Calendar className="h-4 w-4 text-slate-400" /> {booking.date}
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-700">
                          <Clock className="h-4 w-4 text-slate-400" /> {booking.slotStart}
                          {booking.slotEnd ? ` – ${booking.slotEnd}` : ""}
                        </span>
                        {booking.providerAmount && (
                          <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl">
                            <DollarSign className="h-3.5 w-3.5" />
                            Your share: Rs {booking.providerAmount.toLocaleString()}
                          </span>
                        )}
                      </div>

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

                      {/* Notes */}
                      {booking.notes && (
                        <div className="flex items-start gap-2 text-xs text-slate-500">
                          <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span>{booking.notes}</span>
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-col gap-2 shrink-0 min-w-[160px]">
                      {/* Awaiting: Accept / Reject */}
                      {isAwaiting && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleAccept(booking)}
                            disabled={actionLoading[`accept_${booking._id}`]}
                            className="btn-dark text-xs py-2.5 flex items-center justify-center gap-2"
                          >
                            {actionLoading[`accept_${booking._id}`] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => { setRejectModal(booking); setRejectReason(""); }}
                            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-rose-200 bg-white px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                          >
                            <XCircle className="h-4 w-4" /> Reject
                          </button>
                        </>
                      )}

                      {/* Confirmed: On The Way / Cancel */}
                      {isConfirmed && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStatusUpdate(booking, "on-the-way", "Status updated: On the way!")}
                            disabled={actionLoading[`on-the-way_${booking._id}`]}
                            className="btn-primary text-xs py-2.5 flex items-center justify-center gap-2"
                          >
                            {actionLoading[`on-the-way_${booking._id}`] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Truck className="h-4 w-4" />
                            )}
                            On My Way
                          </button>
                          <button
                            type="button"
                            onClick={() => { setCancelModal(booking); setCancelReason(""); }}
                            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Cancel
                          </button>
                        </>
                      )}

                      {/* On The Way: Arrived */}
                      {isOnTheWay && (
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(booking, "arrived", "Job started!")}
                          disabled={actionLoading[`arrived_${booking._id}`]}
                          className="btn-primary text-xs py-2.5 flex items-center justify-center gap-2"
                        >
                          {actionLoading[`arrived_${booking._id}`] ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Wrench className="h-4 w-4" />
                          )}
                          Arrived / Start Job
                        </button>
                      )}

                      {/* In Progress: Complete / Customer No-Show */}
                      {isInProgress && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStatusUpdate(booking, "completed", "Booking marked as completed!")}
                            disabled={actionLoading[`completed_${booking._id}`]}
                            className="btn-dark text-xs py-2.5 flex items-center justify-center gap-2"
                          >
                            {actionLoading[`completed_${booking._id}`] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                            Mark Complete
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusUpdate(booking, "customer-no-show", "Customer no-show recorded.")}
                            disabled={actionLoading[`customer-no-show_${booking._id}`]}
                            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-orange-200 bg-white px-4 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-50 transition"
                          >
                            <AlertCircle className="h-3.5 w-3.5" /> Customer No-Show
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Reject Modal */}
        {rejectModal && (
          <Modal isOpen onClose={() => !rejectLoading && setRejectModal(null)} title="Reject Booking">
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                The customer will not be charged and will receive a full release of their card hold.
              </p>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Reason (optional)
                </label>
                <textarea
                  rows={2}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Not available on this date, outside service area..."
                  className="input-field text-xs"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button onClick={() => setRejectModal(null)} disabled={rejectLoading}
                  className="rounded-full px-5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">
                  Go Back
                </button>
                <button onClick={handleReject} disabled={rejectLoading}
                  className="rounded-full bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 flex items-center gap-2">
                  {rejectLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Rejecting...</> : "Confirm Rejection"}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Cancel Modal */}
        {cancelModal && (
          <Modal isOpen onClose={() => !cancelLoading && setCancelModal(null)} title="Cancel Booking">
            <div className="space-y-4">
              <div className="rounded-2xl bg-amber-50 p-4 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p>Cancelling a confirmed booking will trigger a full refund to the customer.</p>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Reason (required)
                </label>
                <textarea
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Reason for cancellation..."
                  className="input-field text-xs"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button onClick={() => setCancelModal(null)} disabled={cancelLoading}
                  className="rounded-full px-5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">
                  Keep Booking
                </button>
                <button onClick={handleCancel} disabled={cancelLoading}
                  className="rounded-full bg-red-600 px-5 py-2 text-xs font-bold text-white hover:bg-red-700 flex items-center gap-2">
                  {cancelLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Cancelling...</> : "Confirm Cancel"}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </ProviderLayout>
  );
}
