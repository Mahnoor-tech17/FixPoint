const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const PaymentSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["provider_registration", "booking_payment"],
      required: true,
      index: true,
    },
    booking: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      default: undefined,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "pkr",
      lowercase: true,
      trim: true,
    },
    // Stripe references
    stripeSessionId: { type: String, trim: true, index: true },
    stripePaymentIntentId: { type: String, trim: true, index: true },

    // Payment lifecycle status
    status: {
      type: String,
      enum: ["pending", "authorized", "captured", "released", "refunded", "failed"],
      default: "pending",
      index: true,
    },

    // Timestamps for each state transition
    authorizedAt: { type: Date },
    capturedAt: { type: Date },
    releasedAt: { type: Date },
    refundedAt: { type: Date },
    refundedAmount: { type: Number, min: 0 },
    refundReason: { type: String, trim: true, maxlength: 500 },
    refundedBy: { type: String, enum: ["customer", "provider", "admin", "system"] },
    failedAt: { type: Date },

    // Legacy compat
    paidAt: { type: Date }, // set when captured
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", PaymentSchema);