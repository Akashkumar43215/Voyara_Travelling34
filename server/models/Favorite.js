const mongoose = require("mongoose");

/**
 * Favorite Mongoose Model
 * A place or stay saved by a traveler. A small snapshot (name, image, location)
 * is stored so the favorites page does not need to re-fetch external data.
 */
const favoriteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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
    },
    name: { type: String, required: true, trim: true },
    image: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    stateSlug: { type: String, default: "" },
  },
  { timestamps: true },
);

favoriteSchema.index({ user: 1, itemType: 1, itemId: 1 }, { unique: true });

module.exports = mongoose.model("Favorite", favoriteSchema);
