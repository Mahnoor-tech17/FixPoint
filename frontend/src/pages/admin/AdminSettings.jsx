import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import Spinner from "../../components/common/Spinner";
import { httpClient, getErrorMessage } from "../../lib/http";

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Existing fields
  const [cancellationWindowHours, setCancellationWindowHours] = useState(24);
  const [bookingHorizonDays, setBookingHorizonDays] = useState(30);
  const [autoConfirmBookings, setAutoConfirmBookings] = useState(false);
  const [platformName, setPlatformName] = useState("FixPoint");
  const [supportEmail, setSupportEmail] = useState("support@fixpoint.com");
  const [commissionPercent, setCommissionPercent] = useState(20);

  // New booking flow fields
  const [responseWindowMinutes, setResponseWindowMinutes] = useState(120);
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState(15);
  const [noShowWaitMinutes, setNoShowWaitMinutes] = useState(30);
  const [customerNoShowWaitMinutes, setCustomerNoShowWaitMinutes] = useState(60);
  const [slotHoldMinutes, setSlotHoldMinutes] = useState(10);

  useEffect(() => {
    setLoading(true);
    httpClient
      .get("/settings")
      .then((res) => {
        if (res.data?.success && res.data.settings) {
          const s = res.data.settings;
          setCancellationWindowHours(s.cancellationWindowHours ?? 24);
          setBookingHorizonDays(s.bookingHorizonDays ?? 30);
          setAutoConfirmBookings(Boolean(s.autoConfirmBookings));
          setPlatformName(s.platformName || "FixPoint");
          setSupportEmail(s.supportEmail || "support@fixpoint.com");
          // commissionRate is stored as 0-1 decimal; show as percent
          setCommissionPercent(s.commissionRate != null ? Math.round(s.commissionRate * 100) : (s.commissionPercent ?? 20));
          setResponseWindowMinutes(s.responseWindowMinutes ?? 120);
          setGracePeriodMinutes(s.gracePeriodMinutes ?? 15);
          setNoShowWaitMinutes(s.noShowWaitMinutes ?? 30);
          setCustomerNoShowWaitMinutes(s.customerNoShowWaitMinutes ?? 60);
          setSlotHoldMinutes(s.slotHoldMinutes ?? 10);
        }
      })
      .catch((err) => {
        toast.error(getErrorMessage(err, "Failed to load platform settings"));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await httpClient.put("/settings", {
        cancellationWindowHours: Number(cancellationWindowHours),
        bookingHorizonDays: Number(bookingHorizonDays),
        autoConfirmBookings,
        platformName: platformName.trim(),
        supportEmail: supportEmail.trim(),
        commissionRate: Number(commissionPercent) / 100,
        commissionPercent: Number(commissionPercent),
        responseWindowMinutes: Number(responseWindowMinutes),
        gracePeriodMinutes: Number(gracePeriodMinutes),
        noShowWaitMinutes: Number(noShowWaitMinutes),
        customerNoShowWaitMinutes: Number(customerNoShowWaitMinutes),
        slotHoldMinutes: Number(slotHoldMinutes),
      });

      if (res.data?.success) {
        toast.success("Platform settings updated successfully!");
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update platform settings"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Platform Settings">
        <div className="py-20 flex justify-center">
          <Spinner size="lg" />
        </div>
      </AdminLayout>
    );
  }

  const Field = ({ label, hint, children }) => (
    <div>
      <label className="text-xs font-bold text-ink block mb-1">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );

  return (
    <AdminLayout title="Platform Settings">
      <div className="space-y-6 max-w-3xl">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm">
          <h2 className="text-xl font-bold text-ink">System Configuration</h2>
          <p className="text-xs text-gray-500 mt-1">Manage booking flow, cancellation windows, and platform fees.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Booking & Cancellation */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Booking &amp; Cancellation Rules</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Cancellation Cutoff Window (Hours)" hint="Customers cannot cancel for free within this many hours before the slot.">
                <input type="number" min={1} max={168} required value={cancellationWindowHours}
                  onChange={(e) => setCancellationWindowHours(e.target.value)}
                  className="w-full text-xs font-semibold rounded-xl border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#111111]" />
              </Field>
              <Field label="Advance Booking Horizon (Days)" hint="Max future days customers can schedule.">
                <input type="number" min={1} max={90} required value={bookingHorizonDays}
                  onChange={(e) => setBookingHorizonDays(e.target.value)}
                  className="w-full text-xs font-semibold rounded-xl border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#111111]" />
              </Field>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={autoConfirmBookings}
                onChange={(e) => setAutoConfirmBookings(e.target.checked)}
                className="w-4 h-4 rounded text-ink focus:ring-[#111111]" />
              <div>
                <span className="text-xs font-bold text-ink block">Auto-Confirm Bookings</span>
                <span className="text-[11px] text-gray-400">Skip provider approval; bookings go straight to confirmed.</span>
              </div>
            </label>
          </div>

          {/* Provider Response & No-show */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Provider Response &amp; No-Show</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Provider Response Window (Minutes)" hint="Time the provider has to accept or reject after payment hold.">
                <input type="number" min={15} max={480} required value={responseWindowMinutes}
                  onChange={(e) => setResponseWindowMinutes(e.target.value)}
                  className="w-full text-xs font-semibold rounded-xl border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#111111]" />
              </Field>
              <Field label="Slot Grace Period (Minutes)" hint="Lead time before slot start where response window is capped.">
                <input type="number" min={5} max={60} required value={gracePeriodMinutes}
                  onChange={(e) => setGracePeriodMinutes(e.target.value)}
                  className="w-full text-xs font-semibold rounded-xl border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#111111]" />
              </Field>
              <Field label="Provider No-Show Alert (Minutes after slot)" hint="Alert sent to both parties if provider has not updated status.">
                <input type="number" min={10} max={120} required value={noShowWaitMinutes}
                  onChange={(e) => setNoShowWaitMinutes(e.target.value)}
                  className="w-full text-xs font-semibold rounded-xl border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#111111]" />
              </Field>
              <Field label="Customer No-Show Wait (Minutes after slot)" hint="Provider must wait this long before marking customer no-show.">
                <input type="number" min={15} max={240} required value={customerNoShowWaitMinutes}
                  onChange={(e) => setCustomerNoShowWaitMinutes(e.target.value)}
                  className="w-full text-xs font-semibold rounded-xl border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#111111]" />
              </Field>
              <Field label="Slot Hold Duration (Minutes)" hint="How long a slot is held in pending_payment status.">
                <input type="number" min={5} max={60} required value={slotHoldMinutes}
                  onChange={(e) => setSlotHoldMinutes(e.target.value)}
                  className="w-full text-xs font-semibold rounded-xl border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#111111]" />
              </Field>
            </div>
          </div>

          {/* Brand & Fees */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Brand &amp; Fees</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Platform Name">
                <input type="text" required value={platformName} onChange={(e) => setPlatformName(e.target.value)}
                  className="w-full text-xs font-semibold rounded-xl border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#111111]" />
              </Field>
              <Field label="Support Email">
                <input type="email" required value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)}
                  className="w-full text-xs font-semibold rounded-xl border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#111111]" />
              </Field>
            </div>
            <div className="sm:w-1/2">
              <Field label="Commission Rate (%)" hint="Platform share deducted on each completed booking.">
                <input type="number" min={0} max={100} required value={commissionPercent}
                  onChange={(e) => setCommissionPercent(e.target.value)}
                  className="w-full text-xs font-semibold rounded-xl border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#111111]" />
              </Field>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={saving}
              className="btn-dark text-xs px-6 py-2.5 font-bold flex items-center gap-2">
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
