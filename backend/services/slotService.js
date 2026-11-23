const BookingModel = require("../models/bookingModel");
const SettingModel = require("../models/settingModel");
const {
  DEFAULT_RESPONSE_WINDOW_MINUTES,
  DEFAULT_GRACE_PERIOD_MINUTES,
  SLOT_HOLD_MINUTES,
} = require("../config/fees");

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function getPKTNow() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const map = {};
  for (const p of parts) map[p.type] = p.value;
  return {
    date: `${map.year}-${map.month}-${map.day}`, // "YYYY-MM-DD"
    time: `${map.hour}:${map.minute}`, // "HH:mm"
    datetime: new Date(`${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}+05:00`),
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
 * Calculates respondBy deadline for provider response.
 * Rule: min(now + responseWindow, slotStart - gracePeriod)
 */
function calculateRespondBy(dateStr, slotStartStr, responseWindowMinutes = 120, gracePeriodMinutes = 15) {
  const now = new Date();
  const slotDateObj = new Date(`${dateStr}T${slotStartStr}:00+05:00`);

  const windowDeadline = new Date(now.getTime() + responseWindowMinutes * 60 * 1000);
  const slotGraceDeadline = new Date(slotDateObj.getTime() - gracePeriodMinutes * 60 * 1000);

  // Take the earlier of the two
  return new Date(Math.min(windowDeadline.getTime(), slotGraceDeadline.getTime()));
}

/**
 * Generates available appointment slots for a provider on a specific date.
 * Handles single services or cart of services with total durationMinutes.
 */
async function generateAvailableSlots({
  provider,
  date,
  durationMinutes = null,
  service = null,
  excludeBookingId = null,
}) {
  if (!provider || !date) return [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];

  const pktNow = getPKTNow();
  if (date < pktNow.date) return [];

  // Determine needed duration (min 15 mins, default 60)
  let neededDuration = 60;
  if (durationMinutes && Number(durationMinutes) >= 15) {
    neededDuration = Number(durationMinutes);
  } else if (service?.durationMinutes && Number(service.durationMinutes) >= 15) {
    neededDuration = Number(service.durationMinutes);
  }

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

  // Candidate intervals from provider schedule
  const intervals = [];
  if (Array.isArray(schedule.slots) && schedule.slots.length > 0) {
    for (const s of schedule.slots) {
      const sMin = toMinutes(s.start);
      const eMin = toMinutes(s.end);
      if (sMin !== null && eMin !== null && eMin > sMin) {
        intervals.push({ startMin: sMin, endMin: eMin });
      }
    }
  } else if (schedule.startTime && schedule.endTime) {
    const sMin = toMinutes(schedule.startTime);
    const eMin = toMinutes(schedule.endTime);
    if (sMin !== null && eMin !== null && eMin > sMin) {
      intervals.push({ startMin: sMin, endMin: eMin });
    }
  }

  if (intervals.length === 0) return [];

  // Slice intervals into candidate slots of duration `neededDuration`
  const candidateSlots = [];
  for (const interval of intervals) {
    const intervalDuration = interval.endMin - interval.startMin;
    if (intervalDuration < neededDuration) continue;

    // Step by 30 mins or exact slot match
    for (let st = interval.startMin; st + neededDuration <= interval.endMin; st += 30) {
      candidateSlots.push({
        startTime: toTimeString(st),
        endTime: toTimeString(st + neededDuration),
        startMin: st,
        endMin: st + neededDuration,
      });
    }
  }

  if (candidateSlots.length === 0) return [];

  // Fetch active bookings (blocked statuses only)
  const now = new Date();
  const bookingFilter = {
    $and: [
      { provider: provider._id },
      { date },
      {
        $or: [
          {
            status: {
              $in: [
                "awaiting_provider",
                "confirmed",
                "on_the_way",
                "in_progress",
                "pending", // legacy
              ],
            },
          },
          { status: "pending_payment", slotHoldExpiresAt: { $gt: now } },
        ],
      },
    ],
  };
  if (excludeBookingId) {
    bookingFilter._id = { $ne: excludeBookingId };
  }

  const activeBookings = await BookingModel.find(bookingFilter)
    .select("slotStart slotEnd")
    .lean();

  const bookedIntervals = activeBookings.map((b) => ({
    startMin: toMinutes(b.slotStart),
    endMin: toMinutes(b.slotEnd),
  }));

  const currentMinutesNow = toMinutes(pktNow.time);

  const availableSlots = [];
  const seenSlotKeys = new Set();

  for (const slot of candidateSlots) {
    const slotKey = `${slot.startTime}-${slot.endTime}`;
    if (seenSlotKeys.has(slotKey)) continue;
    seenSlotKeys.add(slotKey);

    // Hide past slots for today (including 15-min grace lead time)
    if (date === pktNow.date && slot.startMin <= currentMinutesNow + 15) {
      continue;
    }

    // Check overlap with active bookings
    const isBooked = bookedIntervals.some(
      (b) => Math.max(slot.startMin, b.startMin) < Math.min(slot.endMin, b.endMin)
    );
    if (isBooked) continue;

    availableSlots.push({
      startTime: slot.startTime,
      endTime: slot.endTime,
      durationMinutes: neededDuration,
    });
  }

  return availableSlots;
}

/**
 * Periodic cleanup expiring stale pending_payment holds.
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
  calculateRespondBy,
  generateAvailableSlots,
  startHoldCleanup,
};
