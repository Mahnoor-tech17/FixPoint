const { getStripe } = require("../../services/stripeService");
const PaymentModel = require("../../models/paymentModel");
const UserModel = require("../../models/userModel");
const BookingModel = require("../../models/bookingModel");

const handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    const stripe = getStripe();
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      // In development if no webhook secret is provided, parse from body
      console.warn("WARNING: STRIPE_WEBHOOK_SECRET not set; parsing raw event without signature verification.");
      event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    }
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    const session = event.data?.object;
    const metadata = session?.metadata || {};
    const { type, userId, bookingId } = metadata;

    switch (event.type) {
      case "checkout.session.completed": {
        // Idempotency check: see if already marked paid
        let payment = await PaymentModel.findOne({ stripeSessionId: session.id });
        if (payment && payment.status === "paid") {
          return res.status(200).json({ received: true, alreadyProcessed: true });
        }

        if (payment) {
          payment.status = "paid";
          payment.paidAt = new Date();
          payment.stripePaymentIntentId = session.payment_intent || payment.stripePaymentIntentId;
          await payment.save();
        }

        if (type === "provider_registration") {
          const provider = await UserModel.findById(userId);
          if (provider) {
            provider.registrationFeePaid = true;
            provider.registrationFeePaidAt = new Date();
            await provider.save();
          }
        } else if (type === "booking_fee") {
          const targetBookingId = bookingId || payment?.booking;
          if (targetBookingId) {
            const booking = await BookingModel.findById(targetBookingId);
            if (booking) {
              booking.status = "confirmed";
              booking.slotHoldExpiresAt = undefined;
              await booking.save();
            }
          }
        }
        break;
      }

      case "checkout.session.expired": {
        let payment = await PaymentModel.findOne({ stripeSessionId: session.id });
        if (payment && payment.status === "pending") {
          payment.status = "failed";
          await payment.save();
        }

        // Booking remains releasable / expired
        if (bookingId) {
          const booking = await BookingModel.findById(bookingId);
          if (booking && booking.status === "pending_payment") {
            booking.status = "expired";
            await booking.save();
          }
        }
        break;
      }

      default:
        // Ignore unhandled event types idempotently
        break;
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook event handling error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  handleStripeWebhook,
};
