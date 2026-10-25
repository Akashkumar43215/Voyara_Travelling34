const axios = require("axios");
const mongoose = require("mongoose");

const Room = require("../models/Room");
const {
  MEAL_PLANS,
  MEAL_LABELS,
  TRANSPORT_MODES,
  EXPERIENCES,
  mealPrices,
  geoActivityPrice,
  priceBooking,
} = require("../services/addonCatalog");

const GEOAPIFY_PLACES = "https://api.geoapify.com/v2/places";
const CACHE_TTL_MS = 60 * 60 * 1000;

const cache = new Map();

const cached = async (key, load) => {
  const hit = cache.get(key);

  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  const value = await load();

  cache.set(key, { at: Date.now(), value });

  return value;
};

const readCoordinates = (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    res.status(400).json({ success: false, message: "Valid lat and lon are required." });
    return null;
  }

  return { lat, lon };
};

const fetchPlaces = async ({ categories, lat, lon, radius, limit }) => {
  const response = await axios.get(GEOAPIFY_PLACES, {
    params: {
      categories,
      filter: `circle:${lon},${lat},${radius}`,
      bias: `proximity:${lon},${lat}`,
      limit,
      lang: "en",
      apiKey: process.env.GEOAPIFY_API_KEY,
    },
    timeout: 15000,
  });

  return response.data?.features || [];
};

// Prefer the English name when the map has both (many Indian places are listed in Hindi first)
const englishName = (p) => {
  const raw = p.datasource?.raw || {};

  return String(p.name_international?.en || raw["name:en"] || p.name || "").trim();
};

// The most specific category, ignoring generic tags such as "access.yes"
const kindOf = (categories = []) => {
  const specific = categories.filter((c) => !/^(access|wheelchair|internet_access|fee|no_fee)/.test(c));
  const best = specific.sort((a, b) => b.split(".").length - a.split(".").length)[0] || categories[0] || "attraction";
  const last = best.split(".").pop();

  return last === "yes" ? "Attraction" : last;
};

const titleCase = (value) =>
  String(value || "")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

/* ----------------------------------------------------------------------------
 * GET /api/addons/restaurants?lat&lon&radius&limit
 * Real restaurants, cafes and food stalls around a point, with whatever the map
 * data records (cuisine, vegetarian options, hours, phone).
 * -------------------------------------------------------------------------- */

const getRestaurants = async (req, res) => {
  const point = readCoordinates(req, res);

  if (!point) return undefined;

  const radius = Math.min(5000, Math.max(300, Number(req.query.radius) || 1500));
  const limit = Math.min(40, Math.max(1, Number(req.query.limit) || 20));
  const key = `food|${point.lat.toFixed(3)}|${point.lon.toFixed(3)}|${radius}|${limit}`;

  try {
    const data = await cached(key, async () => {
      const features = await fetchPlaces({
        categories: "catering.restaurant,catering.cafe,catering.fast_food,catering.food_court,catering.bar",
        ...point,
        radius,
        limit: limit + 15,
      });

      return features
        .map((feature) => {
          const p = feature.properties || {};
          const raw = p.datasource?.raw || {};
          const type = String(p.categories?.find((c) => c.startsWith("catering.")) || "catering.restaurant")
            .split(".")
            .pop();

          const cuisines = String(p.catering?.cuisine || raw.cuisine || "")
            .split(/[;,]/)
            .map((c) => titleCase(c.trim()))
            .filter(Boolean);

          return {
            placeId: p.place_id,
            name: englishName(p),
            type: titleCase(type),
            cuisines,
            vegetarian: raw["diet:vegetarian"] === "yes" || raw["diet:vegetarian"] === "only",
            vegetarianOnly: raw["diet:vegetarian"] === "only",
            vegan: raw["diet:vegan"] === "yes" || raw["diet:vegan"] === "only",
            halal: raw["diet:halal"] === "yes",
            openingHours: p.opening_hours || raw.opening_hours || "",
            phone: p.contact?.phone || raw.phone || raw["contact:phone"] || "",
            website: p.website || raw.website || raw["contact:website"] || "",
            outdoorSeating: raw.outdoor_seating === "yes",
            takeaway: raw.takeaway === "yes",
            address: p.address_line2 || p.formatted || "",
            latitude: p.lat ?? null,
            longitude: p.lon ?? null,
            distance: p.distance ?? null,
          };
        })
        .filter((r) => r.name)
        // places that tell us more (cuisine, hours) first, then by distance
        .sort((a, b) => (b.cuisines.length > 0) - (a.cuisines.length > 0) || (a.distance ?? 1e9) - (b.distance ?? 1e9))
        .slice(0, limit);
    });

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    console.error("Restaurants Error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to find nearby restaurants." });
  }
};

/* ----------------------------------------------------------------------------
 * GET /api/addons/activities?lat&lon&radius
 * Real nearby attractions and activities, plus the fixed experiences we offer.
 * -------------------------------------------------------------------------- */

const getActivities = async (req, res) => {
  const point = readCoordinates(req, res);

  if (!point) return undefined;

  const radius = Math.min(15000, Math.max(500, Number(req.query.radius) || 6000));
  const key = `act|${point.lat.toFixed(3)}|${point.lon.toFixed(3)}|${radius}`;

  try {
    const nearby = await cached(key, async () => {
      const features = await fetchPlaces({
        categories:
          "tourism.attraction,tourism.sights,entertainment.museum,entertainment.zoo,entertainment.culture,leisure.park,natural,beach,sport",
        ...point,
        radius,
        limit: 30,
      });

      const seen = new Set();

      return features
        .map((feature) => {
          const p = feature.properties || {};
          const id = `geo:${p.place_id}`;

          return {
            id,
            name: englishName(p),
            kind: titleCase(kindOf(p.categories)),
            address: p.address_line2 || p.formatted || "",
            distance: p.distance ?? null,
            latitude: p.lat ?? null,
            longitude: p.lon ?? null,
            unit: "person",
            price: geoActivityPrice(id),
            real: true,
          };
        })
        .filter((a) => {
          // drop unnamed entries and names we have already listed
          const nameKey = a.name.toLowerCase();

          if (!a.name || seen.has(nameKey)) return false;

          seen.add(nameKey);

          return true;
        })
        .slice(0, 18);
    });

    const experiences = EXPERIENCES.map((e) => ({ ...e, real: false, kind: "Experience" }));

    return res.status(200).json({ success: true, data: { experiences, nearby } });
  } catch (error) {
    console.error("Activities Error:", error.message);

    // the fixed experiences still work without the map service
    return res.status(200).json({
      success: true,
      data: { experiences: EXPERIENCES.map((e) => ({ ...e, real: false, kind: "Experience" })), nearby: [] },
    });
  }
};

/* ----------------------------------------------------------------------------
 * GET /api/addons/catalog?roomPrice=
 * Meal plans with their price at this hotel, plus the travel options.
 * -------------------------------------------------------------------------- */

const getCatalog = (req, res) => {
  const roomPrice = Number(req.query.roomPrice) || 2500;
  const prices = mealPrices(roomPrice);

  return res.status(200).json({
    success: true,
    data: {
      mealPrices: prices,
      mealLabels: MEAL_LABELS,
      mealPlans: MEAL_PLANS.map((plan) => ({
        ...plan,
        pricePerPersonPerNight: plan.meals.reduce((sum, m) => sum + prices[m], 0),
      })),
      transport: Object.entries(TRANSPORT_MODES).map(([id, mode]) => ({ id, ...mode })),
    },
  });
};

/* ----------------------------------------------------------------------------
 * POST /api/addons/quote
 * The full price for a trip, worked out on the server. The pages show this, and
 * the booking charges the same amounts.
 * -------------------------------------------------------------------------- */

const quote = async (req, res) => {
  try {
    const { roomId, rooms, nights, adults, children, meals, transport, activities } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ success: false, message: "Invalid room selected." });
    }

    const room = await Room.findOne({ _id: roomId, isActive: true }).select("pricePerNight").lean();

    if (!room) {
      return res.status(404).json({ success: false, message: "Selected room was not found." });
    }

    const result = priceBooking({
      roomPricePerNight: room.pricePerNight,
      rooms: Number(rooms) || 1,
      nights: Number(nights) || 1,
      adults,
      children,
      meals,
      transport,
      activities,
    });

    if (!result.ok) {
      return res.status(400).json({ success: false, message: result.message });
    }

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Quote Error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to calculate the price." });
  }
};

module.exports = { getRestaurants, getActivities, getCatalog, quote };
