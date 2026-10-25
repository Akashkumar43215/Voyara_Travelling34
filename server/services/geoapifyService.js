const axios = require("axios");

const GEOAPIFY_BASE_URL = "https://api.geoapify.com";
const WIKIMEDIA_API_URL = "https://commons.wikimedia.org/w/api.php";

/*
|--------------------------------------------------------------------------
| Caches
|--------------------------------------------------------------------------
*/

const placeImageCache = new Map();
const wikimediaImageCache = new Map();

/*
|--------------------------------------------------------------------------
| Geoapify API Key
|--------------------------------------------------------------------------
*/

const getApiKey = () => {
  const apiKey = process.env.GEOAPIFY_API_KEY;

  if (!apiKey) {
    throw new Error("GEOAPIFY_API_KEY is not configured.");
  }

  return apiKey;
};

/*
|--------------------------------------------------------------------------
| INDIA LOCATION AUTOCOMPLETE
|--------------------------------------------------------------------------
*/

const autocompleteLocation = async ({ text, type = "city", limit = 8 }) => {
  const response = await axios.get(
    `${GEOAPIFY_BASE_URL}/v1/geocode/autocomplete`,
    {
      params: {
        text,
        type,
        limit,
        format: "json",
        filter: "countrycode:in",
        apiKey: getApiKey(),
      },
    },
  );

  return response.data;
};

/*
|--------------------------------------------------------------------------
| TOURIST PLACE SEARCH BY COORDINATES
|--------------------------------------------------------------------------
*/

const searchPlaces = async ({
  lat,
  lon,
  categories = "tourism.attraction,tourism.sights,entertainment.museum",
  radius = 15000,
  limit = 30,
}) => {
  if (lat === undefined || lat === null || lon === undefined || lon === null) {
    throw new Error("Latitude and longitude are required for place search.");
  }

  const response = await axios.get(`${GEOAPIFY_BASE_URL}/v2/places`, {
    params: {
      categories,
      filter: `circle:${lon},${lat},${radius}`,
      bias: `proximity:${lon},${lat}`,
      limit,
      lang: "en",
      apiKey: getApiKey(),
    },
  });

  return response.data;
};

/*
|--------------------------------------------------------------------------
| RESOLVE STATE
|--------------------------------------------------------------------------
*/

const resolveState = async (stateName) => {
  if (!stateName || !stateName.trim()) {
    throw new Error("State name is required.");
  }

  const response = await axios.get(`${GEOAPIFY_BASE_URL}/v1/geocode/search`, {
    params: {
      text: `${stateName.trim()}, India`,
      type: "state",
      limit: 5,
      filter: "countrycode:in",
      apiKey: getApiKey(),
    },
  });

  const features = response.data?.features || [];

  if (features.length === 0) {
    throw new Error(`Could not find Indian state/UT: ${stateName}`);
  }

  const normalizedInput = stateName
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  const exactMatch = features.find((feature) => {
    const properties = feature?.properties || {};

    const candidate =
      properties.name || properties.state || properties.state_district || "";

    const normalizedCandidate = String(candidate)
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

    return normalizedCandidate === normalizedInput;
  });

  return exactMatch || features[0];
};

/*
|--------------------------------------------------------------------------
| GEOAPIFY PLACE DETAILS IMAGE
|--------------------------------------------------------------------------
*/

const getGeoapifyPlaceImage = async (placeId) => {
  if (!placeId) {
    return "";
  }

  if (placeImageCache.has(placeId)) {
    return placeImageCache.get(placeId);
  }

  try {
    const response = await axios.get(`${GEOAPIFY_BASE_URL}/v2/place-details`, {
      params: {
        id: placeId,
        features: "details",
        lang: "en",
        apiKey: getApiKey(),
      },
      timeout: 10000,
    });

    const features = response.data?.features || [];

    const detailsFeature = features.find(
      (feature) => feature?.properties?.feature_type === "details",
    );

    const image = detailsFeature?.properties?.wiki_and_media?.image || "";

    placeImageCache.set(placeId, image);

    return image;
  } catch (error) {
    console.warn(`[Geoapify Image] ${placeId}: ${error.message}`);

    placeImageCache.set(placeId, "");

    return "";
  }
};

/*
|--------------------------------------------------------------------------
| WIKIMEDIA COMMONS
| COORDINATE-BASED IMAGE SEARCH
|--------------------------------------------------------------------------
|
| This is the important fix.
|
| Instead of:
|
| "WWII Cemetery Arunachal Pradesh"
|
| we search Wikimedia Commons around the actual
| latitude / longitude of the place.
|
| This makes the image geographically relevant.
|--------------------------------------------------------------------------
*/

const searchWikimediaNearbyImage = async ({
  latitude,
  longitude,
  placeName,
}) => {
  if (
    latitude === null ||
    latitude === undefined ||
    longitude === null ||
    longitude === undefined
  ) {
    return "";
  }

  const cacheKey = `geo:${placeName}:${latitude}:${longitude}`;

  if (wikimediaImageCache.has(cacheKey)) {
    return wikimediaImageCache.get(cacheKey);
  }

  try {
    const response = await axios.get(WIKIMEDIA_API_URL, {
      params: {
        action: "query",

        format: "json",

        generator: "geosearch",

        ggsprimary: "all",

        ggsnamespace: 6,

        ggsradius: 10000,

        ggslimit: 10,

        ggscoord: `${latitude}|${longitude}`,

        prop: "imageinfo",

        iiprop: "url",

        iiurlwidth: 1200,

        origin: "*",
      },

      timeout: 10000,

      headers: {
        "User-Agent": "VOYARA-MERN/1.0",
      },
    });

    const pages = response.data?.query?.pages || {};

    const pageList = Object.values(pages);

    /*
     * Choose the first usable image.
     *
     * Wikimedia geosearch orders results
     * geographically, so nearby images are
     * preferred.
     */

    for (const page of pageList) {
      const imageInfo = page?.imageinfo?.[0];

      if (!imageInfo) {
        continue;
      }

      const imageUrl = imageInfo.thumburl || imageInfo.url || "";

      if (imageUrl && /^https?:\/\//i.test(imageUrl)) {
        console.log(`[Wikimedia Geo] ${placeName} → ${imageUrl}`);

        wikimediaImageCache.set(cacheKey, imageUrl);

        return imageUrl;
      }
    }
  } catch (error) {
    console.warn(`[Wikimedia Geo] ${placeName}: ${error.message}`);
  }

  wikimediaImageCache.set(cacheKey, "");

  return "";
};

/*
|--------------------------------------------------------------------------
| WIKIMEDIA TEXT SEARCH
|--------------------------------------------------------------------------
|
| Used only when coordinate-based search doesn't
| find an image.
|--------------------------------------------------------------------------
*/

const searchWikimediaTextImage = async ({
  placeName,
  stateName,
  city = "",
}) => {
  if (!placeName) {
    return "";
  }

  const cacheKey = ["text", placeName, city, stateName]
    .filter(Boolean)
    .join("|")
    .toLowerCase();

  if (wikimediaImageCache.has(cacheKey)) {
    return wikimediaImageCache.get(cacheKey);
  }

  const queries = [
    `"${placeName}" "${stateName}"`,
    `"${placeName}" ${city} ${stateName}`,
    `"${placeName}" India`,
  ];

  for (const query of queries) {
    try {
      const response = await axios.get(WIKIMEDIA_API_URL, {
        params: {
          action: "query",

          format: "json",

          generator: "search",

          gsrsearch: query,

          gsrnamespace: 6,

          gsrlimit: 5,

          prop: "imageinfo",

          iiprop: "url",

          iiurlwidth: 1200,

          origin: "*",
        },

        timeout: 10000,

        headers: {
          "User-Agent": "VOYARA-MERN/1.0",
        },
      });

      const pages = response.data?.query?.pages || {};

      const pageList = Object.values(pages);

      /*
       * Only accept images whose Wikimedia
       * title has meaningful relevance.
       */

      const placeWords = placeName
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length >= 4);

      for (const page of pageList) {
        const title = String(page?.title || "").toLowerCase();

        const relevance = placeWords.filter((word) =>
          title.includes(word),
        ).length;

        /*
         * Reject completely unrelated images.
         */

        if (placeWords.length > 0 && relevance === 0) {
          continue;
        }

        const imageInfo = page?.imageinfo?.[0];

        if (!imageInfo) {
          continue;
        }

        const imageUrl = imageInfo.thumburl || imageInfo.url || "";

        if (imageUrl && /^https?:\/\//i.test(imageUrl)) {
          console.log(`[Wikimedia Text] ${placeName} → ${imageUrl}`);

          wikimediaImageCache.set(cacheKey, imageUrl);

          return imageUrl;
        }
      }
    } catch (error) {
      console.warn(`[Wikimedia Text] ${placeName}: ${error.message}`);
    }
  }

  wikimediaImageCache.set(cacheKey, "");

  return "";
};

/*
|--------------------------------------------------------------------------
| BEST IMAGE RESOLVER
|--------------------------------------------------------------------------
*/

const getBestPlaceImage = async ({
  placeId,
  placeName,
  stateName,
  city,
  latitude,
  longitude,
}) => {
  /*
   * -------------------------------------------------------
   * 1. Geoapify official media
   * -------------------------------------------------------
   */

  if (placeId) {
    const geoapifyImage = await getGeoapifyPlaceImage(placeId);

    if (geoapifyImage) {
      return geoapifyImage;
    }
  }

  /*
   * -------------------------------------------------------
   * 2. Nearby Wikimedia image
   * -------------------------------------------------------
   */

  const nearbyImage = await searchWikimediaNearbyImage({
    latitude,
    longitude,
    placeName,
  });

  if (nearbyImage) {
    return nearbyImage;
  }

  /*
   * -------------------------------------------------------
   * 3. Relevant text Wikimedia image
   * -------------------------------------------------------
   */

  const textImage = await searchWikimediaTextImage({
    placeName,
    stateName,
    city,
  });

  if (textImage) {
    return textImage;
  }

  /*
   * -------------------------------------------------------
   * 4. No individual image
   * -------------------------------------------------------
   *
   * Places.jsx will use the state image.
   */

  return "";
};

/*
|--------------------------------------------------------------------------
| SEARCH TOURIST PLACES BY STATE
|--------------------------------------------------------------------------
*/

const searchPlacesByState = async ({
  stateName,
  limit = 30,
  enrichImages = true,
}) => {
  if (!stateName || !stateName.trim()) {
    throw new Error("State name is required.");
  }

  /*
   * -------------------------------------------------------
   * STEP 1 — Resolve state
   * -------------------------------------------------------
   */

  const stateFeature = await resolveState(stateName);

  const stateProperties = stateFeature?.properties || {};

  const statePlaceId = stateProperties.place_id;

  if (!statePlaceId) {
    throw new Error(`Geoapify did not return a place ID for ${stateName}.`);
  }

  /*
   * -------------------------------------------------------
   * STEP 2 — Tourist categories
   * -------------------------------------------------------
   */

  const categories = [
    "tourism.attraction",
    "tourism.sights",
    "tourism.information",
    "entertainment.museum",
    "heritage",
    "natural",
  ].join(",");

  /*
   * -------------------------------------------------------
   * STEP 3 — Geoapify state search
   * -------------------------------------------------------
   */

  const response = await axios.get(`${GEOAPIFY_BASE_URL}/v2/places`, {
    params: {
      categories,

      filter: `place:${statePlaceId}`,

      limit,

      lang: "en",

      apiKey: getApiKey(),
    },

    timeout: 15000,
  });

  const features = response.data?.features || [];

  /*
   * -------------------------------------------------------
   * STEP 4 — Invalid names
   * -------------------------------------------------------
   */

  const invalidNames = new Set([
    "tourist attraction",
    "tourist attractions",
    "tourism",
    "place",
    "places",
    "unknown",
    "unnamed",
  ]);

  const normalizeName = (value = "") =>
    String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const seen = new Set();

  let places = [];

  /*
   * -------------------------------------------------------
   * STEP 5 — Format Geoapify places
   * -------------------------------------------------------
   */

  for (const feature of features) {
    const properties = feature?.properties || {};

    const name =
      properties.name ||
      properties.address_line1 ||
      properties.address_line2 ||
      "";

    const normalizedName = normalizeName(name);

    if (!normalizedName || invalidNames.has(normalizedName)) {
      continue;
    }

    const uniqueKey =
      properties.place_id ||
      `${normalizedName}-${properties.lat || ""}-${properties.lon || ""}`;

    if (seen.has(uniqueKey)) {
      continue;
    }

    seen.add(uniqueKey);

    const city =
      properties.city ||
      properties.town ||
      properties.village ||
      properties.municipality ||
      properties.county ||
      "";

    const latitude =
      properties.lat ?? feature.geometry?.coordinates?.[1] ?? null;

    const longitude =
      properties.lon ?? feature.geometry?.coordinates?.[0] ?? null;

    const address =
      properties.formatted ||
      properties.address_line2 ||
      properties.address_line1 ||
      `${name}, ${stateName}`;

    places.push({
      id: properties.place_id || `${normalizedName}-${latitude}-${longitude}`,

      placeId: properties.place_id || "",

      name,

      slug: normalizedName.replace(/\s+/g, "-"),

      state: stateName.trim(),

      stateSlug: stateName
        .trim()
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),

      city,

      address,

      latitude,

      longitude,

      categories: Array.isArray(properties.categories)
        ? properties.categories
        : [],

      description:
        properties.formatted || `Tourist destination in ${stateName.trim()}.`,

      image: "",

      cloudinaryPublicId: "",

      imageAlt: name,

      source: "Geoapify",

      sourceUrl: "",

      timings: "9:00 AM – 5:30 PM",

      entryFee: "Free / Nominal",

      rating: 0,

      distance: properties.distance || null,
    });
  }

  /*
   * -------------------------------------------------------
   * STEP 6 — IMAGE ENRICHMENT
   * -------------------------------------------------------
   *
   * Five places at a time.
   * This avoids firing 30 external requests
   * simultaneously.
   * -------------------------------------------------------
   */
  if (enrichImages) {
    const batchSize = 5;

    for (let start = 0; start < places.length; start += batchSize) {
      const batch = places.slice(start, start + batchSize);

      const enriched = await Promise.all(
        batch.map(async (place) => {
          const image = await getBestPlaceImage({
            placeId: place.placeId,

            placeName: place.name,

            stateName: place.state,

            city: place.city,

            latitude: place.latitude,

            longitude: place.longitude,
          });

          return {
            ...place,
            image,
          };
        }),
      );

      places.splice(start, enriched.length, ...enriched);
    }
  }

  /*
   * -------------------------------------------------------
   * IMAGE STATISTICS
   * -------------------------------------------------------
   */

  const imagesFound = enrichImages
    ? places.filter((place) => Boolean(place.image)).length
    : 0;

  console.log(
    `[Places] ${places.length} Geoapify places prepared for ${stateName}.`,
  );

  if (enrichImages) {
    console.log(
      `[Places] Individual images found: ${imagesFound}/${places.length}`,
    );
  }

  /*
   * -------------------------------------------------------
   * RETURN
   * -------------------------------------------------------
   */

  return places.slice(0, limit);
};

/*
|--------------------------------------------------------------------------
| ACCOMMODATION SEARCH
|--------------------------------------------------------------------------
*/

const searchAccommodation = async ({
  lat,
  lon,
  radius = 15000,
  limit = 30,
}) => {
  if (
    lat === undefined ||
    lat === null ||
    lon === undefined ||
    lon === null
  ) {
    throw new Error(
      "Latitude and longitude are required for accommodation search.",
    );
  }

  const response = await axios.get(
    `${GEOAPIFY_BASE_URL}/v2/places`,
    {
      params: {
        categories: "accommodation",

        // Search only within the requested radius
        // and only within India.
        filter: `circle:${lon},${lat},${radius}|countrycode:in`,

        // Rank nearest accommodations first.
        bias: `proximity:${lon},${lat}`,

        limit,
        lang: "en",
        apiKey: getApiKey(),
      },

      timeout: 15000,
    },
  );

  return response.data;
};

/*
|--------------------------------------------------------------------------
| PLACE DETAILS
|--------------------------------------------------------------------------
*/

const getPlaceDetails = async (placeId) => {
  if (!placeId) {
    throw new Error("Place ID is required.");
  }

  const response = await axios.get(`${GEOAPIFY_BASE_URL}/v2/place-details`, {
    params: {
      id: placeId,
      apiKey: getApiKey(),
    },

    timeout: 15000,
  });

  return response.data;
};

/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  autocompleteLocation,
  searchPlaces,
  searchPlacesByState,
  searchAccommodation,
  getPlaceDetails,
  resolveState,
};
