const { getPasswordError } = require("../../utils/passwordPolicy");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const UserModel = require("../../models/userModel");
const generateToken = require("../../utils/token");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// ---------------- SIGNUP (sirf CUSTOMER) ----------------
const signup = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone, role } = req.body;

    if (role && role.toUpperCase() !== "CUSTOMER") {
      return res.status(403).json({
        success: false,
        message:
          "Direct registration is only for customers. Providers are onboarded by the FixPoint admin team.",
      });
    }

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const passwordError = getPasswordError(password);
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError });
    }

    const existingUser = await UserModel.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();

    const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000);

    const newUser = new UserModel({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      role: "CUSTOMER",
      isVerified: false,
      verificationCode,
      verificationCodeExpires,
    });

    await newUser.save();

    try {
      await transporter.sendMail({
        from: `"FixPoint" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "FixPoint Email Verification",
        text:
          `Hi ${firstName} ${lastName},\n\n` +
          `Your FixPoint verification code is: ${verificationCode}\n\n` +
          `This code will expire in 15 minutes.`,
      });
    } catch (mailError) {
      await UserModel.findByIdAndDelete(newUser._id);
      return res.status(500).json({
        success: false,
        message: "Could not send verification email. Please try again.",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Registration successful. Verification code sent to your email.",
      userId: newUser._id,
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong during registration",
      error: error.message,
    });
  }
};

// ---------------- VERIFY EMAIL (OTP) ----------------
const verifyEmail = async (req, res) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({
        success: false,
        message: "User ID and verification code are required",
      });
    }

    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    if (
      user.verificationCode !== code.toString() ||
      !user.verificationCodeExpires ||
      user.verificationCodeExpires < new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "Verification code is invalid or has expired",
      });
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("Verify email error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while verifying email",
      error: error.message,
    });
  }
};

// ---------------- RESEND VERIFICATION CODE ----------------
const resendCode = async (req, res) => {
  try {
    const { userId, email } = req.body;

    if (!userId && !email) {
      return res.status(400).json({
        success: false,
        message: "User ID or email is required",
      });
    }

    const query = userId ? { _id: userId } : { email: email.toLowerCase() };
    const user = await UserModel.findOne(query);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified. Please log in.",
      });
    }

    // 60-second cooldown
    if (user.verificationCodeExpires) {
      const msRemaining = user.verificationCodeExpires.getTime() - Date.now();
      const cooldownRemaining = Math.ceil((msRemaining - 14 * 60 * 1000) / 1000);
      if (cooldownRemaining > 0) {
        return res.status(429).json({
          success: false,
          message: `Please wait ${cooldownRemaining} second${cooldownRemaining === 1 ? "" : "s"} before requesting a new code.`,
          secondsRemaining: cooldownRemaining,
        });
      }
    }

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    const newExpires = new Date(Date.now() + 15 * 60 * 1000);

    user.verificationCode = newCode;
    user.verificationCodeExpires = newExpires;
    await user.save();

    try {
      await transporter.sendMail({
        from: `"FixPoint" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: "FixPoint New Verification Code",
        text:
          `Hi ${user.firstName},\n\n` +
          `Your new FixPoint verification code is: ${newCode}\n\n` +
          `This code will expire in 15 minutes.`,
      });
    } catch (mailError) {
      console.error("Resend mail error:", mailError.message);
      return res.status(500).json({
        success: false,
        message: "Could not send verification email. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "A new verification code has been sent to your email",
    });
  } catch (error) {
    console.error("Resend code error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to resend verification code",
      error: error.message,
    });
  }
};

// ---------------- LOGIN (teeno roles) ----------------
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await UserModel.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.role === "CUSTOMER" && !user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before logging in",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked. Please contact support.",
      });
    }

    const token = generateToken(user._id.toString(), user.role, {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      serviceCategory: user.serviceCategory,
      providerStatus: user.providerStatus,
    });

    const userData = user.toObject();
    delete userData.password;
    delete userData.verificationCode;
    delete userData.verificationCodeExpires;
    delete userData.resetPasswordToken;
    delete userData.resetPasswordTokenExpires;

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: userData,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong during login",
      error: error.message,
    });
  }
};

// ---------------- FORGOT PASSWORD ----------------
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await UserModel.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Email does not exist",
      });
    }

    const resetPasswordToken = crypto.randomBytes(32).toString("hex");
    const resetPasswordTokenExpires = new Date(Date.now() + 15 * 60 * 1000);

    user.resetPasswordToken = resetPasswordToken;
    user.resetPasswordTokenExpires = resetPasswordTokenExpires;
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(
      resetPasswordToken,
    )}`;

    await transporter.sendMail({
      from: `"FixPoint" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "FixPoint Password Reset",
      text:
        `Hi ${user.firstName},\n\n` +
        `Click the link below to reset your password:\n${resetLink}\n\n` +
        `This link will expire in 15 minutes.`,
    });

    return res.status(200).json({
      success: true,
      message: "Password reset link sent to your email",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};

// ---------------- RESET PASSWORD ----------------
const resetPassword = async (req, res) => {
  try {
    const token = req.query.token || req.body.token;
    const { password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: "Reset token or password is missing",
      });
    }

    const passwordError = getPasswordError(password);
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError });
    }

    const user = await UserModel.findOne({
      resetPasswordToken: token,
      resetPasswordTokenExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Password reset link is invalid or has expired",
      });
    }

    const isSamePassword = await bcrypt.compare(password, user.password);

    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from old password",
      });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordTokenExpires = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ---------------- GET LOGGED-IN USER ----------------
const getMe = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.userId).select(
      "-password -verificationCode -verificationCodeExpires -resetPasswordToken -resetPasswordTokenExpires",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  signup,
  verifyEmail,
  resendCode,
  login,
  forgotPassword,
  resetPassword,
  getMe,
};