const SettingModel = require("../../models/settingModel");

// Get settings (public / authenticated)
const getSettings = async (req, res) => {
  try {
    const settings = await SettingModel.getSettings();
    return res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Update settings
const updateSettings = async (req, res) => {
  try {
    const {
      cancellationWindowHours,
      bookingHorizonDays,
      autoConfirmBookings,
      platformName,
      supportEmail,
      commissionPercent,
    } = req.body;

    const settings = await SettingModel.getSettings();

    if (cancellationWindowHours !== undefined) {
      const val = Number(cancellationWindowHours);
      if (val < 1 || val > 168) {
        return res.status(400).json({
          success: false,
          message: "Cancellation window must be between 1 and 168 hours",
        });
      }
      settings.cancellationWindowHours = val;
    }

    if (bookingHorizonDays !== undefined) {
      const val = Number(bookingHorizonDays);
      if (val < 1 || val > 90) {
        return res.status(400).json({
          success: false,
          message: "Booking horizon must be between 1 and 90 days",
        });
      }
      settings.bookingHorizonDays = val;
    }

    if (autoConfirmBookings !== undefined) {
      settings.autoConfirmBookings = Boolean(autoConfirmBookings);
    }

    if (platformName !== undefined) {
      settings.platformName = platformName.trim();
    }

    if (supportEmail !== undefined) {
      settings.supportEmail = supportEmail.trim().toLowerCase();
    }

    if (commissionPercent !== undefined) {
      const val = Number(commissionPercent);
      if (val < 0 || val > 100) {
        return res.status(400).json({
          success: false,
          message: "Commission percent must be between 0 and 100",
        });
      }
      settings.commissionPercent = val;
    }

    await settings.save();

    return res.status(200).json({
      success: true,
      message: "Platform settings updated successfully",
      settings,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
