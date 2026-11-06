const express = require("express");
const rateLimit = require("express-rate-limit");
const authMiddleware = require("../../middleware/authMiddleware");

const {
  signup,
  verifyEmail,
  resendCode,
  login,
  forgotPassword,
  resetPassword,
  getMe,
} = require("../../controllers/auth/authController");

const router = express.Router();

// Rate limiting for auth routes: 30 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes.",
  },
});

router.post("/register", authLimiter, signup);
router.post("/verify-email", authLimiter, verifyEmail);
router.post("/resend-code", authLimiter, resendCode);
router.post("/login", authLimiter, login);
router.post("/forgot-password", authLimiter, forgotPassword);
router.put("/reset-password", authLimiter, resetPassword);
router.get("/me", authMiddleware, getMe);

module.exports = router;
