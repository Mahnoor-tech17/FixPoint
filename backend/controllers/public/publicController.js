const mongoose = require("mongoose");
const CategoryModel = require("../../models/categoryModel");
const UserModel = require("../../models/userModel");
const ReviewModel = require("../../models/reviewModel");
const { generateAvailableSlots, getPKTNow } = require("../../services/slotService");

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Visibility query helper: approved + registration fee paid + hourlyRate set + not blocked
const VISIBLE_PROVIDER_FILTER = {
  role: "PROVIDER",
  providerStatus: "approved",
  registrationFeePaid: true,
  isBlocked: false,
};

// ---------------- GET CATEGORIES ----------------
const getPublicCategories = async (req, res) => {
  try {
    const categories = await CategoryModel.find({ isActive: true })
      .select("name slug description icon")
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({ success: true, categories });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------- SEARCH PROVIDERS (Task 4) ----------------
const searchProviders = async (req, res) => {
  try {
    const {
      q,
      category,
      city,
      minPrice,
      maxPrice,
      minRating,
      sort = "rating",
      page = 1,
      limit = 9,
    } = req.query;

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 9, 1), 30);

    // Base filter: Approved + Paid + HourlyRate set + Not blocked
    const filter = { ...VISIBLE_PROVIDER_FILTER };

    // 1. Category filter
    if (category && category.trim()) {
      filter.serviceCategory = category.toLowerCase().trim();
    }

    // 2. City / Area filter (case-insensitive)
    if (city && city.trim()) {
      const cityRegex = new RegExp(escapeRegex(city.trim()), "i");
      filter.$or = [{ city: cityRegex }, { serviceAreas: cityRegex }];
    }

    // 3. Price range on hourlyRate
    const minP = minPrice ? parseFloat(minPrice) : null;
    const maxP = maxPrice ? parseFloat(maxPrice) : null;
    if (minP !== null && !isNaN(minP)) {
      filter.hourlyRate = { ...filter.hourlyRate, $gte: minP };
    }
    if (maxP !== null && !isNaN(maxP)) {
      filter.hourlyRate = { ...filter.hourlyRate, $lte: maxP };
    }

    // 4. Minimum rating
    if (minRating) {
      const ratingVal = parseFloat(minRating);
      if (!isNaN(ratingVal)) {
        filter["rating.average"] = { $gte: ratingVal };
      }
    }

    // 5. Keyword search (provider name only)
    if (q && q.trim()) {
      const safeQ = escapeRegex(q.trim());
      const regex = new RegExp(safeQ, "i");
      const nameQuery = [{ firstName: regex }, { lastName: regex }];

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: nameQuery }];
        delete filter.$or;
      } else {
        filter.$or = nameQuery;
      }
    }

    // Query candidate providers
    const candidateProviders = await UserModel.find(filter)
      .select(
        "firstName lastName profilePhoto serviceCategory city serviceAreas experienceYears bio rating hourlyRate availability createdAt"
      )
      .lean();

    // Map and check slots
    const validProviders = candidateProviders.map((p) => {
      const hasSlots = Boolean(
        p.availability?.weekly?.some(
          (w) => (w.isAvailable || w.isWorking) && (w.slots?.length > 0 || w.startTime)
        )
      );

      return {
        _id: p._id,
        firstName: p.firstName,
        lastName: p.lastName,
        profilePhoto: p.profilePhoto,
        serviceCategory: p.serviceCategory,
        city: p.city,
        serviceAreas: p.serviceAreas || [],
        experienceYears: p.experienceYears ?? 0,
        bio: p.bio || "",
        rating: p.rating || { average: 5, count: 0 },
        hourlyRate: p.hourlyRate,
        hasSlots,
        createdAt: p.createdAt,
      };
    });

    // Sort: rating, price (hourlyRate), newest
    if (sort === "rating") {
      validProviders.sort((a, b) => (b.rating.average || 0) - (a.rating.average || 0));
    } else if (sort === "price_asc") {
      validProviders.sort((a, b) => (a.hourlyRate || 0) - (b.hourlyRate || 0));
    } else if (sort === "price_desc") {
      validProviders.sort((a, b) => (b.hourlyRate || 0) - (a.hourlyRate || 0));
    } else if (sort === "newest") {
      validProviders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sort === "experience") {
      validProviders.sort((a, b) => (b.experienceYears || 0) - (a.experienceYears || 0));
    } else {
      validProviders.sort((a, b) => (b.rating.average || 5) - (a.rating.average || 5));
    }

    const total = validProviders.length;
    const paginated = validProviders.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return res.status(200).json({
      success: true,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      providers: paginated,
    });
  } catch (error) {
    console.error("searchProviders error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------- GET SINGLE PROVIDER PUBLIC PROFILE ----------------
const getProviderPublicProfile = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid provider id" });
    }

    const provider = await UserModel.findOne({
      _id: id,
      ...VISIBLE_PROVIDER_FILTER,
    })
      .select(
        "firstName lastName profilePhoto serviceCategory bio experienceYears city serviceAreas rating hourlyRate availability"
      )
      .lean();

    if (!provider) {
      return res.status(404).json({ success: false, message: "Provider not found or unavailable" });
    }

    const workingDays = (provider.availability?.weekly || [])
      .filter((w) => (w.isAvailable || w.isWorking) && (w.slots?.length > 0 || w.startTime))
      .map((w) => w.day.toUpperCase());

    return res.status(200).json({
      success: true,
      provider: {
        _id: provider._id,
        firstName: provider.firstName,
        lastName: provider.lastName,
        profilePhoto: provider.profilePhoto,
        serviceCategory: provider.serviceCategory,
        bio: provider.bio,
        experienceYears: provider.experienceYears ?? 0,
        city: provider.city,
        serviceAreas: provider.serviceAreas || [],
        rating: provider.rating || { average: 5, count: 0 },
        hourlyRate: provider.hourlyRate,
        workingDays,
        daysOff: provider.availability?.daysOff || [],
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------- GET PROVIDER AVAILABLE SLOTS (Task 5) ----------------
const getProviderSlots = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid provider id" });
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, message: "Valid date in YYYY-MM-DD format is required" });
    }

    const provider = await UserModel.findOne({
      _id: id,
      ...VISIBLE_PROVIDER_FILTER,
    });

    if (!provider) {
      return res.status(404).json({ success: false, message: "Provider not found or unavailable" });
    }

    const slots = await generateAvailableSlots({
      provider,
      date,
    });

    return res.status(200).json({
      success: true,
      date,
      hourlyRate: provider.hourlyRate,
      slots,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------- GET PROVIDER REVIEWS ----------------
const getProviderReviews = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 5 } = req.query;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid provider id" });
    }

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 5, 1), 20);

    const [reviews, total] = await Promise.all([
      ReviewModel.find({ providerId: id })
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .select("customerName rating comment createdAt")
        .lean(),
      ReviewModel.countDocuments({ providerId: id }),
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

// ---------------- GET FEATURED PROVIDERS (FOR LANDING) ----------------
const getFeaturedProviders = async (req, res) => {
  try {
    const providers = await UserModel.find(VISIBLE_PROVIDER_FILTER)
      .sort({ "rating.average": -1, "rating.count": -1 })
      .limit(6)
      .select("firstName lastName profilePhoto serviceCategory city serviceArea bio rating experienceYears hourlyRate")
      .lean();

    return res.status(200).json({
      success: true,
      providers,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------- GET LATEST REVIEWS (FOR LANDING) ----------------
const getLatestReviews = async (req, res) => {
  try {
    const reviews = await ReviewModel.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .populate("providerId", "firstName lastName profilePhoto serviceCategory")
      .select("customerName rating comment createdAt providerId")
      .lean();

    return res.status(200).json({
      success: true,
      reviews,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPublicCategories,
  searchProviders,
  getProviderPublicProfile,
  getProviderSlots,
  getProviderReviews,
  getFeaturedProviders,
  getLatestReviews,
};