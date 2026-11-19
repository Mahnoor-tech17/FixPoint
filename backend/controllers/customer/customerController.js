const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { getPasswordError } = require("../../utils/passwordPolicy");
const UserModel = require("../../models/userModel");
const BookingModel = require("../../models/bookingModel");
const PaymentModel = require("../../models/paymentModel");
const ServiceModel = require("../../models/serviceModel");
const SettingModel = require("../../models/settingModel");
const { getNextSequence } = require("../../models/counterModel");
const {
  CURRENCY,
  DEFAULT_COMMISSION_RATE,
  DEFAULT_RESPONSE_WINDOW_MINUTES,
  DEFAULT_GRACE_PERIOD_MINUTES,
  DEFAULT_CANCELLATION_WINDOW_HOURS,
  SLOT_HOLD_MINUTES,
} = require("../../config/fees");
const {
  createCheckoutSession,
  getStripe,
  cancelPaymentIntent,
  refundPayment,
} = require("../../services/stripeService");
const {
  getPKTNow,
  toMinutes,
  calculateRespondBy,
  generateAvailableSlots,
} = require("../../services/slotService");
const { sendMail } = require("../../services/emailService");

const FRONTEND_URL = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");

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

// ================= CREATE CUSTOMER BOOKING (Unified Multi-Service Flow) =================
const createCustomerBooking = async (req, res) => {
  try {
    const {
      providerId,
      serviceIds,
      serviceId, // backward compat
      date,
      slotStart,
      startTime, // backward compat
      slotEnd,
      endTime, // backward compat
      phone,
      customerPhone, // backward compat
      address,
      notes,
      location,
    } = req.body;

    const actualSlotStart = slotStart || startTime;
    let actualSlotEnd = slotEnd || endTime;
    const actualPhone = (phone || customerPhone || "").trim();

    // 1. Basic validation
    if (!providerId || !date || !actualSlotStart) {
      return res.status(400).json({
        success: false,
        message: "Provider, date, and slot start time are required.",
      });
    }

    if (!actualPhone || !/^(\+92|0)?3\d{9}$/.test(actualPhone.replace(/[\s-]/g, ""))) {
      return res.status(400).json({
        success: false,
        message: "A valid Pakistani mobile phone number is required (e.g. 03001234567).",
      });
    }

    let addrObj = { line: "", area: "", city: "" };
    if (typeof address === "object" && address !== null) {
      addrObj = {
        line: (address.line || address.street || "").trim(),
        area: (address.area || "").trim(),
        city: (address.city || "").trim(),
      };
    } else if (typeof address === "string") {
      addrObj = {
        line: address.trim(),
        area: "",
        city: (req.body.customerCity || "").trim() || "Lahore",
      };
    } else {
      addrObj = {
        line: (req.body.customerStreet || "").trim(),
        area: "",
        city: (req.body.customerCity || "").trim(),
      };
    }

    if (!addrObj.line || addrObj.line.length < 3) {
      return res.status(400).json({
        success: false,
        message: "A valid street address of at least 3 characters is required.",
      });
    }
    if (!addrObj.city) {
      return res.status(400).json({
        success: false,
        message: "City is required.",
      });
    }

    // 2. Resolve requested services
    let requestedServiceIds = [];
    if (Array.isArray(serviceIds) && serviceIds.length > 0) {
      requestedServiceIds = serviceIds;
    } else if (serviceId) {
      requestedServiceIds = [serviceId];
    }

    if (requestedServiceIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one service must be selected.",
      });
    }

    // 3. Verify provider
    const provider = await UserModel.findOne({
      _id: providerId,
      role: "PROVIDER",
      providerStatus: "approved",
      registrationFeePaid: true,
      isBlocked: false,
      isSuspendedPendingReview: { $ne: true },
    });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider is unavailable or suspended.",
      });
    }

    // 4. Fetch provider's services matching requested IDs
    const matchedServices = await ServiceModel.find({
      _id: { $in: requestedServiceIds },
      providerId: provider._id,
      isActive: true,
    });

    if (matchedServices.length !== requestedServiceIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more selected services are not offered by this provider or are currently inactive.",
      });
    }

    // Build items array and calculate totals
    const items = matchedServices.map((s) => ({
      serviceId: s._id,
      masterServiceId: s.masterServiceId || undefined,
      title: s.title,
      price: s.price,
      durationMinutes: s.durationMinutes,
    }));

    const total = items.reduce((acc, curr) => acc + curr.price, 0);
    const totalDurationMinutes = items.reduce((acc, curr) => acc + curr.durationMinutes, 0);

    // If slotEnd wasn't explicitly given, calculate it from slotStart + totalDurationMinutes
    const startMin = toMinutes(actualSlotStart);
    if (startMin === null) {
      return res.status(400).json({ success: false, message: "Invalid slot start time format (HH:mm)." });
    }

    if (!actualSlotEnd) {
      const endMin = startMin + totalDurationMinutes;
      const endH = Math.floor(endMin / 60);
      const endM = endMin % 60;
      actualSlotEnd = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
    }

    // 5. Verify slot availability via slotService
    const availableSlots = await generateAvailableSlots({
      provider,
      date,
      durationMinutes: totalDurationMinutes,
    });

    const isSlotAvailable = availableSlots.some(
      (s) => s.startTime === actualSlotStart
    );

    if (!isSlotAvailable) {
      return res.status(409).json({
        success: false,
        message: "The requested time slot is not available. Please choose another time slot.",
      });
    }

    // 6. Fetch platform settings for commission, deadlines, hold window
    const settings = await SettingModel.getSettings();
    const commissionRate =
      settings.commissionRate !== undefined
        ? settings.commissionRate
        : (settings.commissionPercent ? settings.commissionPercent / 100 : DEFAULT_COMMISSION_RATE);

    const commissionAmount = Math.round(total * commissionRate);
    const providerAmount = total - commissionAmount;

    const responseWindow = settings.responseWindowMinutes || DEFAULT_RESPONSE_WINDOW_MINUTES;
    const gracePeriod = settings.gracePeriodMinutes || DEFAULT_GRACE_PERIOD_MINUTES;
    const holdMinutes = settings.slotHoldMinutes || SLOT_HOLD_MINUTES;

    const respondBy = calculateRespondBy(date, actualSlotStart, responseWindow, gracePeriod);
    const slotHoldExpiresAt = new Date(Date.now() + holdMinutes * 60 * 1000);

    // 7. Generate atomic booking ID
    const seq = await getNextSequence("booking");
    const humanBookingId = `FP-${String(seq).padStart(6, "0")}`;

    // 8. Create Booking record
    let booking;
    try {
      booking = await BookingModel.create({
        bookingId: humanBookingId,
        customer: req.user.userId,
        provider: provider._id,
        items,
        total,
        commissionRate,
        commissionAmount,
        providerAmount,
        date,
        slotStart: actualSlotStart,
        slotEnd: actualSlotEnd,
        durationMinutes: totalDurationMinutes,
        address: addrObj,
        location: location || undefined,
        phone: actualPhone,
        notes: (notes || "").trim(),
        status: "pending_payment",
        paymentStatus: "pending",
        slotHoldExpiresAt,
        respondBy,
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "This time slot was just booked by another user. Please select another slot.",
        });
      }
      throw err;
    }

    // 9. Create Payment record for booking_payment
    const payment = await PaymentModel.create({
      user: req.user.userId,
      type: "booking_payment",
      amount: total,
      currency: CURRENCY,
      booking: booking._id,
      status: "pending",
    });

    // 10. Create Stripe Checkout Session with manual capture (Authorization / Hold)
    let session;
    try {
      session = await createCheckoutSession({
        amount: total,
        currency: CURRENCY,
        name: `FixPoint Services Hold (${humanBookingId}) - ${provider.firstName} ${provider.lastName}`,
        successUrl: `${FRONTEND_URL}/customer/payment-success?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking._id}`,
        cancelUrl: `${FRONTEND_URL}/customer/payment-cancelled?booking_id=${booking._id}`,
        captureMethod: "manual", // HOLDS full amount on card; charged only upon acceptance!
        metadata: {
          type: "booking_payment",
          bookingId: booking._id.toString(),
          paymentId: payment._id.toString(),
          customerId: req.user.userId.toString(),
          providerId: provider._id.toString(),
        },
        customerEmail: req.user.email,
      });
    } catch (stripeErr) {
      booking.status = "expired";
      booking.paymentStatus = "failed";
      await booking.save();
      payment.status = "failed";
      await payment.save();
      throw stripeErr;
    }

    payment.stripeSessionId = session.id;
    await payment.save();

    return res.status(201).json({
      success: true,
      bookingId: booking._id,
      humanBookingId: booking.bookingId,
      checkoutUrl: session.url,
      expiresAt: slotHoldExpiresAt,
      respondBy,
      total,
      commissionAmount,
      providerAmount,
    });
  } catch (error) {
    console.error("createCustomerBooking error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= RESUME / RETRY PAYMENT =================
const payCustomerBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await BookingModel.findOne({
      _id: id,
      customer: req.user.userId,
    }).populate("provider", "firstName lastName");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.status !== "pending_payment") {
      return res.status(400).json({
        success: false,
        message: `Booking cannot be paid (current status: ${booking.status})`,
      });
    }

    const now = new Date();
    if (!booking.slotHoldExpiresAt || booking.slotHoldExpiresAt <= now) {
      booking.status = "expired";
      booking.paymentStatus = "failed";
      await booking.save();
      return res.status(400).json({
        success: false,
        message: "Slot hold has expired. Please select a time slot again.",
      });
    }

    let payment = await PaymentModel.findOne({
      booking: booking._id,
      type: "booking_payment",
      status: "pending",
    });

    if (!payment) {
      payment = await PaymentModel.create({
        user: req.user.userId,
        type: "booking_payment",
        amount: booking.total,
        currency: CURRENCY,
        booking: booking._id,
        status: "pending",
      });
    }

    const providerName = booking.provider
      ? `${booking.provider.firstName} ${booking.provider.lastName}`
      : "Provider";

    const session = await createCheckoutSession({
      amount: booking.total,
      currency: CURRENCY,
      name: `FixPoint Services Hold (${booking.bookingId}) - ${providerName}`,
      successUrl: `${FRONTEND_URL}/customer/payment-success?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking._id}`,
      cancelUrl: `${FRONTEND_URL}/customer/payment-cancelled?booking_id=${booking._id}`,
      captureMethod: "manual",
      metadata: {
        type: "booking_payment",
        bookingId: booking._id.toString(),
        paymentId: payment._id.toString(),
        customerId: req.user.userId.toString(),
        providerId: booking.provider?._id?.toString() || booking.provider.toString(),
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

// ================= VERIFY PAYMENT (Stripe Session Check fallback) =================
const verifyBookingPayment = async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) {
      return res.status(400).json({ success: false, message: "session_id missing" });
    }

    const session = await getStripe().checkout.sessions.retrieve(session_id);
    const meta = session.metadata || {};

    if (meta.type !== "booking_payment" || meta.customerId !== String(req.user.userId)) {
      return res.status(403).json({ success: false, message: "Session does not belong to you" });
    }

    const payment = await PaymentModel.findOne({ stripeSessionId: session.id });
    if (payment && !["authorized", "captured"].includes(payment.status)) {
      payment.status = "authorized";
      payment.authorizedAt = new Date();
      payment.stripePaymentIntentId = session.payment_intent || payment.stripePaymentIntentId;
      await payment.save();
    }

    const booking = await BookingModel.findById(meta.bookingId).populate("provider customer");
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.status === "pending_payment") {
      booking.status = "awaiting_provider";
      booking.paymentStatus = "authorized";
      booking.stripePaymentIntentId = session.payment_intent || booking.stripePaymentIntentId;
      booking.slotHoldExpiresAt = undefined;
      await booking.save();

      // Send email alert to provider
      if (booking.provider?.email) {
        sendMail({
          to: booking.provider.email,
          subject: `New FixPoint Request: ${booking.bookingId}`,
          text: `Hi ${booking.provider.firstName},\n\nYou have received a new booking request (${booking.bookingId}) on ${booking.date} at ${booking.slotStart}.\n\nPlease accept or reject within 2 hours in your FixPoint portal.\n\nBest regards,\nFixPoint Team`,
        }).catch(() => {});
      }
    }

    return res.json({
      success: true,
      status: booking.status,
      bookingId: booking.bookingId,
      booking,
    });
  } catch (error) {
    console.error("verifyBookingPayment error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= CANCEL CUSTOMER BOOKING =================
const cancelCustomerBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    const booking = await BookingModel.findOne({
      _id: id,
      customer: req.user.userId,
    }).populate("provider customer");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (["completed", "cancelled", "rejected", "expired", "provider_no_show", "customer_no_show"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Booking cannot be cancelled as it is already ${booking.status}`,
      });
    }

    const settings = await SettingModel.getSettings();
    const cancellationWindowHours = settings.cancellationWindowHours || DEFAULT_CANCELLATION_WINDOW_HOURS;

    // Awaiting provider -> release hold completely
    if (booking.status === "awaiting_provider") {
      if (booking.stripePaymentIntentId) {
        try {
          await cancelPaymentIntent(booking.stripePaymentIntentId);
        } catch (stripeErr) {
          console.warn("Cancel hold warning:", stripeErr.message);
        }
      }

      booking.status = "cancelled";
      booking.paymentStatus = "released";
      booking.cancelledBy = "customer";
      booking.cancelReason = reason ? reason.trim() : "Cancelled by customer before provider response";
      await booking.save();

      const payment = await PaymentModel.findOne({ booking: booking._id, type: "booking_payment" });
      if (payment) {
        payment.status = "released";
        payment.releasedAt = new Date();
        await payment.save();
      }

      return res.status(200).json({
        success: true,
        message: "Booking request cancelled and card hold released.",
        booking,
      });
    }

    // Pending payment -> simple cancel
    if (booking.status === "pending_payment") {
      booking.status = "cancelled";
      booking.paymentStatus = "released";
      booking.cancelledBy = "customer";
      booking.cancelReason = reason ? reason.trim() : "Cancelled by customer";
      await booking.save();

      return res.status(200).json({
        success: true,
        message: "Booking cancelled successfully",
        booking,
      });
    }

    // Confirmed booking cancellation policy:
    // Free (100% refund) until 24 hours before the slot; after that only the commission is kept (80% refund).
    if (booking.status === "confirmed") {
      const slotStartTime = new Date(`${booking.date}T${booking.slotStart}:00+05:00`);
      const now = new Date();
      const hoursUntilSlot = (slotStartTime - now) / (1000 * 60 * 60);

      let refundAmount = booking.total;
      let policyNote = "Full refund issued to your card.";

      if (hoursUntilSlot < cancellationWindowHours) {
        // Commission kept; refund provider share
        refundAmount = booking.providerAmount;
        policyNote = `Cancelled within ${cancellationWindowHours} hours of appointment. Platform commission retained; Rs ${refundAmount} refunded to your card.`;
      }

      if (booking.stripePaymentIntentId) {
        try {
          await refundPayment(booking.stripePaymentIntentId, refundAmount);
        } catch (refundErr) {
          console.error("Stripe refund error:", refundErr.message);
        }
      }

      booking.status = "cancelled";
      booking.paymentStatus = "refunded";
      booking.cancelledBy = "customer";
      booking.cancelReason = reason ? reason.trim() : "Cancelled by customer";
      await booking.save();

      const payment = await PaymentModel.findOne({ booking: booking._id, type: "booking_payment" });
      if (payment) {
        payment.status = "refunded";
        payment.refundedAt = new Date();
        await payment.save();
      }

      // Notify provider
      if (booking.provider?.email) {
        sendMail({
          to: booking.provider.email,
          subject: `Booking Cancelled: ${booking.bookingId}`,
          text: `Hi ${booking.provider.firstName},\n\nCustomer cancelled booking ${booking.bookingId} for ${booking.date} at ${booking.slotStart}.\nReason: ${booking.cancelReason}\n\nBest regards,\nFixPoint Team`,
        }).catch(() => {});
      }

      return res.status(200).json({
        success: true,
        message: `Booking cancelled successfully. ${policyNote}`,
        booking,
      });
    }

    return res.status(400).json({
      success: false,
      message: `Booking cannot be cancelled at this stage (${booking.status}).`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= CUSTOMER MARKS PROVIDER NO-SHOW (1 hr after slot start) =================
const customerMarksProviderNoShow = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await BookingModel.findOne({
      _id: id,
      customer: req.user.userId,
    }).populate("provider customer");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.status !== "confirmed" && booking.status !== "on_the_way") {
      return res.status(400).json({
        success: false,
        message: `Provider no-show can only be reported for confirmed bookings where provider has not started job.`,
      });
    }

    // Check that at least 1 hour has passed since slot start time in PKT
    const pktNow = getPKTNow();
    const slotStartMin = toMinutes(booking.slotStart);
    const nowMin = toMinutes(pktNow.time);

    const isAfterOneHour =
      booking.date < pktNow.date ||
      (booking.date === pktNow.date && nowMin >= slotStartMin + 60);

    if (!isAfterOneHour) {
      return res.status(400).json({
        success: false,
        message: "You can report a provider no-show 1 hour after the scheduled appointment start time.",
      });
    }

    // Full refund to customer
    if (booking.stripePaymentIntentId) {
      try {
        await refundPayment(booking.stripePaymentIntentId);
      } catch (refundErr) {
        console.error("Stripe refund error:", refundErr.message);
      }
    }

    booking.status = "provider_no_show";
    booking.paymentStatus = "refunded";
    await booking.save();

    const payment = await PaymentModel.findOne({ booking: booking._id, type: "booking_payment" });
    if (payment) {
      payment.status = "refunded";
      payment.refundedAt = new Date();
      await payment.save();
    }

    // Provider penalty logic (configurable thresholds)
    const provider = await UserModel.findById(booking.provider._id || booking.provider);
    let penaltyApplied = "warned";

    if (provider) {
      provider.noShowCount = (provider.noShowCount || 0) + 1;
      const count = provider.noShowCount;

      if (count === 1) {
        provider.penaltyLevel = "warned";
        penaltyApplied = "warning issued";
      } else if (count === 2) {
        provider.penaltyLevel = "rank_reduced";
        penaltyApplied = "ranking reduced";
      } else {
        provider.penaltyLevel = "suspended_pending";
        provider.isSuspendedPendingReview = true;
        provider.isBlocked = true;
        penaltyApplied = "account suspended pending admin review";
      }

      await provider.save();

      // Email provider
      sendMail({
        to: provider.email,
        subject: `No-Show Violation Alert - ${booking.bookingId}`,
        text: `Hi ${provider.firstName},\n\nYou were marked as a no-show for booking ${booking.bookingId} on ${booking.date} at ${booking.slotStart}.\n\nPenalty status: ${penaltyApplied} (Total no-shows: ${count}).\nPlease contact FixPoint admin if you have any questions.\n\nBest regards,\nFixPoint Safety Team`,
      }).catch(() => {});
    }

    // Email customer
    sendMail({
      to: req.user.email,
      subject: `Provider No-Show Confirmed - Full Refund Issued (${booking.bookingId})`,
      text: `Hi ${req.user.firstName || "there"},\n\nWe apologize for the inconvenience. A full refund of PKR ${booking.total} has been issued to your card.\n\nYou can easily select another provider with prefilled details on FixPoint.\n\nBest regards,\nFixPoint Team`,
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: "Provider marked as no-show. Full refund has been issued to your card.",
      booking,
      penaltyApplied,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= LIST CUSTOMER BOOKINGS =================
const getCustomerBookings = async (req, res) => {
  try {
    const { scope, status, page = 1, limit = 20 } = req.query;

    const query = { customer: req.user.userId };
    const pktNow = getPKTNow();

    if (status) {
      query.status = status;
    } else if (scope === "upcoming") {
      query.status = { $in: ["awaiting_provider", "confirmed", "on_the_way", "in_progress", "pending_payment"] };
    } else if (scope === "past") {
      query.status = {
        $in: ["completed", "cancelled", "rejected", "expired", "provider_no_show", "customer_no_show"],
      };
    }

    const sortOrder = scope === "upcoming" ? { date: 1, slotStart: 1 } : { date: -1, slotStart: -1 };

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const [bookings, total] = await Promise.all([
      BookingModel.find(query)
        .sort(sortOrder)
        .skip(skip)
        .limit(parseInt(limit, 10))
        .populate("provider", "firstName lastName profilePhoto serviceCategory phone rating")
        .populate("items.serviceId", "title price durationMinutes images")
        .lean(),
      BookingModel.countDocuments(query),
    ]);

    // Privacy masking: Reveal provider phone only when booking is confirmed / in progress / completed
    const sanitized = bookings.map((b) => {
      const isConfirmedOrLater = [
        "confirmed",
        "on_the_way",
        "in_progress",
        "completed",
      ].includes(b.status);

      return {
        ...b,
        provider: b.provider
          ? {
              _id: b.provider._id,
              firstName: b.provider.firstName,
              lastName: b.provider.lastName,
              profilePhoto: b.provider.profilePhoto,
              serviceCategory: b.provider.serviceCategory,
              rating: b.provider.rating,
              phone: isConfirmedOrLater ? b.provider.phone : null,
            }
          : null,
      };
    });

    return res.status(200).json({
      success: true,
      bookings: sanitized,
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10)) || 1,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= CUSTOMER PAYMENTS LIST =================
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
          select: "bookingId date slotStart slotEnd total items status provider",
          populate: { path: "provider", select: "firstName lastName serviceCategory" },
        })
        .lean(),
      PaymentModel.countDocuments({ user: req.user.userId }),
    ]);

    return res.status(200).json({
      success: true,
      payments,
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / parseInt(limit, 10)) || 1,
      },
    });
  } catch (error) {
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
  customerMarksProviderNoShow,
  getCustomerBookings,
  getMyPayments,
};
