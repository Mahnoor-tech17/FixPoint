const mongoose = require("mongoose");

const SettingSchema = new mongoose.Schema(
  {
    // Platform identity
    platformName: { type: String, default: "FixPoint", trim: true },
    supportEmail: { type: String, default: "support@fixpoint.com", trim: true, lowercase: true },

    // Booking horizons
    bookingHorizonDays: { type: Number, default: 30, min: 1, max: 90 },

    // Commission (as a decimal, e.g. 0.20 = 20%)
    commissionRate: { type: Number, default: 0.20, min: 0, max: 1 },

    // Legacy field (kept for backward compat, in percent 0-100)
    commissionPercent: {
      type: Number,
      default: 20,
      min: 0,
      max: 100,
    },

    // Provider response window for accept/reject (minutes)
    responseWindowMinutes: { type: Number, default: 120, min: 10, max: 1440 },

    // Grace period before slot start for deadline calculation (minutes)
    gracePeriodMinutes: { type: Number, default: 15, min: 5, max: 60 },

    // No-show: how long after slot start before provider is flagged (minutes)
    noShowWaitMinutes: { type: Number, default: 30, min: 10, max: 120 },

    // No-show: how long customer waits before "did not arrive" is enabled (minutes)
    customerNoShowWaitMinutes: { type: Number, default: 60, min: 30, max: 180 },

    // Cancellation: free refund window (hours before slot)
    cancellationWindowHours: { type: Number, default: 24, min: 1, max: 168 },

    // Auto-confirm (bypass awaiting_provider step)
    autoConfirmBookings: { type: Boolean, default: false },

    // Slot hold (minutes) during Stripe checkout
    slotHoldMinutes: { type: Number, default: 10, min: 5, max: 30 },

    // Provider no-show penalty thresholds
    noShowWarningThreshold: { type: Number, default: 1, min: 1 },
    noShowRankReductionThreshold: { type: Number, default: 2, min: 1 },
    noShowSuspensionThreshold: { type: Number, default: 3, min: 1 },
  },
  { timestamps: true }
);

// Singleton helper
SettingSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model("Setting", SettingSchema);
