// The finished stops of a multi-city trip, kept in this browser tab until their bookings are made.
// Each stop (a "leg") is one normal trip: its own stay, room, dates, guests and add-ons.
// Dates are plain "YYYY-MM-DD" text, so comparing them as text compares them as dates.

const KEY = "voyara_trip_cart";
const EVENT = "voyara-cart";
const MAX_AGE_MS = 3 * 60 * 60 * 1000;

export const MAX_CITIES = 6;

const LEG_FIELDS = [
  "location", "selectedPlaces", "selectedStay", "selectedRoom", "checkIn", "checkOut",
  "rooms", "adults", "children", "nights", "meals", "transport", "activities",
];

const emptyCart = () => ({ tripId: "", legs: [] });

// the same format the server accepts: "trip_" and 24 letters or digits
const makeTripId = () =>
  `trip_${Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join("")}`;

export const getCart = () => {
  try {
    const cart = JSON.parse(sessionStorage.getItem(KEY));

    if (cart && Array.isArray(cart.legs) && Date.now() - cart.savedAt < MAX_AGE_MS) return cart;
  } catch (error) {
    // storage can be blocked or hold something else: start empty
  }

  return emptyCart();
};

const save = (cart) => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...cart, savedAt: Date.now() }));
  } catch (error) {
    // without storage the trip simply cannot be carried across pages
  }

  window.dispatchEvent(new Event(EVENT));

  return cart;
};

export const onCartChange = (listener) => {
  window.addEventListener(EVENT, listener);

  return () => window.removeEventListener(EVENT, listener);
};

export const clearCart = () => {
  try {
    sessionStorage.removeItem(KEY);
  } catch (error) {
    // ignore
  }

  window.dispatchEvent(new Event(EVENT));
};

const stayOf = (trip) => trip.selectedStay?.placeId || trip.selectedStay?.geoapifyPlaceId || trip.selectedStay?.id || trip.selectedStay?.name || "";
const roomOf = (trip) => trip.selectedRoom?._id || trip.selectedRoom?.id || "";

export const legKey = (trip) => [stayOf(trip), roomOf(trip), trip.checkIn, trip.checkOut].join("|");

export const cityOf = (leg) => leg.location?.city || leg.location?.name || leg.selectedStay?.city || "this city";

/** Adds a stop, or replaces it when the same stay, room and dates are already saved. Stops stay in date order. */
export const addLeg = (trip) => {
  const cart = getCart();
  const leg = { key: legKey(trip) };

  LEG_FIELDS.forEach((field) => {
    leg[field] = trip[field];
  });

  const others = cart.legs.filter((l) => l.key !== leg.key);
  const legs = [...others, leg].sort((a, b) => (a.checkIn < b.checkIn ? -1 : a.checkIn > b.checkIn ? 1 : 0));

  return save({ tripId: cart.tripId || makeTripId(), legs });
};

export const removeLeg = (key) => {
  const cart = getCart();
  const legs = cart.legs.filter((l) => l.key !== key);

  return legs.length ? save({ ...cart, legs }) : (clearCart(), emptyCart());
};

/** Remembers the booking made for a stop, so a retry never books it twice. */
export const markBooked = (key, booking) => {
  const cart = getCart();

  return save({ ...cart, legs: cart.legs.map((l) => (l.key === key ? { ...l, booking } : l)) });
};

/** The day the next stop should start: when the last saved stop ends. "" when nothing is saved. */
export const nextStart = (cart) => cart.legs.reduce((latest, l) => (l.checkOut > latest ? l.checkOut : latest), "");

/** A saved stop whose dates overlap this trip's dates (stops may touch). The identical saved stop is skipped. */
export const overlapWith = (cart, trip) =>
  cart.legs.find((l) => l.key !== legKey(trip) && trip.checkIn < l.checkOut && trip.checkOut > l.checkIn) || null;

export const addDays = (dateString, days) => {
  const date = new Date(`${dateString}T00:00:00`);

  date.setDate(date.getDate() + days);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
