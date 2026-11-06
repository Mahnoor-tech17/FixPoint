const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const BreakSchema = new Schema(
  {
    start: { type: String, required: true }, // "13:00"
    end: { type: String, required: true }, // "14:00"
  },
  { _id: false },
);

const DayScheduleSchema = new Schema(
  {
    day: {
      type: String,
      enum: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      required: true,
    },
    isWorking: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: false },
    startTime: { type: String }, // legacy "09:00"
    endTime: { type: String }, // legacy "18:00"
    breaks: { type: [BreakSchema], default: [] },
    slots: {
      type: [
        new Schema(
          {
            start: { type: String, required: true },
            end: { type: String, required: true },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { _id: false },
);

const AvailabilitySchema = new Schema(
  {
    slotDurationMinutes: { type: Number, default: 60 },
    weekly: { type: [DayScheduleSchema], default: [] },
    daysOff: { type: [String], default: [] }, // ["2026-12-25"]
  },
  { _id: false },
);

const VerificationDocSchema = new Schema(
  {
    docType: { type: String, enum: ["cnic", "certificate", "other"], required: true },
    url: { type: String, required: true },
    name: { type: String, trim: true },
  },
  { _id: false },
);

const UserSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    password: { type: String, required: true },

    phone: { type: String, trim: true },

    role: {
      type: String,
      enum: ["ADMIN", "CUSTOMER", "PROVIDER"],
      default: "CUSTOMER",
    },

    profilePhoto: { type: String, trim: true },

    isVerified: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },

    verificationCode: { type: String },
    verificationCodeExpires: { type: Date },

    resetPasswordToken: { type: String },
    resetPasswordTokenExpires: { type: Date },

    // ---------------- Sirf PROVIDER ke liye ----------------
    serviceCategory: {
      type: String,
      trim: true,
      required: function () {
        return this.role === "PROVIDER";
      },
    },

    providerStatus: {
      type: String,
      enum: ["invited", "pending_verification", "approved", "rejected"],
      default: function () {
        return this.role === "PROVIDER" ? "invited" : undefined;
      },
    },

    rejectionReason: { type: String, trim: true },
    submittedAt: { type: Date },

    // Provider profile
    bio: { type: String, trim: true, maxlength: 500 },
    experienceYears: { type: Number, min: 0, max: 60 },
    hourlyRate: { type: Number, min: 100, max: 50000 },
    city: { type: String, trim: true },
    address: { type: String, trim: true },
    serviceAreas: { type: [String], default: undefined },
    cnic: { type: String, trim: true },
    verificationDocs: { type: [VerificationDocSchema], default: undefined },

    // Registration fee payment
    registrationFeePaid: { type: Boolean, default: false },
    registrationFeePaidAt: { type: Date },

    // Availability
    availability: { type: AvailabilitySchema, default: undefined },

    // Rating (reviews wale phase mein update hogi)
    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", UserSchema);