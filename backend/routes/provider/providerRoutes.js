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
  // New actions
  acceptBooking,
  rejectBooking,
  markOnTheWay,
  markArrived,
  markCompleted,
  markCustomerNoShow,
  getEarnings,
  getMyServices,
  getAvailableMasterServices,
  createService,
  updateService,
  deleteService,
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
router.post("/bookings/:id/accept", acceptBooking);
router.post("/bookings/:id/reject", rejectBooking);
router.put("/bookings/:id/on-the-way", markOnTheWay);
router.put("/bookings/:id/arrived", markArrived);
router.put("/bookings/:id/completed", markCompleted);
router.put("/bookings/:id/customer-no-show", markCustomerNoShow);

// Earnings
router.get("/earnings", getEarnings);

// Services (Provider services catalog)
router.get("/services", getMyServices);
router.get("/master-services", getAvailableMasterServices);
router.post("/services", createService);
router.put("/services/:id", updateService);
router.delete("/services/:id", deleteService);

router.get("/payments", getMyPayments);

module.exports = router;
