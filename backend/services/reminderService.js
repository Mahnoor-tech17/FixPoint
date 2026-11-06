const cron = require("node-cron");
const BookingModel = require("../models/bookingModel");
const UserModel = require("../models/userModel");
const { sendMail } = require("./emailService");
const { getPKTNow, toMinutes } = require("./slotService");

async function sendReminderEmail(userId, subject, message) {
  try {
    const user = await UserModel.findById(userId).select("email firstName");
    if (user && user.email) {
      await sendMail({
        to: user.email,
        subject,
        text: `Hi ${user.firstName || "there"},\n\n${message}\n\nBest regards,\nThe FixPoint Team`,
      });
    }
  } catch (err) {
    console.error("Reminder email error (non-blocking):", err.message);
  }
}

function startReminderCron() {
  // Run every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    try {
      const pktNow = getPKTNow();
      const nowMinutes = toMinutes(pktNow.time);

      // ================= 1. Auto-cancel expired pending bookings =================
      const expiredPending = await BookingModel.find({
        status: "pending",
        $or: [
          { date: { $lt: pktNow.date } },
          { date: pktNow.date, startTime: { $lte: pktNow.time } },
        ],
      });

      for (const booking of expiredPending) {
        booking.status = "cancelled";
        booking.cancelledBy = "system";
        booking.cancelReason = "Appointment start time passed without provider confirmation.";
        await booking.save();

        await sendReminderEmail(
          booking.customerId,
          "Booking Auto-Cancelled",
          `Your booking (${booking.bookingId}) for ${booking.serviceTitle} was cancelled as the start time passed without confirmation.`
        );
      }

      // ================= 2. Send 24h and 1h reminders for confirmed bookings =================
      const confirmedBookings = await BookingModel.find({
        status: "confirmed",
        date: { $gte: pktNow.date },
        $or: [{ reminder24hSent: false }, { reminder1hSent: false }],
      });

      const todayMidnight = new Date(`${pktNow.date}T00:00:00Z`);

      for (const b of confirmedBookings) {
        const bDate = new Date(`${b.date}T00:00:00Z`);
        const dayDiff = Math.round((bDate - todayMidnight) / (1000 * 60 * 60 * 24));
        const bMinutes = toMinutes(b.startTime) || 0;
        const totalMinutesUntil = dayDiff * 24 * 60 + (bMinutes - nowMinutes);

        // 24h reminder (between 22h and 26h = 1320m to 1560m)
        if (!b.reminder24hSent && totalMinutesUntil >= 1320 && totalMinutesUntil <= 1560) {
          b.reminder24hSent = true;
          await b.save();

          // Email customer
          await sendReminderEmail(
            b.customerId,
            "Upcoming Appointment Tomorrow",
            `Reminder: Your appointment (${b.bookingId}) for ${b.serviceTitle} is scheduled for tomorrow at ${b.startTime}.`
          );

          // Email provider
          await sendReminderEmail(
            b.providerId,
            "Upcoming Job Tomorrow",
            `Reminder: You have a scheduled appointment (${b.bookingId}) tomorrow at ${b.startTime} for ${b.serviceTitle}.`
          );
        }

        // 1h reminder (between 30m and 90m = 30m to 90m)
        if (!b.reminder1hSent && totalMinutesUntil >= 30 && totalMinutesUntil <= 90) {
          b.reminder1hSent = true;
          await b.save();

          // Email customer
          await sendReminderEmail(
            b.customerId,
            "Appointment in 1 Hour",
            `Your provider is scheduled to arrive at ${b.startTime} for ${b.serviceTitle} (${b.bookingId}).`
          );

          // Email provider
          await sendReminderEmail(
            b.providerId,
            "Upcoming Job in 1 Hour",
            `Your job for ${b.serviceTitle} (${b.bookingId}) starts at ${b.startTime}. Address: ${b.address.street}, ${b.address.area}.`
          );
        }
      }
    } catch (err) {
      console.error("Reminder cron job error:", err.message);
    }
  });

  console.log("Reminder & auto-cancellation cron service initialized");
}

module.exports = { startReminderCron };
