const mongoose = require("mongoose");

/**
 * Photo links found for a stay (keyed by the Geoapify place id).
 * Only links and references are kept, never the pictures. Empty lists mean "looked, found none",
 * so a hotel without photos is not searched again on every request. Entries expire after
 * 7 days because Google photo references do not last forever.
 */
const stayPhotoSchema = new mongoose.Schema({
  placeId: { type: String, required: true, unique: true },
  photos: { type: [String], default: [], index: true }, // Google references
  urls: { type: [String], default: [] }, // direct links found on free sources
  checkedAt: { type: Date, default: Date.now, expires: 7 * 24 * 60 * 60 },
});

module.exports = mongoose.model("StayPhoto", stayPhotoSchema);
