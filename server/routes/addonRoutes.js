const express = require("express");

const {
  getRestaurants,
  getActivities,
  getCatalog,
  quote,
} = require("../controllers/addonController");

const router = express.Router();

// All read-only or calculation-only, so visitors can plan before logging in
router.get("/restaurants", getRestaurants);
router.get("/activities", getActivities);
router.get("/catalog", getCatalog);
router.post("/quote", quote);

module.exports = router;
