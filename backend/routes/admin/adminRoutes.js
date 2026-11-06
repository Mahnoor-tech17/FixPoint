const express = require("express");
const authMiddleware = require("../../middleware/authMiddleware");
const adminMiddleware = require("../../middleware/adminMiddleware");

const {
  getStats,
  createUser,
  getAllUsers,
  getUserDetails,
  updateUser,
  deleteUser,
  getProviders,
  inviteProvider,
  getProviderRequests,
  updateProviderStatus,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllServices,
  toggleServiceActive,
  deleteService,
  getReports,
  exportBookingsCsv,
  getPayments,
} = require("../../controllers/admin/adminController");

const router = express.Router();

// All routes here require ADMIN authentication
router.use(authMiddleware, adminMiddleware);

router.get("/stats", getStats);

router.get("/users", getAllUsers);
router.post("/users", createUser);
router.get("/users/:id", getUserDetails);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

router.get("/providers", getProviders);
router.post("/providers/invite", inviteProvider);
router.get("/provider-requests", getProviderRequests);
router.put("/providers/:id/status", updateProviderStatus);

router.get("/categories", getCategories);
router.post("/categories", createCategory);
router.put("/categories/:id", updateCategory);
router.delete("/categories/:id", deleteCategory);

router.get("/services", getAllServices);
router.put("/services/:id/toggle-active", toggleServiceActive);
router.delete("/services/:id", deleteService);

router.get("/reports", getReports);
router.get("/reports/export-csv", exportBookingsCsv);

router.get("/payments", getPayments);

module.exports = router;
