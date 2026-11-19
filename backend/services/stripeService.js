const Stripe = require("stripe");

let stripeClient = null;

function getStripe() {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      console.warn("WARNING: STRIPE_SECRET_KEY is not set in environment.");
    }
    stripeClient = new Stripe(key || "sk_test_placeholder");
  }
  return stripeClient;
}

/**
 * Creates a hosted Stripe Checkout session.
 * Supports capture_method = "manual" (hold) or "automatic" (immediate charge).
 */
async function createCheckoutSession({
  amount,
  currency = "pkr",
  name,
  successUrl,
  cancelUrl,
  metadata = {},
  customerEmail,
  captureMethod = "automatic", // "manual" for hold, "automatic" for instant capture
}) {
  const stripe = getStripe();

  const sessionPayload = {
    mode: "payment",
    customer_email: customerEmail || undefined,
    line_items: [
      {
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: Math.round(amount * 100), // smallest currency unit (paisa)
          product_data: {
            name,
          },
        },
        quantity: 1,
      },
    ],
    metadata,
    payment_intent_data: {
      capture_method: captureMethod,
      metadata,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  };

  const session = await stripe.checkout.sessions.create(sessionPayload);
  return session;
}

/**
 * Captures an authorized PaymentIntent (converts card hold to charged).
 */
async function capturePaymentIntent(paymentIntentId, amountToCapture = null) {
  const stripe = getStripe();
  const opts = {};
  if (amountToCapture !== null && amountToCapture !== undefined) {
    opts.amount_to_capture = Math.round(amountToCapture * 100);
  }
  return stripe.paymentIntents.capture(paymentIntentId, Object.keys(opts).length > 0 ? opts : undefined);
}

/**
 * Cancels an uncaptured PaymentIntent (releases the hold on customer card).
 */
async function cancelPaymentIntent(paymentIntentId) {
  const stripe = getStripe();
  return stripe.paymentIntents.cancel(paymentIntentId);
}

/**
 * Refunds a captured payment via Stripe PaymentIntent ID (full or partial).
 */
async function refundPayment(paymentIntentId, amount = null) {
  const stripe = getStripe();
  const refundPayload = {
    payment_intent: paymentIntentId,
  };
  if (amount !== null && amount !== undefined) {
    refundPayload.amount = Math.round(amount * 100);
  }
  return stripe.refunds.create(refundPayload);
}

module.exports = {
  getStripe,
  createCheckoutSession,
  capturePaymentIntent,
  cancelPaymentIntent,
  refundPayment,
};
