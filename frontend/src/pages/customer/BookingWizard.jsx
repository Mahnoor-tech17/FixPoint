import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Phone,
  FileText,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  User,
  Sparkles,
} from "lucide-react";
import Navbar from "../../components/common/Navbar";
import Footer from "../../components/common/Footer";
import Spinner from "../../components/common/Spinner";
import { httpClient, getErrorMessage } from "../../lib/http";
import { getUser, getUserRole } from "../../lib/local-storage";

const detailsSchema = z.object({
  street: z
    .string()
    .trim()
    .min(1, "Street address is required")
    .min(5, "Please enter a fuller street address (at least 5 characters)")
    .max(150, "Street address must be 150 characters or less"),
  city: z
    .string()
    .trim()
    .min(1, "City is required")
    .min(2, "City name is too short")
    .max(60, "City must be 60 characters or less")
    .regex(/^[\p{L}][\p{L}\s.'-]*$/u, "City can only contain letters"),
  phone: z
    .string()
    .min(1, "Contact phone number is required")
    .regex(/^(\+92|0)?3\d{9}$/, "Enter a valid Pakistani mobile number (e.g. 03001234567)"),
  notes: z.string().trim().max(300, "Notes must be 300 characters or less"),
});

export default function BookingWizard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const prefilledProviderId = searchParams.get("providerId") || "";
  const prefilledServiceId = searchParams.get("serviceId") || "";

  // Step state (1: Service & Provider, 2: Date & Time, 3: Address & Details, 4: Review & Confirm)
  const [step, setStep] = useState(1);

  // Data fetching state
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Platform settings
  const [settings, setSettings] = useState({ bookingHorizonDays: 30 });

  // Selections
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [availableServices, setAvailableServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);

  // Step 2: Date & Time
  const [selectedDate, setSelectedDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Step 3: Customer Details
  const currentUser = getUser();
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [notes, setNotes] = useState("");

  // Load Settings & Provider/Services
  useEffect(() => {
    setLoading(true);

    Promise.all([
      httpClient.get("/settings").catch(() => ({ data: { settings: { bookingHorizonDays: 30 } } })),
      prefilledProviderId
        ? httpClient.get(`/public/providers/${prefilledProviderId}`).catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([settingsRes, providerRes]) => {
        if (settingsRes?.data?.settings) {
          setSettings(settingsRes.data.settings);
        }

        if (providerRes?.data?.success) {
          const prov = providerRes.data.provider;
          const srvs = providerRes.data.services || [];
          setSelectedProvider(prov);
          setAvailableServices(srvs);

          if (prefilledServiceId) {
            const found = srvs.find((s) => s._id === prefilledServiceId);
            if (found) setSelectedService(found);
          } else if (srvs.length > 0) {
            setSelectedService(srvs[0]);
          }

          if (prov.serviceArea) {
            setCity(prov.serviceArea);
          }
        }
      })
      .finally(() => setLoading(false));
  }, [prefilledProviderId, prefilledServiceId]);

  // Set default date to tomorrow
  useEffect(() => {
    if (!selectedDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yyyy = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
      const dd = String(tomorrow.getDate()).padStart(2, "0");
      setSelectedDate(`${yyyy}-${mm}-${dd}`);
    }
  }, [selectedDate]);

  // Fetch slots whenever selectedDate or selectedService or selectedProvider changes
  useEffect(() => {
    if (!selectedProvider?._id || !selectedService?._id || !selectedDate) return;

    setSlotsLoading(true);
    setSelectedSlot(null);

    httpClient
      .get(
        `/public/providers/${selectedProvider._id}/slots?date=${selectedDate}&serviceId=${selectedService._id}`
      )
      .then((res) => {
        if (res.data?.success) {
          setAvailableSlots(res.data.slots || []);
        } else {
          setAvailableSlots([]);
        }
      })
      .catch((err) => {
        console.error("Error loading slots:", err);
        setAvailableSlots([]);
      })
      .finally(() => setSlotsLoading(false));
  }, [selectedProvider?._id, selectedService?._id, selectedDate]);

  // Date horizon constraints
  const todayStr = new Date().toISOString().split("T")[0];
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + (settings.bookingHorizonDays || 30));
  const maxDateStr = maxDate.toISOString().split("T")[0];

  // Validation before progressing steps
  const handleNext = () => {
    if (step === 1) {
      if (!selectedService) {
        toast.error("Please choose a service to proceed.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!selectedDate) {
        toast.error("Please select a date.");
        return;
      }
      if (selectedDate < todayStr) {
        toast.error("You cannot book a date in the past.");
        return;
      }
      if (selectedDate > maxDateStr) {
        toast.error(
          `Bookings can only be made up to ${settings.bookingHorizonDays || 30} days ahead.`,
        );
        return;
      }
      if (!selectedSlot) {
        toast.error("Please choose an available time slot.");
        return;
      }
      setStep(3);
    } else if (step === 3) {
      const details = detailsSchema.safeParse({
        street,
        city,
        phone: phone.replace(/[\s-]/g, ""),
        notes,
      });
      if (!details.success) {
        toast.error(details.error.issues[0].message);
        return;
      }
      setStep(4);
    }
  };

  const handleBookingSubmit = async () => {
    const role = getUserRole();
    if (!role) {
      toast.error("Please login to complete your booking.");
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    if (role !== "CUSTOMER") {
      toast.error("Only registered customers can place bookings.");
      return;
    }

    // Final safety check before sending (in case a step was skipped)
    const details = detailsSchema.safeParse({
      street,
      city,
      phone: phone.replace(/[\s-]/g, ""),
      notes,
    });
    if (!details.success) {
      toast.error(details.error.issues[0].message);
      setStep(3);
      return;
    }
    if (!selectedSlot || !selectedService || !selectedProvider) {
      toast.error("Please complete all booking steps first.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        providerId: selectedProvider._id,
        serviceId: selectedService._id,
        date: selectedDate,
        startTime: selectedSlot.startTime,
        customerStreet: street.trim(),
        customerCity: city.trim(),
        customerPhone: phone.replace(/[\s-]/g, ""),
        notes: notes.trim(),
      };

      const res = await httpClient.post("/bookings", payload);
      if (res.data?.success) {
        toast.success("Booking confirmed successfully!");
        navigate(`/customer/bookings/${res.data.booking._id || res.data.booking.bookingId}`);
      }
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error("This slot was just booked by another user. Please select a different time slot.");
        setStep(2);
      } else {
        toast.error(getErrorMessage(err, "Failed to confirm booking. Please try again."));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-soft flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!selectedProvider) {
    return (
      <div className="min-h-screen bg-soft flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-xl mx-auto px-4 py-20 text-center">
          <h2 className="text-xl font-bold text-ink mb-2">Select a Provider First</h2>
          <p className="text-sm text-gray-500 mb-6">
            Please browse our verified providers and select one to start booking.
          </p>
          <Link to="/search" className="btn-dark px-6 py-3 text-xs">
            Browse Providers
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-soft flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Stepper Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm mb-6">
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
            {[
              { num: 1, label: "Service" },
              { num: 2, label: "Date & Time" },
              { num: 3, label: "Address" },
              { num: 4, label: "Confirm" },
            ].map((s) => (
              <div key={s.num} className="flex items-center gap-2 shrink-0">
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                    step === s.num
                      ? "bg-[#111111] text-white ring-4 ring-gray-100"
                      : step > s.num
                      ? "bg-pastel-mint text-emerald-800"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {step > s.num ? "✓" : s.num}
                </span>
                <span
                  className={`text-xs font-bold ${
                    step >= s.num ? "text-ink" : "text-gray-400"
                  }`}
                >
                  {s.label}
                </span>
                {s.num < 4 && <ChevronRight className="w-4 h-4 text-gray-300 ml-2" />}
              </div>
            ))}
          </div>
        </div>

        {/* Wizard Card Body */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm">
          {/* STEP 1: Select Service */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-ink mb-1">
                  Step 1: Select a Service
                </h2>
                <p className="text-xs text-gray-500">
                  Booking with{" "}
                  <span className="font-bold text-ink">
                    {selectedProvider.firstName} {selectedProvider.lastName}
                  </span>
                </p>
              </div>

              {availableServices.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  This provider has no active services listed.
                </div>
              ) : (
                <div className="space-y-3">
                  {availableServices.map((srv) => {
                    const isSelected = selectedService?._id === srv._id;
                    return (
                      <div
                        key={srv._id}
                        onClick={() => setSelectedService(srv)}
                        className={`p-5 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                          isSelected
                            ? "border-[#111111] bg-gray-50 ring-2 ring-[#111111]"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-sm text-ink">{srv.title}</span>
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                              {srv.durationMinutes} mins
                            </span>
                          </div>
                          {srv.description && (
                            <p className="text-xs text-gray-500 line-clamp-1">
                              {srv.description}
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-base font-black text-ink">
                            PKR {srv.price}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Date & Time */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-ink mb-1">
                  Step 2: Pick Appointment Date & Time
                </h2>
                <p className="text-xs text-gray-500">
                  Service:{" "}
                  <span className="font-bold text-ink">{selectedService?.title}</span> (
                  {selectedService?.durationMinutes} mins)
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Date Input */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-2">
                    Appointment Date
                  </label>
                  <input
                    type="date"
                    min={todayStr}
                    max={maxDateStr}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full text-sm font-semibold rounded-2xl border border-gray-200 px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-[#111111]"
                  />
                  <p className="text-[11px] text-gray-400 mt-2">
                    Bookings open up to {settings.bookingHorizonDays} days in advance.
                  </p>
                </div>

                {/* Available Slots */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-2">
                    Available Time Slots
                  </label>

                  {slotsLoading ? (
                    <div className="py-8">
                      <Spinner size="md" />
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-gray-50 border border-gray-200 text-center">
                      <Clock className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs font-medium text-gray-600">
                        No slots available on this date.
                      </p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        The provider may have a day off, or all slots are fully booked.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                      {availableSlots.map((slot) => {
                        const isChosen =
                          selectedSlot?.startTime === slot.startTime;
                        return (
                          <button
                            key={slot.startTime}
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition text-center ${
                              isChosen
                                ? "bg-[#111111] text-white border-[#111111]"
                                : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                            }`}
                          >
                            {slot.startTime}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Address & Contact Details */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-ink mb-1">
                  Step 3: Service Location & Contact
                </h2>
                <p className="text-xs text-gray-500">
                  Where should {selectedProvider.firstName} arrive to perform the service?
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-2">
                    Street Address & House / Flat # <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. House 42-B, Street 5, Phase 4, DHA"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="w-full text-sm rounded-2xl border border-gray-200 px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-[#111111]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-2">
                      City <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Lahore"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full text-sm rounded-2xl border border-gray-200 px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-[#111111]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-2">
                      Contact Phone <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 03001234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full text-sm rounded-2xl border border-gray-200 px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-[#111111]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-2">
                    Special Instructions / Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    maxLength={300}
                    placeholder="Any entry gate instructions, parking tips or specifics about the issue..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full text-sm rounded-2xl border border-gray-200 px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-[#111111]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Review & Confirm */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-ink mb-1">
                  Step 4: Review & Confirm Booking
                </h2>
                <p className="text-xs text-gray-500">
                  Please verify your booking details before confirmation.
                </p>
              </div>

              {/* Summary Cards */}
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                  <div>
                    <span className="text-xs text-gray-400 uppercase font-bold block">
                      Service Provider
                    </span>
                    <span className="text-sm font-bold text-ink">
                      {selectedProvider.firstName} {selectedProvider.lastName}
                    </span>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-pastel-yellow text-ink">
                    {selectedProvider.serviceCategory?.replace("-", " ")}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-gray-200">
                  <div>
                    <span className="text-xs text-gray-400 uppercase font-bold block">
                      Service
                    </span>
                    <span className="text-sm font-bold text-ink">
                      {selectedService?.title}
                    </span>
                    <span className="text-xs text-gray-500 block">
                      Duration: {selectedService?.durationMinutes} mins
                    </span>
                  </div>

                  <div>
                    <span className="text-xs text-gray-400 uppercase font-bold block">
                      Date & Time
                    </span>
                    <span className="text-sm font-bold text-ink">
                      {selectedDate}
                    </span>
                    <span className="text-xs text-emerald-600 font-semibold block">
                      {selectedSlot?.startTime} - {selectedSlot?.endTime}
                    </span>
                  </div>
                </div>

                <div className="pb-4 border-b border-gray-200">
                  <span className="text-xs text-gray-400 uppercase font-bold block">
                    Location & Contact
                  </span>
                  <p className="text-sm text-ink font-medium mt-1">
                    {street}, {city}
                  </p>
                  <p className="text-xs text-gray-500">Phone: {phone}</p>
                  {notes && (
                    <p className="text-xs text-gray-500 italic mt-1">"{notes}"</p>
                  )}
                </div>

                {/* Pricing snapshot */}
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <span className="text-sm font-bold text-ink">Total Price</span>
                    <span className="text-xs text-gray-400 block">
                      Pay upon service completion
                    </span>
                  </div>
                  <span className="text-2xl font-black text-ink">
                    PKR {selectedService?.price}
                  </span>
                </div>
              </div>

              {/* Policy note */}
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Cancellation Policy:</span> You can cancel
                  or reschedule free of charge up to 12 hours before your scheduled
                  appointment start time.
                </div>
              </div>
            </div>
          )}

          {/* Wizard Action Controls */}
          <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                disabled={submitting}
                className="px-5 py-2.5 rounded-full border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="btn-dark px-6 py-2.5 text-xs font-bold flex items-center gap-1.5"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleBookingSubmit}
                disabled={submitting}
                className="btn-dark px-8 py-3 text-xs font-bold flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Spinner size="sm" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-pastel-mint" />
                    Confirm Booking
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}