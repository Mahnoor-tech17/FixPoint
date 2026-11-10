const express = require("express");
const authMiddleware = require("../../middleware/authMiddleware");
const adminMiddleware = require("../../middleware/adminMiddleware");

const {
  getMyAppReview,
  saveMyAppReview,
  deleteMyAppReview,
  getAllAppReviews,
  adminDeleteAppReview,
} = require("../../controllers/review/appReviewController");

const router = express.Router();

// Customer / Provider: apna app review
const nonAdmin = (req, res, next) => {
  if (req.user?.role === "ADMIN") {
    return res.status(403).json({ success: false, message: "Admins cannot review the app" });
  }
  next();
};

router.get("/my", authMiddleware, nonAdmin, getMyAppReview);
router.post("/my", authMiddleware, nonAdmin, saveMyAppReview);
router.delete("/my", authMiddleware, nonAdmin, deleteMyAppReview);

// Admin moderation
router.get("/", authMiddleware, adminMiddleware, getAllAppReviews);
router.delete("/:id", authMiddleware, adminMiddleware, adminDeleteAppReview);

module.exports = router;
