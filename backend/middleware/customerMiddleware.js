const customerMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (req.user.role !== "CUSTOMER") {
    return res.status(403).json({
      success: false,
      message: "Customer access only",
    });
  }

  next();
};

module.exports = customerMiddleware;
