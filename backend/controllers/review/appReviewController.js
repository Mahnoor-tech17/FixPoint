const AppReviewModel = require("../../models/appReviewModel");
const UserModel = require("../../models/userModel");

// ================= GET MY APP REVIEW =================
const getMyAppReview = async (req, res) => {
  try {
    const review = await AppReviewModel.findOne({ userId: req.user.userId }).lean();
    return res.status(200).json({ success: true, review: review || null });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= CREATE / UPDATE MY APP REVIEW =================
const saveMyAppReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;

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

    const user = await UserModel.findById(req.user.userId).select("firstName lastName role");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const userName = `${user.firstName} ${user.lastName?.[0] || ""}.`;

    const review = await AppReviewModel.findOneAndUpdate(
      { userId: user._id },
      {
        $set: {
          rating: ratingNum,
          comment: comment ? comment.trim() : "",
          userName,
          userRole: user.role === "PROVIDER" ? "PROVIDER" : "CUSTOMER",
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: "Thanks for reviewing FixPoint!",
      review,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= DELETE MY APP REVIEW =================
const deleteMyAppReview = async (req, res) => {
  try {
    await AppReviewModel.deleteOne({ userId: req.user.userId });
    return res.status(200).json({ success: true, message: "Your app review was removed" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= ADMIN: LIST ALL APP REVIEWS =================
const getAllAppReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 50);

    const [reviews, total, agg] = await Promise.all([
      AppReviewModel.find()
        .populate("userId", "firstName lastName email")
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      AppReviewModel.countDocuments(),
      AppReviewModel.aggregate([{ $group: { _id: null, avg: { $avg: "$rating" } } }]),
    ]);

    const average = agg[0] ? Math.round(agg[0].avg * 10) / 10 : 0;

    return res.status(200).json({
      success: true,
      total,
      average,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      reviews,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= ADMIN: DELETE ANY APP REVIEW =================
const adminDeleteAppReview = async (req, res) => {
  try {
    const deleted = await AppReviewModel.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }
    return res.status(200).json({ success: true, message: "App review removed" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMyAppReview,
  saveMyAppReview,
  deleteMyAppReview,
  getAllAppReviews,
  adminDeleteAppReview,
};