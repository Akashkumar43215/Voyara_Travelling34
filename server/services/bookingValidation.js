/**
 * Checks the details of a new booking before anything is priced or saved.
 * Pure logic (no database, no `req`), so it is easy to test.
 *
 * Nights are worked out here from the two dates. The page's own "nights" value is
 * ignored, because the room price is multiplied by nights: trusting it would let a
 * traveler pay for 1 night and stay for 10.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const LIMITS = { maxNights: 30, maxRooms: 10, maxAdults: 50, maxChildren: 50 };

const isText = (value) => typeof value === "string";

const startOfTodayUtc = (now) => Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

const fail = (message) => ({ ok: false, message });

const wholeNumber = (value) => {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;

  return typeof n === "number" && Number.isInteger(n) ? n : null;
};

/**
 * Checks a pair of dates: real dates, check-out after check-in, not in the past, 1 to 30 nights.
 * Shared by new bookings and by changing the dates of an existing booking.
 * @returns { ok: true, data: { checkInDate, checkOutDate, nights } } or { ok: false, message }
 */
const validateDates = (checkIn, checkOut, now = new Date()) => {
  if (!isText(checkIn) || !isText(checkOut)) return fail("Invalid booking dates.");

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) return fail("Invalid booking dates.");

  if (checkOutDate <= checkInDate) return fail("Check-out date must be after check-in date.");

  if (checkInDate.getTime() < startOfTodayUtc(now)) return fail("Check-in date cannot be in the past.");

  const nights = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / DAY_MS);

  if (nights < 1) return fail("Trip must contain at least one night.");
  if (nights > LIMITS.maxNights) return fail(`You can book up to ${LIMITS.maxNights} nights at a time.`);

  return { ok: true, data: { checkInDate, checkOutDate, nights } };
};

/**
 * @param body the request body
 * @param now  current time (a parameter so tests can fix it)
 * @returns { ok: true, data } or { ok: false, message }
 */
const validateBookingInput = (body, now = new Date()) => {
  const { destination, traveler, accommodation, room, checkIn, checkOut } = body || {};

  if (!destination || typeof destination !== "object" || !isText(destination.name) || !destination.name.trim()) {
    return fail("Please choose a destination.");
  }

  if (!accommodation || typeof accommodation !== "object") return fail("Please choose a hotel.");

  if (!room || typeof room !== "object" || !isText(room.id) || !room.id) return fail("Please choose a room.");

  if (!traveler || typeof traveler !== "object" || ![traveler.name, traveler.email, traveler.phone].every(isText)) {
    return fail("Incomplete booking information.");
  }

  const travelerName = traveler.name.trim();
  const travelerEmail = traveler.email.trim().toLowerCase();
  const travelerPhone = traveler.phone.trim();

  if (travelerName.length < 2 || travelerName.length > 100) return fail("Please provide a valid traveler name.");
  if (travelerEmail.length > 254 || !/^\S+@\S+\.\S+$/.test(travelerEmail)) return fail("Please provide a valid traveler email.");
  if (travelerPhone.length > 30 || travelerPhone.replace(/\D/g, "").length < 10) return fail("Please provide a valid traveler phone number.");

  // ---- dates
  const dates = validateDates(checkIn, checkOut, now);

  if (!dates.ok) return dates;

  const { checkInDate, checkOutDate, nights } = dates.data;

  // ---- guests and rooms: whole numbers only
  const rooms = wholeNumber(body.rooms);
  const adults = wholeNumber(body.adults);
  const children = body.children === undefined || body.children === null || body.children === "" ? 0 : wholeNumber(body.children);

  if (rooms === null || rooms < 1 || rooms > LIMITS.maxRooms) return fail(`Choose between 1 and ${LIMITS.maxRooms} rooms.`);
  if (adults === null || adults < 1 || adults > LIMITS.maxAdults) return fail("At least one adult is required.");
  if (children === null || children < 0 || children > LIMITS.maxChildren) return fail("Invalid number of children.");
  if (adults < rooms) return fail("At least one adult is required per room.");

  return {
    ok: true,
    data: {
      destination,
      accommodation,
      roomId: room.id,
      traveler: { name: travelerName, email: travelerEmail, phone: travelerPhone },
      checkInDate,
      checkOutDate,
      nights,
      rooms,
      adults,
      children,
    },
  };
};

module.exports = { LIMITS, validateBookingInput, validateDates };
