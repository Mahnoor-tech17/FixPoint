const mongoose = require("mongoose");

const ServiceSchema = new mongoose.Schema(
  {
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    categorySlug: { type: String, required: true, trim: true, index: true },

    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 1000 },

    price: { type: Number, required: true, min: 1 },
    priceType: { type: String, enum: ["fixed", "hourly"], default: "fixed" },
    durationMinutes: { type: Number, required: true, min: 15, max: 480 },

    serviceType: {
      type: String,
      enum: ["repair", "installation", "maintenance", "cleaning", "inspection", "other"],
      default: "other",
    },

    images: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Service", ServiceSchema);
