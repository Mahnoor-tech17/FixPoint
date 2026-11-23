const mongoose = require("mongoose");
const CategoryModel = require("../../models/categoryModel");
const UserModel = require("../../models/userModel");
const ReviewModel = require("../../models/reviewModel");
const ServiceModel = require("../../models/serviceModel");
const MasterServiceModel = require("../../models/masterServiceModel");
const { generateAvailableSlots, getPKTNow } = require("../../services/slotService");

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Visibility query helper: approved + registration fee paid + not blocked + not suspended
const VISIBLE_PROVIDER_FILTER = {
  role: "PROVIDER",
  providerStatus: "approved",
  registrationFeePaid: true,
  isBlocked: false,
  isSuspendedPendingReview: { $ne: true },
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

const getActiveMasterServices = async (req, res) => {
  try {
    const services = await MasterServiceModel.find({ isActive: true }).sort({ categorySlug: 1, title: 1 }).lean();
    const grouped = services.reduce((groups, service) => {
      (groups[service.categorySlug] ||= []).push(service);
      return groups;
    }, {});
    return res.status(200).json({ success: true, groups: grouped });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------- SEARCH PROVIDERS ----------------
const searchProviders = async (req, res) => {
  try {
    const {
      q, category, city, area, minPrice, maxPrice, minRating, availability,
      sort = "rating", page = 1, limit = 9, serviceIds,
    } = req.query;

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 9, 1), 30);

    const filter = { ...VISIBLE_PROVIDER_FILTER };

    if (category && category.trim()) {
      filter.serviceCategory = category.toLowerCase().trim();
    }

    if (city && city.trim()) {
      const cityRegex = new RegExp(escapeRegex(city.trim()), "i");
      filter.$or = [{ city: cityRegex }, { serviceAreas: cityRegex }];
    }

    const requestedMasterIds = serviceIds ? String(serviceIds).split(",").filter(mongoose.isValidObjectId) : [];

    if (minRating) {
      const ratingVal = parseFloat(minRating);
      if (!isNaN(ratingVal)) filter["rating.average"] = { $gte: ratingVal };
    }

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

    // If serviceIds provided, filter to providers who offer ALL those services
    if (requestedMasterIds.length) {
      const matchingProviderSets = await Promise.all(requestedMasterIds.map((masterId) =>
        ServiceModel.distinct("providerId", { masterServiceId: masterId, isActive: true })
      ));
      const intersection = matchingProviderSets.map((set) => set.map(String)).reduce((acc, ids) => acc.filter((id) => ids.includes(id)));
      filter._id = { $in: intersection };
    }

    const areaValue = area || city;
    if (areaValue && !city) filter.serviceAreas = new RegExp(escapeRegex(areaValue.trim()), "i");

    const candidateProviders = await UserModel.find(filter)
      .select("firstName lastName profilePhoto serviceCategory city serviceAreas experienceYears bio rating availability createdAt")
      .lean();

    const serviceMap = new Map();
    if (requestedMasterIds.length) {
      const providerIds = candidateProviders.map((provider) => provider._id);
      const providerServices = await ServiceModel.find({ providerId: { $in: providerIds }, masterServiceId: { $in: requestedMasterIds }, isActive: true }).lean();
      for (const service of providerServices) {
        const key = String(service.providerId);
        serviceMap.set(key, [...(serviceMap.get(key) || []), service]);
      }
    }

    const validProviders = candidateProviders.map((p) => {
      const hasSlots = Boolean(
        p.availability?.weekly?.some((w) => (w.isAvailable || w.isWorking) && (w.slots?.length > 0 || w.startTime))
      );
      const cartServices = serviceMap.get(String(p._id)) || [];
      const cartPrice = cartServices.reduce((total, service) => total + service.price, 0);
      const completeCart = !requestedMasterIds.length || new Set(cartServices.map((service) => String(service.masterServiceId))).size === new Set(requestedMasterIds).size;
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
        cartPrice,
        serviceIds: cartServices.map((service) => service._id),
        services: cartServices.map(({ _id, masterServiceId, title, price, durationMinutes }) => ({ _id, masterServiceId, title, price, durationMinutes })),
        hasSlots,
        availability: hasSlots ? "later" : "unavailable",
        availabilityData: p.availability,
        createdAt: p.createdAt,
        completeCart,
      };
    }).filter((provider) => provider.completeCart);

    const minP = minPrice === undefined || minPrice === "" ? null : Number(minPrice);
    const maxP = maxPrice === undefined || maxPrice === "" ? null : Number(maxPrice);
    let pricedProviders = validProviders.filter((provider) =>
      (!requestedMasterIds.length || Number.isFinite(provider.cartPrice)) &&
      (minP === null || Number.isNaN(minP) || provider.cartPrice >= minP) &&
      (maxP === null || Number.isNaN(maxP) || provider.cartPrice <= maxP)
    );

    if (sort === "rating") pricedProviders.sort((a, b) => (b.rating.average || 0) - (a.rating.average || 0));
    else if (sort === "price_asc") pricedProviders.sort((a, b) => a.cartPrice - b.cartPrice);
    else if (sort === "price_desc") pricedProviders.sort((a, b) => b.cartPrice - a.cartPrice);
    else if (sort === "newest") pricedProviders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    else if (sort === "experience") pricedProviders.sort((a, b) => (b.experienceYears || 0) - (a.experienceYears || 0));
    else pricedProviders.sort((a, b) => (b.rating.average || 5) - (a.rating.average || 5));

    const pktToday = getPKTNow().date;
    const today = new Date(`${pktToday}T12:00:00+05:00`);
    const tomorrow = new Date(today.getTime() + 86400000);
    const dayCodes = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    for (const provider of pricedProviders) {
      const weekly = provider.availabilityData?.weekly || [];
      const worksToday = weekly.some((w) => w.day === dayCodes[today.getUTCDay()] && (w.isAvailable || w.isWorking));
      const worksTomorrow = weekly.some((w) => w.day === dayCodes[tomorrow.getUTCDay()] && (w.isAvailable || w.isWorking));
      provider.availability = worksToday ? "today" : worksTomorrow ? "tomorrow" : "later";
      delete provider.availabilityData;
    }
    if (availability === "today" || availability === "tomorrow") {
      pricedProviders = pricedProviders.filter((p) => p.availability === availability);
    }

    const total = pricedProviders.length;
    const paginated = pricedProviders.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return res.status(200).json({ success: true, total, page: pageNum, pages: Math.ceil(total / limitNum) || 1, providers: paginated });
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

    const [provider, services] = await Promise.all([
      UserModel.findOne({ _id: id, ...VISIBLE_PROVIDER_FILTER })
        .select("firstName lastName profilePhoto serviceCategory bio experienceYears city serviceAreas rating hourlyRate availability")
        .lean(),
      ServiceModel.find({ providerId: id, isActive: true }).populate({ path: "masterServiceId", match: { isActive: true } }).lean(),
    ]);

    if (!provider) {
      return res.status(404).json({ success: false, message: "Provider not found or unavailable" });
    }

    const activeServices = services.filter((service) => service.masterServiceId);
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
        services: activeServices,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ---------------- GET PROVIDER AVAILABLE SLOTS ----------------
const getProviderSlots = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, durationMinutes, serviceIds } = req.query;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid provider id" });
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, message: "Valid date in YYYY-MM-DD format is required" });
    }

    const provider = await UserModel.findOne({ _id: id, ...VISIBLE_PROVIDER_FILTER });
    if (!provider) {
      return res.status(404).json({ success: false, message: "Provider not found or unavailable" });
    }

    // Calculate duration
    let totalDuration = durationMinutes ? parseInt(durationMinutes) : 60;
    if (serviceIds) {
      const idList = String(serviceIds).split(",").map((s) => s.trim()).filter(Boolean);
      const validIds = idList.filter((s) => mongoose.isValidObjectId(s)).map((s) => new mongoose.Types.ObjectId(s));
      if (validIds.length > 0) {
        const svcs = await ServiceModel.find({ _id: { $in: validIds }, providerId: provider._id }).lean();
        if (svcs.length > 0) {
          totalDuration = svcs.reduce((sum, s) => sum + (s.durationMinutes || 60), 0);
        }
      }
    }

    const slots = await generateAvailableSlots({ provider, date, durationMinutes: totalDuration });

    return res.status(200).json({ success: true, date, hourlyRate: provider.hourlyRate, slots });
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

    return res.status(200).json({ success: true, total, page: pageNum, pages: Math.ceil(total / limitNum) || 1, reviews });
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
    return res.status(200).json({ success: true, providers });
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
    return res.status(200).json({ success: true, reviews });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPublicCategories,
  getActiveMasterServices,
  searchProviders,
  getProviderPublicProfile,
  getProviderSlots,
  getProviderReviews,
  getFeaturedProviders,
  getLatestReviews,
};
