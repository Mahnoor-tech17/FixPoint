const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const mongoose = require("mongoose");
 
const UserModel = require("../../models/userModel");
const CategoryModel = require("../../models/categoryModel");
const BookingModel = require("../../models/bookingModel");
const ReviewModel = require("../../models/reviewModel");
const PaymentModel = require("../../models/paymentModel");
const { sendMail } = require("../../services/emailService");
 
const SAFE_FIELDS =
  "-password -verificationCode -verificationCodeExpires -resetPasswordToken -resetPasswordTokenExpires";
 
const isValidId = (id) => mongoose.isValidObjectId(id);
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
 
// ================= DASHBOARD =================
const getStats = async (req, res) => {
  try {
    const [
      totalCustomers,
      totalProviders,
      approvedProviders,
      pendingRequests,
      totalCategories,
      totalBookings,
      completedBookings,
      revenueResult,
    ] = await Promise.all([
      UserModel.countDocuments({ role: "CUSTOMER" }),
      UserModel.countDocuments({ role: "PROVIDER" }),
      UserModel.countDocuments({ role: "PROVIDER", providerStatus: "approved" }),
      UserModel.countDocuments({
        role: "PROVIDER",
        providerStatus: "pending_verification",
      }),
      CategoryModel.countDocuments(),
      BookingModel.countDocuments(),
      BookingModel.countDocuments({ status: "completed" }),
      PaymentModel.aggregate([
        { $match: { status: "paid" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);
 
    const totalRevenue = revenueResult[0]?.total || 0;
 
    return res.status(200).json({
      success: true,
      stats: {
        totalCustomers,
        totalProviders,
        approvedProviders,
        pendingRequests,
        totalCategories,
        totalBookings,
        completedBookings,
          totalRevenue,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
 
 
// ================= CREATE USER (Admin) =================
const createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone, role } = req.body;
 
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ success: false, message: "firstName, lastName, email, and password are required" });
    }
    if (!["CUSTOMER"].includes((role || "CUSTOMER").toUpperCase())) {
      return res.status(400).json({ success: false, message: "Only CUSTOMER role can be created via this endpoint" });
    }
    const existing = await UserModel.findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: "A user with this email already exists" });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await UserModel.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      password: hashed,
      phone: phone ? phone.trim() : undefined,
      role: "CUSTOMER",
      isVerified: true,
    });
    return res.status(201).json({ success: true, message: "Customer created successfully", userId: user._id });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
 
// ================= USERS =================
const getAllUsers = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 10 } = req.query;
 
    const filter = {};
    if (role) filter.role = role.toUpperCase();
    if (search) {
      const regex = new RegExp(escapeRegex(search.trim()), "i");
      filter.$or = [{ firstName: regex }, { lastName: regex }, { email: regex }];
    }
 
    const pageNum = Math.max(parseInt(page), 1);
    const limitNum = Math.min(Math.max(parseInt(limit), 1), 100);
 
    const [users, total] = await Promise.all([
      UserModel.find(filter)
        .select(SAFE_FIELDS)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      UserModel.countDocuments(filter),
    ]);
 
    return res.status(200).json({
      success: true,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      users,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
 
const getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;
 
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }
 
    const user = await UserModel.findById(id).select(SAFE_FIELDS);
 
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
 
    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
 
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
 
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }
 
    const user = await UserModel.findById(id);
 
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
 
    if (user.role === "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Admin accounts cannot be modified here",
      });
    }
 
    const { firstName, lastName, phone, isBlocked } = req.body;
 
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (phone !== undefined) user.phone = phone;
    if (isBlocked !== undefined) user.isBlocked = Boolean(isBlocked);
 
    await user.save();
 
    return res.status(200).json({
      success: true,
      message: "User updated successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
 
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
 
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }
 
    const user = await UserModel.findById(id);
 
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
 
    if (user.role === "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Admin accounts cannot be deleted",
      });
    }
 
    await user.deleteOne();
 
    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
 
// ================= PROVIDERS =================
const getProviders = async (req, res) => {
  try {
    const { status, category, search } = req.query;
 
    const filter = { role: "PROVIDER" };
    if (status) filter.providerStatus = status;
    if (category) filter.serviceCategory = category;
    if (search) {
      const regex = new RegExp(escapeRegex(search.trim()), "i");
      filter.$or = [{ firstName: regex }, { lastName: regex }, { email: regex }];
    }
 
    const providers = await UserModel.find(filter)
      .select(SAFE_FIELDS)
      .sort({ createdAt: -1 });
 
    return res.status(200).json({
      success: true,
      total: providers.length,
      providers,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
 
const inviteProvider = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, serviceCategory } = req.body;
 
    if (!firstName || !lastName || !email || !serviceCategory) {
      return res.status(400).json({
        success: false,
        message: "firstName, lastName, email and serviceCategory are required",
      });
    }
 
    const category = await CategoryModel.findOne({
      slug: serviceCategory.toLowerCase(),
      isActive: true,
    });
 
    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Service category does not exist or is inactive",
      });
    }
 
    const existing = await UserModel.findOne({ email: email.toLowerCase() });
 
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }
 
    const tempPassword = crypto.randomBytes(6).toString("base64url");
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
 
    const provider = await UserModel.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone,
      password: hashedPassword,
      role: "PROVIDER",
      isVerified: true,
      serviceCategory: category.slug,
      providerStatus: "invited",
    });
 
    try {
      await sendMail({
        to: provider.email,
        subject: "You have been invited to FixPoint",
        text:
          `Hi ${firstName} ${lastName},\n\n` +
          `You have been invited to join FixPoint as a ${category.name}.\n\n` +
          `Login email: ${provider.email}\n` +
          `Temporary password: ${tempPassword}\n\n` +
          `Login here: ${process.env.FRONTEND_URL}/login\n` +
          `After logging in, please complete your profile and upload your documents for verification.`,
      });
    } catch (mailError) {
      await provider.deleteOne();
      return res.status(500).json({
        success: false,
        message: "Could not send invitation email. Provider was not created.",
      });
    }
 
    return res.status(201).json({
      success: true,
      message: "Provider invited successfully. Login details sent by email.",
      providerId: provider._id,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
 
const getProviderRequests = async (req, res) => {
  try {
    const requests = await UserModel.find({
      role: "PROVIDER",
      providerStatus: "pending_verification",
    })
      .select(SAFE_FIELDS)
      .sort({ updatedAt: -1 });
 
    return res.status(200).json({
      success: true,
      total: requests.length,
      requests,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
 
const updateProviderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
 
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid provider id" });
    }
 
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be approved or rejected",
      });
    }
 
    if (status === "rejected" && !reason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }
 
    const provider = await UserModel.findOne({ _id: id, role: "PROVIDER" });
 
    if (!provider) {
      return res.status(404).json({ success: false, message: "Provider not found" });
    }
 
    if (provider.providerStatus !== "pending_verification") {
      return res.status(400).json({
        success: false,
        message: "Only providers with pending verification can be approved or rejected",
      });
    }
 
    provider.providerStatus = status;
    provider.rejectionReason = status === "rejected" ? reason : undefined;
    await provider.save();
 
 
    try {
      await sendMail({
        to: provider.email,
        subject:
          status === "approved"
            ? "Your FixPoint profile is approved"
            : "Your FixPoint profile needs changes",
        text:
          status === "approved"
            ? `Hi ${provider.firstName},\n\nCongratulations! Your profile has been approved. You can now add services and start receiving bookings.`
            : `Hi ${provider.firstName},\n\nYour profile was not approved.\nReason: ${reason}\n\nPlease update your profile and submit again.`,
      });
    } catch (mailError) {
      console.error("Status email failed:", mailError.message);
    }
 
    return res.status(200).json({
      success: true,
      message: `Provider ${status} successfully`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
 
// ================= CATEGORIES =================
const getCategories = async (req, res) => {
  try {
    const categories = await CategoryModel.find().sort({ name: 1 });
    return res.status(200).json({ success: true, categories });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
 
const createCategory = async (req, res) => {
  try {
    const { name, description, icon } = req.body;
 
    if (!name) {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }
 
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
 
    const exists = await CategoryModel.findOne({ $or: [{ name: name.trim() }, { slug }] });
 
    if (exists) {
      return res.status(400).json({ success: false, message: "Category already exists" });
    }
 
    const category = await CategoryModel.create({
      name: name.trim(),
      slug,
      description,
      icon,
    });
 
    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
 
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
 
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid category id" });
    }
 
    const category = await CategoryModel.findById(id);
 
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
 
    const { name, description, icon, isActive } = req.body;
 
    if (name !== undefined) category.name = name.trim();
    if (description !== undefined) category.description = description;
    if (icon !== undefined) category.icon = icon;
    if (isActive !== undefined) category.isActive = Boolean(isActive);
 
    await category.save();
 
    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
 
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
 
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid category id" });
    }
 
    const category = await CategoryModel.findById(id);
 
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
 
    const inUse = await UserModel.countDocuments({ serviceCategory: category.slug });
 
    if (inUse > 0) {
      return res.status(400).json({
        success: false,
        message: "Category is used by providers. Deactivate it instead of deleting.",
      });
    }
 
    await category.deleteOne();
 
    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
 
// ================= ADMIN REPORTS & ANALYTICS =================
const getReports = async (req, res) => {
  try {
    // 1. Last 30 days bookings count & revenue per day
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];
 
    const bookingsLast30Days = await BookingModel.aggregate([
      { $match: { date: { $gte: thirtyDaysAgoStr } } },
      {
        $group: {
          _id: "$date",
          count: { $sum: 1 },
          completedCount: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          revenue: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, "$total", 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);
 
    // 2. Status breakdown
    const statusCounts = await BookingModel.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
 
    // 3. Category breakdown
    const categoryCounts = await BookingModel.aggregate([
      {
        $group: {
          _id: "$categorySlug",
          count: { $sum: 1 },
          revenue: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, "$total", 0] },
          },
        },
      },
      { $sort: { count: -1 } },
    ]);
 
    // 4. Top providers
    const topProviders = await UserModel.find({ role: "PROVIDER", providerStatus: "approved" })
      .select("firstName lastName rating serviceCategory totalBookingsCompleted")
      .sort({ "rating.average": -1, "rating.count": -1 })
      .limit(5)
      .lean();
 
    return res.status(200).json({
      success: true,
      reports: {
        bookingsDaily: bookingsLast30Days,
        statusCounts: statusCounts.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
        categoryCounts,
        topProviders,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
 
const exportBookingsCsv = async (req, res) => {
  try {
    const bookings = await BookingModel.find()
      .populate("customer", "firstName lastName email")
      .populate("provider", "firstName lastName")
      .sort({ createdAt: -1 })
      .lean();
 
    const header = [
      "Booking ID",
      "Date",
      "Start Time",
      "End Time",
      "Service",
      "Category",
      "Customer Name",
      "Customer Email",
      "Provider Name",
      "Price (PKR)",
      "Status",
      "Created At",
    ].join(",");
 
    const rows = bookings.map((b) => {
      const escape = (val) => `"${String(val || "").replace(/"/g, '""')}"`;
      return [
        escape(b.bookingId),
        escape(b.date),
        escape(b.slotStart),
        escape(b.slotEnd),
        escape(b.items?.map((item) => item.title).join(", ") || ""),
        escape(b.categorySlug),
        escape(`${b.customer?.firstName || ""} ${b.customer?.lastName || ""}`.trim()),
        escape(b.customer?.email || ""),
        escape(`${b.provider?.firstName || ""} ${b.provider?.lastName || ""}`.trim()),
        escape(b.total || 0),
        escape(b.status),
        escape(b.createdAt?.toISOString() || ""),
      ].join(",");
    });
 
    const csv = [header, ...rows].join("\n");
 
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="fixpoint-bookings.csv"');
    return res.status(200).send(csv);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
 
// ================= PAYMENTS =================
const getPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 50);

    // Commission income: sum of commissionAmount on captured/completed bookings
    const [commissionAgg, pendingPayoutAgg, recentPayments, totalCount] = await Promise.all([
      BookingModel.aggregate([
        {
          $match: {
            paymentStatus: "captured",
            status: { $in: ["confirmed", "on_the_way", "in_progress", "completed", "customer_no_show"] },
          },
        },
        { $group: { _id: null, totalCommission: { $sum: "$commissionAmount" } } },
      ]),
      UserModel.aggregate([
        { $match: { role: "PROVIDER", pendingPayout: { $gt: 0 } } },
        { $group: { _id: null, totalPending: { $sum: "$pendingPayout" } } },
      ]),
      PaymentModel.find()
        .populate("user", "firstName lastName email role")
        .populate("booking", "bookingId total commissionAmount providerAmount status")
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      PaymentModel.countDocuments(),
    ]);

    const providersPendingPayout = await UserModel.find({ role: "PROVIDER", pendingPayout: { $gt: 0 } })
      .select("firstName lastName email phone pendingPayout totalPaidOut")
      .sort({ pendingPayout: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      summary: {
        totalCommissionEarned: commissionAgg[0]?.totalCommission || 0,
        totalPendingProviderPayouts: pendingPayoutAgg[0]?.totalPending || 0,
      },
      providersPendingPayout,
      payments: recentPayments,
      pagination: { total: totalCount, page: pageNum, pages: Math.ceil(totalCount / limitNum) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
 
// ---- New Admin Functions ----
const ServiceModel = require("../../models/serviceModel");
const MasterServiceModel = require("../../models/masterServiceModel");

const getAdminServices = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 50);
    const filter = {};
    if (search) {
      filter.title = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    }
    const [services, total] = await Promise.all([
      ServiceModel.find(filter)
        .populate("provider", "firstName lastName email")
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      ServiceModel.countDocuments(filter),
    ]);
    return res.status(200).json({ success: true, services, pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const toggleServiceActive = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await ServiceModel.findById(id);
    if (!service) return res.status(404).json({ success: false, message: "Service not found" });
    service.isActive = !service.isActive;
    await service.save();
    return res.status(200).json({ success: true, service });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteAdminService = async (req, res) => {
  try {
    const { id } = req.params;
    const activeBooking = await BookingModel.findOne({
      "items.serviceId": id,
      status: { $in: ["pending_payment", "awaiting_provider", "confirmed", "on_the_way", "in_progress"] },
    });
    if (activeBooking) return res.status(400).json({ success: false, message: "Cannot delete service with active bookings" });
    await ServiceModel.findByIdAndDelete(id);
    return res.status(200).json({ success: true, message: "Service deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getMasterServices = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
    const [services, total] = await Promise.all([
      MasterServiceModel.find().sort({ title: 1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
      MasterServiceModel.countDocuments(),
    ]);
    return res.status(200).json({ success: true, services, pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const createMasterService = async (req, res) => {
  try {
    const { title, categorySlug, description, defaultDurationMinutes, suggestedPrice, serviceType } = req.body;
    if (!title || !categorySlug) return res.status(400).json({ success: false, message: "title and categorySlug are required" });
    const service = new MasterServiceModel({
      title: title.trim(), categorySlug, description: description?.trim(),
      defaultDurationMinutes: Number(defaultDurationMinutes) || 60,
      suggestedPrice: Number(suggestedPrice) || 0,
      serviceType: serviceType || "repair",
      isActive: true,
    });
    await service.save();
    return res.status(201).json({ success: true, service });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateMasterService = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const service = await MasterServiceModel.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });
    if (!service) return res.status(404).json({ success: false, message: "Master service not found" });
    return res.status(200).json({ success: true, service });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteMasterService = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await MasterServiceModel.findById(id);
    if (!service) return res.status(404).json({ success: false, message: "Master service not found" });
    const providerUse = await ServiceModel.exists({ masterServiceId: id });
    if (providerUse) {
      service.isActive = false;
      await service.save();
      return res.status(409).json({ success: false, deactivated: true, message: "Providers already use this service. It has been deactivated instead of deleted." });
    }
    await service.deleteOne();
    return res.status(200).json({ success: true, message: "Master service deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const markProviderPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body || {};
    const provider = await UserModel.findById(id);
    if (!provider || provider.role !== "PROVIDER") return res.status(404).json({ success: false, message: "Provider not found" });
    const paidAmount = Number(amount) || provider.pendingPayout || 0;
    provider.pendingPayout = Math.max(0, (provider.pendingPayout || 0) - paidAmount);
    provider.totalPaidOut = (provider.totalPaidOut || 0) + paidAmount;
    await provider.save();
    return res.status(200).json({ success: true, message: `Marked Rs ${paidAmount.toLocaleString()} as paid to provider`, provider });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getStats,
  createUser,
  getAllUsers,
  getUserDetails,
  updateUser,
  deleteUser,
  getProviders,
  inviteProvider,
  getProviderRequests,
  updateProviderStatus,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getReports,
  exportBookingsCsv,
  getPayments,
  getAdminServices,
  toggleServiceActive,
  deleteAdminService,
  getMasterServices,
  createMasterService,
  updateMasterService,
  deleteMasterService,
  markProviderPaid,
};