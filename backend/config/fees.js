module.exports = {
  PROVIDER_REGISTRATION_FEE: Number(process.env.PROVIDER_REGISTRATION_FEE) || 500,
  BOOKING_FEE: Number(process.env.BOOKING_FEE) || 100,
  CURRENCY: process.env.STRIPE_CURRENCY || "pkr",
  SLOT_HOLD_MINUTES: Number(process.env.SLOT_HOLD_MINUTES) || 10,
};
