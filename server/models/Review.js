const mongoose = require("mongoose");

/**
 * Review Mongoose Model
 * A traveler's rating and comment for a tourist place or a stay.
 * One review per user per item (enforced by a unique compound index).
 */
const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    itemType: {
      type: String,
      enum: ["place", "stay"],
      required: true,
    },
    itemId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    // up to 3 photos, stored on Cloudinary
    photos: {
      type: [{ url: { type: String, required: true }, publicId: { type: String, required: true }, _id: false }],
      default: [],
      validate: [(list) => list.length <= 3, "A review can have up to 3 photos."],
    },

    // who found this review helpful (one vote each). Only the count is shown to others.
    helpfulBy: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
      select: false,
    },
  },
  { timestamps: true },
);

reviewSchema.index({ user: 1, itemType: 1, itemId: 1 }, { unique: true });

module.exports = mongoose.model("Review", reviewSchema);
