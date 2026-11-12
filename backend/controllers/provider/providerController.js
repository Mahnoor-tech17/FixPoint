const { getPasswordError } = require("../../utils/passwordPolicy");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const UserModel = require("../../models/userModel");
const BookingModel = require("../../models/bookingModel");
const PaymentModel = require("../../models/paymentModel");
const { PROVIDER_REGISTRATION_FEE, CURRENCY } = require("../../config/fees");
const { createCheckoutSession, refundPayment, getStripe } = require("../../services/stripeService");
const { getPKTNow, toMinutes } = require("../../services/slotService");

const SAFE_FIELDS =
  "-password -verificationCode -verificationCodeExpires -resetPasswordToken -resetPasswordTokenExpires";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DOC_TYPES = ["cnic", "certificate", "other"];
const CLOUDINARY_PREFIX = "https://res.cloudinary.com/";

const BASIC_FIELDS = [
  "firstName",
  "lastName",
  "phone",
  "bio",
  "experienceYears",
  "hourlyRate",
  "city",
  "address",
  "serviceAreas",
  "profilePhoto",
];
const VERIFICATION_FIELDS = ["cnic", "verificationDocs"];

// ---------------- Helpers ----------------
const isCloudinaryUrl = (url) =>
  typeof url === "string" && url.startsWith(CLOUDINARY_PREFIX);

const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  try {
    return new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  } catch {
    return false;
  }
};

const findProvider = async (req, res) => {
  const provider = await UserModel.findOne({
    _id: req.user.userId,
    role: "PROVIDER",
  });

  if (!provider) {
    res.status(404).json({ success: false, message: "Provider not found" });
    return null;
  }

  if (provider.isBlocked) {
    res.status(403).json({
      success: false,
      message: "Your account has been blocked. Please contact support.",
    });
    return null;
  }

  return provider;
};

const findApprovedProvider = async (req, res) => {
  const provider = await findProvider(req, res);
  if (!provider) return null;

  if (provider.providerStatus !== "approved") {
    res.status(403).json({
      success: false,
      message: "Your profile must be approved by the admin before you can do this",
    });
    return null;
  }

  return provider;
};

const validateProfileInput = (body) => {
  if (body.firstName !== undefined && String(body.firstName).trim().length < 2)
    return "First name is too short";
  if (body.lastName !== undefined && String(body.lastName).trim().length < 2)
    return "Last name is too short";

  if (body.bio !== undefined && String(body.bio).length > 500)
    return "Bio cannot exceed 500 characters";

  if (body.experienceYears !== undefined && body.experienceYears !== "") {
    const years = Number(body.experienceYears);
    if (!Number.isFinite(years) || years < 0 || years > 60)
      return "Experience must be between 0 and 60 years";
  }

  // hourlyRate is optional and no longer required from provider

  if (body.serviceAreas !== undefined) {
    if (
      !Array.isArray(body.serviceAreas) ||
      body.serviceAreas.length > 20 ||
      body.serviceAreas.some((a) => typeof a !== "string" || !a.trim())
    )
      return "Service areas must be a list of up to 20 area names";
  }

  if (body.profilePhoto && !isCloudinaryUrl(body.profilePhoto))
    return "Invalid profile photo URL";

  if (body.cnic !== undefined && !/^\d{5}-?\d{7}-?\d$/.test(String(body.cnic).trim()))
    return "Enter a valid 13-digit CNIC";

  if (body.verificationDocs !== undefined) {
    if (!Array.isArray(body.verificationDocs) || body.verificationDocs.length > 10)
      return "Documents must be a list of up to 10 files";

    for (const doc of body.verificationDocs) {
      if (!DOC_TYPES.includes(doc?.docType)) return "Invalid document type";
      if (!isCloudinaryUrl(doc?.url)) return "Invalid document URL";
    }
  }

  return null;
};

// ================= DASHBOARD =================
const getDashboard = async (req, res) => {
  try {
    const provider = await findProvider(req, res);
    if (!provider) return;

    const upcomingBookingsCount = await BookingModel.countDocuments({
      $or: [{ provider: provider._id }, { providerId: provider._id }],
      status: "confirmed",
    });

    const activeWeeklySlotsCount = (provider.availability?.weekly || []).reduce(
      (total, day) =>
        total +
        ((day.isAvailable || day.isWorking) && Array.isArray(day.slots)
          ? day.slots.length
          : 0),
      0
    );

    return res.status(200).json({
      success: true,
      dashboard: {
        providerStatus: provider.providerStatus,
        rejectionReason: provider.rejectionReason,
        serviceCategory: provider.serviceCategory,
        hourlyRate: provider.hourlyRate || null,
        registrationFeePaid: Boolean(provider.registrationFeePaid),
        weeklySlotsCount: activeWeeklySlotsCount,
        upcomingBookingsCount,
        hasAvailability: activeWeeklySlotsCount > 0,
        rating: provider.rating || { average: 5, count: 0 },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= PROFILE =================
const getProfile = async (req, res) => {
  try {
    const provider = await UserModel.findOne({
      _id: req.user.userId,
      role: "PROVIDER",
    }).select(SAFE_FIELDS);

    if (!provider) {
      return res.status(404).json({ success: false, message: "Provider not found" });
    }

    return res.status(200).json({ success: true, provider });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const provider = await findProvider(req, res);
    if (!provider) return;

    if (provider.providerStatus === "pending_verification") {
      return res.status(400).json({
        success: false,
        message: "Your profile is under review. You can edit it after the admin responds.",
      });
    }

    const body = req.body ?? {};
    const validationError = validateProfileInput(body);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    // hourlyRate is allowed to be updated even for approved providers
    const allowed =
      provider.providerStatus === "approved"
        ? BASIC_FIELDS
        : [...BASIC_FIELDS, ...VERIFICATION_FIELDS];

    for (const field of allowed) {
      if (body[field] !== undefined) {
        if (field === "hourlyRate" || field === "experienceYears") {
          provider[field] = body[field] === "" ? undefined : Number(body[field]);
        } else {
          provider[field] = body[field];
        }
      }
    }

    await provider.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const submitProfile = async (req, res) => {
  try {
    const provider = await findProvider(req, res);
    if (!provider) return;

    if (provider.providerStatus === "pending_verification") {
      return res.status(400).json({
        success: false,
        message: "Your profile is already submitted and under review",
      });
    }

    if (provider.providerStatus === "approved") {
      return res.status(400).json({
        success: false,
        message: "Your profile is already approved",
      });
    }

    const missing = [];
    if (!provider.profilePhoto) missing.push("profile photo");
    if (!provider.bio) missing.push("bio");
    if (provider.experienceYears === undefined || provider.experienceYears === null)
      missing.push("experience");
    // hourlyRate optional hai (service charges customer provider ko seedha deta hai)
    if (!provider.city) missing.push("city");
    if (!provider.serviceAreas?.length) missing.push("service areas");
    if (!provider.cnic) missing.push("CNIC number");
    if (!provider.verificationDocs?.some((d) => d.docType === "cnic"))
      missing.push("CNIC document");

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Please complete: ${missing.join(", ")}`,
      });
    }

    provider.providerStatus = "pending_verification";
    provider.submittedAt = new Date();
    provider.rejectionReason = undefined;
    await provider.save();

    return res.status(200).json({
      success: true,
      message: "Profile submitted for verification",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const provider = await findProvider(req, res);
    if (!provider) return;

    const { currentPassword, newPassword } = req.body ?? {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    const passwordError = getPasswordError(newPassword);
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError });
    }

    const isCorrect = await bcrypt.compare(currentPassword, provider.password);
    if (!isCorrect) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    if (await bcrypt.compare(newPassword, provider.password)) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password",
      });
    }

    provider.password = await bcrypt.hash(newPassword, 10);
    await provider.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= AVAILABILITY (PoseFit-Style Slots) =================
const validateAvailability = (body) => {
  const { weekly, daysOff = [] } = body;

  if (!Array.isArray(weekly) || weekly.length === 0) {
    return { error: "Weekly availability schedule is required" };
  }

  const seenDays = new Set();
  const normalizedWeekly = [];

  for (const entry of weekly) {
    const day = String(entry?.day || "").toLowerCase();
    if (!DAYS.includes(day)) return { error: `Invalid day: ${entry?.day}` };
    if (seenDays.has(day)) return { error: `Duplicate day specified: ${day}` };
    seenDays.add(day);

    const isAvailable = Boolean(entry.isAvailable ?? entry.isWorking);
    const rawSlots = Array.isArray(entry.slots) ? entry.slots : [];

    if (!isAvailable) {
      normalizedWeekly.push({ day, isAvailable: false, isWorking: false, slots: [] });
      continue;
    }

    if (rawSlots.length === 0) {
      return { error: `${day.toUpperCase()} is marked available but has no time slots configured.` };
    }

    if (rawSlots.length > 8) {
      return { error: `${day.toUpperCase()} cannot have more than 8 slots per day.` };
    }

    const parsedSlots = [];
    const seenSlots = new Set();

    for (const slot of rawSlots) {
      const start = toMinutes(slot?.start);
      const end = toMinutes(slot?.end);

      if (start === null || end === null) {
        return { error: `${day.toUpperCase()}: Start and end times must be in HH:mm format (e.g. 09:00)` };
      }

      if (end <= start) {
        return { error: `${day.toUpperCase()}: End time (${slot.end}) must be after start time (${slot.start}).` };
      }

      if (end - start < 30) {
        return { error: `${day.toUpperCase()}: Slot duration must be at least 30 minutes.` };
      }

      const slotKey = `${slot.start}-${slot.end}`;
      if (seenSlots.has(slotKey)) {
        return { error: `${day.toUpperCase()}: Duplicate slot ${slot.start} - ${slot.end} is not allowed.` };
      }
      seenSlots.add(slotKey);

      parsedSlots.push({ startMin: start, endMin: end, start: slot.start, end: slot.end });
    }

    parsedSlots.sort((a, b) => a.startMin - b.startMin);
    for (let i = 1; i < parsedSlots.length; i++) {
      if (parsedSlots[i].startMin < parsedSlots[i - 1].endMin) {
        return {
          error: `${day.toUpperCase()}: Slot ${parsedSlots[i].start}-${parsedSlots[i].end} overlaps with ${parsedSlots[i - 1].start}-${parsedSlots[i - 1].end}.`,
        };
      }
    }

    normalizedWeekly.push({
      day,
      isAvailable: true,
      isWorking: true,
      slots: parsedSlots.map(({ start, end }) => ({ start, end })),
    });
  }

  for (const day of DAYS) {
    if (!seenDays.has(day)) {
      normalizedWeekly.push({ day, isAvailable: false, isWorking: false, slots: [] });
    }
  }
  normalizedWeekly.sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day));

  if (!Array.isArray(daysOff)) {
    return { error: "daysOff must be a list of dates" };
  }

  const offSet = new Set();
  for (const date of daysOff) {
    if (!isValidDate(date)) return { error: `Invalid date: ${date}. Use YYYY-MM-DD` };
    offSet.add(date);
  }

  return {
    availability: {
      weekly: normalizedWeekly,
      daysOff: [...offSet].sort(),
    },
  };
};

const getAvailability = async (req, res) => {
  try {
    const provider = await findProvider(req, res);
    if (!provider) return;

    return res.status(200).json({
      success: true,
      availability: provider.availability || null,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateAvailability = async (req, res) => {
  try {
    const provider = await findApprovedProvider(req, res);
    if (!provider) return;

    const { availability, error } = validateAvailability(req.body ?? {});
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    provider.availability = availability;
    await provider.save();

    return res.status(200).json({
      success: true,
      message: "Availability schedule updated successfully",
      availability: provider.availability,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= REGISTRATION FEE (Stripe Test Mode) =================
const getPaymentStatus = async (req, res) => {
  try {
    const provider = await findProvider(req, res);
    if (!provider) return;

    return res.status(200).json({
      success: true,
      providerStatus: provider.providerStatus,
      registrationFeePaid: Boolean(provider.registrationFeePaid),
      fee: PROVIDER_REGISTRATION_FEE,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const createRegistrationFeeCheckout = async (req, res) => {
  try {
    const provider = await findProvider(req, res);
    if (!provider) return;

    if (provider.providerStatus !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Your profile must be approved by admin before paying the registration fee.",
      });
    }

    if (provider.registrationFeePaid) {
      return res.status(400).json({
        success: false,
        message: "Registration fee has already been paid.",
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    const session = await createCheckoutSession({
      amount: PROVIDER_REGISTRATION_FEE,
      currency: CURRENCY,
      name: "FixPoint Provider Registration Fee (One-Time)",
      customerEmail: provider.email,
      successUrl: `${frontendUrl}/provider/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${frontendUrl}/provider/payment-cancelled`,
      metadata: {
        type: "provider_registration",
        userId: provider._id.toString(),
      },
    });

    await PaymentModel.create({
      user: provider._id,
      type: "provider_registration",
      amount: PROVIDER_REGISTRATION_FEE,
      currency: CURRENCY,
      stripeSessionId: session.id,
      status: "pending",
    });

    return res.status(200).json({
      success: true,
      checkoutUrl: session.url,
    });
  } catch (error) {
    console.error("createRegistrationFeeCheckout error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= VERIFY REGISTRATION FEE (fallback when webhook is slow/missing) =================
const verifyRegistrationFee = async (req, res) => {
  try {
    const provider = await findProvider(req, res);
    if (!provider) return;

    const { session_id } = req.query;
    if (!session_id) {
      return res.status(400).json({ success: false, message: "session_id missing" });
    }

    const session = await getStripe().checkout.sessions.retrieve(session_id);

    if (session.metadata?.userId !== provider._id.toString()) {
      return res.status(403).json({ success: false, message: "Session does not belong to you" });
    }
    if (session.payment_status !== "paid") {
      return res.json({ success: false, status: session.payment_status });
    }

    const payment = await PaymentModel.findOne({ stripeSessionId: session.id });
    if (payment && payment.status !== "paid") {
      payment.status = "paid";
      payment.paidAt = new Date();
      payment.stripePaymentIntentId = session.payment_intent || payment.stripePaymentIntentId;
      await payment.save();
    }

    if (!provider.registrationFeePaid) {
      provider.registrationFeePaid = true;
      provider.registrationFeePaidAt = new Date();
      await provider.save();
    }

    return res.json({ success: true, status: "paid" });
  } catch (error) {
    console.error("verifyRegistrationFee error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= PROVIDER BOOKINGS (Task 6) =================
const getProviderBookings = async (req, res) => {
  try {
    const provider = await findProvider(req, res);
    if (!provider) return;

    const { scope = "all" } = req.query;

    // Provider ko sirf paid (confirmed) bookings nazar aani chahiye.
    const query = {
      $and: [
        { $or: [{ provider: provider._id }, { providerId: provider._id }] },
        { status: { $nin: ["pending_payment", "expired"] } },
      ],
    };

    const pktNow = getPKTNow();

    if (scope === "upcoming") {
      query.$and.push({ status: "confirmed" });
      query.$and.push({ date: { $gte: pktNow.date } });
    } else if (scope === "past") {
      query.$and.push({
        $or: [
          { status: { $in: ["completed", "cancelled", "no-show", "no_show"] } },
          { date: { $lt: pktNow.date } },
        ],
      });
    }

    const bookings = await BookingModel.find(query)
      .populate("customer customerId", "firstName lastName phone")
      .sort({ date: -1, startTime: -1 })
      .lean();

    // Privacy rule: Customer phone, address, and notes returned ONLY for confirmed or completed bookings
    const sanitized = bookings.map((b) => {
      const isConfirmedOrCompleted = ["confirmed", "completed"].includes(b.status);
      const cust = b.customer || b.customerId;
      const addr = b.address?.line ? b.address : { line: b.customerStreet || b.address?.street, area: b.address?.area, city: b.customerCity || b.address?.city };

      return {
        _id: b._id,
        bookingId: b.bookingId,
        status: b.status,
        date: b.date,
        slotStart: b.slotStart || b.startTime,
        slotEnd: b.slotEnd || b.endTime,
        category: b.category || b.categorySlug,
        estimatedPrice: b.estimatedPrice || b.priceSnapshot,
        customerName: cust ? `${cust.firstName} ${cust.lastName}` : "Customer",
        customerPhone: isConfirmedOrCompleted ? (b.phone || cust?.phone || b.customerPhone) : null,
        address: isConfirmedOrCompleted ? addr : null,
        notes: isConfirmedOrCompleted ? b.notes : null,
        createdAt: b.createdAt,
      };
    });

    return res.status(200).json({ success: true, bookings: sanitized });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateProviderBookingStatus = async (req, res) => {
  try {
    const provider = await findProvider(req, res);
    if (!provider) return;

    const { id } = req.params;
    const { status } = req.body;

    if (!["completed", "no-show", "no_show"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'completed' or 'no-show'",
      });
    }

    const booking = await BookingModel.findOne({
      _id: id,
      $or: [{ provider: provider._id }, { providerId: provider._id }],
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.status !== "confirmed") {
      return res.status(400).json({
        success: false,
        message: "Only confirmed bookings can be marked as completed or no-show",
      });
    }

    // Must be after slot START time
    const pktNow = getPKTNow();
    const startTimeStr = booking.slotStart || booking.startTime;
    if (
      booking.date > pktNow.date ||
      (booking.date === pktNow.date && toMinutes(startTimeStr) > toMinutes(pktNow.time))
    ) {
      return res.status(400).json({
        success: false,
        message: "You can only update status after the appointment start time",
      });
    }

    booking.status = status === "no_show" ? "no-show" : status;
    await booking.save();

    return res.status(200).json({
      success: true,
      message: `Booking marked as ${booking.status}`,
      booking,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const cancelProviderBooking = async (req, res) => {
  try {
    const provider = await findProvider(req, res);
    if (!provider) return;

    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || String(reason).trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "A cancellation reason of at least 3 characters is required",
      });
    }

    const booking = await BookingModel.findOne({
      _id: id,
      $or: [{ provider: provider._id }, { providerId: provider._id }],
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.status !== "confirmed") {
      return res.status(400).json({
        success: false,
        message: "Only confirmed bookings can be cancelled",
      });
    }

    // Refund Rs 100 booking fee via Stripe
    const payment = await PaymentModel.findOne({
      booking: booking._id,
      type: "booking_fee",
      status: "paid",
    });

    if (payment && payment.stripePaymentIntentId) {
      try {
        await refundPayment(payment.stripePaymentIntentId);
        payment.status = "refunded";
        payment.refundedAt = new Date();
        await payment.save();
      } catch (refundErr) {
        console.error("Stripe refund error:", refundErr.message);
      }
    }

    booking.status = "cancelled";
    booking.cancelledBy = "provider";
    booking.cancelReason = reason.trim();
    await booking.save();

    return res.status(200).json({
      success: true,
      message: "Booking cancelled and customer refunded successfully",
      booking,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


const getMyPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const [payments, total] = await Promise.all([
      PaymentModel.find({ user: req.user.userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .lean(),
      PaymentModel.countDocuments({ user: req.user.userId }),
    ]);
    return res.status(200).json({
      success: true,
      payments,
      pagination: { total, page: parseInt(page, 10), pages: Math.ceil(total / parseInt(limit, 10)) },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDashboard,
  getProfile,
  updateProfile,
  submitProfile,
  changePassword,
  getAvailability,
  updateAvailability,
  getPaymentStatus,
  createRegistrationFeeCheckout,
  verifyRegistrationFee,
  getProviderBookings,
  updateProviderBookingStatus,
  cancelProviderBooking,
  getMyPayments,
};