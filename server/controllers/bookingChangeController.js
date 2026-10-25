const mongoose = require("mongoose");

const Booking = require("../models/Booking");
const Room = require("../models/Room");
const { priceBooking } = require("../services/addonCatalog");
const { validateDates } = require("../services/bookingValidation");
const { sendBookingEmail } = require("../services/emailService");
const { checkRoomAvailability } = require("./bookingController");

/**
 * Changing the dates of a booking.
 *
 * Rules (so the money always adds up):
 *  - only the owner, only while the booking is not cancelled and the stay has not started
 *  - the new dates must pass the same checks as a new booking, and the room must be free
 *  - the room keeps the price it was booked at; nights, meals, travel days are re-priced
 *    by the same priceBooking a new booking uses
 *  - UNPAID booking: the new price replaces the old one
 *  - PAID booking: allowed only when the total stays exactly the same (for example the same
 *    number of nights on other days). A different total would mean taking extra money or
 *    refunding part of it, which needs a payment step this feature does not have
 *
 * body: { checkIn, checkOut, dryRun } . dryRun only reports the new price, nothing is saved.
 */

const fail = (res, status, message, extra = {}) => res.status(status).json({ success: false, message, ...extra });

// meals / travel / activities exactly as the traveler chose them, ready for priceBooking
const choicesOf = (booking) => {
  const t = booking.addons?.transport;

  return {
    meals: {
      breakfast: Boolean(booking.addons?.meals?.breakfast),
      lunch: Boolean(booking.addons?.meals?.lunch),
      dinner: Boolean(booking.addons?.meals?.dinner),
    },
    transport: t?.mode
      ? {
          mode: t.mode,
          ac: t.ac,
          vehicles: t.vehicles,
          // replaced below: days follow the new number of nights
          days: Number(t.days) || 1,
        }
      : null,
    activities: (booking.addons?.activities || []).map((a) => ({ id: a.id, name: a.name })),
  };
};

const changeBookingDates = async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) return fail(res, 400, "Invalid booking ID.");

    const { checkIn, checkOut } = req.body || {};
    const dryRun = req.body?.dryRun === true;

    const dates = validateDates(checkIn, checkOut);

    if (!dates.ok) return fail(res, 400, dates.message);

    const { checkInDate, checkOutDate, nights } = dates.data;

    const booking = await Booking.findOne({ _id: bookingId, user: req.user.userId });

    if (!booking) return fail(res, 404, "Booking not found.");
    if (booking.status === "cancelled") return fail(res, 400, "A cancelled booking cannot be changed.");
    if (new Date(booking.checkIn) <= new Date()) return fail(res, 400, "This stay has already started, so its dates can no longer be changed.");

    if (checkInDate.getTime() === new Date(booking.checkIn).getTime() && checkOutDate.getTime() === new Date(booking.checkOut).getTime()) {
      return fail(res, 400, "These are already the dates of your booking.");
    }

    const room = await Room.findOne({ _id: booking.room.id, isActive: true });

    if (!room) return fail(res, 404, "The room for this booking is no longer available.");

    // is the room free on the new dates (not counting this booking itself)?
    const availability = await checkRoomAvailability({
      roomId: booking.room.id,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      roomsRequired: booking.rooms,
      excludeBookingId: booking._id,
    });

    if (!availability.available) {
      return fail(res, 409, availability.message, { available: false, data: { availableRooms: availability.availableRooms } });
    }

    // transport days follow the new length of stay
    const choices = choicesOf(booking);

    if (choices.transport) {
      const extraDays = Math.max(0, Number(booking.addons.transport.days || 0) - Number(booking.nights || 0));
      choices.transport.days = Math.min(30, nights + extraDays);
    }

    const priced = priceBooking({
      roomPricePerNight: booking.room.pricePerNight,
      rooms: booking.rooms,
      nights,
      adults: booking.adults,
      children: booking.children,
      ...choices,
    });

    if (!priced.ok) return fail(res, 400, priced.message);

    const oldTotal = Number(booking.pricing?.totalAmount || 0);
    const paid = booking.paymentStatus === "paid";

    const preview = { oldTotal, newTotal: priced.totalAmount, difference: priced.totalAmount - oldTotal, nights, paid };

    if (paid && priced.totalAmount !== oldTotal) {
      return fail(
        res,
        400,
        `This booking is already paid. The new dates would cost ${priced.totalAmount.toLocaleString("en-IN")} instead of ${oldTotal.toLocaleString("en-IN")}. You can move it only to dates with the same total (for example ${booking.nights} night${booking.nights === 1 ? "" : "s"}), or cancel and book again.`,
        { data: preview }
      );
    }

    if (dryRun) return res.status(200).json({ success: true, message: "These dates are available.", data: preview });

    const previous = { checkIn: booking.checkIn, checkOut: booking.checkOut, nights: booking.nights, pricing: booking.pricing, addons: booking.addons, payment: booking.payment };

    booking.checkIn = checkInDate;
    booking.checkOut = checkOutDate;
    booking.nights = nights;
    booking.pricing = {
      roomTotal: priced.roomTotal,
      mealsTotal: priced.mealsTotal,
      transportTotal: priced.transportTotal,
      activitiesTotal: priced.activitiesTotal,
      addonsTotal: priced.addonsTotal,
      taxes: priced.taxes,
      totalAmount: priced.totalAmount,
      currency: "INR",
    };
    booking.addons = { meals: priced.meals, transport: priced.transport || undefined, activities: priced.activities };

    // an online payment order was created for the OLD amount: it must not be used any more
    if (!paid && booking.payment?.orderId && priced.totalAmount !== oldTotal) {
      booking.payment = { provider: "", orderId: "", paymentId: "", paidAt: null };
    }

    await booking.save();

    // Same race guard as a new booking: now that the new dates are saved, count again.
    // Two people moving into the last room at once cannot both keep it.
    const overlapping = await Booking.find({
      "room.id": booking.room.id,
      status: { $in: ["pending", "confirmed"] },
      checkIn: { $lt: checkOutDate },
      checkOut: { $gt: checkInDate },
    }).select("rooms");

    if (overlapping.reduce((sum, b) => sum + Number(b.rooms || 0), 0) > Number(room.totalRooms || 0)) {
      Object.assign(booking, previous);
      await booking.save();

      return fail(res, 409, "Someone else just booked that room for those dates. Your booking was left as it was.");
    }

    sendBookingEmail("changed", booking);

    return res.status(200).json({ success: true, message: "Your dates were changed.", data: { ...preview, booking } });
  } catch (error) {
    console.error("Change Dates Error:", error.message);

    return fail(res, 500, "Failed to change the dates.");
  }
};

module.exports = { changeBookingDates };
