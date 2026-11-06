const express = require("express");
const authMiddleware = require("../../middleware/authMiddleware");
const adminMiddleware = require("../../middleware/adminMiddleware");

const { getSettings, updateSettings } = require("../../controllers/setting/settingController");

const router = express.Router();

router.get("/", getSettings);
router.put("/", authMiddleware, adminMiddleware, updateSettings);

module.exports = router;
