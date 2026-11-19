const mongoose = require("mongoose");

const MasterServiceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    categorySlug: { type: String, required: true, trim: true, lowercase: true, index: true },
    description: { type: String, trim: true, maxlength: 1000 },
    defaultDurationMinutes: { type: Number, default: 60, min: 15, max: 480 },
    suggestedPrice: { type: Number, min: 0, default: 1000 },
    serviceType: {
      type: String,
      enum: ["repair", "installation", "maintenance", "cleaning", "inspection", "other"],
      default: "repair",
    },
    icon: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MasterService", MasterServiceSchema);
