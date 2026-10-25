const express = require("express");

const {
  autocomplete,
  places,
  stays,
  saveStay,
} = require("../controllers/locationController");

const router = express.Router();

// Location autocomplete
router.get("/autocomplete", autocomplete);

// Real tourist places
router.get("/places", places);

// Real accommodations
router.get("/stays", stays);

// Save selected accommodation to MongoDB
router.post("/stays/save", saveStay);

module.exports = router;