const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    stay: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stay",
      required: [true, "Stay is required"],
      index: true,
    },

    name: {
      type: String,
      required: [true, "Room name is required"],
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    pricePerNight: {
      type: Number,
      required: [true, "Room price is required"],
      min: 0,
    },

    maxGuests: {
      type: Number,
      required: [true, "Maximum guests is required"],
      min: 1,
    },

    totalRooms: {
      type: Number,
      required: [true, "Total rooms is required"],
      min: 0,
    },

    availableRooms: {
      type: Number,
      required: [true, "Available rooms is required"],
      min: 0,
    },

    amenities: {
      type: [String],
      default: [],
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

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

roomSchema.index({
  stay: 1,
  name: 1,
});

const Room = mongoose.model("Room", roomSchema);

module.exports = Room;