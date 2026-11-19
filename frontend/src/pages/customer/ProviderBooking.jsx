import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import {
  Clock,
  MapPin,
  ShieldCheck,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
  Minus,
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
  const [searchParams] = useSearchParams();

  const [provider, setProvider] = useState(null);
  const [loadingProvider, setLoadingProvider] = useState(true);
  const [error, setError] = useState("");

  // Wizard step: 1=Services, 2=Date&Time, 3=Address, 4=Review&Pay
  const [step, setStep] = useState(1);

  // Step 1: Cart / Services
  const [selectedServiceIds, setSelectedServiceIds] = useState(new Set());

  // Step 2: Date & time selection
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Step 3: Customer Details
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [addressLine, setAddressLine] = useState(currentUser?.address || "");
  const [addressArea, setAddressArea] = useState("");
  const [addressCity, setAddressCity] = useState(currentUser?.city || "Lahore");
  const [notes, setNotes] = useState("");
  const [formErrors, setFormErrors] = useState({});

  // Submitting
  const [submitting, setSubmitting] = useState(false);

  // Load provider profile + services
  useEffect(() => {
    setLoadingProvider(true);
    httpClient
      .get(`/public/providers/${id}`)
      .then((res) => {
        if (res.data?.success) {
          setProvider(res.data.provider);

          // If URL has prefill params (from "Choose another provider")
          const prefillServiceIds = searchParams.get("serviceIds");
          if (prefillServiceIds) {
            const ids = prefillServiceIds.split(",").filter(Boolean);
            setSelectedServiceIds(new Set(ids));
          }
          const prefillDate = searchParams.get("date");
          if (prefillDate) setSelectedDate(prefillDate);
        } else {
          setError("Provider not found");
        }
      })
      .catch((err) => {
        setError(getErrorMessage(err, "Failed to load provider profile"));
      })
      .finally(() => setLoadingProvider(false));
  }, [id]);

  // Compute cart
  const services = provider?.services || [];
  const selectedServices = useMemo(
    () => services.filter((s) => selectedServiceIds.has(s._id)),
    [services, selectedServiceIds]
  );
  const cartTotal = useMemo(
    () => selectedServices.reduce((sum, s) => sum + (s.price || 0), 0),
    [selectedServices]
  );
  const totalDuration = useMemo(
    () => selectedServices.reduce((sum, s) => sum + (s.durationMinutes || 60), 0),
    [selectedServices]
  );

  // Load slots whenever date or selected services change
  useEffect(() => {
    if (!selectedDate || !id || selectedServiceIds.size === 0) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    setSelectedSlot(null);
    const serviceIdList = Array.from(selectedServiceIds).join(",");
    httpClient
      .get(`/public/providers/${id}/slots?date=${selectedDate}&serviceIds=${serviceIdList}&durationMinutes=${totalDuration}`)
      .then((res) => {
        if (res.data?.success) {
          setSlots(res.data.slots || []);
        } else {
          setSlots([]);
        }
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [id, selectedDate, totalDuration, selectedServiceIds.size]);

  // Date quick picker
  const nextDates = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
    const dayNum = d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
    return { dateStr, dayLabel, dayNum, isToday: i === 0 };
  });

  if (!selectedDate && nextDates.length > 0) {
    // We can't call setSelectedDate in render; do it in an effect
  }
  useEffect(() => {
    if (!selectedDate && nextDates.length > 0) {
      setSelectedDate(nextDates[0].dateStr);
    }
  }, []);

  const toggleService = (svcId) => {
    setSelectedServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(svcId)) next.delete(svcId);
      else next.add(svcId);
      return next;
    });
  };

  const canProceedStep1 = selectedServiceIds.size > 0;
  const canProceedStep2 = selectedSlot != null;
  const canProceedStep3 = () => {
    const result = detailsSchema.safeParse({ phone, line: addressLine, area: addressArea, city: addressCity, notes });
    return result.success;
  };

  const handleSubmit = async () => {
    setFormErrors({});
    const valResult = detailsSchema.safeParse({ phone, line: addressLine, area: addressArea, city: addressCity, notes });
    if (!valResult.success) {
      const errMap = {};
      valResult.error.issues.forEach((iss) => { errMap[iss.path[0]] = iss.message; });
      setFormErrors(errMap);
      toast.error("Please fix form errors.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        providerId: id,
        serviceIds: Array.from(selectedServiceIds),
        date: selectedDate,
        slotStart: selectedSlot.startTime,
        slotEnd: selectedSlot.endTime,
        phone: phone.trim(),
        address: { line: addressLine.trim(), area: addressArea.trim(), city: addressCity.trim() },
        notes: notes ? notes.trim() : "",
      };

      const res = await httpClient.post("/customer/bookings", payload);

      if (res.data?.checkoutUrl) {
        toast.success("Redirecting to secure checkout...");
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
            <Link to="/customer/search" className="btn-dark">Browse Other Providers</Link>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  const STEPS = [
    { num: 1, label: "Services" },
    { num: 2, label: "Date & Time" },
    { num: 3, label: "Address" },
    { num: 4, label: "Review & Pay" },
  ];

  return (
    <CustomerLayout title="Book Appointment">
      <div className="space-y-6">
        {/* Provider Header */}
        <div className="rounded-3xl bg-white p-6 shadow-xs border border-black/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {provider.profilePhoto ? (
                <img src={provider.profilePhoto} alt={provider.firstName}
                  className="h-16 w-16 rounded-2xl object-cover border border-slate-100" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-pastel-mint text-xl font-extrabold text-ink">
                  {provider.firstName?.[0]}{provider.lastName?.[0]}
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
                </div>
              </div>
            </div>
            <Link to="/customer/search"
              className="text-xs font-semibold text-slate-500 hover:text-ink flex items-center gap-1 self-start sm:self-auto">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to search
            </Link>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {STEPS.map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => { if (s.num < step) setStep(s.num); }}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
                s.num === step
                  ? "bg-ink text-white"
                  : s.num < step
                  ? "bg-pastel-mint text-emerald-900 border border-emerald-200"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {s.num < step ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span>{s.num}</span>}
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* STEP 1: Select Services */}
            {step === 1 && (
              <div className="rounded-3xl bg-white p-6 shadow-xs border border-black/5 sm:p-7">
                <h3 className="text-base font-bold text-ink mb-1">Select Services</h3>
                <p className="text-xs text-slate-500 mb-5">Pick one or more services to include in your booking.</p>

                {services.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 p-6 text-center border border-slate-100">
                    <Info className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-ink">No services listed</p>
                    <p className="text-xs text-slate-500 mt-1">This provider has not added any services yet.</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {services.map((svc) => {
                      const isSelected = selectedServiceIds.has(svc._id);
                      return (
                        <button
                          key={svc._id}
                          type="button"
                          onClick={() => toggleService(svc._id)}
                          className={`text-left rounded-2xl p-4 transition border ${
                            isSelected
                              ? "bg-pastel-mint border-emerald-500 ring-2 ring-emerald-500/30"
                              : "bg-slate-50 hover:bg-slate-100 border-slate-200"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-bold text-ink">{svc.title}</p>
                              {svc.description && (
                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{svc.description}</p>
                              )}
                            </div>
                            <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ml-3 mt-0.5 ${
                              isSelected ? "border-emerald-600 bg-emerald-600" : "border-slate-300"
                            }`}>
                              {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-3 text-xs">
                            <span className="flex items-center gap-1 text-slate-600">
                              <Clock className="h-3 w-3" /> {svc.durationMinutes || 60} min
                            </span>
                            <span className="font-extrabold text-ink">Rs {(svc.price || 0).toLocaleString()}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    disabled={!canProceedStep1}
                    onClick={() => setStep(2)}
                    className="btn-dark text-xs py-2.5 px-6 flex items-center gap-2 disabled:opacity-40"
                  >
                    Continue <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Date & Time */}
            {step === 2 && (
              <div className="space-y-6">
                {/* Date Picker */}
                <div className="rounded-3xl bg-white p-6 shadow-xs border border-black/5 sm:p-7">
                  <h3 className="text-base font-bold text-ink mb-4">Select Date</h3>
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
                          <span className="text-[11px] font-bold uppercase tracking-wider">{item.dayLabel}</span>
                          <span className="text-base font-extrabold mt-0.5">{item.dayNum.split(" ")[0]}</span>
                          <span className="text-[10px] font-medium opacity-80">{item.dayNum.split(" ")[1]}</span>
                        </button>
                      );
                    })}
                  </div>
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

                {/* Time Slot Picker */}
                <div className="rounded-3xl bg-white p-6 shadow-xs border border-black/5 sm:p-7">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-bold text-ink">Choose Time Slot</h3>
                    <span className="text-xs text-slate-500">Duration: {totalDuration} min</span>
                  </div>

                  {loadingSlots ? (
                    <div className="flex items-center justify-center py-8 text-slate-400 gap-2 text-xs">
                      <Loader2 className="h-4 w-4 animate-spin" /> Checking available slots...
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-6 text-center border border-slate-100">
                      <Clock className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                      <p className="text-sm font-semibold text-ink">No slots available</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {provider.firstName} is not available on this date or all slots are booked. Try another date.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                      {slots.map((s, idx) => {
                        const isSelected = selectedSlot?.startTime === s.startTime && selectedSlot?.endTime === s.endTime;
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
                            <span className="text-xs text-slate-500 mt-1">{s.durationMinutes || totalDuration} mins</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-6 flex justify-between">
                    <button type="button" onClick={() => setStep(1)}
                      className="text-xs font-semibold text-slate-500 hover:text-ink flex items-center gap-1">
                      <ArrowLeft className="h-3.5 w-3.5" /> Back
                    </button>
                    <button type="button" disabled={!canProceedStep2} onClick={() => setStep(3)}
                      className="btn-dark text-xs py-2.5 px-6 flex items-center gap-2 disabled:opacity-40">
                      Continue <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Address & Notes */}
            {step === 3 && (
              <div className="rounded-3xl bg-white p-6 shadow-xs border border-black/5 sm:p-7">
                <h3 className="text-base font-bold text-ink mb-4">Your Contact & Service Address</h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Phone Number *
                    </label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                      placeholder="03001234567" className="input-field font-mono" />
                    {formErrors.phone && <p className="mt-1 text-xs text-red-500">{formErrors.phone}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Street Address / House / Flat *
                    </label>
                    <input type="text" value={addressLine} onChange={(e) => setAddressLine(e.target.value)}
                      placeholder="House #12, Street 4, Sector..." className="input-field" />
                    {formErrors.line && <p className="mt-1 text-xs text-red-500">{formErrors.line}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Area / Locality</label>
                    <input type="text" value={addressArea} onChange={(e) => setAddressArea(e.target.value)}
                      placeholder="DHA Phase 5, Gulberg..." className="input-field" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">City *</label>
                    <input type="text" value={addressCity} onChange={(e) => setAddressCity(e.target.value)}
                      placeholder="Lahore, Karachi..." className="input-field" />
                    {formErrors.city && <p className="mt-1 text-xs text-red-500">{formErrors.city}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Notes (Optional, max 300 chars)
                    </label>
                    <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                      placeholder="Describe the issue, tools needed, parking info..."
                      className="input-field resize-none text-xs" />
                  </div>
                </div>

                <div className="mt-6 flex justify-between">
                  <button type="button" onClick={() => setStep(2)}
                    className="text-xs font-semibold text-slate-500 hover:text-ink flex items-center gap-1">
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                  </button>
                  <button type="button" onClick={() => { if (canProceedStep3()) setStep(4); else toast.error("Please fill required fields."); }}
                    className="btn-dark text-xs py-2.5 px-6 flex items-center gap-2">
                    Review & Pay <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Review & Pay */}
            {step === 4 && (
              <div className="rounded-3xl bg-white p-6 shadow-xs border border-black/5 sm:p-7 space-y-5">
                <h3 className="text-base font-bold text-ink">Review & Confirm</h3>

                {/* Summary */}
                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Provider</span>
                    <span className="font-bold text-ink">{provider.firstName} {provider.lastName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date</span>
                    <span className="font-bold text-ink">{selectedDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Time</span>
                    <span className="font-bold text-ink font-mono">
                      {selectedSlot?.startTime} – {selectedSlot?.endTime}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Address</span>
                    <span className="font-bold text-ink text-right max-w-[200px]">
                      {addressLine}{addressArea ? `, ${addressArea}` : ""}, {addressCity}
                    </span>
                  </div>
                </div>

                {/* Services */}
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase text-slate-500">Services</p>
                  {selectedServices.map((svc) => (
                    <div key={svc._id} className="flex justify-between items-center px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <span className="font-semibold text-ink">{svc.title}</span>
                      <span className="font-bold text-ink">Rs {(svc.price || 0).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center px-3 py-2 rounded-xl bg-pastel-mint border border-emerald-200 text-sm font-extrabold text-ink">
                    <span>Total</span>
                    <span>Rs {cartTotal.toLocaleString()}</span>
                  </div>
                </div>

                {/* Card Hold Warning */}
                <div className="rounded-2xl bg-blue-50 p-4 border border-blue-200 flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-900 leading-relaxed space-y-1">
                    <p className="font-bold">Important: Your card will NOT be charged now</p>
                    <p>
                      Your card will only be <strong>held</strong> for Rs {cartTotal.toLocaleString()}.
                      The amount is charged <strong>only if the provider accepts</strong> your request.
                      If the provider rejects or does not respond within 2 hours, the hold is released automatically and you are not charged.
                    </p>
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <button type="button" onClick={() => setStep(3)}
                    className="text-xs font-semibold text-slate-500 hover:text-ink flex items-center gap-1">
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                  </button>
                  <button type="button" disabled={submitting} onClick={handleSubmit}
                    className="btn-primary py-3 px-8 text-sm font-bold flex items-center gap-2 shadow-sm disabled:opacity-50">
                    {submitting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                    ) : (
                      <><CreditCard className="h-4 w-4" /> Hold Rs {cartTotal.toLocaleString()} & Book</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Cart Summary (always visible) */}
          <div>
            <div className="rounded-3xl bg-white p-6 shadow-xs border border-black/5 sticky top-6 space-y-4">
              <h3 className="text-sm font-bold text-ink">Your Cart</h3>

              {selectedServices.length === 0 ? (
                <p className="text-xs text-slate-400">No services selected yet.</p>
              ) : (
                <div className="space-y-2">
                  {selectedServices.map((svc) => (
                    <div key={svc._id} className="flex justify-between items-center text-xs">
                      <div>
                        <p className="font-semibold text-ink">{svc.title}</p>
                        <p className="text-slate-400">{svc.durationMinutes || 60} min</p>
                      </div>
                      <span className="font-bold text-ink">Rs {(svc.price || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Total Duration</span>
                  <span className="font-semibold text-ink">{totalDuration} min</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Card Hold Amount</span>
                  <span className="text-lg font-black text-ink">Rs {cartTotal.toLocaleString()}</span>
                </div>
              </div>

              {selectedSlot && (
                <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Date</span>
                    <span className="font-semibold text-ink">{selectedDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Time</span>
                    <span className="font-semibold text-ink font-mono">{selectedSlot.startTime} – {selectedSlot.endTime}</span>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Your card is held, not charged. The provider must accept within 2 hours or the hold is released.
              </p>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
