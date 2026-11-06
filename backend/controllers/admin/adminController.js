const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const mongoose = require("mongoose");

const UserModel = require("../../models/userModel");
const CategoryModel = require("../../models/categoryModel");
const ServiceModel = require("../../models/serviceModel");
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

// ================= ADMIN SERVICES MANAGEMENT =================
const getAllServices = async (req, res) => {
  try {
    const { category, search, active, page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 50);

    const filter = {};
    if (category) filter.categorySlug = category;
    if (active !== undefined && active !== "") {
      filter.isActive = active === "true";
    }
    if (search && search.trim()) {
      filter.title = { $regex: escapeRegex(search.trim()), $options: "i" };
    }

    const [services, total] = await Promise.all([
      ServiceModel.find(filter)
        .populate("providerId", "firstName lastName email serviceCategory profilePhoto")
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      ServiceModel.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      services,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const toggleServiceActive = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid service ID" });
    }

    const service = await ServiceModel.findById(id);
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    service.isActive = !service.isActive;
    await service.save();

    return res.status(200).json({
      success: true,
      message: `Service ${service.isActive ? "activated" : "deactivated"} successfully`,
      service,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid service ID" });
    }

    // Check if there are active bookings
    const activeBookings = await BookingModel.countDocuments({
      serviceId: id,
      status: { $in: ["pending", "confirmed"] },
    });

    if (activeBookings > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete service with active pending or confirmed bookings. Deactivate it instead.",
      });
    }

    const deleted = await ServiceModel.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Service deleted successfully",
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
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, { $ifNull: ["$price", "$priceSnapshot"] }, 0] },
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
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, { $ifNull: ["$price", "$priceSnapshot"] }, 0] },
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
      .populate("customerId", "firstName lastName email")
      .populate("providerId", "firstName lastName")
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
        escape(b.startTime),
        escape(b.endTime),
        escape(b.serviceTitle),
        escape(b.categorySlug),
        escape(`${b.customerId?.firstName || ""} ${b.customerId?.lastName || ""}`.trim()),
        escape(b.customerId?.email || ""),
        escape(`${b.providerId?.firstName || ""} ${b.providerId?.lastName || ""}`.trim()),
        escape(b.price || b.priceSnapshot || 0),
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
    const { type, status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (type && type !== "all") {
      query.type = type;
    }
    if (status && status !== "all") {
      query.status = status;
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

    const [payments, total, totalsAgg] = await Promise.all([
      PaymentModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .populate("user", "firstName lastName email role phone")
        .populate({
          path: "booking",
          select: "bookingId date slotStart slotEnd startTime endTime estimatedPrice status customer provider",
          populate: [
            { path: "customer", select: "firstName lastName email" },
            { path: "provider", select: "firstName lastName email serviceCategory" },
          ],
        })
        .lean(),
      PaymentModel.countDocuments(query),
      PaymentModel.aggregate([
        {
          $group: {
            _id: null,
            registrationFees: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ["$type", "provider_registration"] }, { $eq: ["$status", "paid"] }] },
                  "$amount",
                  0,
                ],
              },
            },
            bookingFees: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ["$type", "booking_fee"] }, { $eq: ["$status", "paid"] }] },
                  "$amount",
                  0,
                ],
              },
            },
            refunds: {
              $sum: {
                $cond: [{ $eq: ["$status", "refunded"] }, "$amount", 0],
              },
            },
          },
        },
      ]),
    ]);

    const totals = totalsAgg[0] || { registrationFees: 0, bookingFees: 0, refunds: 0 };
    totals.totalRevenue = (totals.registrationFees || 0) + (totals.bookingFees || 0) - (totals.refunds || 0);

    return res.status(200).json({
      success: true,
      payments,
      totals,
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
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
  getAllServices,
  toggleServiceActive,
  deleteService,
  getReports,
  exportBookingsCsv,
  getPayments,
};