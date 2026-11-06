import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Settings, Save, CheckCircle2, Shield } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import Spinner from "../../components/common/Spinner";
import { httpClient, getErrorMessage } from "../../lib/http";

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [cancellationWindowHours, setCancellationWindowHours] = useState(12);
  const [bookingHorizonDays, setBookingHorizonDays] = useState(30);
  const [autoConfirmBookings, setAutoConfirmBookings] = useState(false);
  const [platformName, setPlatformName] = useState("FixPoint");
  const [supportEmail, setSupportEmail] = useState("support@fixpoint.com");
  const [commissionPercent, setCommissionPercent] = useState(10);

  useEffect(() => {
    setLoading(true);
    httpClient
      .get("/settings")
      .then((res) => {
        if (res.data?.success && res.data.settings) {
          const s = res.data.settings;
          setCancellationWindowHours(s.cancellationWindowHours || 12);
          setBookingHorizonDays(s.bookingHorizonDays || 30);
          setAutoConfirmBookings(Boolean(s.autoConfirmBookings));
          setPlatformName(s.platformName || "FixPoint");
          setSupportEmail(s.supportEmail || "support@fixpoint.com");
          setCommissionPercent(s.commissionPercent || 10);
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
        commissionPercent: Number(commissionPercent),
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

  return (
    <AdminLayout title="Platform Settings">
      <div className="space-y-6 max-w-3xl">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-ink">System Configuration</h2>
            <p className="text-xs text-gray-500">
              Manage booking lead times, cancellation cutoff windows, and platform fees.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Booking Constraints */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Booking & Cancellation Rules
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-ink block mb-1">
                    Cancellation Cutoff Window (Hours)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={168}
                    required
                    value={cancellationWindowHours}
                    onChange={(e) => setCancellationWindowHours(e.target.value)}
                    className="w-full text-xs font-semibold rounded-xl border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#111111]"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Customers cannot cancel or reschedule within this many hours before appointment.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-ink block mb-1">
                    Advance Booking Horizon (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    required
                    value={bookingHorizonDays}
                    onChange={(e) => setBookingHorizonDays(e.target.value)}
                    className="w-full text-xs font-semibold rounded-xl border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#111111]"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Maximum future days customers are allowed to schedule slots for.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoConfirmBookings}
                    onChange={(e) => setAutoConfirmBookings(e.target.checked)}
                    className="w-4 h-4 rounded text-ink focus:ring-[#111111]"
                  />
                  <div>
                    <span className="text-xs font-bold text-ink block">
                      Auto-Confirm Bookings
                    </span>
                    <span className="text-[11px] text-gray-400">
                      When enabled, new bookings immediately transition to "confirmed" status without waiting for provider approval.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Brand & Platform Info
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-ink block mb-1">
                    Platform Name
                  </label>
                  <input
                    type="text"
                    required
                    value={platformName}
                    onChange={(e) => setPlatformName(e.target.value)}
                    className="w-full text-xs font-semibold rounded-xl border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#111111]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-ink block mb-1">
                    Support Email
                  </label>
                  <input
                    type="email"
                    required
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    className="w-full text-xs font-semibold rounded-xl border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#111111]"
                  />
                </div>
              </div>

              <div className="w-full sm:w-1/2">
                <label className="text-xs font-bold text-ink block mb-1">
                  Commission Rate (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={commissionPercent}
                  onChange={(e) => setCommissionPercent(e.target.value)}
                  className="w-full text-xs font-semibold rounded-xl border border-gray-200 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#111111]"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Platform share deducted on completed bookings.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="btn-dark text-xs px-6 py-2.5 font-bold flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
