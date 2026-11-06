import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertCircle,
  Calendar,
  Check,
  Clock,
  Loader2,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import ProviderLayout from "../../components/provider/ProviderLayout";
import { getErrorMessage, httpClient } from "../../lib/http";
import { useProviderStatus } from "../../components/provider/useProviderStatus";

const DAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

const toMinutes = (time) => {
  if (!time) return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  return match ? parseInt(match[1], 10) * 60 + parseInt(match[2], 10) : null;
};

const formatDuration = (start, end) => {
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (s === null || e === null || e <= s) return "";
  const diff = e - s;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

export default function ProviderAvailability() {
  const { providerStatus, loading: statusLoading } = useProviderStatus();

  // 7 days schedule: { day: 'mon', isAvailable: boolean, slots: [{ start, end }] }
  const [weekly, setWeekly] = useState(
    DAYS.map((d) => ({
      day: d.key,
      isAvailable: d.key !== "sun",
      slots:
        d.key !== "sun"
          ? [
              { start: "09:00", end: "13:00" },
              { start: "14:00", end: "18:00" },
            ]
          : [],
    }))
  );

  // Per-day new slot input state: { [dayKey]: { start: "09:00", end: "10:00" } }
  const [newSlotInputs, setNewSlotInputs] = useState(
    DAYS.reduce((acc, d) => ({ ...acc, [d.key]: { start: "09:00", end: "10:00" } }), {})
  );

  const [daysOff, setDaysOff] = useState([]);
  const [newDayOff, setNewDayOff] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      const res = await httpClient.get("/provider/availability");
      const av = res.data.availability;
      if (av) {
        if (Array.isArray(av.daysOff)) {
          setDaysOff(av.daysOff);
        }

        if (Array.isArray(av.weekly) && av.weekly.length > 0) {
          const mapped = DAYS.map((d) => {
            const found = av.weekly.find((w) => w.day === d.key);
            if (found) {
              const isAvail = found.isAvailable !== undefined ? Boolean(found.isAvailable) : Boolean(found.isWorking);
              let sList = [];
              if (Array.isArray(found.slots) && found.slots.length > 0) {
                sList = found.slots.map((s) => ({ start: s.start, end: s.end }));
              } else if (found.startTime && found.endTime) {
                sList = [{ start: found.startTime, end: found.endTime }];
              }
              return {
                day: d.key,
                isAvailable: isAvail,
                slots: sList,
              };
            }
            return {
              day: d.key,
              isAvailable: false,
              slots: [],
            };
          });
          setWeekly(mapped);
        }
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, []);

  const handleToggleDay = (dayKey) => {
    setWeekly((prev) =>
      prev.map((d) => (d.day === dayKey ? { ...d, isAvailable: !d.isAvailable } : d))
    );
  };

  const handleSlotInputChange = (dayKey, field, value) => {
    setNewSlotInputs((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        [field]: value,
      },
    }));
  };

  const handleAddSlot = (dayKey) => {
    const input = newSlotInputs[dayKey] || { start: "09:00", end: "10:00" };
    const { start, end } = input;

    if (!start || !end) {
      toast.error("Please specify both start and end time.");
      return;
    }

    const sMin = toMinutes(start);
    const eMin = toMinutes(end);

    if (sMin === null || eMin === null) {
      toast.error("Invalid time format.");
      return;
    }

    if (eMin <= sMin) {
      toast.error("End time must be after start time.");
      return;
    }

    if (eMin - sMin < 30) {
      toast.error("Slot duration must be at least 30 minutes.");
      return;
    }

    const dayObj = weekly.find((d) => d.day === dayKey);
    const currentSlots = dayObj?.slots || [];

    if (currentSlots.length >= 8) {
      toast.error("Maximum 8 slots allowed per day.");
      return;
    }

    // Check overlap with existing slots
    const hasOverlap = currentSlots.some((slot) => {
      const existingS = toMinutes(slot.start);
      const existingE = toMinutes(slot.end);
      return Math.max(sMin, existingS) < Math.min(eMin, existingE);
    });

    if (hasOverlap) {
      toast.error("New slot overlaps with an existing slot for this day.");
      return;
    }

    // Insert sorted
    const updatedSlots = [...currentSlots, { start, end }].sort(
      (a, b) => toMinutes(a.start) - toMinutes(b.start)
    );

    setWeekly((prev) =>
      prev.map((d) => (d.day === dayKey ? { ...d, slots: updatedSlots, isAvailable: true } : d))
    );

    toast.success(`Slot added to ${DAYS.find((d) => d.key === dayKey)?.label}`);
  };

  const handleRemoveSlot = (dayKey, slotIndex) => {
    setWeekly((prev) =>
      prev.map((d) =>
        d.day === dayKey
          ? { ...d, slots: d.slots.filter((_, idx) => idx !== slotIndex) }
          : d
      )
    );
  };

  const handleAddDayOff = (e) => {
    e.preventDefault();
    if (!newDayOff) return;
    if (daysOff.includes(newDayOff)) {
      toast.error("This date is already marked as a day off");
      return;
    }
    setDaysOff([...daysOff, newDayOff].sort());
    setNewDayOff("");
  };

  const handleRemoveDayOff = (dateStr) => {
    setDaysOff(daysOff.filter((d) => d !== dateStr));
  };

  const handleSave = async () => {
    // Validation: Any available day must have at least 1 slot
    const emptyActiveDays = weekly.filter((d) => d.isAvailable && (!d.slots || d.slots.length === 0));
    if (emptyActiveDays.length > 0) {
      const names = emptyActiveDays.map((d) => DAYS.find((x) => x.key === d.day)?.label).join(", ");
      toast.error(`Please add at least one slot or uncheck: ${names}`);
      return;
    }

    try {
      setSaving(true);
      const payload = {
        weekly: weekly.map((w) => ({
          day: w.day,
          isAvailable: Boolean(w.isAvailable),
          isWorking: Boolean(w.isAvailable),
          slots: w.slots.map((s) => ({ start: s.start, end: s.end })),
        })),
        daysOff,
      };

      const res = await httpClient.put("/provider/availability", payload);
      toast.success(res.data?.message || "Availability saved successfully!");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const totalSlotsCount = weekly.reduce(
    (total, d) => total + (d.isAvailable ? d.slots?.length || 0 : 0),
    0
  );

  return (
    <ProviderLayout title="Weekly Availability">
      {/* Header & Status */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-ink sm:text-2xl">
            Appointment Slot Schedule
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Define the exact time slots customers can book with you each week.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className="btn-primary self-start md:self-auto flex items-center gap-2 px-6 py-3"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> Save availability
            </>
          )}
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 w-full animate-pulse rounded-3xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Summary badge bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-xs border border-black/5 text-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pastel-blue text-blue-900 font-bold">
                <Clock className="h-4 w-4" />
              </span>
              <div>
                <p className="font-bold text-ink">
                  {totalSlotsCount} active slot{totalSlotsCount === 1 ? "" : "s"} across{" "}
                  {weekly.filter((d) => d.isAvailable).length} days
                </p>
                <p className="text-xs text-slate-500">
                  Customers only book within these designated time windows.
                </p>
              </div>
            </div>
            <div className="text-xs font-semibold text-slate-500">
              Min duration: 30 mins • Max 8 slots / day
            </div>
          </div>

          {/* 7 Days Schedule Cards */}
          <div className="space-y-4">
            {weekly.map((daySchedule) => {
              const dayMeta = DAYS.find((d) => d.key === daySchedule.day);
              const currentInput = newSlotInputs[daySchedule.day] || { start: "09:00", end: "10:00" };

              return (
                <div
                  key={daySchedule.day}
                  className={`rounded-3xl p-6 transition-all border ${
                    daySchedule.isAvailable
                      ? "bg-white border-black/10 shadow-xs"
                      : "bg-slate-50/70 border-slate-200 opacity-75"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={daySchedule.isAvailable}
                          onChange={() => handleToggleDay(daySchedule.day)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ink"></div>
                      </label>
                      <h3 className="text-lg font-bold text-ink">{dayMeta?.label}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                          daySchedule.isAvailable
                            ? daySchedule.slots.length > 0
                              ? "bg-emerald-100 text-emerald-900"
                              : "bg-amber-100 text-amber-900"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {daySchedule.isAvailable
                          ? `${daySchedule.slots.length} Slot${daySchedule.slots.length === 1 ? "" : "s"}`
                          : "Day off"}
                      </span>
                    </div>
                  </div>

                  {daySchedule.isAvailable && (
                    <div className="mt-5 space-y-4">
                      {/* Existing Slots as Chips */}
                      {daySchedule.slots.length === 0 ? (
                        <div className="rounded-2xl bg-amber-50/60 p-3 text-xs text-amber-800 border border-amber-200/60">
                          No slots added yet for this day. Use the form below to add your available hours.
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2.5">
                          {daySchedule.slots.map((slot, sIdx) => (
                            <div
                              key={sIdx}
                              className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 hover:bg-slate-200/70 px-3.5 py-2 text-xs font-bold text-ink transition border border-slate-200/60"
                            >
                              <Clock className="h-3.5 w-3.5 text-slate-500" />
                              <span>
                                {slot.start} – {slot.end}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                ({formatDuration(slot.start, slot.end)})
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveSlot(daySchedule.day, sIdx)}
                                className="ml-1 rounded-full p-0.5 text-slate-400 hover:bg-white hover:text-red-600 transition"
                                title="Remove slot"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Slot Input Bar */}
                      {daySchedule.slots.length < 8 ? (
                        <div className="flex flex-wrap items-center gap-3 pt-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500">From</span>
                            <input
                              type="time"
                              value={currentInput.start}
                              onChange={(e) =>
                                handleSlotInputChange(daySchedule.day, "start", e.target.value)
                              }
                              className="input-field py-1.5 px-3 text-xs w-32 font-mono"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500">To</span>
                            <input
                              type="time"
                              value={currentInput.end}
                              onChange={(e) =>
                                handleSlotInputChange(daySchedule.day, "end", e.target.value)
                              }
                              className="input-field py-1.5 px-3 text-xs w-32 font-mono"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddSlot(daySchedule.day)}
                            className="btn-dark py-1.5 px-4 text-xs font-semibold flex items-center gap-1.5"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add Slot
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">
                          Maximum limit of 8 slots reached for {dayMeta?.label}.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Days Off Section */}
          <div className="rounded-3xl bg-white p-6 shadow-xs border border-black/5 sm:p-8">
            <h3 className="text-lg font-bold text-ink mb-1">Specific Days Off (Holidays)</h3>
            <p className="text-xs text-slate-500 mb-4">
              Mark specific calendar dates where you will not be available regardless of weekly schedule.
            </p>

            <form onSubmit={handleAddDayOff} className="flex flex-wrap items-center gap-3 mb-4">
              <input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={newDayOff}
                onChange={(e) => setNewDayOff(e.target.value)}
                className="input-field w-auto text-xs py-2 px-3 font-mono"
              />
              <button
                type="submit"
                disabled={!newDayOff}
                className="btn-dark py-2 px-4 text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Add Day Off
              </button>
            </form>

            {daysOff.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No special days off configured.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {daysOff.map((dateStr) => (
                  <span
                    key={dateStr}
                    className="inline-flex items-center gap-2 rounded-2xl bg-pastel-pink px-3 py-1.5 text-xs font-bold text-rose-950 border border-rose-200"
                  >
                    <Calendar className="h-3.5 w-3.5 text-rose-700" />
                    {dateStr}
                    <button
                      type="button"
                      onClick={() => handleRemoveDayOff(dateStr)}
                      className="rounded-full p-0.5 hover:bg-white text-rose-700 hover:text-rose-900 transition"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Sticky Bottom Save Bar for Mobile/Desktop */}
          <div className="sticky bottom-4 rounded-3xl bg-ink p-4 text-white shadow-xl flex items-center justify-between gap-4">
            <div className="text-xs sm:text-sm font-medium">
              Ready to publish changes to your booking calendar?
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-primary py-2.5 px-6 text-xs sm:text-sm font-bold flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save schedule
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </ProviderLayout>
  );
}
