const axios = require("axios");

/**
 * Stock photos for stays that have no uploaded image yet.
 *
 * Geoapify does not return hotel photos, so without this every unsaved stay
 * renders the same placeholder icon. We fetch one pool of photos per stay
 * type from Pexels (one API call per type, cached) and pick from the pool
 * using a hash of the stay id, so each stay keeps the same photo between
 * searches while neighbouring stays get different ones.
 */

const PEXELS_API_URL = "https://api.pexels.com/v1/search";
const POOL_TTL_MS = 24 * 60 * 60 * 1000;

const POOL_QUERIES = {
  resort: "resort pool india",
  villa: "luxury villa india",
  homestay: "guest house room cozy",
  hostel: "hostel room",
  apartment: "apartment interior bedroom",
  hotel: "hotel room india",
};

const pools = new Map(); // type -> { photos: string[], fetchedAt: number }
const inFlight = new Map(); // type -> Promise

const detectStayType = (stay) => {
  const text = [
    stay.name,
    ...(Array.isArray(stay.categories) ? stay.categories : []),
  ]
    .join(" ")
    .toLowerCase();

  if (/resort/.test(text)) return "resort";
  if (/villa/.test(text)) return "villa";
  if (/homestay|guest_house|guesthouse|guest house|bed_and_breakfast/.test(text)) {
    return "homestay";
  }
  if (/hostel/.test(text)) return "hostel";
  if (/apartment|chalet/.test(text)) return "apartment";

  return "hotel";
};

const fetchPool = async (type) => {
  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey) return [];

  try {
    const response = await axios.get(PEXELS_API_URL, {
      headers: { Authorization: apiKey },
      params: {
        query: POOL_QUERIES[type] || POOL_QUERIES.hotel,
        per_page: 40,
        orientation: "landscape",
      },
      timeout: 8000,
    });

    return (response.data?.photos || [])
      .map((photo) => photo.src?.large || photo.src?.medium || "")
      .filter(Boolean);
  } catch (error) {
    console.warn(`[Stay Images] Pexels pool "${type}" failed: ${error.message}`);
    return [];
  }
};

const getPool = async (type) => {
  const cached = pools.get(type);

  if (cached && Date.now() - cached.fetchedAt < POOL_TTL_MS) {
    return cached.photos;
  }

  if (!inFlight.has(type)) {
    inFlight.set(
      type,
      fetchPool(type)
        .then((photos) => {
          // Don't cache failures for a whole day; retry on the next search.
          if (photos.length) {
            pools.set(type, { photos, fetchedAt: Date.now() });
          }

          return photos;
        })
        .finally(() => inFlight.delete(type)),
    );
  }

  return inFlight.get(type);
};

const hashString = (value) => {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }

  return hash;
};

/**
 * Returns the stays with a stock `image` filled in wherever one is missing.
 * Stays that already have an image (e.g. Cloudinary uploads) are untouched.
 * Within one result set, photos are not repeated until the pool is used up.
 */
const attachStockImages = async (stays) => {
  const types = [
    ...new Set(stays.filter((s) => !s.image).map((s) => detectStayType(s))),
  ];

  const loaded = await Promise.all(types.map((type) => getPool(type)));
  const poolByType = new Map(types.map((type, i) => [type, loaded[i]]));

  const used = new Map(); // type -> Set of indexes already handed out

  return stays.map((stay) => {
    if (stay.image) return stay;

    const type = detectStayType(stay);
    const pool = poolByType.get(type) || [];

    if (!pool.length) return stay;

    if (!used.has(type)) used.set(type, new Set());

    const taken = used.get(type);
    let index = hashString(String(stay.placeId || stay.name)) % pool.length;

    if (taken.size < pool.length) {
      while (taken.has(index)) index = (index + 1) % pool.length;
    }

    taken.add(index);

    return { ...stay, image: pool[index], imageIsStock: true };
  });
};

module.exports = { attachStockImages, detectStayType };
