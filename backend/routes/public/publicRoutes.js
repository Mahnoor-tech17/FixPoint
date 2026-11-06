const express = require("express");
const {
  getPublicCategories,
  searchProviders,
  getProviderPublicProfile,
  getProviderSlots,
  getProviderReviews,
  getFeaturedProviders,
  getLatestReviews,
} = require("../../controllers/public/publicController");

const router = express.Router();

router.get("/categories", getPublicCategories);
router.get("/search", searchProviders);
router.get("/featured", getFeaturedProviders);
router.get("/reviews/latest", getLatestReviews);
router.get("/providers/:id", getProviderPublicProfile);
router.get("/providers/:id/slots", getProviderSlots);
router.get("/providers/:id/reviews", getProviderReviews);

module.exports = router;
