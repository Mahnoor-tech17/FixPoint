const errorHandler = (err, req, res, next) => {
  console.error("ERROR:", err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Server error",
  });
};

module.exports = errorHandler;