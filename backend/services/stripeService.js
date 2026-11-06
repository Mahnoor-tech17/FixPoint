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
 * @param {Object} opts
 * @param {number} opts.amount - Amount in whole rupees
 * @param {string} [opts.currency="pkr"]
 * @param {string} opts.name - Item name
 * @param {string} opts.successUrl
 * @param {string} opts.cancelUrl
 * @param {Object} [opts.metadata={}]
 * @param {string} [opts.customerEmail]
 * @returns {Promise<Stripe.Checkout.Session>}
 */
async function createCheckoutSession({
  amount,
  currency = "pkr",
  name,
  successUrl,
  cancelUrl,
  metadata = {},
  customerEmail,
}) {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
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
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return session;
}

/**
 * Refunds a payment via Stripe PaymentIntent ID.
 * @param {string} paymentIntentId
 * @returns {Promise<Stripe.Refund>}
 */
async function refundPayment(paymentIntentId) {
  const stripe = getStripe();
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
  });
}

module.exports = {
  getStripe,
  createCheckoutSession,
  refundPayment,
};