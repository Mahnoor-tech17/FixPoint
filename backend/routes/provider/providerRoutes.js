const express = require("express");
const authMiddleware = require("../../middleware/authMiddleware");
const providerMiddleware = require("../../middleware/providerMiddleware");

const {
  getDashboard,
  getProfile,
  updateProfile,
  submitProfile,
  changePassword,
  getAvailability,
  updateAvailability,
  getPaymentStatus,
  createRegistrationFeeCheckout,
  verifyRegistrationFee,
  getProviderBookings,
  updateProviderBookingStatus,
  cancelProviderBooking,
  getMyPayments,
} = require("../../controllers/provider/providerController");

const router = express.Router();

// All routes in this router require authenticated PROVIDER
router.use(authMiddleware, providerMiddleware);

router.get("/dashboard", getDashboard);

router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.post("/profile/submit", submitProfile);
router.put("/change-password", changePassword);

// Availability
router.get("/availability", getAvailability);
router.put("/availability", updateAvailability);

// Registration fee (Rs 500)
router.get("/payment-status", getPaymentStatus);
router.post("/registration-fee/checkout", createRegistrationFeeCheckout);
router.get("/registration-fee/verify", verifyRegistrationFee);

// Bookings
router.get("/bookings", getProviderBookings);
router.put("/bookings/:id/status", updateProviderBookingStatus);
router.post("/bookings/:id/cancel", cancelProviderBooking);
router.get("/payments", getMyPayments);

module.exports = router;