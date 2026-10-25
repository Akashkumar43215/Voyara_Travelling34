const express = require("express");
const upload = require("../middleware/uploadMiddleware");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const {
  uploadImage,
  uploadPlaceImage,
} = require("../controllers/uploadController");

const router = express.Router();

// Uploads spend the site's Cloudinary storage, so only admins may use them
router.use(protect, adminOnly);

// Upload a single image
router.post("/image", upload.single("image"), uploadImage);

router.post(
  "/place/:placeId/image",
  upload.single("image"),
  uploadPlaceImage
);

module.exports = router;
