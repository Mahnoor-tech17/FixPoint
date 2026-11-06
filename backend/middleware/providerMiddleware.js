const providerMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (req.user.role !== "PROVIDER") {
    return res.status(403).json({
      success: false,
      message: "Provider access only",
    });
  }

  next();
};

module.exports = providerMiddleware;
