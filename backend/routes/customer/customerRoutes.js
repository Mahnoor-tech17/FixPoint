const express = require("express");
const authMiddleware = require("../../middleware/authMiddleware");
const customerMiddleware = require("../../middleware/customerMiddleware");

const {
  getProfile,
  updateProfile,
  changePassword,
  createCustomerBooking,
  payCustomerBooking,
  verifyBookingPayment,
  cancelCustomerBooking,
  getCustomerBookings,
  getMyPayments,
  customerMarksProviderNoShow,
} = require("../../controllers/customer/customerController");

const router = express.Router();

router.use(authMiddleware, customerMiddleware);

router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.put("/change-password", changePassword);

// Customer booking endpoints
router.post("/bookings", createCustomerBooking);
router.get("/bookings/verify-payment", verifyBookingPayment);
router.post("/bookings/:id/pay", payCustomerBooking);
router.post("/bookings/:id/cancel", cancelCustomerBooking);
router.post("/bookings/:id/no-show", customerMarksProviderNoShow);
router.get("/bookings", getCustomerBookings);
router.get("/payments", getMyPayments);

module.exports = router;
