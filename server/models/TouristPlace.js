const mongoose = require("mongoose");

/**
 * TouristPlace Mongoose Model
 * Represents verified Indian tourist destinations, monuments, and attractions
 */
const touristPlaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Place name is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, "Place slug is required"],
      lowercase: true,
      trim: true,
      index: true,
    },
    state: {
      type: String,
      required: [true, "State name is required"],
      trim: true,
      index: true,
    },
    stateSlug: {
      type: String,
      required: [true, "State slug is required"],
      lowercase: true,
      trim: true,
      index: true,
    },
    city: {
      type: String,
      required: [true, "City name is required"],
      trim: true,
    },
    address: {
      type: String,
      default: "",
    },
    latitude: {
      type: Number,
      required: [true, "Latitude coordinate is required"],
    },
    longitude: {
      type: Number,
      required: [true, "Longitude coordinate is required"],
    },
    categories: {
      type: [String],
      default: ["tourism", "attraction"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    image: {
      type: String,
      default: "",
    },
    cloudinaryPublicId: {
      type: String,
      default: "",
    },
    imageAlt: {
      type: String,
      default: "",
    },
    source: {
      type: String,
      default: "Curated",
    },
    sourceUrl: {
      type: String,
      default: "",
    },
    timings: {
      type: String,
      default: "9:00 AM – 5:30 PM",
    },
    entryFee: {
      type: String,
      default: "Free / Nominal",
    },
    rating: {
      type: Number,
      default: 4.8,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index on stateSlug + slug for fast lookups
touristPlaceSchema.index({ stateSlug: 1, slug: 1 });
touristPlaceSchema.index({ name: "text", description: "text", city: "text" });

const TouristPlace = mongoose.model("TouristPlace", touristPlaceSchema);

module.exports = TouristPlace;
