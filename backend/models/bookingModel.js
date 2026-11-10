const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: function () {
        return this.customer;
      },
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: function () {
        return this.provider;
      },
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    categorySlug: {
      type: String,
      default: function () {
        return this.category;
      },
    },
    hourlyRate: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
    },
    date: {
      type: String, // "YYYY-MM-DD"
      required: true,
      index: true,
    },
    slotStart: {
      type: String, // "HH:mm"
      required: true,
    },
    slotEnd: {
      type: String, // "HH:mm"
      required: true,
    },
    startTime: {
      type: String,
      default: function () {
        return this.slotStart;
      },
    },
    endTime: {
      type: String,
      default: function () {
        return this.slotEnd;
      },
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 15,
      max: 480,
    },
    estimatedPrice: {
      type: Number,
      required: false,
      default: 0,
      min: 0,
    },
    priceSnapshot: {
      type: Number,
      default: function () {
        return this.estimatedPrice;
      },
    },
    address: {
      line: { type: String, required: true, trim: true },
      street: {
        type: String,
        default: function () {
          return this.address?.line || "";
        },
      },
      area: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
    },
    customerStreet: {
      type: String,
      default: function () {
        return this.address?.line || "";
      },
    },
    customerCity: {
      type: String,
      default: function () {
        return this.address?.city || "";
      },
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    customerPhone: {
      type: String,
      default: function () {
        return this.phone;
      },
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    status: {
      type: String,
      enum: [
        "pending_payment",
        "confirmed",
        "completed",
        "cancelled",
        "no-show",
        "no_show",
        "expired",
        "pending",
      ],
      default: "pending_payment",
      index: true,
    },
    reviewed: {
      type: Boolean,
      default: false,
    },
    slotHoldExpiresAt: {
      type: Date,
      index: true,
    },
    cancelledBy: {
      type: String,
      enum: ["customer", "provider", "admin", "system"],
    },
    cancelReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

// Partial unique index preventing double booking under concurrency
BookingSchema.index(
  { provider: 1, date: 1, slotStart: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["pending_payment", "confirmed"] } },
  }
);

BookingSchema.index({ customer: 1, status: 1, date: -1 });
BookingSchema.index({ provider: 1, status: 1, date: -1 });

module.exports = mongoose.model("Booking", BookingSchema);