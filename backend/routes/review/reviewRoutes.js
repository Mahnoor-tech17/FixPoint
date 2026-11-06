const express = require("express");
const authMiddleware = require("../../middleware/authMiddleware");
const adminMiddleware = require("../../middleware/adminMiddleware");
const customerMiddleware = require("../../middleware/customerMiddleware");

const {
  createReview,
  getMyReviews,
  updateReview,
  deleteReview,
  getAllReviews,
} = require("../../controllers/review/reviewController");

const router = express.Router();

// Customer review routes
router.post("/", authMiddleware, customerMiddleware, createReview);
router.get("/my", authMiddleware, customerMiddleware, getMyReviews);
router.put("/:id", authMiddleware, customerMiddleware, updateReview);

// Delete can be done by Customer (own review) or Admin
router.delete("/:id", authMiddleware, deleteReview);

// Admin review moderation
router.get("/", authMiddleware, adminMiddleware, getAllReviews);

module.exports = router;
