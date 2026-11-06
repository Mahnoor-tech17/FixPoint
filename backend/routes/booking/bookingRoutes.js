const express = require("express");
const authMiddleware = require("../../middleware/authMiddleware");
const customerMiddleware = require("../../middleware/customerMiddleware");

const {
  createBooking,
  getBookings,
  getBookingDetails,
  updateBookingStatus,
  cancelCustomerBooking,
  rescheduleBooking,
} = require("../../controllers/booking/bookingController");

const router = express.Router();

router.use(authMiddleware);

router.post("/", customerMiddleware, createBooking);
router.get("/", getBookings);
router.get("/:id", getBookingDetails);
router.put("/:id/status", updateBookingStatus);
router.put("/:id/cancel", customerMiddleware, cancelCustomerBooking);
router.put("/:id/reschedule", customerMiddleware, rescheduleBooking);

module.exports = router;
