const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    // User who created the booking
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true,
    },

    // Stops of one multi-city trip share this id (made by the website). Empty for a single booking.
    // Each stop is still a normal booking: priced, paid and cancelled on its own.
    tripId: {
      type: String,
      default: "",
      trim: true,
      maxlength: 64,
      index: true,
    },

    // Booking reference
    bookingReference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Destination
    destination: {
      name: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        default: "",
      },
      state: {
        type: String,
        default: "",
      },
      country: {
        type: String,
        default: "India",
      },
      latitude: {
        type: Number,
        default: null,
      },
      longitude: {
        type: Number,
        default: null,
      },
    },

    // Selected tourist places
    selectedPlaces: [
      {
        placeId: {
          type: String,
          default: "",
        },
        name: {
          type: String,
          required: true,
        },
        city: {
          type: String,
          default: "",
        },
        state: {
          type: String,
          default: "",
        },
      },
    ],

    traveler: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },
      phone: {
        type: String,
        required: true,
        trim: true,
      },
    },

    // Selected accommodation
    accommodation: {
      placeId: {
        type: String,
        default: "",
      },
      name: {
        type: String,
        required: true,
      },
      address: {
        type: String,
        default: "",
      },
      city: {
        type: String,
        default: "",
      },
      state: {
        type: String,
        default: "",
      },
    },

    // Selected room
    room: {
      id: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      guests: {
        type: Number,
        required: true,
      },
      pricePerNight: {
        type: Number,
        required: true,
      },
    },

    // Trip dates
    checkIn: {
      type: Date,
      required: true,
    },

    checkOut: {
      type: Date,
      required: true,
    },

    // Travellers
    rooms: {
      type: Number,
      required: true,
      min: 1,
    },

    adults: {
      type: Number,
      required: true,
      min: 1,
    },

    children: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Number of nights
    nights: {
      type: Number,
      required: true,
      min: 1,
    },

    // Pricing
    pricing: {
      roomTotal: {
        type: Number,
        required: true,
        min: 0,
      },
      mealsTotal: { type: Number, default: 0, min: 0 },
      transportTotal: { type: Number, default: 0, min: 0 },
      activitiesTotal: { type: Number, default: 0, min: 0 },
      addonsTotal: { type: Number, default: 0, min: 0 },
      taxes: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalAmount: {
        type: Number,
        required: true,
        min: 0,
      },
      currency: {
        type: String,
        default: "INR",
      },
    },

    // Meals, local travel and activities chosen with the stay
    addons: {
      meals: {
        breakfast: { type: Boolean, default: false },
        lunch: { type: Boolean, default: false },
        dinner: { type: Boolean, default: false },
        perPersonPerNight: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
      },
      transport: {
        mode: { type: String, default: "" },
        label: { type: String, default: "" },
        ac: { type: Boolean, default: false },
        vehicles: { type: Number, default: 0 },
        days: { type: Number, default: 0 },
        perDay: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
      },
      activities: [
        {
          id: { type: String },
          name: { type: String },
          unit: { type: String, default: "person" },
          persons: { type: Number, default: 1 },
          pricePerUnit: { type: Number, default: 0 },
          total: { type: Number, default: 0 },
        },
      ],
    },

    // Filled in when a booking is cancelled
    cancellation: {
      cancelledAt: { type: Date, default: null },
      refundAmount: { type: Number, default: 0, min: 0 },
      note: { type: String, default: "" },
      cancelledBy: { type: String, enum: ["user", "admin", ""], default: "" },
    },

    // Online payment (Razorpay). Empty for demo payments.
    payment: {
      provider: { type: String, default: "" },
      orderId: { type: String, default: "", index: true },
      paymentId: { type: String, default: "" },
      paidAt: { type: Date, default: null },
    },

    // Booking status
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },

    // Payment status
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  },
);

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;
