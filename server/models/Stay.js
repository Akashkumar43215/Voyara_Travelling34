const mongoose = require("mongoose");

const staySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Stay name is required"],
      trim: true,
    },

    address: {
      type: String,
      default: "",
      trim: true,
    },

    city: {
      type: String,
      default: "",
      trim: true,
    },

    state: {
      type: String,
      default: "",
      trim: true,
    },

    latitude: {
      type: Number,
      default: null,
    },

    longitude: {
      type: Number,
      default: null,
    },

    geoapifyPlaceId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    category: {
      type: String,
      default: "accommodation",
      trim: true,
    },

    image: {
      type: String,
      default: "",
      trim: true,
    },

    cloudinaryPublicId: {
      type: String,
      default: "",
      trim: true,
    },

    rating: {
      type: Number,
      default: 0,
    },

    reviewCount: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

staySchema.index({
  name: "text",
  address: "text",
  city: "text",
  state: "text",
});

const Stay = mongoose.model("Stay", staySchema);

module.exports = Stay;