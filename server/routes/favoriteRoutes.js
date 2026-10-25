const express = require("express");

const {
  getMyFavorites,
  toggleFavorite,
} = require("../controllers/favoriteController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getMyFavorites);
router.post("/toggle", protect, toggleFavorite);

module.exports = router;
