const { getStripe } = require("../../services/stripeService");
const PaymentModel = require("../../models/paymentModel");
const UserModel = require("../../models/userModel");
const BookingModel = require("../../models/bookingModel");
const { sendMail } = require("../../services/emailService");

const handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    const stripe = getStripe();
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
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
        // Idempotency check: see if already marked authorized or paid
        let payment = await PaymentModel.findOne({ stripeSessionId: session.id });
        if (payment && ["paid", "authorized", "captured"].includes(payment.status)) {
          return res.status(200).json({ received: true, alreadyProcessed: true });
        }

        if (type === "provider_registration") {
          if (payment) {
            payment.status = "paid";
            payment.paidAt = new Date();
            payment.stripePaymentIntentId = session.payment_intent || payment.stripePaymentIntentId;
            await payment.save();
          }

          const provider = await UserModel.findById(userId);
          if (provider) {
            provider.registrationFeePaid = true;
            provider.registrationFeePaidAt = new Date();
            await provider.save();
          }
        } else if (type === "booking_payment" || type === "booking_fee") {
          // New Hold Flow: card is authorized (held), NOT captured yet
          if (payment) {
            payment.status = "authorized";
            payment.authorizedAt = new Date();
            payment.stripePaymentIntentId = session.payment_intent || payment.stripePaymentIntentId;
            await payment.save();
          }

          const targetBookingId = bookingId || payment?.booking;
          if (targetBookingId) {
            const booking = await BookingModel.findById(targetBookingId).populate("customer provider");
            if (booking) {
              booking.status = "awaiting_provider";
              booking.paymentStatus = "authorized";
              booking.stripePaymentIntentId = session.payment_intent || booking.stripePaymentIntentId;
              booking.slotHoldExpiresAt = undefined;
              await booking.save();

              // Send notification emails
              try {
                if (booking.provider?.email) {
                  await sendMail({
                    to: booking.provider.email,
                    subject: `New Booking Request: ${booking.bookingId}`,
                    text: `Hi ${booking.provider.firstName},\n\nYou have received a new booking request (${booking.bookingId}) for ${booking.date} at ${booking.slotStart}.\n\nPlease accept or reject this request within 2 hours in your FixPoint portal.\n\nBest regards,\nFixPoint Team`,
                  });
                }
                if (booking.customer?.email) {
                  await sendMail({
                    to: booking.customer.email,
                    subject: `Booking Request Placed: ${booking.bookingId}`,
                    text: `Hi ${booking.customer.firstName},\n\nA temporary hold of PKR ${booking.total} has been placed on your card for booking ${booking.bookingId}.\n\nYour card will only be charged after the provider accepts your request. If the provider does not respond or rejects within 2 hours, the hold is released automatically.\n\nBest regards,\nFixPoint Team`,
                  });
                }
              } catch (mailErr) {
                console.error("Webhook notification email error (non-blocking):", mailErr.message);
              }
            }
          }
        }
        break;
      }

      case "checkout.session.expired": {
        let payment = await PaymentModel.findOne({ stripeSessionId: session.id });
        if (payment && payment.status === "pending") {
          payment.status = "failed";
          payment.failedAt = new Date();
          await payment.save();
        }

        const targetBookingId = bookingId || payment?.booking;
        if (targetBookingId) {
          const booking = await BookingModel.findById(targetBookingId);
          if (booking && booking.status === "pending_payment") {
            booking.status = "expired";
            booking.paymentStatus = "failed";
            await booking.save();
          }
        }
        break;
      }

      default:
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
