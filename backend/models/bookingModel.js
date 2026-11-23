const mongoose = require("mongoose");

const BookingItemSchema = new mongoose.Schema(
  {
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
    masterServiceId: { type: mongoose.Schema.Types.ObjectId, ref: "MasterService" },
    title: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    durationMinutes: { type: Number, required: true, min: 15 },
  },
  { _id: false }
);

const BookingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Parties
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Services (cart)
    items: { type: [BookingItemSchema], default: [] },

    // Pricing (snapshotted at booking creation)
    total: { type: Number, required: true, min: 0, default: 0 },
    commissionRate: { type: Number, required: true, default: 0.20 }, // e.g. 0.20 = 20%
    commissionAmount: { type: Number, required: true, default: 0 },
    providerAmount: { type: Number, required: true, default: 0 },

    // Slot
    date: { type: String, required: true, index: true },   // "YYYY-MM-DD"
    slotStart: { type: String, required: true },            // "HH:mm"
    slotEnd: { type: String, required: true },              // "HH:mm"
    durationMinutes: { type: Number, required: true, min: 15, max: 480 },

    // Address
    address: {
      line: { type: String, required: true, trim: true },
      area: { type: String, trim: true, default: "" },
      city: { type: String, required: true, trim: true },
    },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },

    // Contact
    phone: { type: String, required: true, trim: true },

    // Notes
    notes: { type: String, trim: true, maxlength: 300, default: "" },

    // Status
    status: {
      type: String,
      enum: [
        "pending_payment",
        "awaiting_provider",
        "confirmed",
        "on_the_way",
        "in_progress",
        "completed",
        "rejected",
        "expired",
        "cancelled",
        "provider_no_show",
        "customer_no_show",
      ],
      default: "pending_payment",
      index: true,
    },

    // Payment status (mirrors Stripe state)
    paymentStatus: {
      type: String,
      enum: ["pending", "authorized", "captured", "released", "refunded"],
      default: "pending",
      index: true,
    },

    // Stripe references (stored on Payment model; duplicated here for quick lookup)
    stripePaymentIntentId: { type: String, trim: true, index: true },

    // Deadlines
    slotHoldExpiresAt: { type: Date, index: true },
    respondBy: { type: Date, index: true }, // provider must respond by this time

    // Service-day timestamps
    onTheWayAt: { type: Date },
    arrivedAt: { type: Date },
    completedAt: { type: Date },

    // Cancellation / rejection
    cancelledBy: { type: String, enum: ["customer", "provider", "admin", "system"] },
    cancelReason: { type: String, trim: true, maxlength: 500 },
    rejectedBy: { type: String, enum: ["provider", "system"] },
    rejectionReason: { type: String, trim: true, maxlength: 500 },

    // Reminder flags
    reminder24hSent: { type: Boolean, default: false },
    reminder1hSent: { type: Boolean, default: false },
    providerReminderSent: { type: Boolean, default: false }, // 1-hr response reminder

    // Review flag
    reviewed: { type: Boolean, default: false },

  },
  { timestamps: true }
);

// ---- Indexes ----
// Partial unique index: prevents double booking for active statuses
BookingSchema.index(
  { provider: 1, date: 1, slotStart: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $in: [
          "pending_payment",
          "awaiting_provider",
          "confirmed",
          "on_the_way",
          "in_progress",
        ],
      },
    },
  }
);

BookingSchema.index({ customer: 1, status: 1, date: -1 });
BookingSchema.index({ provider: 1, status: 1, date: -1 });
BookingSchema.index({ respondBy: 1, status: 1 });

module.exports = mongoose.model("Booking", BookingSchema);
