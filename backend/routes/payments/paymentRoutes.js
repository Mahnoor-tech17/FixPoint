const express = require("express");
const { handleStripeWebhook } = require("../../controllers/payments/paymentController");

const router = express.Router();

// The webhook uses raw body parser configured in server.js
router.post("/webhook", handleStripeWebhook);

module.exports = router;
