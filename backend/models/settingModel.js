const mongoose = require("mongoose");

const SettingSchema = new mongoose.Schema(
  {
    cancellationWindowHours: {
      type: Number,
      default: 12,
      min: 1,
      max: 168,
    },
    bookingHorizonDays: {
      type: Number,
      default: 30,
      min: 1,
      max: 90,
    },
    autoConfirmBookings: {
      type: Boolean,
      default: false,
    },
    platformName: {
      type: String,
      default: "FixPoint",
      trim: true,
    },
    supportEmail: {
      type: String,
      default: "support@fixpoint.com",
      trim: true,
      lowercase: true,
    },
    commissionPercent: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },
  },
  { timestamps: true }
);

// Singleton helper to fetch or initialize settings
SettingSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model("Setting", SettingSchema);
