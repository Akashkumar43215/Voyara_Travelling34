const { detectStayType } = require("./stayImageService");

/**
 * Hotel details shown on the Stays listing (price, stars, rating, amenities,
 * cancellation policy).
 *
 * The map data VOYARA gets for hotels has names and locations only, so these
 * values are generated: stable per hotel (the same hotel always gets the same
 * numbers) and shaped by the kind of property. The starting price is exactly
 * the Standard Room price from roomService, so the price on the listing
 * matches what the booking charges. Real traveler reviews, when there are any,
 * replace the generated rating.
 */

const TYPE_PRICE_FACTOR = {
  resort: 2.2,
  villa: 1.8,
  hotel: 1,
  apartment: 0.9,
  homestay: 0.6,
  hostel: 0.35,
};

const BASE_STANDARD_PRICE = 2499;

const TYPE_LABELS = {
  resort: "Resort",
  villa: "Villa",
  hotel: "Hotel",
  apartment: "Apartment",
  homestay: "Homestay",
  hostel: "Hostel",
};

const hashString = (value) => {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }

  return hash;
};

const roundToHundred = (value) => Math.max(500, Math.round(value / 100) * 100);

const seedOf = (stay) => String(stay.geoapifyPlaceId || stay.placeId || stay._id || stay.name);

/** Standard Room price per night: used by both the listing and the room inventory. */
const LUXURY_NAME = /palace|heritage|royal|grand|luxury|imperial|taj|oberoi|marriott|hyatt|hilton|radisson|leela|itc|resort|haveli/i;
const isLuxuryName = (name) => LUXURY_NAME.test(String(name || ""));

const standardRoomPrice = (stay, type) => {
  const typeFactor = (TYPE_PRICE_FACTOR[type] || 1) * (isLuxuryName(stay.name) ? 1.7 : 1);
  // 0.85 to 1.25, stable for a given stay
  const variation = 0.85 + (hashString(seedOf(stay)) % 41) / 100;

  return roundToHundred(BASE_STANDARD_PRICE * typeFactor * variation);
};

const AMENITY_POOLS = {
  always: ["Free WiFi", "24-hour Front Desk"],
  hotel: ["Air Conditioning", "Room Service", "Restaurant", "Parking", "Power Backup", "Laundry"],
  resort: ["Swimming Pool", "Spa", "Restaurant", "Bar", "Air Conditioning", "Parking", "Gym", "Airport Transfers"],
  villa: ["Private Pool", "Kitchen", "Air Conditioning", "Parking", "Garden", "Caretaker"],
  apartment: ["Kitchen", "Air Conditioning", "Parking", "Washing Machine", "Power Backup"],
  homestay: ["Home-cooked Meals", "Parking", "Garden", "Power Backup", "Local Guide"],
  hostel: ["Shared Kitchen", "Lockers", "Common Room", "Laundry", "Power Backup"],
};

const pickMany = (pool, count, seed) => {
  const items = [...pool];
  const out = [];
  let h = seed;

  while (out.length < count && items.length) {
    h = (h * 1103515245 + 12345) >>> 0;
    out.push(items.splice(h % items.length, 1)[0]);
  }

  return out;
};

/** Free cancellation (until 24h before check-in) depends only on the hotel's id. */
const hasFreeCancellation = (stay) => hashString(seedOf(stay)) % 4 !== 0;

const ratingLabel = (rating) => {
  if (rating >= 4.5) return "Excellent";
  if (rating >= 4.0) return "Very Good";
  if (rating >= 3.5) return "Good";
  return "Average";
};

/**
 * @param stay        a stay from the listing ({ placeId, name, categories, ... })
 * @param realReviews optional { average, count } from VOYARA traveler reviews
 */
const buildStayProfile = (stay, realReviews) => {
  const type = detectStayType(stay);
  const seed = hashString(seedOf(stay));

  const price = standardRoomPrice(stay, type);

  // Stars follow the property type, with a stable nudge per hotel
  const baseStars = { resort: 4, villa: 4, hotel: 3, apartment: 3, homestay: 2, hostel: 2 }[type] || 3;
  const generatedStars = Math.min(5, Math.max(2, baseStars + ((seed >>> 3) % 2) + (isLuxuryName(stay.name) ? 1 : 0)));
  const stars = stay.facilities?.stars || generatedStars;

  // Generated rating 3.5 to 4.8, a little higher for pricier properties
  const generated = Math.min(4.8, Math.max(3.4, 3.5 + ((seed >>> 5) % 11) / 10 + (stars - 3) * 0.1));
  const hasReal = realReviews && realReviews.count > 0;

  const rating = hasReal ? realReviews.average : Math.round(generated * 10) / 10;
  const reviewCount = hasReal ? realReviews.count : 40 + (seed % 960);

  const real = stay.facilities || {};
  const verified = real.verifiedAmenities || [];

  // Facts reported by the property come first, then typical ones for this kind of property
  const typical = [
    ...AMENITY_POOLS.always,
    ...pickMany(AMENITY_POOLS[type] || AMENITY_POOLS.hotel, 4, seed),
  ];
  const amenities = [...new Set([...verified, ...typical])];

  // Roughly 3 in 4 properties offer free cancellation; 1 in 3 allow paying at the hotel
  const freeCancellation = hasFreeCancellation(stay);
  const payAtHotel = (seed >>> 2) % 3 === 0;

  // A "was" price for the strike-through, 12 to 32 percent higher
  const discountPercent = 12 + (seed % 21);
  const originalPrice = roundToHundred(price / (1 - discountPercent / 100));

  return {
    stayType: type,
    stayTypeLabel: TYPE_LABELS[type] || "Hotel",
    stars,
    price,
    originalPrice,
    discountPercent,
    taxesPerNight: Math.round(price * 0.05),
    rating,
    ratingLabel: ratingLabel(rating),
    reviewCount,
    ratingIsReal: Boolean(hasReal),
    amenities,
    amenitiesVerified: verified,
    starsAreReal: Boolean(real.stars),
    freeCancellation,
    payAtHotel,
  };
};

module.exports = { buildStayProfile, hasFreeCancellation, standardRoomPrice, isLuxuryName, TYPE_PRICE_FACTOR, BASE_STANDARD_PRICE };
