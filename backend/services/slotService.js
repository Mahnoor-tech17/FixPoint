const BookingModel = require("../models/bookingModel");
const SettingModel = require("../models/settingModel");

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function getPKTNow() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const map = {};
  for (const p of parts) map[p.type] = p.value;
  return {
    date: `${map.year}-${map.month}-${map.day}`, // "YYYY-MM-DD"
    time: `${map.hour}:${map.minute}`, // "HH:mm"
  };
}

function toMinutes(timeStr) {
  if (!timeStr) return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeStr);
  return match ? parseInt(match[1], 10) * 60 + parseInt(match[2], 10) : null;
}

function toTimeString(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Generates available appointment slots for a provider on a specific date.
 * PoseFit-style slot model: checks discrete provider slots, filters held/confirmed bookings and past slots.
 */
async function generateAvailableSlots({ provider, date, excludeBookingId = null }) {
  if (!provider || !date) return [];

  // Check valid date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];

  const pktNow = getPKTNow();
  if (date < pktNow.date) return [];

  // Check booking horizon
  let horizonDays = 30;
  try {
    const settings = await SettingModel.getSettings();
    if (settings?.bookingHorizonDays) horizonDays = settings.bookingHorizonDays;
  } catch {
    // Default 30 days
  }

  const todayDate = new Date(`${pktNow.date}T00:00:00Z`);
  const requestedDate = new Date(`${date}T00:00:00Z`);
  const diffDays = Math.round((requestedDate - todayDate) / (1000 * 60 * 60 * 24));
  if (diffDays > horizonDays) return [];

  const availability = provider.availability;
  if (!availability || !Array.isArray(availability.weekly)) return [];

  // Check days off
  if (Array.isArray(availability.daysOff) && availability.daysOff.includes(date)) {
    return [];
  }

  // Determine weekday in UTC
  const dayIndex = requestedDate.getUTCDay();
  const dayKey = DAYS[dayIndex];

  const schedule = availability.weekly.find(
    (w) => w.day === dayKey && (w.isAvailable || w.isWorking)
  );
  if (!schedule) return [];

  // Candidate slots from provider schedule
  let candidateSlots = [];
  if (Array.isArray(schedule.slots) && schedule.slots.length > 0) {
    candidateSlots = schedule.slots.map((s) => ({
      startTime: s.start,
      endTime: s.end,
      startMin: toMinutes(s.start),
      endMin: toMinutes(s.end),
    }));
  } else if (schedule.startTime && schedule.endTime) {
    // Legacy fallback (60-minute slices)
    const sMin = toMinutes(schedule.startTime);
    const eMin = toMinutes(schedule.endTime);
    if (sMin !== null && eMin !== null && eMin > sMin) {
      for (let st = sMin; st + 60 <= eMin; st += 60) {
        candidateSlots.push({
          startTime: toTimeString(st),
          endTime: toTimeString(st + 60),
          startMin: st,
          endMin: st + 60,
        });
      }
    }
  }

  if (candidateSlots.length === 0) return [];

  // Fetch active bookings (confirmed or active holds)
  const now = new Date();
  const bookingFilter = {
    $and: [
      { $or: [{ provider: provider._id }, { providerId: provider._id }] },
      { date },
      {
        $or: [
          { status: "confirmed" },
          { status: "pending" },
          { status: "pending_payment", slotHoldExpiresAt: { $gt: now } },
        ],
      },
    ],
  };
  if (excludeBookingId) {
    bookingFilter._id = { $ne: excludeBookingId };
  }

  const activeBookings = await BookingModel.find(bookingFilter)
    .select("slotStart slotEnd startTime endTime")
    .lean();

  const bookedIntervals = activeBookings.map((b) => ({
    startMin: toMinutes(b.slotStart || b.startTime),
    endMin: toMinutes(b.slotEnd || b.endTime),
  }));

  const currentMinutesNow = toMinutes(pktNow.time);
  const hourlyRate = provider.hourlyRate || 0;

  const availableSlots = [];
  for (const slot of candidateSlots) {
    // Hide past slots for today
    if (date === pktNow.date && slot.startMin <= currentMinutesNow) {
      continue;
    }

    // Check overlap with active bookings
    const isBooked = bookedIntervals.some(
      (b) => Math.max(slot.startMin, b.startMin) < Math.min(slot.endMin, b.endMin)
    );
    if (isBooked) continue;

    const durationMinutes = Math.max(slot.endMin - slot.startMin, 30);
    const durationHours = durationMinutes / 60;
    const estimatedPrice = Math.round(hourlyRate * durationHours);

    availableSlots.push({
      startTime: slot.startTime,
      endTime: slot.endTime,
      durationMinutes,
      estimatedPrice,
    });
  }

  return availableSlots;
}

/**
 * Lightweight periodic cleanup expiring stale pending_payment holds.
 */
function startHoldCleanup() {
  setInterval(async () => {
    try {
      const now = new Date();
      await BookingModel.updateMany(
        {
          status: "pending_payment",
          slotHoldExpiresAt: { $lte: now },
        },
        {
          $set: { status: "expired" },
        }
      );
    } catch (err) {
      console.error("Slot hold cleanup error:", err.message);
    }
  }, 60 * 1000);
}

module.exports = {
  getPKTNow,
  toMinutes,
  toTimeString,
  generateAvailableSlots,
  startHoldCleanup,
};
