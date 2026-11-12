const { getPasswordError } = require("../../utils/passwordPolicy");
const bcrypt = require("bcryptjs");
const UserModel = require("../../models/userModel");
const BookingModel = require("../../models/bookingModel");
const PaymentModel = require("../../models/paymentModel");
const { BOOKING_FEE, CURRENCY, SLOT_HOLD_MINUTES } = require("../../config/fees");
const { createCheckoutSession, getStripe } = require("../../services/stripeService");
const { getPKTNow, toMinutes, generateAvailableSlots } = require("../../services/slotService");
const { getNextSequence } = require("../../models/counterModel");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const SAFE_FIELDS =
  "-password -verificationCode -verificationCodeExpires -resetPasswordToken -resetPasswordTokenExpires";

const getProfile = async (req, res) => {
  try {
    const user = await UserModel.findOne({
      _id: req.user.userId,
      role: "CUSTOMER",
    }).select(SAFE_FIELDS);

    if (!user) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    return res.status(200).json({ success: true, customer: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, profilePhoto, city, address } = req.body;

    const user = await UserModel.findOne({
      _id: req.user.userId,
      role: "CUSTOMER",
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    if (firstName !== undefined) {
      if (firstName.trim().length < 2) {
        return res.status(400).json({ success: false, message: "First name is too short" });
      }
      user.firstName = firstName.trim();
    }

    if (lastName !== undefined) {
      user.lastName = lastName.trim();
    }

    if (phone !== undefined) {
      user.phone = phone.trim();
    }

    if (profilePhoto !== undefined) {
      user.profilePhoto = profilePhoto;
    }

    if (city !== undefined) {
      user.city = city.trim();
    }

    if (address !== undefined) {
      user.address = address.trim();
    }

    await user.save();

    const sanitized = user.toObject();
    delete sanitized.password;

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      customer: sanitized,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

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

    const user = await UserModel.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password does not match",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= CUSTOMER BOOKINGS =================

const createCustomerBooking = async (req, res) => {
  try {
    const { providerId, date, slotStart, slotEnd, phone, address, notes } = req.body;

    if (!providerId || !date || !slotStart || !slotEnd) {
      return res.status(400).json({
        success: false,
        message: "providerId, date, slotStart, and slotEnd are required",
      });
    }

    if (!phone || phone.trim().length < 7) {
      return res.status(400).json({
        success: false,
        message: "A valid contact phone number is required",
      });
    }

    const addrLine = typeof address === "object" ? address.line || address.street : address;
    if (!addrLine || addrLine.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "A valid service address is required",
      });
    }

    // 1. Verify provider visibility & eligibility
    const provider = await UserModel.findOne({
      _id: providerId,
      role: "PROVIDER",
      providerStatus: "approved",
      registrationFeePaid: true,
      isBlocked: { $ne: true },
    });

    if (!provider) {
      return res.status(400).json({
        success: false,
        message: "Provider is not available for booking",
      });
    }

    // 2. Verify date & slot is in provider's available slots
    const availableSlots = await generateAvailableSlots({ provider, date });
    const matchingSlot = availableSlots.find(
      (s) => s.startTime === slotStart && s.endTime === slotEnd
    );

    if (!matchingSlot) {
      return res.status(400).json({
        success: false,
        message: "Selected slot is not available. Please choose an available time slot.",
      });
    }

    // 3. Check for existing active booking or hold
    const now = new Date();
    const existingConflict = await BookingModel.findOne({
      $and: [
        { $or: [{ provider: provider._id }, { providerId: provider._id }] },
        { date },
        {
          $or: [
            { slotStart, slotEnd },
            { startTime: slotStart, endTime: slotEnd },
          ],
        },
        {
          $or: [
            { status: "confirmed" },
            { status: "pending_payment", slotHoldExpiresAt: { $gt: now } },
          ],
        },
      ],
    });

    if (existingConflict) {
      return res.status(409).json({
        success: false,
        message: "This slot is no longer available. Please select another slot.",
      });
    }

    // 4. Calculate duration & estimated price
    const startMin = toMinutes(slotStart);
    const endMin = toMinutes(slotEnd);
    const durationMinutes = endMin - startMin;
    if (durationMinutes < 30) {
      return res.status(400).json({
        success: false,
        message: "Booking duration must be at least 30 minutes",
      });
    }

    const estimatedPrice = 0; // Service charge paid directly to provider offline
    const slotHoldExpiresAt = new Date(Date.now() + (SLOT_HOLD_MINUTES || 10) * 60 * 1000);

    const fullAddress = {
      line: typeof address === "object" ? (address.line || address.street || "") : address.trim(),
      area: typeof address === "object" ? (address.area || "") : "",
      city: typeof address === "object" ? (address.city || provider.city || "") : (provider.city || ""),
    };

    // 5. Create Booking in pending_payment state with 10-min hold
    const seq = await getNextSequence("booking");
    const bookingId = `FP-${String(seq).padStart(6, "0")}`;

    const booking = await BookingModel.create({
      bookingId,
      customer: req.user.userId,
      customerId: req.user.userId,
      provider: provider._id,
      providerId: provider._id,
      category: provider.serviceCategory,
      categorySlug: provider.serviceCategory,
      hourlyRate: 0,
      date,
      slotStart,
      startTime: slotStart,
      slotEnd,
      endTime: slotEnd,
      durationMinutes,
      estimatedPrice,
      priceSnapshot: estimatedPrice,
      address: fullAddress,
      phone: phone.trim(),
      customerPhone: phone.trim(),
      customerCity: fullAddress.city,
      customerStreet: fullAddress.line,
      notes: notes ? notes.trim() : "",
      status: "pending_payment",
      slotHoldExpiresAt,
    });

    // 6. Create Payment record for Rs 100 booking fee
    const payment = await PaymentModel.create({
      user: req.user.userId,
      paymentType: "booking_fee",
      type: "booking_fee",
      amount: BOOKING_FEE,
      currency: CURRENCY || "pkr",
      customer: req.user.userId,
      provider: provider._id,
      booking: booking._id,
      status: "pending",
    });

    // 7. Create Stripe Checkout Session (release the slot hold if Stripe fails)
    let session;
    try {
      session = await createCheckoutSession({
        amount: BOOKING_FEE,
        currency: CURRENCY || "pkr",
        name: `FixPoint Booking Fee - ${provider.firstName} ${provider.lastName}`,
        successUrl: `${FRONTEND_URL}/customer/payment-success?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking._id}`,
        cancelUrl: `${FRONTEND_URL}/customer/payment-cancelled?booking_id=${booking._id}`,
        metadata: {
          type: "booking_fee",
          paymentType: "booking_fee",
          userId: req.user.userId.toString(),
          customerId: req.user.userId.toString(),
          providerId: provider._id.toString(),
          bookingId: booking._id.toString(),
          paymentId: payment._id.toString(),
        },
        customerEmail: req.user.email,
      });
    } catch (stripeError) {
      booking.status = "expired";
      await booking.save();
      payment.status = "failed";
      await payment.save();
      throw stripeError;
    }

    payment.stripeSessionId = session.id;
    await payment.save();

    return res.status(201).json({
      success: true,
      bookingId: booking._id,
      checkoutUrl: session.url,
      expiresAt: slotHoldExpiresAt,
      estimatedPrice,
      bookingFee: BOOKING_FEE,
    });
  } catch (error) {
    console.error("createCustomerBooking error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const payCustomerBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await BookingModel.findOne({
      _id: id,
      $or: [{ customer: req.user.userId }, { customerId: req.user.userId }],
    }).populate("provider", "firstName lastName");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.status === "confirmed") {
      return res.status(400).json({ success: false, message: "Booking is already paid and confirmed" });
    }

    if (booking.status !== "pending_payment") {
      return res.status(400).json({ success: false, message: `Booking cannot be paid (status: ${booking.status})` });
    }

    // Check hold expiration
    const now = new Date();
    if (!booking.slotHoldExpiresAt || booking.slotHoldExpiresAt <= now) {
      booking.status = "expired";
      await booking.save();
      return res.status(400).json({
        success: false,
        message: "Slot hold has expired. Please select a time slot again.",
      });
    }

    let payment = await PaymentModel.findOne({
      booking: booking._id,
      type: "booking_fee",
      status: "pending",
    });

    if (!payment) {
      payment = await PaymentModel.create({
        user: req.user.userId,
        paymentType: "booking_fee",
        type: "booking_fee",
        amount: BOOKING_FEE,
        currency: CURRENCY || "pkr",
        customer: req.user.userId,
        provider: booking.provider?._id || booking.provider,
        booking: booking._id,
        status: "pending",
      });
    }

    const providerName = booking.provider ? `${booking.provider.firstName} ${booking.provider.lastName}` : "Provider";
    const session = await createCheckoutSession({
      amount: BOOKING_FEE,
      currency: CURRENCY || "pkr",
      name: `FixPoint Booking Fee - ${providerName}`,
      successUrl: `${FRONTEND_URL}/customer/payment-success?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking._id}`,
      cancelUrl: `${FRONTEND_URL}/customer/payment-cancelled?booking_id=${booking._id}`,
      metadata: {
        type: "booking_fee",
        paymentType: "booking_fee",
        userId: req.user.userId.toString(),
        customerId: req.user.userId.toString(),
        providerId: (booking.provider?._id || booking.provider).toString(),
        bookingId: booking._id.toString(),
        paymentId: payment._id.toString(),
      },
      customerEmail: req.user.email,
    });

    payment.stripeSessionId = session.id;
    await payment.save();

    return res.status(200).json({
      success: true,
      checkoutUrl: session.url,
      expiresAt: booking.slotHoldExpiresAt,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const cancelCustomerBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    const booking = await BookingModel.findOne({
      _id: id,
      $or: [{ customer: req.user.userId }, { customerId: req.user.userId }],
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (["completed", "cancelled", "expired"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Booking cannot be cancelled as it is already ${booking.status}`,
      });
    }

    if (booking.status === "confirmed") {
      // Rule: Customer can cancel only if slot start is > 24 hours away
      const slotStartTime = new Date(`${booking.date}T${booking.slotStart || booking.startTime}:00+05:00`);
      const now = new Date();
      const hoursUntilSlot = (slotStartTime - now) / (1000 * 60 * 60);

      if (hoursUntilSlot <= 24) {
        return res.status(400).json({
          success: false,
          message: "Bookings can only be cancelled at least 24 hours in advance",
        });
      }

      booking.status = "cancelled";
      booking.cancelledBy = "customer";
      booking.cancelReason = reason ? reason.trim() : "Cancelled by customer";
      booking.cancelledAt = new Date();
      await booking.save();

      return res.status(200).json({
        success: true,
        message: "Booking cancelled successfully. Note: Booking fee is non-refundable for customer cancellations.",
        booking,
      });
    }

    // If pending_payment, cancel directly
    booking.status = "cancelled";
    booking.cancelledBy = "customer";
    booking.cancelReason = reason ? reason.trim() : "Cancelled by customer";
    booking.cancelledAt = new Date();
    await booking.save();

    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      booking,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getCustomerBookings = async (req, res) => {
  try {
    const { scope, status, page = 1, limit = 20 } = req.query;

    const query = {
      $and: [{ $or: [{ customer: req.user.userId }, { customerId: req.user.userId }] }],
    };

    const pktNow = getPKTNow();

    if (status) {
      query.status = status;
    } else if (scope === "upcoming") {
      query.status = { $in: ["confirmed", "pending_payment"] };
      query.$and.push({
        $or: [
          { date: { $gt: pktNow.date } },
          { date: pktNow.date, slotEnd: { $gte: pktNow.time } },
          { date: pktNow.date, endTime: { $gte: pktNow.time } },
        ],
      });
    } else if (scope === "past") {
      query.$and.push({ $or: [
        { status: { $in: ["completed", "cancelled", "no-show", "no_show", "expired"] } },
        {
          status: "confirmed",
          $or: [
            { date: { $lt: pktNow.date } },
            { date: pktNow.date, slotEnd: { $lt: pktNow.time } },
            { date: pktNow.date, endTime: { $lt: pktNow.time } },
          ],
        },
      ] });
    }

    const sortOrder = scope === "upcoming" ? { date: 1, slotStart: 1 } : { date: -1, slotStart: -1 };

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const bookings = await BookingModel.find(query)
      .sort(sortOrder)
      .skip(skip)
      .limit(parseInt(limit, 10))
      .populate("provider", "firstName lastName profilePhoto serviceCategory phone")
      .populate("providerId", "firstName lastName profilePhoto serviceCategory phone")
      .lean();

    const total = await BookingModel.countDocuments(query);

    // Sanitize output for customer
    // PRIVACY:
    // 1. Only include provider phone if booking status is "confirmed" or "completed"
    // 2. NEVER include provider email
    const sanitized = bookings.map((b) => {
      const prov = b.provider || b.providerId;
      const isConfirmedOrCompleted = ["confirmed", "completed"].includes(b.status);

      return {
        _id: b._id,
        bookingId: b.bookingId,
        status: b.status,
        date: b.date,
        slotStart: b.slotStart || b.startTime,
        slotEnd: b.slotEnd || b.endTime,
        durationMinutes: b.durationMinutes,
        category: b.category || b.categorySlug,
        hourlyRate: b.hourlyRate,
        estimatedPrice: b.estimatedPrice || b.priceSnapshot,
        address: b.address?.line ? b.address : { line: b.customerStreet || b.address?.street, area: b.address?.area, city: b.customerCity || b.address?.city },
        phone: b.phone || b.customerPhone,
        notes: b.notes,
        slotHoldExpiresAt: b.slotHoldExpiresAt,
        provider: prov
          ? {
              _id: prov._id,
              firstName: prov.firstName,
              lastName: prov.lastName,
              profilePhoto: prov.profilePhoto,
              serviceCategory: prov.serviceCategory,
              phone: isConfirmedOrCompleted ? prov.phone : null,
            }
          : null,
        cancelledBy: b.cancelledBy,
        cancelReason: b.cancelReason,
        createdAt: b.createdAt,
      };
    });

    return res.status(200).json({
      success: true,
      bookings: sanitized,
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


const getMyPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const [payments, total] = await Promise.all([
      PaymentModel.find({ user: req.user.userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10))
        .populate({
          path: "booking",
          select: "bookingId date slotStart slotEnd category provider",
          populate: { path: "provider", select: "firstName lastName serviceCategory" },
        })
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


// Webhook ke bina bhi booking confirm karne ke liye: Stripe se session poochh kar status update karta hai
const verifyBookingPayment = async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) {
      return res.status(400).json({ success: false, message: "session_id missing" });
    }

    const session = await getStripe().checkout.sessions.retrieve(session_id);
    const meta = session.metadata || {};

    if (meta.type !== "booking_fee" || meta.userId !== String(req.user.userId)) {
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

    const booking = await BookingModel.findById(meta.bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.status === "pending_payment") {
      booking.status = "confirmed";
      booking.slotHoldExpiresAt = undefined;
      await booking.save();
    } else if (booking.status === "expired") {
      // Paid hone ke baad hold expire ho gaya ho: slot khali ho to confirm kar do
      const clash = await BookingModel.findOne({
        _id: { $ne: booking._id },
        $and: [
          { $or: [{ provider: booking.provider }, { providerId: booking.provider }] },
          { date: booking.date },
          { $or: [{ slotStart: booking.slotStart }, { startTime: booking.slotStart }] },
          { status: "confirmed" },
        ],
      });
      if (clash) {
        return res.status(409).json({
          success: false,
          message: "Payment received but slot was taken. Please contact support for a refund.",
        });
      }
      booking.status = "confirmed";
      booking.slotHoldExpiresAt = undefined;
      await booking.save();
    }

    return res.json({ success: true, status: booking.status });
  } catch (error) {
    console.error("verifyBookingPayment error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  createCustomerBooking,
  payCustomerBooking,
  verifyBookingPayment,
  cancelCustomerBooking,
  getCustomerBookings,
  getMyPayments,
};