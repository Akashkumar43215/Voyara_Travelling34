const mongoose = require("mongoose");
const TouristPlace = require("../models/TouristPlace");

const {
  searchPlacesByState,
} = require("../services/geoapifyService");

/**
 * Allowed tourist place categories
 */
const ALLOWED_CATEGORIES = [
  "tourism",
  "attraction",
  "heritage",
  "natural",
  "museum",
  "entertainment",
  "cultural attractions",
  "landmarks",
];

/**
 * Normalize text into a URL-safe slug.
 *
 * Examples:
 *
 * Arunachal Pradesh
 * -> arunachal-pradesh
 *
 * Guravayapalem
 * -> guravayapalem
 *
 * Jammu & Kashmir
 * -> jammu-and-kashmir
 */
const normalizeSlug = (value) => {
  if (!value) return "";

  return String(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

/**
 * Normalize state slug.
 */
const normalizeStateSlug = (value) => {
  return normalizeSlug(value);
};

/**
 * Convert state slug into readable state name.
 *
 * Example:
 * andhra-pradesh
 * ->
 * Andhra Pradesh
 */
const slugToStateName = (slug) => {
  if (!slug) return "";

  return String(slug)
    .split("-")
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
};

/**
 * Safely parse numeric limit.
 */
const getSafeLimit = (value, defaultValue = 30) => {
  const parsed = parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }

  return Math.min(Math.max(parsed, 1), 100);
};

/**
 * ==========================================================
 * GET TOURIST PLACES
 * ==========================================================
 *
 * GET /api/places?state=<state>
 *
 * Priority:
 *
 * 1. MongoDB curated places
 * 2. Geoapify fallback
 */
const getPlaces = async (req, res, next) => {
  try {
    const {
      state,
      category,
      search,
      limit = 30,
    } = req.query;

    // ======================================================
    // VALIDATE STATE
    // ======================================================

    if (!state || state.trim() === "") {
      return res.status(400).json({
        success: false,
        message:
          "Please provide a state name or slug. Example: /api/places?state=rajasthan",
        data: [],
        places: [],
      });
    }

    const requestedState = state.trim();

    const stateSlug =
      normalizeStateSlug(requestedState);

    // ======================================================
    // MONGODB FILTER
    // ======================================================

    const filter = {
      stateSlug,
    };

    // ======================================================
    // CATEGORY FILTER
    // ======================================================

    if (
      category &&
      category.trim() !== ""
    ) {
      const cat = category
        .trim()
        .toLowerCase();

      if (
        !ALLOWED_CATEGORIES.includes(cat)
      ) {
        return res.status(400).json({
          success: false,
          message: `Category "${category}" is not allowed. Allowed: ${ALLOWED_CATEGORIES.join(
            ", "
          )}`,
          data: [],
          places: [],
        });
      }

      filter.categories = cat;
    }

    // ======================================================
    // SEARCH FILTER
    // ======================================================

    if (
      search &&
      search.trim() !== ""
    ) {
      const searchRegex = new RegExp(
        search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );

      filter.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { city: searchRegex },
      ];
    }

    const safeLimit = getSafeLimit(limit);

    // ======================================================
    // STEP 1 — MONGODB
    // ======================================================

    let places = await TouristPlace.find(
      filter
    )
      .limit(safeLimit)
      .sort({ name: 1 })
      .lean();

    // ======================================================
    // STEP 2 — RETURN CURATED DATA
    // ======================================================

    if (places.length > 0) {
      return res.status(200).json({
        success: true,
        source: "MongoDB",
        state: requestedState,
        stateSlug,
        count: places.length,
        data: places,
        places,
      });
    }

    // ======================================================
    // STEP 3 — GEOAPIFY FALLBACK
    // ======================================================

    const stateName =
      slugToStateName(stateSlug);

    console.log(
      `[Places] No curated places found for "${requestedState}".`
    );

    console.log(
      `[Places] Searching Geoapify for "${stateName}".`
    );

    let geoapifyPlaces =
      await searchPlacesByState({
        stateName,
        limit: safeLimit,
      });

    if (!Array.isArray(geoapifyPlaces)) {
      geoapifyPlaces = [];
    }

    // ======================================================
    // NORMALIZE GEOAPIFY RESULTS
    // ======================================================

    geoapifyPlaces = geoapifyPlaces.map(
      (place) => {
        const generatedSlug =
          normalizeSlug(
            place.slug ||
              place.name ||
              place.placeId ||
              place.id
          );

        return {
          ...place,

          slug:
            place.slug ||
            generatedSlug,

          stateSlug:
            place.stateSlug ||
            stateSlug,

          state:
            place.state ||
            stateName,

          source:
            place.source ||
            "Geoapify",

          categories:
            Array.isArray(place.categories)
              ? place.categories
              : [],
        };
      }
    );

    // ======================================================
    // STEP 4 — CATEGORY FILTER
    // ======================================================

    if (
      category &&
      category.trim() !== ""
    ) {
      const requestedCategory =
        category.trim().toLowerCase();

      geoapifyPlaces =
        geoapifyPlaces.filter(
          (place) =>
            Array.isArray(place.categories) &&
            place.categories.some(
              (item) =>
                String(item)
                  .toLowerCase()
                  .includes(
                    requestedCategory
                  )
            )
        );
    }

    // ======================================================
    // STEP 5 — SEARCH FILTER
    // ======================================================

    if (
      search &&
      search.trim() !== ""
    ) {
      const searchText =
        search.trim().toLowerCase();

      geoapifyPlaces =
        geoapifyPlaces.filter(
          (place) =>
            place.name
              ?.toLowerCase()
              .includes(searchText) ||
            place.city
              ?.toLowerCase()
              .includes(searchText) ||
            place.description
              ?.toLowerCase()
              .includes(searchText)
        );
    }

    // ======================================================
    // STEP 6 — RETURN GEOAPIFY RESULTS
    // ======================================================

    return res.status(200).json({
      success: true,
      source: "Geoapify",
      state: stateName,
      stateSlug,
      count: geoapifyPlaces.length,
      data: geoapifyPlaces,
      places: geoapifyPlaces,
    });
  } catch (error) {
    console.error(
      "[Places Controller] Error:",
      error
    );

    next(error);
  }
};

/**
 * ==========================================================
 * GET SINGLE TOURIST PLACE
 * ==========================================================
 *
 * GET /api/places/:id
 *
 * Supported:
 *
 * /api/places/65abc...
 *
 * /api/places/taj-mahal
 *
 * /api/places/guravayapalem?state=andhra-pradesh
 *
 * Search priority:
 *
 * 1. MongoDB ObjectId
 * 2. MongoDB slug
 * 3. MongoDB name
 * 4. Geoapify fallback using state
 */
const getPlaceById = async (
  req,
  res,
  next
) => {
  try {
    const rawId = req.params.id;

    const id = decodeURIComponent(
      String(rawId || "")
    ).trim();

    const requestedState =
      typeof req.query.state === "string"
        ? req.query.state.trim()
        : "";

    console.log(
      `[PlaceDetails] Requested place: "${id}"`
    );

    console.log(
      `[PlaceDetails] Requested state: "${requestedState}"`
    );

    if (!id) {
      return res.status(400).json({
        success: false,
        message:
          "Tourist place identifier is required.",
      });
    }

    const requestedSlug =
      normalizeSlug(id);

    let place = null;

    // ======================================================
    // STEP 1 — SEARCH BY MONGODB OBJECT ID
    // ======================================================

    if (
      mongoose.Types.ObjectId.isValid(id)
    ) {
      place =
        await TouristPlace.findById(id).lean();

      if (place) {
        console.log(
          `[PlaceDetails] Found MongoDB place by ObjectId: ${id}`
        );
      }
    }

    // ======================================================
    // STEP 2 — SEARCH BY SLUG
    // ======================================================

    if (!place && requestedSlug) {
      place =
        await TouristPlace.findOne({
          slug: requestedSlug,
        }).lean();

      if (place) {
        console.log(
          `[PlaceDetails] Found MongoDB place by slug: ${requestedSlug}`
        );
      }
    }

    // ======================================================
    // STEP 3 — SEARCH BY NAME
    // ======================================================

    if (!place && requestedSlug) {
      const placesByName =
        await TouristPlace.find({}).lean();

      place =
        placesByName.find(
          (item) =>
            normalizeSlug(item.name) ===
            requestedSlug
        ) || null;

      if (place) {
        console.log(
          `[PlaceDetails] Found MongoDB place by name: ${place.name}`
        );
      }
    }

    // ======================================================
    // IF MONGODB FOUND PLACE
    // ======================================================

    if (place) {
      return res.status(200).json({
        success: true,
        source: "MongoDB",
        data: place,
      });
    }

    // ======================================================
    // STEP 4 — GEOAPIFY FALLBACK
    // ======================================================

    /*
      This is the important fix.

      A Geoapify place displayed on Places.jsx does not
      necessarily exist in TouristPlace MongoDB.

      Therefore a details request such as:

      /place/guravayapalem?state=andhra-pradesh

      must be resolved against Geoapify as well.
    */

    if (!requestedState) {
      return res.status(404).json({
        success: false,
        message: `Tourist place "${id}" not found in MongoDB and no state was provided for Geoapify fallback.`,
      });
    }

    const stateSlug =
      normalizeStateSlug(requestedState);

    const stateName =
      slugToStateName(stateSlug);

    console.log(
      `[PlaceDetails] MongoDB miss. Searching Geoapify for "${id}" in "${stateName}".`
    );

    let geoapifyPlaces =
      await searchPlacesByState({
        stateName,
        limit: 100,
      });

    if (!Array.isArray(geoapifyPlaces)) {
      geoapifyPlaces = [];
    }

    // ======================================================
    // NORMALIZE GEOAPIFY RESULTS
    // ======================================================

    const normalizedGeoPlaces =
      geoapifyPlaces.map((item) => ({
        ...item,

        slug:
          item.slug ||
          normalizeSlug(
            item.name ||
              item.placeId ||
              item.id
          ),

        stateSlug:
          item.stateSlug ||
          stateSlug,

        state:
          item.state ||
          stateName,

        source:
          item.source ||
          "Geoapify",
      }));

    // ======================================================
    // EXACT SLUG MATCH
    // ======================================================

    let matchedPlace =
      normalizedGeoPlaces.find(
        (item) =>
          normalizeSlug(item.slug) ===
          requestedSlug
      );

    // ======================================================
    // NAME MATCH
    // ======================================================

    if (!matchedPlace) {
      matchedPlace =
        normalizedGeoPlaces.find(
          (item) =>
            normalizeSlug(item.name) ===
            requestedSlug
        );
    }

    // ======================================================
    // PLACE ID MATCH
    // ======================================================

    if (!matchedPlace) {
      matchedPlace =
        normalizedGeoPlaces.find(
          (item) =>
            normalizeSlug(item.placeId) ===
            requestedSlug
        );
    }

    // ======================================================
    // PARTIAL NAME MATCH
    // ======================================================

    if (!matchedPlace) {
      matchedPlace =
        normalizedGeoPlaces.find((item) => {
          const itemName =
            normalizeSlug(item.name);

          return (
            itemName === requestedSlug ||
            itemName.includes(requestedSlug) ||
            requestedSlug.includes(itemName)
          );
        });
    }

    // ======================================================
    // GEOAPIFY PLACE FOUND
    // ======================================================

    if (matchedPlace) {
      console.log(
        `[PlaceDetails] Geoapify match found: ${matchedPlace.name}`
      );

      return res.status(200).json({
        success: true,
        source: "Geoapify",
        state: stateName,
        stateSlug,
        data: matchedPlace,
      });
    }

    // ======================================================
    // FINAL 404
    // ======================================================

    console.warn(
      `[PlaceDetails] Place "${id}" could not be found in MongoDB or Geoapify.`
    );

    return res.status(404).json({
      success: false,
      message: `Tourist place "${id}" not found.`,
    });
  } catch (error) {
    console.error(
      "[PlaceDetails] Error:",
      error
    );

    next(error);
  }
};

module.exports = {
  getPlaces,
  getPlaceById,
};