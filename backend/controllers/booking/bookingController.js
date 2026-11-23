const mongoose = require("mongoose");
const BookingModel = require("../../models/bookingModel");
const UserModel = require("../../models/userModel");
const ServiceModel = require("../../models/serviceModel");
const SettingModel = require("../../models/settingModel");
const { getNextSequence } = require("../../models/counterModel");
const { generateAvailableSlots, getPKTNow, toMinutes } = require("../../services/slotService");
const { sendMail } = require("../../services/emailService");

const escapeRegex = (str = "") => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const sendBookingEmail = async (userId, subject, message) => {
  try {
    const user = await UserModel.findById(userId).select("email firstName");
    if (user && user.email) {
      await sendMail({
        to: user.email,
        subject,
        text: `Hi ${user.firstName || "there"},\n\n${message}\n\nBest regards,\nThe FixPoint Team`,
      });
    }
  } catch (err) {
    console.error("Booking email error (non-blocking):", err.message);
  }
};

const formatBookingId = (seq) => `FP-${String(seq).padStart(6, "0")}`;

// Helper: Calculate hours remaining until booking start time (in PKT)
const getHoursUntilBooking = (bookingDate, bookingStartTime) => {
  const pktNow = getPKTNow();
  const todayMidnight = new Date(`${pktNow.date}T00:00:00Z`);
  const targetDate = new Date(`${bookingDate}T00:00:00Z`);
  const dayDiff = Math.round((targetDate - todayMidnight) / (1000 * 60 * 60 * 24));

  const nowMinutes = toMinutes(pktNow.time) || 0;
  const startMinutes = toMinutes(bookingStartTime) || 0;

  const totalMinutesUntil = dayDiff * 24 * 60 + (startMinutes - nowMinutes);
  return totalMinutesUntil / 60;
};

// Helper: Check if booking start time has passed (in PKT)
const isBookingStartTimePassed = (bookingDate, bookingStartTime) => {
  const pktNow = getPKTNow();
  if (bookingDate < pktNow.date) return true;
  if (bookingDate > pktNow.date) return false;
  return toMinutes(bookingStartTime) <= toMinutes(pktNow.time);
};

// ================= CREATE BOOKING (Customer only / Backward compatibility) =================
const createBooking = async (req, res) => {
  try {
    const customerId = req.user.userId;
    const {
      providerId,
      serviceId,
      date,
      startTime,
      address,
      customerPhone,
      notes,
    } = req.body;

    // 1. Basic validation
    const resolvedAddress = address || {
      street: (req.body.customerStreet || "").trim(),
      area: (req.body.customerCity || "City Area").trim(),
      city: (req.body.customerCity || "").trim(),
      notes: (notes || "").trim(),
    };

    if (!providerId || !serviceId || !date || !startTime || !resolvedAddress.street || !resolvedAddress.city || !customerPhone) {
      return res.status(400).json({
        success: false,
        message: "Provider, service, date, time slot, street, city, and contact phone are required",
      });
    }

    if (!resolvedAddress.area) {
      resolvedAddress.area = resolvedAddress.city;
    }

    if (!mongoose.isValidObjectId(providerId) || !mongoose.isValidObjectId(serviceId)) {
      return res.status(400).json({ success: false, message: "Invalid provider or service ID" });
    }

    // 2. Fetch and validate provider
    const provider = await UserModel.findOne({
      _id: providerId,
      role: "PROVIDER",
      providerStatus: "approved",
      isBlocked: false,
    });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider is unavailable or no longer active on FixPoint",
      });
    }

    // 3. Fetch and validate service
    const service = await ServiceModel.findOne({
      _id: serviceId,
      providerId: provider._id,
      isActive: true,
    }).populate("masterServiceId");

    if (!service?.masterServiceId?.isActive) {
      return res.status(404).json({
        success: false,
        message: "Selected service is no longer available",
      });
    }

    // 4. Validate slot availability via slotService
    const availableSlots = await generateAvailableSlots({
      provider,
      date,
      service,
      durationMinutes: service.durationMinutes,
    });

    const matchingSlot = availableSlots.find((s) => s.startTime === startTime);
    if (!matchingSlot) {
      return res.status(409).json({
        success: false,
        message: "This time slot is no longer available. Please select another slot.",
      });
    }

    // 5. Price calculation snapshot
    const calculatedPrice = service.price;

    // 6. Settings
    const settings = await SettingModel.getSettings();
    const commissionRate = settings.commissionRate ?? 0.20;
    const commissionAmount = Math.round(calculatedPrice * commissionRate);
    const providerAmount = calculatedPrice - commissionAmount;
    const initialStatus = "awaiting_provider";

    // 7. Atomic sequence for bookingId
    const seq = await getNextSequence("booking");
    const humanBookingId = formatBookingId(seq);

    // 8. Create booking matching the unified BookingModel schema
    let booking;
    try {
      booking = await BookingModel.create({
        bookingId: humanBookingId,
        customer: customerId,
        provider: provider._id,
        items: [
          {
            serviceId: service._id,
            masterServiceId: service.masterServiceId,
            title: service.title,
            price: calculatedPrice,
            durationMinutes: service.durationMinutes,
          },
        ],
        total: calculatedPrice,
        commissionRate,
        commissionAmount,
        providerAmount,
        date,
        slotStart: matchingSlot.startTime,
        slotEnd: matchingSlot.endTime,
        durationMinutes: service.durationMinutes,
        address: {
          line: resolvedAddress.street.trim(),
          area: (resolvedAddress.area || resolvedAddress.city).trim(),
          city: resolvedAddress.city.trim(),
        },
        phone: customerPhone.trim(),
        notes: notes ? notes.trim() : "",
        status: initialStatus,
      });
    } catch (dbError) {
      if (dbError.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "This time slot was just booked by another customer. Please select another slot.",
        });
      }
      throw dbError;
    }

    // 9. Notify provider
    const customer = await UserModel.findById(customerId).select("firstName lastName");
    const customerName = customer ? `${customer.firstName} ${customer.lastName}` : "A customer";

    await sendBookingEmail(
      provider._id,
      `New FixPoint Booking: ${humanBookingId}`,
      `${customerName} booked "${service.title}" on ${date} at ${matchingSlot.startTime} (${humanBookingId}).`
    );

    return res.status(201).json({
      success: true,
      message: "Booking submitted successfully",
      booking: attachBookingCompat(booking.toObject()),
    });
  } catch (error) {
    console.error("createBooking error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= LIST BOOKINGS (Role-filtered) =================
const getBookings = async (req, res) => {
  try {
    const { role, userId } = req.user;
    const { status, date, search, page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 50);

    const filter = {};

    // Role-based scoping
    if (role === "CUSTOMER") {
      filter.customer = userId;
    } else if (role === "PROVIDER") {
      filter.provider = userId;
    }
    // Admin sees all, or can filter by specific provider/customer
    if (role === "ADMIN") {
      if (req.query.providerId && mongoose.isValidObjectId(req.query.providerId)) {
        filter.provider = req.query.providerId;
      }
      if (req.query.customerId && mongoose.isValidObjectId(req.query.customerId)) {
        filter.customer = req.query.customerId;
      }
    }

    // Status filter
    if (status) {
      if (status === "upcoming") {
        filter.status = { $in: ["awaiting_provider", "confirmed", "on_the_way", "in_progress", "pending_payment"] };
      } else if (status === "past") {
        filter.status = { $in: ["completed", "cancelled", "rejected", "expired", "provider_no_show", "customer_no_show"] };
      } else {
        filter.status = status;
      }
    }

    if (date) {
      filter.date = date;
    }

    if (search && search.trim()) {
      const regex = new RegExp(escapeRegex(search.trim()), "i");
      filter.$or = [
        { bookingId: regex },
        { "items.title": regex },
        { phone: regex },
      ];
    }

    const [bookings, total] = await Promise.all([
      BookingModel.find(filter)
        .populate("customer", "firstName lastName profilePhoto")
        .populate("provider", "firstName lastName profilePhoto serviceCategory")
        .populate("items.serviceId", "title price durationMinutes images")
        .sort({ date: -1, slotStart: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      BookingModel.countDocuments(filter),
    ]);

    // Apply privacy masking on contact details
    const sanitized = bookings.map((b) => {
      const cId = b.customer?._id?.toString();
      const pId = b.provider?._id?.toString();
      const isOwner = role === "CUSTOMER" && cId === userId;
      const isAssignedProvider = role === "PROVIDER" && pId === userId;
      const isAdmin = role === "ADMIN";

      const showCustomerContact = isAssignedProvider || isAdmin;
      const showProviderContact = (isOwner && ["confirmed", "on_the_way", "in_progress", "completed"].includes(b.status)) || isAdmin;

      return {
        ...b,
        customerPhone: showCustomerContact ? b.phone : undefined,
        provider: b.provider
          ? {
              ...b.provider,
              phone: showProviderContact ? compat.provider.phone : undefined,
            }
          : undefined,
      };
    });

    return res.status(200).json({
      success: true,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      bookings: sanitized,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= GET SINGLE BOOKING DETAILS =================
const getBookingDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, userId } = req.user;

    const query = mongoose.isValidObjectId(id) ? { _id: id } : { bookingId: id };
    const booking = await BookingModel.findOne(query)
      .populate("customer", "firstName lastName profilePhoto email phone")
      .populate("provider", "firstName lastName profilePhoto serviceCategory phone rating")
      .populate("items.serviceId", "title price durationMinutes images")
      .lean();

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const cId = (booking.customer?._id || booking.customer)?.toString();
    const pId = (booking.provider?._id || booking.provider)?.toString();

    // Ownership check
    const isCustomer = cId === userId;
    const isProvider = pId === userId;
    const isAdmin = role === "ADMIN";

    if (!isCustomer && !isProvider && !isAdmin) {
      return res.status(403).json({ success: false, message: "Access denied to this booking" });
    }

    const responseBooking = booking;

    // Privacy masking: Customer sees provider's phone only if confirmed, on_the_way, in_progress, completed
    if (isCustomer && !["confirmed", "on_the_way", "in_progress", "completed"].includes(responseBooking.status)) {
      if (responseBooking.provider) {
        delete responseBooking.provider.phone;
      }
    }

    return res.status(200).json({
      success: true,
      booking: responseBooking,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= UPDATE BOOKING STATUS (Provider & Admin) =================
const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const { role, userId } = req.user;

    if (!status) {
      return res.status(400).json({ success: false, message: "New status is required" });
    }

    const booking = await BookingModel.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const pId = booking.provider?.toString();
    const isProvider = pId === userId;
    const isAdmin = role === "ADMIN";

    if (!isProvider && !isAdmin) {
      return res.status(403).json({ success: false, message: "Only the assigned provider or admin can update this status" });
    }

    const currentStatus = booking.status;

    // Terminal statuses cannot be changed
    if (["completed", "cancelled", "rejected", "expired", "provider_no_show", "customer_no_show"].includes(currentStatus)) {
      return res.status(400).json({
        success: false,
        message: `Booking is already ${currentStatus} and cannot be modified.`,
      });
    }

    const sStart = booking.slotStart;
    const title = booking.items?.[0]?.title || "Service";
    const cId = booking.customer;

    if (status === "confirmed") {
      if (!["pending", "pending_payment", "awaiting_provider"].includes(currentStatus)) {
        return res.status(400).json({
          success: false,
          message: "Only pending/awaiting bookings can be confirmed.",
        });
      }
      booking.status = "confirmed";

      await sendBookingEmail(
        cId,
        "Booking Confirmed!",
        `Your booking (${booking.bookingId}) for ${title} on ${booking.date} at ${sStart} has been confirmed.`
      );
    } else if (status === "completed") {
      if (!["confirmed", "on_the_way", "in_progress"].includes(currentStatus)) {
        return res.status(400).json({
          success: false,
          message: "Only confirmed or in-progress bookings can be marked as completed.",
        });
      }

      booking.status = "completed";
      booking.completedAt = new Date();

      await sendBookingEmail(
        cId,
        "Service Completed",
        `Your service for ${title} (${booking.bookingId}) has been marked as completed. Please leave a review!`
      );
    } else if (status === "cancelled") {
      if (!reason || reason.trim().length < 3) {
        return res.status(400).json({
          success: false,
          message: "A cancellation reason of at least 3 characters is required.",
        });
      }

      booking.status = "cancelled";
      booking.cancelledBy = isAdmin ? "admin" : "provider";
      booking.cancelReason = reason.trim();

      await sendBookingEmail(
        cId,
        "Booking Cancelled",
        `Your booking (${booking.bookingId}) was cancelled by the ${booking.cancelledBy}. Reason: ${booking.cancelReason}`
      );
    } else {
      booking.status = status;
    }

    await booking.save();

    return res.status(200).json({
      success: true,
      message: `Booking status updated to ${status}`,
      booking: attachBookingCompat(booking.toObject()),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= CANCEL BOOKING (Customer) =================
const cancelCustomerBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const customerId = req.user.userId;

    const booking = await BookingModel.findOne({
      _id: id,
      customer: customerId,
    });
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (["completed", "cancelled", "rejected", "expired", "provider_no_show", "customer_no_show"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Booking is already ${booking.status}.`,
      });
    }

    const sStart = booking.slotStart;
    const title = booking.items?.[0]?.title || "Service";
    const pId = booking.provider;

    // Cutoff check for CONFIRMED bookings
    if (booking.status === "confirmed") {
      const settings = await SettingModel.getSettings();
      const cutoffHours = settings.cancellationWindowHours || 24;
      const hoursUntil = getHoursUntilBooking(booking.date, sStart);

      if (hoursUntil < cutoffHours) {
        return res.status(400).json({
          success: false,
          message: `Cannot cancel within ${cutoffHours} hours of the appointment start time. Please contact support if you need assistance.`,
        });
      }
    }

    booking.status = "cancelled";
    booking.cancelledBy = "customer";
    booking.cancelReason = reason ? reason.trim() : "Cancelled by customer";
    await booking.save();

    // Email provider
    await sendBookingEmail(
      pId,
      "Booking Cancelled by Customer",
      `Customer cancelled booking ${booking.bookingId} (${title}) scheduled for ${booking.date} at ${sStart}.`
    );

    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      booking: attachBookingCompat(booking.toObject()),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ================= RESCHEDULE BOOKING (Customer) =================
const rescheduleBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, startTime } = req.body;
    const customerId = req.user.userId;

    if (!date || !startTime) {
      return res.status(400).json({
        success: false,
        message: "New date and start time slot are required",
      });
    }

    const booking = await BookingModel.findOne({
      _id: id,
      customer: customerId,
    });
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (["completed", "cancelled", "rejected", "expired", "provider_no_show", "customer_no_show"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot reschedule a booking that is ${booking.status}.`,
      });
    }

    const sStart = booking.slotStart;
    const pId = booking.provider;

    // Cutoff check for CONFIRMED bookings
    if (booking.status === "confirmed") {
      const settings = await SettingModel.getSettings();
      const cutoffHours = settings.cancellationWindowHours || 24;
      const hoursUntil = getHoursUntilBooking(booking.date, sStart);

      if (hoursUntil < cutoffHours) {
        return res.status(400).json({
          success: false,
          message: `Cannot reschedule within ${cutoffHours} hours of the appointment start time.`,
        });
      }
    }

    // Fetch provider to validate new slot
    const provider = await UserModel.findOne({
      _id: pId,
      role: "PROVIDER",
      providerStatus: "approved",
      isBlocked: false,
    });

    if (!provider) {
      return res.status(400).json({
        success: false,
        message: "Provider is currently unavailable for rescheduling",
      });
    }

    const serviceDuration = booking.durationMinutes || 60;

    // Validate new slot (excluding current booking from collision)
    const availableSlots = await generateAvailableSlots({
      provider,
      date,
      durationMinutes: serviceDuration,
      excludeBookingId: booking._id,
    });

    const newSlot = availableSlots.find((s) => s.startTime === startTime);
    if (!newSlot) {
      return res.status(409).json({
        success: false,
        message: "The requested time slot is not available. Please choose another time.",
      });
    }

    booking.date = date;
    booking.slotStart = newSlot.startTime;
    booking.slotEnd = newSlot.endTime;
    booking.reminder24hSent = false;
    booking.reminder1hSent = false;

    await booking.save();

    const title = booking.items?.[0]?.title || "Service";

    // Email provider
    await sendBookingEmail(
      pId,
      "Booking Rescheduled",
      `Booking ${booking.bookingId} (${title}) has been rescheduled by customer to ${date} at ${newSlot.startTime}.`
    );

    return res.status(200).json({
      success: true,
      message: "Booking rescheduled successfully",
      booking: attachBookingCompat(booking.toObject()),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "The requested time slot was just booked by another customer.",
      });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createBooking,
  getBookings,
  getBookingDetails,
  updateBookingStatus,
  cancelCustomerBooking,
  rescheduleBooking,
};
