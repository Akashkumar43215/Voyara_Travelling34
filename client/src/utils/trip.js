// Helpers for the trip that travels from page to page in the booking flow.

import { tg } from "../i18n/runtime";

const EMPTY_MEALS = { breakfast: false, lunch: false, dinner: false };

export const nightsBetween = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;

  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);

  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
};

/** Turns the router state of any booking page into one tidy trip object. */
export const tripFromState = (routerState) => {
  // the router hands over null when a page is opened directly or refreshed
  const state = routerState || {};
  const checkIn = state.checkIn || "";
  const checkOut = state.checkOut || "";

  return {
    location: state.location || null,
    selectedPlaces: state.selectedPlaces || [],
    selectedStay: state.selectedStay || null,
    selectedRoom: state.selectedRoom || null,
    checkIn,
    checkOut,
    rooms: Number(state.rooms) || 1,
    adults: Number(state.adults) || 2,
    children: Number(state.children) || 0,
    nights: Number(state.nights) || nightsBetween(checkIn, checkOut),
    meals: { ...EMPTY_MEALS, ...(state.meals || {}) },
    transport: state.transport || null,
    activities: state.activities || [],
    traveler: state.traveler || null,
  };
};

/** The router state to hand to the next page: the whole trip, with any changes. */
export const stateForNext = (trip, changes = {}) => ({ ...trip, ...changes });

/** What the server needs to price the trip. Only choices, never amounts. */
export const quoteRequest = (trip) => ({
  roomId: trip.selectedRoom?._id || trip.selectedRoom?.id,
  rooms: trip.rooms,
  nights: trip.nights,
  adults: trip.adults,
  children: trip.children,
  meals: trip.meals,
  transport: trip.transport
    ? {
        mode: trip.transport.mode,
        ac: trip.transport.ac,
        vehicles: trip.transport.vehicles,
        days: trip.transport.days,
      }
    : null,
  activities: (trip.activities || []).map((a) => ({ id: a.id, name: a.name })),
});

/**
 * The body of POST /api/bookings for one stop of a trip: the choices only, never a price.
 * `tripId` is set for the stops of a multi-city trip.
 */
export const bookingPayload = (trip, traveler, tripId = "") => {
  const { location, selectedStay: stay, selectedRoom: room } = trip;

  return {
    destination: {
      name: location.name || location.city || "Unknown Destination",
      city: location.city || "",
      state: location.state || "",
      country: location.country || "India",
      latitude: location.lat ?? location.latitude ?? null,
      longitude: location.lon ?? location.longitude ?? null,
    },
    selectedPlaces: (trip.selectedPlaces || []).map((place) => ({
      placeId: place.placeId || place.id || place.geoapifyPlaceId || "",
      name: place.name || "Tourist Place",
      city: place.city || "",
      state: place.state || "",
    })),
    traveler: { name: traveler.name.trim(), email: traveler.email.trim().toLowerCase(), phone: traveler.phone.trim() },
    accommodation: {
      placeId: stay.geoapifyPlaceId || stay.placeId || stay.id || "",
      name: stay.name || "",
      address: stay.address || "",
      city: stay.city || "",
      state: stay.state || "",
    },
    room: {
      id: room._id || room.id || "",
      name: room.name || "",
      guests: Number(room.maxGuests || 1),
      pricePerNight: Number(room.pricePerNight || 0),
    },
    checkIn: trip.checkIn,
    checkOut: trip.checkOut,
    rooms: Number(trip.rooms),
    adults: Number(trip.adults),
    children: Number(trip.children),
    nights: Number(trip.nights),
    meals: trip.meals,
    transport: trip.transport
      ? { mode: trip.transport.mode, ac: trip.transport.ac, vehicles: trip.transport.vehicles, days: trip.transport.days }
      : null,
    activities: (trip.activities || []).map((a) => ({ id: a.id, name: a.name })),
    ...(tripId ? { tripId } : {}),
  };
};

export const hasTripBasics = (trip) =>
  Boolean(trip.location && trip.selectedStay && trip.selectedRoom && trip.checkIn && trip.checkOut && trip.nights > 0);

export const formatMoney = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

export const mealNames = (meals = {}) =>
  ["breakfast", "lunch", "dinner"]
    .filter((m) => meals[m])
    .map((m) => tg(m.charAt(0).toUpperCase() + m.slice(1)));

export const TRANSPORT_LABELS = {
  cab: "Cab (sedan)",
  suv: "SUV / Innova",
  bike: "Bike / Scooter",
  bus: "Tempo Traveller / Bus",
};
