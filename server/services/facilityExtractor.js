/**
 * Pulls the facts the map data (OpenStreetMap, through Geoapify) actually
 * records about a hotel: wifi, air conditioning, pool, parking, wheelchair
 * access, stars, rooms, and contact details. Most hotels have only a few of
 * these filled in, so anything missing is simply left out (never guessed).
 */

const yes = (value) => ["yes", "true", "wlan", "wifi", "free", "designated"].includes(String(value || "").toLowerCase());

const clean = (value) => {
  const text = String(value || "").trim();

  return text || "";
};

const firstOf = (...values) => values.map(clean).find(Boolean) || "";

const extractFacilities = (properties = {}) => {
  const raw = properties.datasource?.raw || {};
  const facilities = properties.facilities || {};
  const verified = [];

  const wifi = yes(raw.internet_access) || facilities.internet_access === true || raw["internet_access:fee"] === "no";
  if (wifi) verified.push("Free WiFi");

  if (yes(raw.air_conditioning)) verified.push("Air Conditioning");
  if (yes(raw.swimming_pool) || raw.leisure === "swimming_pool") verified.push("Swimming Pool");
  // parking is recorded as yes / surface / underground / multi-storey ...; "no" means none
  if (raw.parking && String(raw.parking).toLowerCase() !== "no") verified.push("Parking");
  if (yes(raw.wheelchair) || facilities.wheelchair === true) verified.push("Wheelchair Accessible");
  if (yes(raw.breakfast)) verified.push("Breakfast");
  if (yes(raw.restaurant)) verified.push("Restaurant");

  const starsNumber = Number(String(raw.stars || "").replace(/[^0-9.]/g, ""));
  const stars = Number.isFinite(starsNumber) && starsNumber >= 1 && starsNumber <= 5 ? Math.round(starsNumber) : null;

  const roomsNumber = Number(raw.rooms);

  return {
    verifiedAmenities: [...new Set(verified)],
    stars,
    rooms: Number.isFinite(roomsNumber) && roomsNumber > 0 ? roomsNumber : null,
    phone: firstOf(properties.contact?.phone, raw.phone, raw["contact:phone"]),
    email: firstOf(properties.contact?.email, raw.email, raw["contact:email"]),
    website: firstOf(properties.website, raw.website, raw["contact:website"]),
    openingHours: firstOf(properties.opening_hours, raw.opening_hours),
    operator: firstOf(raw.operator, raw.brand),
    smoking: clean(raw.smoking),
  };
};

module.exports = { extractFacilities };
