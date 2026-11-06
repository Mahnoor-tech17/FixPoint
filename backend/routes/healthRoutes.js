const express = require("express");
const router = express.Router();

// GET /api/health
// Check karta hai ke server chal raha hai. Postman se test karne ke liye pehli request.
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "FixPoint API is running",
    time: new Date().toISOString(),
  });
});

module.exports = router;