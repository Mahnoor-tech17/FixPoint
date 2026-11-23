"use strict";
const cron = require("node-cron");
const BookingModel = require("../models/bookingModel");
const UserModel = require("../models/userModel");
const PaymentModel = require("../models/paymentModel");
const { sendMail } = require("./emailService");
const { getPKTNow, toMinutes } = require("./slotService");
const { cancelPaymentIntent } = require("./stripeService");
const {
  DEFAULT_RESPONSE_WINDOW_MINUTES,
  DEFAULT_NO_SHOW_WAIT_MINUTES,
} = require("../config/fees");

let SettingModel;
try { SettingModel = require("../models/settingModel"); } catch (e) { SettingModel = null; }

async function getSettings() {
  try {
    const s = SettingModel ? await SettingModel.findOne().lean() : null;
    return {
      responseWindowMinutes: s?.responseWindowMinutes ?? DEFAULT_RESPONSE_WINDOW_MINUTES,
      noShowWaitMinutes: s?.noShowWaitMinutes ?? DEFAULT_NO_SHOW_WAIT_MINUTES,
    };
  } catch {
    return {
      responseWindowMinutes: DEFAULT_RESPONSE_WINDOW_MINUTES,
      noShowWaitMinutes: DEFAULT_NO_SHOW_WAIT_MINUTES,
    };
  }
}

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
      const nowDate = pktNow.date;
      const nowTime = pktNow.time;
      const nowTs = Date.now();

      // ===== 1. Expire awaiting_provider bookings past respondBy =====
      const expiredAwaiting = await BookingModel.find({
        status: "awaiting_provider",
        respondBy: { $lt: new Date() },
      });

      for (const booking of expiredAwaiting) {
        if (booking.stripePaymentIntentId) {
          try {
            await cancelPaymentIntent(booking.stripePaymentIntentId);
          } catch (stripeErr) {
            console.error(`Stripe cancel for booking ${booking._id}:`, stripeErr.message);
          }
        }

        await PaymentModel.findOneAndUpdate(
          { booking: booking._id },
          { status: "released", releasedAt: new Date() }
        );

        booking.status = "expired";
        booking.paymentStatus = "released";
        await booking.save();

        const serviceNames = (booking.items || []).map((i) => i.title).join(", ") || "your service";
        const customerId = booking.customer;
        const providerId = booking.provider;

        await sendReminderEmail(
          customerId,
          "Provider Did Not Respond - Hold Released",
          `Your booking request (${booking.bookingId}) for ${serviceNames} on ${booking.date} at ${booking.slotStart} was not responded to in time.\n\nYour card hold has been fully released — you have not been charged.\n\nPlease choose another provider from the app.`
        );

        await sendReminderEmail(
          providerId,
          "Missed Booking Request",
          `You did not respond to booking request ${booking.bookingId} in time. The request has expired.\n\nPlease respond to future requests promptly.`
        );
      }

      // ===== 2. 1-hour response-window reminder to provider =====
      const oneHourFromNow = new Date(nowTs + 60 * 60 * 1000);
      const awaitingNearDeadline = await BookingModel.find({
        status: "awaiting_provider",
        respondBy: { $gte: new Date(), $lte: oneHourFromNow },
        providerReminderSent: { $ne: true },
      });

      for (const booking of awaitingNearDeadline) {
        const providerId = booking.provider;
        const serviceNames = (booking.items || []).map((i) => i.title).join(", ") || "a service";
        await sendReminderEmail(
          providerId,
          "Respond to Booking Request Soon",
          `You have less than 1 hour to respond to booking request ${booking.bookingId} for ${serviceNames} on ${booking.date} at ${booking.slotStart}.\n\nPlease open the app and Accept or Reject before the deadline.`
        );
        booking.providerReminderSent = true;
        await booking.save();
      }

      // ===== 3. 24h and 1h reminders for confirmed/on_the_way bookings =====
      const confirmedBookings = await BookingModel.find({
        status: { $in: ["confirmed", "on_the_way"] },
        date: { $gte: nowDate },
        $or: [{ reminder24hSent: { $ne: true } }, { reminder1hSent: { $ne: true } }],
      });

      const todayMidnight = new Date(`${nowDate}T00:00:00Z`);

      for (const b of confirmedBookings) {
        const bDate = new Date(`${b.date}T00:00:00Z`);
        const dayDiff = Math.round((bDate - todayMidnight) / (1000 * 60 * 60 * 24));
        const bMinutes = toMinutes(b.slotStart) || 0;
        const totalMinutesUntil = dayDiff * 24 * 60 + (bMinutes - toMinutes(nowTime));
        const serviceNames = (b.items || []).map((i) => i.title).join(", ") || "your service";
        const customerId = b.customer;
        const providerId = b.provider;

        // 24h reminder (between 22h and 26h)
        if (!b.reminder24hSent && totalMinutesUntil >= 1320 && totalMinutesUntil <= 1560) {
          b.reminder24hSent = true;
          await b.save();
          await sendReminderEmail(customerId, "Upcoming Appointment Tomorrow",
            `Reminder: Your appointment (${b.bookingId}) for ${serviceNames} is scheduled for tomorrow at ${b.slotStart}.`);
          await sendReminderEmail(providerId, "Upcoming Job Tomorrow",
            `Reminder: You have a scheduled appointment (${b.bookingId}) tomorrow at ${b.slotStart} for ${serviceNames}.`);
        }

        // 1h reminder (between 30m and 90m)
        if (!b.reminder1hSent && totalMinutesUntil >= 30 && totalMinutesUntil <= 90) {
          b.reminder1hSent = true;
          await b.save();
          await sendReminderEmail(customerId, "Appointment in 1 Hour",
            `Your provider is scheduled to arrive at ${b.slotStart} for ${serviceNames} (${b.bookingId}).`);
          const addr = b.address
            ? `${b.address.line || ""}${b.address.area ? ", " + b.address.area : ""}${b.address.city ? ", " + b.address.city : ""}`
            : "see the app";
          await sendReminderEmail(providerId, "Upcoming Job in 1 Hour",
            `Your job for ${serviceNames} (${b.bookingId}) starts at ${b.slotStart}. Address: ${addr}.`);
        }
      }

      // ===== 4. Provider no-show check =====
      const settings = await getSettings();
      const confirmedForNoShow = await BookingModel.find({
        status: "confirmed",
        onTheWayAt: null,
        $or: [
          { date: { $lt: nowDate } },
          { date: nowDate, slotStart: { $lte: nowTime } },
        ],
      });

      for (const b of confirmedForNoShow) {
        const slotStartMins = toMinutes(b.slotStart) || 0;
        const dateParts = b.date.split("-").map(Number);
        const slotStartUtcMs =
          Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]) +
          slotStartMins * 60 * 1000 -
          5 * 60 * 60 * 1000; // PKT = UTC+5

        const minutesSinceSlotStart = (nowTs - slotStartUtcMs) / (60 * 1000);

        // Alert between noShowWaitMinutes and noShowWaitMinutes+20 (once per window)
        if (minutesSinceSlotStart >= settings.noShowWaitMinutes && minutesSinceSlotStart < settings.noShowWaitMinutes + 20) {
          const customerId = b.customer;
          const providerId = b.provider;
          const serviceNames = (b.items || []).map((i) => i.title).join(", ") || "your service";

          await sendReminderEmail(providerId, "Action Required - Scheduled Job",
            `Your booking ${b.bookingId} for ${serviceNames} started at ${b.slotStart}. Please tap "On My Way" or "Arrived" in the app immediately.`);

          await sendReminderEmail(customerId, "Provider May Be Delayed",
            `Your provider for booking ${b.bookingId} (${serviceNames} at ${b.slotStart}) has not updated their status yet. We have notified them. If they do not arrive, you can mark them as a no-show from the app 1 hour after the scheduled time.`);
        }
      }

    } catch (err) {
      console.error("Reminder cron job error:", err.message);
    }
  });

  console.log("Reminder & auto-cancellation cron service initialized");
}

module.exports = { startReminderCron };
