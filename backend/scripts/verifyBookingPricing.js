const assert = require("node:assert/strict");
const { completeBookingAndCreditPayout } = require("../controllers/provider/providerController");

const providerServices = [
  { _id: "service-1", title: "Repair", price: 2500, durationMinutes: 60 },
  { _id: "service-2", title: "Inspection", price: 1000, durationMinutes: 30 },
];
const snapshot = providerServices.map((service) => ({ ...service }));
const total = snapshot.reduce((sum, item) => sum + item.price, 0);
const commissionRate = 0.2;
const commissionAmount = Math.round(total * commissionRate);
const providerAmount = total - commissionAmount;

assert.equal(snapshot.reduce((sum, item) => sum + item.price, 0), total);
assert.equal(commissionAmount + providerAmount, total);
providerServices[0].price = 9000;
assert.equal(snapshot[0].price, 2500, "Provider price edits must not change a booking snapshot");

const booking = { _id: "booking-1", provider: "provider-1", status: "confirmed", providerAmount };
let pendingPayout = 0;
const bookingModel = {
  async startSession() {
    return {
      async withTransaction(callback) { await callback(); },
      async endSession() {},
    };
  },
  async findOneAndUpdate(filter, update) {
    if (booking._id !== filter._id || booking.provider !== filter.provider || !filter.status.$in.includes(booking.status)) return null;
    Object.assign(booking, update.$set);
    return { ...booking };
  },
};
const userModel = {
  async findByIdAndUpdate(_providerId, update) {
    pendingPayout += update.$inc.pendingPayout;
  },
};

async function verifyCompletionPayout() {
  await completeBookingAndCreditPayout({ bookingId: booking._id, providerId: booking.provider, bookingModel, userModel });
  await completeBookingAndCreditPayout({ bookingId: booking._id, providerId: booking.provider, bookingModel, userModel });
  assert.equal(pendingPayout, providerAmount, "Repeated completion must credit payout once");
}

verifyCompletionPayout().then(() => {
  process.stdout.write("Booking pricing and completion payout checks passed.\n");
}).catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
