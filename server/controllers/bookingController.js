const mongoose = require("mongoose");
const { priceBooking } = require("../services/addonCatalog");
const { MAX_TRIP_CITIES, findTripOverlap, validateBookingInput } = require("../services/bookingValidation");
const { sendBookingEmail } = require("../services/emailService");
const { isConfigured: onlinePaymentOn } = require("../services/razorpayService");
const { refundThroughGateway } = require("./paymentController");

const Booking = require("../models/Booking");
const Room = require("../models/Room");

// ======================================================
// GENERATE UNIQUE BOOKING REFERENCE
// ======================================================

const generateBookingReference = async () => {
  let bookingReference;

  do {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(1000 + Math.random() * 9000);

    bookingReference = `VOY-${timestamp}-${random}`;
  } while (
    await Booking.exists({
      bookingReference,
    })
  );

  return bookingReference;
};

// ======================================================
// CHECK ROOM AVAILABILITY HELPER
// ======================================================

const checkRoomAvailability = async ({
  roomId,
  checkIn,
  checkOut,
  roomsRequired,
  excludeBookingId,
}) => {
  // ----------------------------------------------------
  // Validate Room ID
  // ----------------------------------------------------

  if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
    return {
      available: false,
      message: "Invalid room ID.",
    };
  }

  // ----------------------------------------------------
  // Find Room
  // ----------------------------------------------------

  const room = await Room.findOne({
    _id: roomId,
    isActive: true,
  });

  if (!room) {
    return {
      available: false,
      message: "Room not found or inactive.",
    };
  }

  // ----------------------------------------------------
  // Validate Requested Rooms
  // ----------------------------------------------------

  const requestedRooms = Number(roomsRequired);

  if (
    !Number.isFinite(requestedRooms) ||
    requestedRooms < 1
  ) {
    return {
      available: false,
      message: "Invalid number of rooms.",
    };
  }

  // ----------------------------------------------------
  // Validate Dates
  // ----------------------------------------------------

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  if (
    Number.isNaN(checkInDate.getTime()) ||
    Number.isNaN(checkOutDate.getTime())
  ) {
    return {
      available: false,
      message: "Invalid booking dates.",
    };
  }

  if (checkOutDate <= checkInDate) {
    return {
      available: false,
      message: "Check-out date must be after check-in.",
    };
  }

  // ----------------------------------------------------
  // FIND OVERLAPPING BOOKINGS
  // ----------------------------------------------------
  //
  // Overlap condition:
  //
  // Existing check-in  < Requested check-out
  // AND
  // Existing check-out > Requested check-in
  //
  // Pending and confirmed bookings both reserve rooms
  // in the current VOYARA demo booking system.
  //
  // ----------------------------------------------------

  const overlappingBookings = await Booking.find({
    "room.id": roomId,

    // when moving a booking to new dates, its own rooms must not count against it
    ...(excludeBookingId ? { _id: { $ne: excludeBookingId } } : {}),

    status: {
      $in: ["pending", "confirmed"],
    },

    checkIn: {
      $lt: checkOutDate,
    },

    checkOut: {
      $gt: checkInDate,
    },
  }).select("rooms");

  // ----------------------------------------------------
  // CALCULATE BOOKED ROOMS
  // ----------------------------------------------------

  const bookedRooms = overlappingBookings.reduce(
    (total, booking) => {
      return total + Number(booking.rooms || 0);
    },
    0
  );

  // ----------------------------------------------------
  // CALCULATE REMAINING ROOMS
  // ----------------------------------------------------

  const totalRooms = Number(room.totalRooms || 0);

  const availableRooms = Math.max(
    0,
    totalRooms - bookedRooms
  );

  const isAvailable =
    availableRooms >= requestedRooms;

  // ----------------------------------------------------
  // RESPONSE DATA
  // ----------------------------------------------------

  return {
    available: isAvailable,

    room,

    totalRooms,

    bookedRooms,

    availableRooms,

    requestedRooms,

    maxGuests: Number(room.maxGuests || 0),

    message: isAvailable
      ? "Room is available."
      : `Only ${availableRooms} room(s) available for the selected dates.`,
  };
};

// ======================================================
// CHECK ROOM AVAILABILITY
// ======================================================

const checkAvailability = async (req, res) => {
  try {
    const {
      roomId,
      checkIn,
      checkOut,
      rooms,
    } = req.body;

    // ----------------------------------------------------
    // BASIC VALIDATION
    // ----------------------------------------------------

    if (
      !roomId ||
      !checkIn ||
      !checkOut ||
      !rooms
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Room, check-in, check-out, and number of rooms are required.",
      });
    }

    // ----------------------------------------------------
    // CHECK INVENTORY
    // ----------------------------------------------------

    const availability =
      await checkRoomAvailability({
        roomId,
        checkIn,
        checkOut,
        roomsRequired: rooms,
      });

    // ----------------------------------------------------
    // ROOM NOT FOUND / INVALID REQUEST
    // ----------------------------------------------------

    if (!availability.room) {
      return res.status(404).json({
        success: false,
        available: false,
        message: availability.message,
      });
    }

    // ----------------------------------------------------
    // CAPACITY / AVAILABILITY RESPONSE
    // ----------------------------------------------------

    return res.status(200).json({
      success: true,

      available: availability.available,

      message: availability.message,

      data: {
        roomId,

        roomName: availability.room.name,

        checkIn,

        checkOut,

        requestedRooms:
          availability.requestedRooms,

        totalRooms:
          availability.totalRooms,

        bookedRooms:
          availability.bookedRooms,

        availableRooms:
          availability.availableRooms,

        maxGuests:
          availability.maxGuests,
      },
    });
  } catch (error) {
    console.error(
      "Check Room Availability Error:",
      error
    );

    return res.status(500).json({
      success: false,
      available: false,
      message:
        "Failed to check room availability.",
    });
  }
};

// ======================================================
// CREATE BOOKING
// ======================================================

const createBooking = async (req, res) => {
  try {
    const { selectedPlaces, room, meals, transport, activities } = req.body;

    // ==================================================
    // VALIDATE THE REQUEST
    // ==================================================
    //
    // Dates, guests and rooms are checked in services/bookingValidation.js.
    // Nights come from the two dates, never from the page.

    const input = validateBookingInput(req.body);

    if (!input.ok) {
      return res.status(400).json({ success: false, message: input.message });
    }

    const {
      destination,
      accommodation,
      traveler: { name: travelerName, email: travelerEmail, phone: travelerPhone },
      checkInDate,
      checkOutDate,
      nights: numberOfNights,
      rooms: numberOfRooms,
      adults: numberOfAdults,
      children: numberOfChildren,
      tripId,
    } = input.data;

    // ==================================================
    // MULTI-CITY TRIP RULES
    // ==================================================
    //
    // Only this traveler's own stops count (every query filters by user), so a trip id
    // can never reach into someone else's bookings.

    if (tripId) {
      const otherStops = await Booking.find({
        user: req.user.userId,
        tripId,
        status: { $ne: "cancelled" },
      }).select("checkIn checkOut");

      if (otherStops.length >= MAX_TRIP_CITIES) {
        return res.status(400).json({ success: false, message: `A trip can have up to ${MAX_TRIP_CITIES} cities.` });
      }

      if (findTripOverlap(otherStops, checkInDate, checkOutDate)) {
        return res.status(409).json({
          success: false,
          message: "These dates overlap another city in your trip. Choose dates after your previous stop.",
        });
      }
    }

    // ==================================================
    // CHECK ACTUAL ROOM
    // ==================================================

    if (
      !mongoose.Types.ObjectId.isValid(
        room.id
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid room selected.",
      });
    }

    const roomDocument =
      await Room.findOne({
        _id: room.id,
        isActive: true,
      });

    if (!roomDocument) {
      return res.status(404).json({
        success: false,
        message:
          "Selected room was not found.",
      });
    }

    // ==================================================
    // CHECK GUEST CAPACITY
    // ==================================================

    const totalGuests =
      numberOfAdults +
      numberOfChildren;

    const maximumGuests =
      Number(roomDocument.maxGuests) *
      numberOfRooms;

    if (
      totalGuests >
      maximumGuests
    ) {
      return res.status(400).json({
        success: false,
        message:
          `This room supports a maximum of ${maximumGuests} guest(s) for ${numberOfRooms} room(s).`,
      });
    }

    if (
      numberOfAdults <
      numberOfRooms
    ) {
      return res.status(400).json({
        success: false,
        message:
          "At least one adult is required per room.",
      });
    }

    // ==================================================
    // RE-CHECK ROOM AVAILABILITY
    // ==================================================
    //
    // IMPORTANT:
    // Even if frontend availability showed YES,
    // another booking could have happened before
    // this request reached the server.
    //
    // Therefore the server checks again.
    //
    // ==================================================

    const availability =
      await checkRoomAvailability({
        roomId: room.id,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        roomsRequired: numberOfRooms,
      });

    if (!availability.available) {
      return res.status(409).json({
        success: false,
        available: false,
        message:
          availability.message,
        data: {
          availableRooms:
            availability.availableRooms,
          requestedRooms:
            availability.requestedRooms,
        },
      });
    }

    // ==================================================
    // SERVER-SIDE ROOM PRICE
    // ==================================================
    //
    // Never trust the price sent by frontend.
    //
    // ==================================================

    const pricePerNight =
      Number(
        roomDocument.pricePerNight
      );

    if (
      !Number.isFinite(
        pricePerNight
      ) ||
      pricePerNight < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid room pricing information.",
      });
    }

    // ==================================================
    // SERVER-SIDE PRICING
    // ==================================================

    // Room + meals + local travel + activities + 5% tax, all worked out here.
    // The page only sends WHAT was chosen, never any prices.
    const priced = priceBooking({
      roomPricePerNight: pricePerNight,
      rooms: numberOfRooms,
      nights: numberOfNights,
      adults: numberOfAdults,
      children: numberOfChildren,
      meals,
      transport,
      activities,
    });

    if (!priced.ok) {
      return res.status(400).json({
        success: false,
        message: priced.message,
      });
    }

    const { roomTotal, taxes, totalAmount } = priced;

    // ==================================================
    // CREATE BOOKING
    // ==================================================

    const booking =
      await Booking.create({
        user: req.user.userId,

        bookingReference:
        await generateBookingReference(),

        destination,

        selectedPlaces: Array.isArray(selectedPlaces) ? selectedPlaces : [],

        traveler: {
          name: travelerName,
          email: travelerEmail,
          phone: travelerPhone,
        },

        accommodation,

        tripId,

        room: {
          id: roomDocument._id.toString(),
          name: roomDocument.name,
          guests:
            Number(
              roomDocument.maxGuests
            ),
          pricePerNight,
        },

        checkIn:
          checkInDate,

        checkOut:
          checkOutDate,

        rooms:
          numberOfRooms,

        adults:
          numberOfAdults,

        children:
          numberOfChildren,

        nights:
          numberOfNights,

        pricing: {
          roomTotal,
          mealsTotal: priced.mealsTotal,
          transportTotal: priced.transportTotal,
          activitiesTotal: priced.activitiesTotal,
          addonsTotal: priced.addonsTotal,
          taxes,
          totalAmount,
          currency: "INR",
        },

        addons: {
          meals: priced.meals,
          transport: priced.transport || undefined,
          activities: priced.activities,
        },

        status: "pending",

        paymentStatus: "pending",
      });

    // ==================================================
    // RACE CHECK
    // ==================================================
    //
    // Two travelers can pass the availability check at the same instant. Now that
    // this booking is saved, count again, but only the bookings created before it
    // (lower _id). Every racer uses the same order, so exactly the ones that do not
    // fit are undone and the rest stay. No transaction is needed.

    const earlier = await Booking.find({
      "room.id": roomDocument._id.toString(),
      status: { $in: ["pending", "confirmed"] },
      checkIn: { $lt: checkOutDate },
      checkOut: { $gt: checkInDate },
      _id: { $lte: booking._id },
    }).select("rooms");

    const roomsInUse = earlier.reduce((sum, b) => sum + Number(b.rooms || 0), 0);

    if (roomsInUse > Number(roomDocument.totalRooms || 0)) {
      await Booking.deleteOne({ _id: booking._id });

      return res.status(409).json({
        success: false,
        available: false,
        message:
          "Someone else just booked the last room(s). Please choose other dates or another room.",
      });
    }

    // ==================================================
    // SUCCESS RESPONSE
    // ==================================================

    return res.status(201).json({
      success: true,

      message:
        "Booking created successfully.",

      data: booking,
    });
  } catch (error) {
    console.error(
      "Create Booking Error:",
      error.message
    );

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message:
          "Some booking details are missing or invalid.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to create booking.",
    });
  }
};

// ======================================================
// GET CURRENT USER'S BOOKINGS
// ======================================================

const getMyBookings = async (
  req,
  res
) => {
  try {
    const bookings =
      await Booking.find({
        user: req.user.userId,
      }).sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,

      count:
        bookings.length,

      data: bookings,
    });
  } catch (error) {
    console.error(
      "Get My Bookings Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load your bookings.",
    });
  }
};

// ======================================================
// COMPLETE DEMO PAYMENT
// ======================================================

const completeDemoPayment = async (
  req,
  res
) => {
  try {
    // IMPORTANT:
    // bookingId comes from route:
    // PATCH /api/bookings/:bookingId/payment

    const { bookingId } =
      req.params;

    // With online payment on, the demo endpoint must not exist: it would let anyone
    // confirm a booking without paying.
    if (onlinePaymentOn()) {
      return res.status(403).json({
        success: false,
        message:
          "Demo payment is switched off. Please pay online.",
      });
    }

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message:
          "Booking ID is required.",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        bookingId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid booking ID.",
      });
    }

    // One atomic update: only an unpaid, not-cancelled booking of this user can be paid.
    // A cancelled booking has already given its rooms back, so paying it would skip
    // the availability check and could overbook the room.
    const booking =
      await Booking.findOneAndUpdate(
        {
          _id: bookingId,
          user: req.user.userId,
          status: { $ne: "cancelled" },
          paymentStatus: { $ne: "paid" },
        },
        { paymentStatus: "paid", status: "confirmed" },
        { new: true }
      );

    if (!booking) {
      const existing =
        await Booking.findOne({
          _id: bookingId,
          user: req.user.userId,
        }).select("status paymentStatus");

      if (!existing) {
        return res.status(404).json({
          success: false,
          message:
            "Booking not found.",
        });
      }

      return res.status(400).json({
        success: false,
        message:
          existing.status === "cancelled"
            ? "This booking was cancelled, so it cannot be paid. Please make a new booking."
            : "This booking has already been paid.",
      });
    }

    // not awaited: a slow mail server must never hold up the payment answer
    sendBookingEmail("paid", booking);

    return res.status(200).json({
      success: true,

      message:
        "Demo payment completed successfully.",

      data: booking,
    });
  } catch (error) {
    console.error(
      "Demo Payment Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to complete demo payment.",
    });
  }
};

// ======================================================
// EXPORT
// ======================================================

// ======================================================
// CANCELLATION
// ======================================================
//
// Hotels with free cancellation refund the full amount up to 24 hours before
// check-in. Everything else can be cancelled but is non-refundable.
// A cancelled booking stops reserving rooms (availability only counts
// pending and confirmed bookings).

const { hasFreeCancellation } = require("../services/stayProfile");

const FREE_CANCEL_WINDOW_HOURS = 24;

const buildCancellationQuote = (booking) => {
  const now = new Date();
  const checkIn = new Date(booking.checkIn);
  const hoursToCheckIn = (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60);

  const freeCancellation = hasFreeCancellation({
    placeId: booking.accommodation?.placeId,
    name: booking.accommodation?.name,
  });

  const refundDeadline = new Date(checkIn.getTime() - FREE_CANCEL_WINDOW_HOURS * 60 * 60 * 1000);

  if (booking.status === "cancelled") {
    return { canCancel: false, reason: "This booking is already cancelled.", freeCancellation, refundAmount: 0, refundDeadline };
  }

  if (hoursToCheckIn <= 0) {
    return { canCancel: false, reason: "This stay has already started, so it can no longer be cancelled.", freeCancellation, refundAmount: 0, refundDeadline };
  }

  const paid = booking.paymentStatus === "paid";
  const withinFreeWindow = freeCancellation && hoursToCheckIn >= FREE_CANCEL_WINDOW_HOURS;
  const refundAmount = paid && withinFreeWindow ? Number(booking.pricing?.totalAmount || 0) : 0;

  let message;

  if (!paid) {
    message = "No payment has been taken for this booking, so there is nothing to refund.";
  } else if (withinFreeWindow) {
    message = `Free cancellation: the full amount of ₹${refundAmount.toLocaleString("en-IN")} will be refunded.`;
  } else if (freeCancellation) {
    message = "Free cancellation ended 24 hours before check-in, so this booking is now non-refundable.";
  } else {
    message = "This property does not offer free cancellation, so this booking is non-refundable.";
  }

  return { canCancel: true, freeCancellation, refundAmount, refundDeadline, message };
};

const getCancellationQuote = async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID." });
    }

    const booking = await Booking.findOne({ _id: bookingId, user: req.user.userId });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    return res.status(200).json({ success: true, data: buildCancellationQuote(booking) });
  } catch (error) {
    console.error("Cancellation Quote Error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to check the cancellation policy." });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID." });
    }

    const booking = await Booking.findOne({ _id: bookingId, user: req.user.userId });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    const quote = buildCancellationQuote(booking);

    if (!quote.canCancel) {
      return res.status(400).json({ success: false, message: quote.reason });
    }

    // A booking paid online is refunded through the gateway first. If the gateway
    // refuses, the booking stays as it was so the traveler can try again.
    try {
      await refundThroughGateway(booking, quote.refundAmount);
    } catch (refundError) {
      console.error("Gateway refund failed:", refundError.response?.data?.error?.description || refundError.message);

      return res.status(502).json({
        success: false,
        message: "Your refund could not be started. The booking was not cancelled. Please try again in a moment.",
      });
    }

    booking.status = "cancelled";
    booking.cancellation = {
      cancelledAt: new Date(),
      refundAmount: quote.refundAmount,
      note: quote.message,
      cancelledBy: "user",
    };

    if (quote.refundAmount > 0) {
      booking.paymentStatus = "refunded";
    }

    await booking.save();

    sendBookingEmail("cancelled", booking);

    return res.status(200).json({
      success: true,
      message: quote.refundAmount > 0 ? "Booking cancelled. Your refund has been initiated." : "Booking cancelled.",
      data: booking,
      refundAmount: quote.refundAmount,
    });
  } catch (error) {
    console.error("Cancel Booking Error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to cancel the booking." });
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  completeDemoPayment,
  checkAvailability,
  getCancellationQuote,
  cancelBooking,
  checkRoomAvailability,
};