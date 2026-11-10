const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(__dirname, "../.env") });

const ConnectToDB = require("../models/db");
const BookingModel = require("../models/bookingModel");
const { Counter } = require("../models/counterModel");

(async () => {
  try {
    await ConnectToDB();
    const all = await BookingModel.find({ bookingId: /^FP-\d+$/ }).select("bookingId").lean();
    const max = all.reduce((m, b) => Math.max(m, parseInt(b.bookingId.slice(3), 10) || 0), 0);
    const current = await Counter.findById("booking");
    const target = Math.max(max, current ? current.seq : 0);
    await Counter.findByIdAndUpdate("booking", { $set: { seq: target } }, { upsert: true });
    console.log(`Max bookingId in DB: FP-${String(max).padStart(6, "0")}`);
    console.log(`Counter "booking" ab ${target} par hai. Agli booking: FP-${String(target + 1).padStart(6, "0")}`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
