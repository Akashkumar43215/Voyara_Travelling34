const express = require("express");

const {
  autocomplete,
  places,
  stays,
  saveStay,
  stayPhoto,
} = require("../controllers/locationController");

const router = express.Router();

// Location autocomplete
router.get("/autocomplete", autocomplete);

// Real tourist places
router.get("/places", places);

// Real accommodations
router.get("/stays", stays);

// Photo of a stay, fetched from Google on the server
router.get("/stay-photo", stayPhoto);

// Save selected accommodation to MongoDB
router.post("/stays/save", saveStay);

module.exports = router;