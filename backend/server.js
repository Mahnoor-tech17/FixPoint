const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const ConnectToDB = require("./models/db");
const authRoutes = require("./routes/auth/authRoutes");
const adminRoutes = require("./routes/admin/adminRoutes");
const providerRoutes = require("./routes/provider/providerRoutes");
const customerRoutes = require("./routes/customer/customerRoutes");
const uploadRoutes = require("./routes/upload/uploadRoutes");
const publicRoutes = require("./routes/public/publicRoutes");
const bookingRoutes = require("./routes/booking/bookingRoutes");
const reviewRoutes = require("./routes/review/reviewRoutes");
const appReviewRoutes = require("./routes/review/appReviewRoutes");
const settingRoutes = require("./routes/setting/settingRoutes");
const paymentRoutes = require("./routes/payments/paymentRoutes");

const { startReminderCron } = require("./services/reminderService");
const { startHoldCleanup } = require("./services/slotService");

const app = express();

const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan("dev"));

// Stripe Webhook MUST receive the raw body before express.json()
app.use("/api/payments/webhook", express.raw({ type: "application/json" }), paymentRoutes);

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/provider", providerRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/app-reviews", appReviewRoutes);
app.use("/api/settings", settingRoutes);
app.use("/api/payments", paymentRoutes);

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "FixPoint Backend API is running",
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

const startServer = async () => {
  try {
    await ConnectToDB();

    startReminderCron();
    startHoldCleanup();

    app.listen(PORT, () => {
      console.log(`FixPoint Backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();