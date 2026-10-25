const express = require("express");

const {
  getReviews,
  saveReview,
  deleteReview,
  toggleHelpful,
  addPhotos,
  deletePhoto,
} = require("../controllers/reviewController");

const { protect, optionalAuth } = require("../middleware/authMiddleware");
const { uploadReviewPhotos } = require("../middleware/uploadMiddleware");

const router = express.Router();

// A review id is 24 hex characters. These routes come first so "/<reviewId>/photos"
// is never mistaken for "/:itemType/:itemId".
const ID = "[0-9a-fA-F]{24}";

router.post(`/:reviewId(${ID})/helpful`, protect, toggleHelpful);
router.post(`/:reviewId(${ID})/photos`, protect, uploadReviewPhotos, addPhotos);
router.delete(`/:reviewId(${ID})/photos/:index`, protect, deletePhoto);

router.get("/:itemType/:itemId", optionalAuth, getReviews);
router.post("/:itemType/:itemId", protect, saveReview);
router.delete("/:reviewId", protect, deleteReview);

module.exports = router;
