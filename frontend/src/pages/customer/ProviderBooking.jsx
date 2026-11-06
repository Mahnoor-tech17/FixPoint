import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Phone,
  DollarSign,
  ShieldCheck,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  Info,
} from "lucide-react";
import CustomerLayout from "../../components/customer/CustomerLayout";
import StarRating from "../../components/common/StarRating";
import { httpClient, getErrorMessage } from "../../lib/http";
import { getUser } from "../../lib/local-storage";

const detailsSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number is too long"),
  line: z.string().trim().min(3, "Street address must be at least 3 characters"),
  area: z.string().trim().optional(),
  city: z.string().trim().min(2, "City is required"),
  notes: z.string().trim().max(300, "Notes cannot exceed 300 characters").optional(),
});

export default function ProviderBooking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = getUser();

  const [provider, setProvider] = useState(null);
  const [loadingProvider, setLoadingProvider] = useState(true);
  const [error, setError] = useState("");

  // Step 1: Date selection
  const [selectedDate, setSelectedDate] = useState("");
  // Step 2: Slot selection
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Step 3: Customer Details Form
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [addressLine, setAddressLine] = useState(currentUser?.address || "");
  const [addressArea, setAddressArea] = useState("");
  const [addressCity, setAddressCity] = useState(currentUser?.city || "Lahore");
  const [notes, setNotes] = useState("");
  const [formErrors, setFormErrors] = useState({});

  // Submitting
  const [submitting, setSubmitting] = useState(false);

  // Load provider profile
  useEffect(() => {
    setLoadingProvider(true);
    httpClient
      .get(`/public/providers/${id}`)
      .then((res) => {
        if (res.data?.success) {
          setProvider(res.data.provider);
          // Set default date to today or tomorrow
          const today = new Date().toISOString().split("T")[0];
          setSelectedDate(today);
        } else {
          setError("Provider not found");
        }
      })
      .catch((err) => {
        setError(getErrorMessage(err, "Failed to load provider profile"));
      })
      .finally(() => setLoadingProvider(false));
  }, [id]);

  // Load available slots whenever selectedDate changes
  useEffect(() => {
    if (!selectedDate || !id) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    httpClient
      .get(`/public/providers/${id}/slots?date=${selectedDate}`)
      .then((res) => {
        if (res.data?.success) {
          setSlots(res.data.slots || []);
        } else {
          setSlots([]);
        }
      })
      .catch((err) => {
        console.error("Failed to load slots:", err);
        setSlots([]);
      })
      .finally(() => setLoadingSlots(false));
  }, [id, selectedDate]);

  // Pre-generate next 14 selectable dates for easy quick selection
  const nextDates = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
    const dayNum = d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
    return { dateStr, dayLabel, dayNum, isToday: i === 0 };
  });

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    if (!selectedSlot) {
      toast.error("Please select a time slot first.");
      return;
    }

    const valResult = detailsSchema.safeParse({
      phone,
      line: addressLine,
      area: addressArea,
      city: addressCity,
      notes,
    });

    if (!valResult.success) {
      const errMap = {};
      valResult.error.issues.forEach((iss) => {
        errMap[iss.path[0]] = iss.message;
      });
      setFormErrors(errMap);
      toast.error("Please fix details form errors.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        providerId: id,
        date: selectedDate,
        slotStart: selectedSlot.startTime,
        slotEnd: selectedSlot.endTime,
        phone: phone.trim(),
        address: {
          line: addressLine.trim(),
          area: addressArea.trim(),
          city: addressCity.trim(),
        },
        notes: notes ? notes.trim() : "",
      };

      const res = await httpClient.post("/customer/bookings", payload);

      if (res.data?.checkoutUrl) {
        toast.success("Holding your slot! Redirecting to secure checkout...");
        window.location.href = res.data.checkoutUrl;
      } else {
        toast.error("Could not initiate payment session.");
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Booking creation failed"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingProvider) {
    return (
      <CustomerLayout title="Book Appointment">
        <div className="space-y-4">
          <div className="h-32 w-full animate-pulse rounded-3xl bg-slate-100" />
          <div className="h-64 w-full animate-pulse rounded-3xl bg-slate-100" />
        </div>
      </CustomerLayout>
    );
  }

  if (error || !provider) {
    return (
      <CustomerLayout title="Provider Not Found">
        <div className="rounded-3xl bg-white p-12 text-center shadow-xs border border-black/5">
          <AlertCircle className="mx-auto h-12 w-12 text-rose-500 mb-3" />
          <h2 className="text-xl font-bold text-ink">Provider Not Available</h2>
          <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
            {error || "This service provider cannot be booked at the moment."}
          </p>
          <div className="mt-6">
            <Link to="/customer/search" className="btn-dark">
              Browse Other Providers
            </Link>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  const estimatedServiceCharge = selectedSlot
    ? selectedSlot.estimatedPrice ||
      Math.round(((provider.hourlyRate || 0) * (selectedSlot.durationMinutes || 60)) / 60)
    : provider.hourlyRate || 0;

  return (
    <CustomerLayout title={`Book Appointment`}>
      <div className="space-y-6">
        {/* Breadcrumb & Provider Header Card */}
        <div className="rounded-3xl bg-white p-6 shadow-xs border border-black/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {provider.profilePhoto ? (
                <img
                  src={provider.profilePhoto}
                  alt={provider.firstName}
                  className="h-16 w-16 rounded-2xl object-cover border border-slate-100"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-pastel-mint text-xl font-extrabold text-ink">
                  {provider.firstName?.[0]}
                  {provider.lastName?.[0]}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-ink sm:text-xl">
                    {provider.firstName} {provider.lastName}
                  </h2>
                  <span className="rounded-full bg-pastel-yellow px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink">
                    {provider.serviceCategory}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <StarRating rating={provider.rating?.average || 5} showValue size="sm" />
                  {provider.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-400" /> {provider.city}
                    </span>
                  )}
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">
                    Rs {provider.hourlyRate}/hr (estimate)
                  </span>
                </div>
              </div>
            </div>

            <Link
              to="/customer/search"
              className="text-xs font-semibold text-slate-500 hover:text-ink flex items-center gap-1 self-start sm:self-auto"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to search
            </Link>
          </div>
        </div>

        <form onSubmit={handleBookingSubmit} className="grid gap-6 lg:grid-cols-3">
          {/* Main Booking Selection (2 cols) */}
          <div className="space-y-6 lg:col-span-2">
            {/* Step 1: Date Picker */}
            <div className="rounded-3xl bg-white p-6 shadow-xs border border-black/5 sm:p-7">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">
                  1
                </span>
                <h3 className="text-base font-bold text-ink">Select Appointment Date</h3>
              </div>

              {/* Quick horizontal date scroller */}
              <div className="flex gap-2.5 overflow-x-auto pb-3 pt-1 scrollbar-none">
                {nextDates.map((item) => {
                  const isSelected = selectedDate === item.dateStr;
                  return (
                    <button
                      key={item.dateStr}
                      type="button"
                      onClick={() => setSelectedDate(item.dateStr)}
                      className={`flex flex-col items-center justify-center rounded-2xl p-3 min-w-[72px] transition border ${
                        isSelected
                          ? "bg-ink text-white border-ink shadow-sm"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span className="text-[11px] font-bold uppercase tracking-wider">
                        {item.dayLabel}
                      </span>
                      <span className="text-base font-extrabold mt-0.5">{item.dayNum.split(" ")[0]}</span>
                      <span className="text-[10px] font-medium opacity-80">{item.dayNum.split(" ")[1]}</span>
                    </button>
                  );
                })}
              </div>

              {/* Or manual date picker input */}
              <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                <span>Or choose date:</span>
                <input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="input-field w-auto py-1.5 px-3 text-xs font-mono"
                />
              </div>
            </div>

            {/* Step 2: Time Slot Picker */}
            <div className="rounded-3xl bg-white p-6 shadow-xs border border-black/5 sm:p-7">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">
                    2
                  </span>
                  <h3 className="text-base font-bold text-ink">Choose Time Slot</h3>
                </div>
                <span className="text-xs text-slate-500">Date: {selectedDate}</span>
              </div>

              {loadingSlots ? (
                <div className="flex items-center justify-center py-8 text-slate-400 gap-2 text-xs">
                  <Loader2 className="h-4 w-4 animate-spin" /> Checking provider slots...
                </div>
              ) : slots.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-6 text-center border border-slate-100">
                  <Clock className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-ink">No slots available for this date</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {provider.firstName} is not available on this date or all slots are booked. Please pick another date.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {slots.map((s, idx) => {
                    const isSelected =
                      selectedSlot?.startTime === s.startTime && selectedSlot?.endTime === s.endTime;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedSlot(s)}
                        className={`flex flex-col text-left rounded-2xl p-4 transition border ${
                          isSelected
                            ? "bg-pastel-mint border-emerald-500 ring-2 ring-emerald-500/30"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-extrabold text-ink font-mono">
                            {s.startTime} – {s.endTime}
                          </span>
                          {isSelected && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                          <span>{s.durationMinutes} mins</span>
                          <span className="font-bold text-ink">
                            ~Rs {s.estimatedPrice?.toLocaleString()}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 3: Service Address & Contact */}
            <div className="rounded-3xl bg-white p-6 shadow-xs border border-black/5 sm:p-7">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">
                  3
                </span>
                <h3 className="text-base font-bold text-ink">Your Contact & Service Address</h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Phone Number (Visible to provider after booking) *
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="03001234567"
                    className="input-field font-mono"
                  />
                  {formErrors.phone && (
                    <p className="mt-1 text-xs text-red-500">{formErrors.phone}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Street Address / House / Flat *
                  </label>
                  <input
                    type="text"
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                    placeholder="House #12, Street 4, Sector..."
                    className="input-field"
                  />
                  {formErrors.line && (
                    <p className="mt-1 text-xs text-red-500">{formErrors.line}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Area / Locality
                  </label>
                  <input
                    type="text"
                    value={addressArea}
                    onChange={(e) => setAddressArea(e.target.value)}
                    placeholder="DHA Phase 5, Gulberg..."
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    value={addressCity}
                    onChange={(e) => setAddressCity(e.target.value)}
                    placeholder="Lahore, Karachi..."
                    className="input-field"
                  />
                  {formErrors.city && (
                    <p className="mt-1 text-xs text-red-500">{formErrors.city}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Special Notes or Issue Description (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Describe specific repair needed, tools required, or parking details..."
                    className="input-field resize-none text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Checkout CTA */}
          <div className="space-y-6">
            <div className="rounded-3xl bg-white p-6 shadow-xs border border-black/5 sticky top-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">
                  4
                </span>
                <h3 className="text-base font-bold text-ink">Payment & Summary</h3>
              </div>

              {/* Slot Summary */}
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 space-y-2 mb-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Provider</span>
                  <span className="font-bold text-ink">{provider.firstName} {provider.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Category</span>
                  <span className="font-bold text-ink uppercase">{provider.serviceCategory}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date</span>
                  <span className="font-bold text-ink">{selectedDate || "Not chosen"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Time Slot</span>
                  <span className="font-bold text-ink font-mono">
                    {selectedSlot ? `${selectedSlot.startTime} – ${selectedSlot.endTime}` : "Not chosen"}
                  </span>
                </div>
              </div>

              {/* Pricing Breakdown */}
              <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-ink">FixPoint Booking Fee</p>
                    <p className="text-[11px] text-slate-500">Paid online now via Stripe</p>
                  </div>
                  <span className="text-sm font-extrabold text-ink">Rs 200</span>
                </div>

                <div className="flex justify-between items-center rounded-xl bg-pastel-yellow/60 p-3 text-amber-950 border border-amber-200">
                  <div>
                    <p className="font-bold">Estimated Service Charge</p>
                    <p className="text-[11px] text-amber-800">
                      Paid directly to provider at your doorstep
                    </p>
                  </div>
                  <span className="text-sm font-extrabold">
                    ~Rs {estimatedServiceCharge?.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Total Due Now */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 block">Total Due Now</span>
                  <span className="text-2xl font-black text-ink">Rs 200</span>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-900">
                  Holds slot for 10 min
                </span>
              </div>

              <div className="mt-6">
                <button
                  type="submit"
                  disabled={submitting || !selectedSlot}
                  className="btn-primary w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 shadow-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Holding slot & redirecting...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" /> Pay Rs 200 & Book
                    </>
                  )}
                </button>
              </div>

              <p className="mt-3 text-[11px] text-slate-400 text-center leading-relaxed">
                By booking, you agree that the Rs 200 platform fee confirms your reserved appointment window. Actual service charges are settled with the provider.
              </p>
            </div>
          </div>
        </form>
      </div>
    </CustomerLayout>
  );
}