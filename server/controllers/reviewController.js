const mongoose = require("mongoose");
const Review = require("../models/Review");
const User = require("../models/User");
const cloudinary = require("../config/cloudinary");
const { detectImageType } = require("../services/imageCheck");

const ITEM_TYPES = ["place", "stay"];
const MAX_PHOTOS = 3;

const cloudinaryReady = () =>
  Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

// The role inside a login token can be days old, so admin rights are read from the database
const isAdminUser = async (userId) => {
  const account = await User.findById(userId).select("role").lean();

  return account?.role === "admin";
};

/** What the website sees: counts and photo links, never the list of who voted. */
const publicReview = (review, viewerId) => ({
  _id: review._id,
  user: review.user,
  userName: review.userName,
  rating: review.rating,
  comment: review.comment,
  createdAt: review.createdAt,
  photos: (review.photos || []).map((p) => ({ url: p.url })),
  demo: Boolean(review.isDemo),
  helpfulCount: (review.helpfulBy || []).length,
  iVoted: viewerId ? (review.helpfulBy || []).some((id) => String(id) === String(viewerId)) : false,
});

// GET /api/reviews/:itemType/:itemId?sort=new|helpful  (public; a logged-in viewer also gets iVoted)
const getReviews = async (req, res) => {
  try {
    const { itemType, itemId } = req.params;

    if (!ITEM_TYPES.includes(itemType)) {
      return res.status(400).json({ success: false, message: "Invalid item type." });
    }

    const reviews = await Review.find({ itemType, itemId })
      .sort({ createdAt: -1 })
      .select("userName rating comment createdAt user photos helpfulBy isDemo")
      .lean();

    const count = reviews.length;
    const average = count
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10
      : 0;

    const data = reviews.map((r) => publicReview(r, req.user?.userId));

    if (req.query.sort === "helpful") data.sort((a, b) => b.helpfulCount - a.helpfulCount);

    return res.status(200).json({ success: true, count, average, data });
  } catch (error) {
    console.error("Get Reviews Error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to load reviews." });
  }
};

// POST /api/reviews/:itemType/:itemId  (auth) - creates or updates the caller's review
const saveReview = async (req, res) => {
  try {
    const { itemType, itemId } = req.params;
    const rating = Number(req.body.rating);
    const comment = String(req.body.comment || "").trim().slice(0, 1000);

    if (!ITEM_TYPES.includes(itemType)) {
      return res.status(400).json({ success: false, message: "Invalid item type." });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be a whole number between 1 and 5.",
      });
    }

    const user = await User.findById(req.user.userId).select("name");

    if (!user) {
      return res.status(401).json({ success: false, message: "User not found." });
    }

    const review = await Review.findOneAndUpdate(
      { user: user._id, itemType, itemId },
      { $set: { userName: user.name, rating, comment } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );

    return res.status(200).json({
      success: true,
      message: "Review saved.",
      data: publicReview(review.toObject(), req.user.userId),
    });
  } catch (error) {
    console.error("Save Review Error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to save review." });
  }
};

// POST /api/reviews/:reviewId/helpful  (auth) - adds or removes the caller's "helpful" vote
const toggleHelpful = async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId).select("user helpfulBy");

    if (!review) return res.status(404).json({ success: false, message: "Review not found." });

    if (String(review.user) === String(req.user.userId)) {
      return res.status(400).json({ success: false, message: "You cannot vote on your own review." });
    }

    const voted = review.helpfulBy.some((id) => String(id) === String(req.user.userId));

    // $addToSet / $pull keep one vote per person even when two taps arrive together
    const updated = await Review.findByIdAndUpdate(
      review._id,
      voted ? { $pull: { helpfulBy: req.user.userId } } : { $addToSet: { helpfulBy: req.user.userId } },
      { new: true }
    ).select("helpfulBy");

    return res.status(200).json({ success: true, data: { iVoted: !voted, helpfulCount: updated.helpfulBy.length } });
  } catch (error) {
    console.error("Helpful Vote Error:", error.message);
    return res.status(500).json({ success: false, message: "Could not save your vote." });
  }
};

const uploadBuffer = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "voyara/reviews", resource_type: "image", transformation: [{ width: 1600, height: 1600, crop: "limit" }] },
      (error, result) => (error ? reject(error) : resolve({ url: result.secure_url, publicId: result.public_id }))
    );

    stream.end(buffer);
  });

const destroyQuietly = (photos) =>
  Promise.all(
    (photos || []).map((p) =>
      cloudinary.uploader.destroy(p.publicId).catch((error) => console.error("Cloudinary delete failed:", error.message))
    )
  );

// POST /api/reviews/:reviewId/photos  (auth, owner) - multipart field "photos", up to 3 in total
const addPhotos = async (req, res) => {
  try {
    if (!cloudinaryReady()) {
      return res.status(503).json({ success: false, message: "Photo upload is not set up on this server." });
    }

    const review = await Review.findOne({ _id: req.params.reviewId, user: req.user.userId });

    if (!review) return res.status(404).json({ success: false, message: "Review not found." });

    const files = req.files || [];

    if (files.length === 0) return res.status(400).json({ success: false, message: "Choose at least one photo." });

    if (review.photos.length + files.length > MAX_PHOTOS) {
      return res.status(400).json({ success: false, message: `A review can have up to ${MAX_PHOTOS} photos.` });
    }

    // the bytes must really be a JPEG, PNG or WebP, whatever the file is called
    if (files.some((f) => !detectImageType(f.buffer))) {
      return res.status(400).json({ success: false, message: "Only JPEG, PNG or WebP photos are allowed." });
    }

    const uploaded = [];

    try {
      for (const file of files) uploaded.push(await uploadBuffer(file.buffer));
    } catch (error) {
      console.error("Review photo upload failed:", error.message);
      await destroyQuietly(uploaded);

      return res.status(502).json({ success: false, message: "The photo could not be uploaded. Please try again." });
    }

    review.photos.push(...uploaded);
    await review.save();

    return res.status(200).json({ success: true, message: "Photos added.", data: publicReview(review.toObject(), req.user.userId) });
  } catch (error) {
    console.error("Add Photos Error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to add photos." });
  }
};

// DELETE /api/reviews/:reviewId/photos/:index  (auth) - owner or admin
const deletePhoto = async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);

    if (!review) return res.status(404).json({ success: false, message: "Review not found." });

    if (String(review.user) !== String(req.user.userId) && !(await isAdminUser(req.user.userId))) {
      return res.status(403).json({ success: false, message: "You can only change your own review." });
    }

    const index = Number(req.params.index);

    if (!Number.isInteger(index) || index < 0 || index >= review.photos.length) {
      return res.status(404).json({ success: false, message: "Photo not found." });
    }

    const [removed] = review.photos.splice(index, 1);
    await review.save();
    await destroyQuietly([removed]);

    return res.status(200).json({ success: true, message: "Photo removed.", data: publicReview(review.toObject(), req.user.userId) });
  } catch (error) {
    console.error("Delete Photo Error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to remove the photo." });
  }
};

// DELETE /api/reviews/:reviewId  (auth) - owner or admin
const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ success: false, message: "Invalid review id." });
    }

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found." });
    }

    const isOwner = String(review.user) === String(req.user.userId);

    if (!isOwner && !(await isAdminUser(req.user.userId))) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own review.",
      });
    }

    await review.deleteOne();
    await destroyQuietly(review.photos);

    return res.status(200).json({ success: true, message: "Review deleted." });
  } catch (error) {
    console.error("Delete Review Error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to delete review." });
  }
};

module.exports = { getReviews, saveReview, deleteReview, toggleHelpful, addPhotos, deletePhoto, MAX_PHOTOS };
