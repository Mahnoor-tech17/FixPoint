const mongoose = require("mongoose");

// FixPoint app/platform ka review (provider review se alag). Ek user ka ek hi review.
const AppReviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    userRole: { type: String, enum: ["CUSTOMER", "PROVIDER"], default: "CUSTOMER" },
    userName: { type: String, trim: true, default: "User" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AppReview", AppReviewSchema);