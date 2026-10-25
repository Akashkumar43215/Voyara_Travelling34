const multer = require("multer");

// Store uploaded files temporarily in memory
const storage = multer.memoryStorage();

// Allow only image files
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});

// Review photos: up to 3 files of 3 MB each. The route also checks the real file bytes.
const uploadReviewPhotos = multer({
  storage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024, files: 3 },
}).array("photos", 3);

module.exports = upload;
module.exports.uploadReviewPhotos = uploadReviewPhotos;