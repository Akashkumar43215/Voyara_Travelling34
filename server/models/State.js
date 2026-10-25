const mongoose = require("mongoose");

/**
 * State Mongoose Model
 * Central model representing all 28 Indian States & 8 Union Territories
 */
const stateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "State name is required"],
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      required: [true, "State slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      required: [true, "Type is required"],
      enum: ["State", "Union Territory"],
    },
    region: {
      type: String,
      required: [true, "Region is required"],
      enum: [
        "North",
        "South",
        "East",
        "West",
        "Central",
        "Northeast",
        "Union Territory",
      ],
    },
    capital: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
      required: [true, "Representative image is required"],
      trim: true,
    },

    cloudinaryPublicId: {
      type: String,
      default: "",
      trim: true,
    },
    imageSource: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    popularPlaces: {
      type: [String],
      default: [],
    },
    bestTimeToVisit: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

// Text index for fast full-text searching across name, description, and popular places
stateSchema.index({ name: "text", description: "text", popularPlaces: "text" });

const State = mongoose.model("State", stateSchema);

module.exports = State;
