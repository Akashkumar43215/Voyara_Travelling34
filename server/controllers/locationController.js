const {
  autocompleteLocation,
  searchPlaces,
  searchAccommodation,
} = require("../services/geoapifyService");

const { attachStayPhotos, resolvePhoto } = require("../services/stayPhotoService");
const { attachStockImages } = require("../services/stayImageService");
const { ensureDefaultRooms } = require("../services/roomService");
const { attachPlaceImages, distanceKm } = require("../services/placeImageService");
const { buildStayProfile } = require("../services/stayProfile");
const { extractFacilities } = require("../services/facilityExtractor");
const Review = require("../models/Review");
const Room = require("../models/Room");
const TouristPlace = require("../models/TouristPlace");

const Stay = require("../models/Stay");

// ==========================================
// LOCATION AUTOCOMPLETE
// ==========================================
const autocomplete = async (req, res) => {
  try {
    const { text, type, limit } = req.query;

    if (!text || text.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least 2 characters to search.",
      });
    }

    const data = await autocompleteLocation({
      text: text.trim(),
      type: type || "city",
      limit: Number(limit) || 8,
    });

    return res.status(200).json({
      success: true,
      count: data.results?.length || 0,
      data: data.results || [],
    });
  } catch (error) {
    console.error(
      "Geoapify Autocomplete Error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to search locations.",
    });
  }
};

// ==========================================
// REAL TOURIST PLACES
// ==========================================
// Finished place searches are kept for an hour so repeat searches are instant
const placesCache = new Map();
const PLACES_CACHE_TTL_MS = 60 * 60 * 1000;

const places = async (req, res) => {
  try {
    const {
      lat,
      lon,
      radius,
      limit,
      categories,
    } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required.",
      });
    }

    const latitude = Number(lat);
    const longitude = Number(lon);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Latitude and longitude must be valid numbers.",
      });
    }

    // One small query per kind of place keeps the mix varied
    // (a single combined query is swamped by whatever is closest).
    const cacheKey = [
      latitude.toFixed(2),
      longitude.toFixed(2),
      radius || "",
      limit || "",
      categories || "",
    ].join("|");

    const cached = placesCache.get(cacheKey);

    if (cached && Date.now() - cached.at < PLACES_CACHE_TTL_MS) {
      return res.status(200).json(cached.body);
    }

    const GROUPS = categories
      ? [{ categories, limit: 20 }]
      : [
          { categories: "tourism.attraction,tourism.sights", limit: 12 },
          { categories: "entertainment.museum", limit: 4 },
          { categories: "beach", limit: 4 },
          { categories: "natural", limit: 4 },
          { categories: "leisure.park", limit: 3 },
        ];

    const groupResults = await Promise.all(
      GROUPS.map(async (group) => {
        try {
          const data = await searchPlaces({
            lat: latitude,
            lon: longitude,
            radius: Number(radius) || 20000,
            limit: group.limit,
            categories: group.categories,
          });

          return data.features || [];
        } catch (groupError) {
          console.warn(`[Places] ${group.categories} failed: ${groupError.message}`);
          return [];
        }
      })
    );

    const features = [];
    const seenIds = new Set();

    for (const feature of groupResults.flat()) {
      const id = feature.properties?.place_id;

      if (id && seenIds.has(id)) continue;
      if (id) seenIds.add(id);

      features.push(feature);
    }

    const data = { features };

    const wanted = Number(limit) || 24;

    // Geoapify results (unnamed entries are useless on a card)
    const nearby = (data.features || [])
      .map((feature) => {
        const properties = feature.properties || {};

        return {
          placeId: properties.place_id || "",
          name: (properties.name || "").trim(),

          address:
            properties.formatted ||
            properties.address_line1 ||
            "",

          city: properties.city || "",
          state: properties.state || "",
          country: properties.country || "",

          latitude:
            properties.lat ??
            feature.geometry?.coordinates?.[1] ??
            null,

          longitude:
            properties.lon ??
            feature.geometry?.coordinates?.[0] ??
            null,

          categories:
            properties.categories || [],

          distance:
            properties.distance ?? null,
        };
      })
      .filter((place) => place.name);

    // Our curated landmarks within reach, with their own hand-picked photos
    const curatedDocs = await TouristPlace.find({
      source: /^Curated/,
    }).lean();

    const curated = curatedDocs
      .map((doc) => ({
        doc,
        km: distanceKm(latitude, longitude, doc.latitude, doc.longitude),
      }))
      .filter((entry) => entry.km <= 40)
      .sort((a, b) => a.km - b.km)
      .map(({ doc, km }) => ({
        placeId: `curated-${doc.slug}`,
        name: doc.name,
        address: doc.address || "",
        city: doc.city || "",
        state: doc.state || "",
        country: "India",
        latitude: doc.latitude,
        longitude: doc.longitude,
        categories: doc.categories || [],
        distance: Math.round(km * 1000),
        image: doc.image || "",
        imageSource: "curated",
        curated: true,
        slug: doc.slug,
        stateSlug: doc.stateSlug,
      }));

    // Drop nearby results that are the same place as a curated one
    const normalise = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
    const curatedNames = curated.map((c) => normalise(c.name));

    const extras = nearby.filter((place) => {
      const name = normalise(place.name);

      return !curatedNames.some(
        (c) => c.includes(name) || name.includes(c)
      );
    });

    const searchCity =
      curated[0]?.city?.split(",")[0] ||
      extras.find((p) => p.city)?.city ||
      "";

    const withImages = await attachPlaceImages(extras, { city: searchCity });

    // Places with their own Wikipedia photo are the notable ones: show them first
    const rank = (place) => (place.imageSource === "wikipedia" ? 0 : 1);

    const ranked = withImages
      .map((place, index) => ({ place, index }))
      .sort((a, b) => rank(a.place) - rank(b.place) || a.index - b.index)
      .map((entry) => entry.place);

    const results = [...curated, ...ranked].slice(0, wanted);

    const body = {
      success: true,
      count: results.length,
      data: results,
    };

    // Don't cache a thin result (e.g. Geoapify hiccup), so it gets another chance
    if (results.length > curated.length) {
      placesCache.set(cacheKey, { at: Date.now(), body });
    }

    return res.status(200).json(body);
  } catch (error) {
    console.error(
      "Geoapify Places Error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to search tourist places.",
    });
  }
};

// ==========================================
// REAL ACCOMMODATION SEARCH
// ==========================================
const stays = async (req, res) => {
  try {
    const {
      lat,
      lon,
      radius,
      limit,
    } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message:
          "Latitude and longitude are required.",
      });
    }

    const latitude = Number(lat);
    const longitude = Number(lon);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Latitude and longitude must be valid numbers.",
      });
    }

    const data = await searchAccommodation({
      lat: latitude,
      lon: longitude,
      radius: Number(radius) || 15000,
      limit: Number(limit) || 30,
    });

    // ==========================================
    // GET LIVE GEOAPIFY STAYS
    // ==========================================

    const geoapifyStays =
      (data.features || [])
        // a hotel with no name can't be shown or booked
        .filter((feature) => (feature.properties?.name || "").trim())
        .map(
        (feature) => {
          const properties =
            feature.properties || {};

          return {
            placeId:
              properties.place_id || "",

            name:
              properties.name ||
              "Unnamed Accommodation",

            address:
              properties.formatted ||
              properties.address_line1 ||
              "",

            city:
              properties.city || "",

            state:
              properties.state || "",

            country:
              properties.country || "",

            latitude:
              properties.lat ??
              feature.geometry?.coordinates?.[1] ??
              null,

            longitude:
              properties.lon ??
              feature.geometry?.coordinates?.[0] ??
              null,

            categories:
              properties.categories || [],

            distance:
              properties.distance ?? null,

            website:
              properties.website ||
              "",

            phone:
              properties.contact?.phone ||
              properties.phone ||
              "",

            // What the map data really records about this hotel
            facilities: extractFacilities(properties),
          };
        }
      );

    // ==========================================
    // MATCH SAVED STAYS WITH MONGODB
    // ==========================================

    const placeIds =
      geoapifyStays
        .map((stay) => stay.placeId)
        .filter(Boolean);

    const savedStays =
      placeIds.length > 0
        ? await Stay.find({
            geoapifyPlaceId: {
              $in: placeIds,
            },
            isActive: true,
          }).lean()
        : [];

    // ==========================================
    // CREATE QUICK LOOKUP MAP
    // ==========================================

    const savedStayMap = new Map(
      savedStays.map((stay) => [
        stay.geoapifyPlaceId,
        stay,
      ])
    );

    // ==========================================
    // MERGE GEOAPIFY + MONGODB
    // ==========================================

    const results =
      geoapifyStays.map((stay) => {
        const savedStay =
          savedStayMap.get(
            stay.placeId
          );

        return {
          ...stay,

          // MongoDB information
          mongoStayId:
            savedStay?._id || null,

          geoapifyPlaceId:
            savedStay?.geoapifyPlaceId ||
            stay.placeId,

          // Cloudinary image
          image:
            savedStay?.image || "",

          cloudinaryPublicId:
            savedStay?.cloudinaryPublicId ||
            "",

          // Database status
          isSaved:
            Boolean(savedStay),
        };
      });

    // Real photos of the property where one is found, stock photos for the rest
    const withPhotos = await attachStockImages(await attachStayPhotos(results));

    // Real traveler reviews, where there are any, replace the generated rating
    const stayIds = withPhotos.map((s) => s.placeId).filter(Boolean);

    const reviewStats = stayIds.length
      ? await Review.aggregate([
          { $match: { itemType: "stay", itemId: { $in: stayIds } } },
          { $group: { _id: "$itemId", average: { $avg: "$rating" }, count: { $sum: 1 } } },
        ])
      : [];

    const reviewsByStay = new Map(
      reviewStats.map((r) => [r._id, { average: Math.round(r.average * 10) / 10, count: r.count }])
    );

    // A saved stay's real Standard Room price beats the generated one
    const savedIds = withPhotos.map((s) => s.mongoStayId).filter(Boolean);

    const standardRooms = savedIds.length
      ? await Room.find({ stay: { $in: savedIds }, name: "Standard Room", isActive: true })
          .select("stay pricePerNight")
          .lean()
      : [];

    const roomPriceByStay = new Map(standardRooms.map((r) => [String(r.stay), r.pricePerNight]));

    const withImages = withPhotos.map((stay) => {
      const profile = buildStayProfile(stay, reviewsByStay.get(stay.placeId));
      const realPrice = roomPriceByStay.get(String(stay.mongoStayId));

      if (realPrice) {
        profile.price = realPrice;
        profile.taxesPerNight = Math.round(realPrice * 0.05);
        profile.originalPrice = Math.max(
          realPrice + 100,
          Math.round((realPrice / (1 - profile.discountPercent / 100)) / 100) * 100
        );
      }

      return { ...stay, ...profile };
    });

    return res.status(200).json({
      success: true,
      count: withImages.length,
      data: withImages,
    });
  } catch (error) {
    console.error(
      "Geoapify Accommodation Error:",
      error.response?.data ||
        error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to search accommodations.",
    });
  }
};

// ==========================================
// SAVE A REAL STAY TO MONGODB
// ==========================================
const saveStay = async (req, res) => {
  try {
    const {
      placeId,
      name,
      address,
      city,
      state,
      latitude,
      longitude,
      categories,
      website,
      phone,
    } = req.body;

    if (!placeId) {
      return res.status(400).json({
        success: false,
        message:
          "Geoapify placeId is required.",
      });
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message:
          "Stay name is required.",
      });
    }

    const existingStay =
      await Stay.findOne({
        geoapifyPlaceId: placeId,
      });

    if (existingStay) {
      await ensureDefaultRooms(existingStay);

      return res.status(200).json({
        success: true,
        message:
          "Stay already exists in MongoDB.",
        data: existingStay,
      });
    }

    const stay =
      await Stay.create({
        geoapifyPlaceId: placeId,

        name: name.trim(),

        address:
          address?.trim() || "",

        city:
          city?.trim() || "",

        state:
          state?.trim() || "",

        latitude:
          Number.isFinite(Number(latitude))
            ? Number(latitude)
            : null,

        longitude:
          Number.isFinite(Number(longitude))
            ? Number(longitude)
            : null,

        // Keep the specific type (accommodation.hotel, .guest_house...) so
        // room pricing matches the listing
        category:
          categories?.find((c) => String(c).startsWith("accommodation.")) ||
          categories?.[0] ||
          "accommodation",
      });

    await ensureDefaultRooms(stay);

    return res.status(201).json({
      success: true,
      message:
        "Stay saved successfully.",
      data: stay,
    });
  } catch (error) {
    console.error(
      "Save Stay Error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to save accommodation.",
    });
  }
};

// GET /api/location/stay-photo?ref=...&w=800  - sends the browser to Google's picture; the API key never leaves the server
const stayPhoto = async (req, res) => {
  const width = Math.min(1600, Math.max(200, Math.round(Number(req.query.w)) || 800));
  const url = await resolvePhoto(String(req.query.ref || ""), width);

  if (!url) return res.status(404).json({ success: false, message: "Photo not found." });

  res.set("Cache-Control", "public, max-age=86400");
  return res.redirect(302, url);
};

module.exports = {
  stayPhoto,
  autocomplete,
  places,
  stays,
  saveStay,
};