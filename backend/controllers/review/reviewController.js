const mongoose = require("mongoose");
const ReviewModel = require("../../models/reviewModel");
const BookingModel = require("../../models/bookingModel");
const UserModel = require("../../models/userModel");

const recalculateProviderRating = async (providerId) => {
  const reviews = await ReviewModel.find({ providerId }).select("rating").lean();
  if (reviews.length === 0) {
    await UserModel.findByIdAndUpdate(providerId, {
      rating: { average: 5, count: 0 },
    });
    return;
  }
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const average = Math.round((sum / reviews.length) * 10) / 10;
  await UserModel.findByIdAndUpdate(providerId, {
    rating: { average, count: reviews.length },
  });
};

// ================= CREATE REVIEW (Customer only) =================
const createReview = async (req, res) => {
  try {
    const customerId = req.user.userId;
    const { bookingId, rating, comment } = req.body;

    if (!bookingId || !rating) {
      return res.status(400).json({
        success: false,
        message: "Booking ID and rating (1 to 5) are required",
      });
    }

    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be an integer between 1 and 5",
      });
    }

    if (comment && comment.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Comment cannot exceed 1000 characters",
      });
    }

    const booking = await BookingModel.findOne({ _id: bookingId, customerId });
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "You can only review completed services",
      });
    }

    const existingReview = await ReviewModel.findOne({ bookingId: booking._id });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted a review for this booking",
      });
    }

    const customer = await UserModel.findById(customerId).select("firstName lastName");
    const customerName = customer
      ? `${customer.firstName} ${customer.lastName?.[0] || ""}.`
      : "Customer";

    const review = await ReviewModel.create({
      bookingId: booking._id,
      customerId,
      providerId: booking.providerId,
      serviceId: booking.serviceId,
      rating: ratingNum,
      comment: comment ? comment.trim() : "",
      customerName,
    });

    booking.reviewed = true;
    await booking.save();

    await recalculateProviderRating(booking.providerId);


    return res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      review,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= GET CUSTOMER'S REVIEWS =================
const getMyReviews = async (req, res) => {
  try {
    const customerId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 50);

    const [reviews, total] = await Promise.all([
      ReviewModel.find({ customerId })
        .populate("providerId", "firstName lastName profilePhoto serviceCategory")
        .populate("bookingId", "bookingId serviceTitle date startTime")
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      ReviewModel.countDocuments({ customerId }),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      reviews,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= UPDATE REVIEW (Customer only) =================
const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.user.userId;
    const { rating, comment } = req.body;

    const review = await ReviewModel.findOne({ _id: id, customerId });
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    if (rating !== undefined) {
      const ratingNum = Number(rating);
      if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return res.status(400).json({
          success: false,
          message: "Rating must be between 1 and 5",
        });
      }
      review.rating = ratingNum;
    }

    if (comment !== undefined) {
      if (comment.length > 1000) {
        return res.status(400).json({
          success: false,
          message: "Comment cannot exceed 1000 characters",
        });
      }
      review.comment = comment.trim();
    }

    await review.save();
    await recalculateProviderRating(review.providerId);

    return res.status(200).json({
      success: true,
      message: "Review updated successfully",
      review,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= DELETE REVIEW (Customer or Admin) =================
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, userId } = req.user;

    const filter = role === "ADMIN" ? { _id: id } : { _id: id, customerId: userId };
    const review = await ReviewModel.findOne(filter);

    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    const providerId = review.providerId;
    const bookingId = review.bookingId;

    await review.deleteOne();

    if (bookingId) {
      await BookingModel.findByIdAndUpdate(bookingId, { reviewed: false });
    }

    await recalculateProviderRating(providerId);

    return res.status(200).json({
      success: true,
      message: "Review removed successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= ADMIN LIST ALL REVIEWS =================
const getAllReviews = async (req, res) => {
  try {
    const { providerId, page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 50);

    const filter = {};
    if (providerId && mongoose.isValidObjectId(providerId)) {
      filter.providerId = providerId;
    }

    const [reviews, total] = await Promise.all([
      ReviewModel.find(filter)
        .populate("customerId", "firstName lastName email")
        .populate("providerId", "firstName lastName serviceCategory")
        .populate("bookingId", "bookingId serviceTitle date")
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      ReviewModel.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      reviews,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createReview,
  getMyReviews,
  updateReview,
  deleteReview,
  getAllReviews,
};
