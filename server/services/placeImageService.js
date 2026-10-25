const axios = require("axios");

/**
 * Photos for tourist places found through Geoapify (which returns none).
 *
 * 1. Wikipedia: if the place has its own article, use that article's lead photo.
 *    This is the accurate source for notable places (temples, forts, beaches).
 * 2. Themed stock photo (Pexels) for the rest, chosen by what the place is
 *    (beach, museum, statue, temple...) and its city, never repeating within
 *    one result set.
 *
 * Results are cached in memory, including misses, so repeat searches are fast.
 */

const WIKI_SUMMARY_URL = "https://en.wikipedia.org/api/rest_v1/page/summary/";
const PEXELS_URL = "https://api.pexels.com/v1/search";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const WIKI_HEADERS = { "User-Agent": "VoyaraTravelApp/1.0 (student project)" };

const wikiCache = new Map(); // title -> { url, at }
let wikiBlockedUntil = 0; // set when Wikipedia answers 429, so we back off instead of hammering it
const poolCache = new Map(); // query -> { photos, at }

const fresh = (entry) => entry && Date.now() - entry.at < CACHE_TTL_MS;

const toRadians = (deg) => (deg * Math.PI) / 180;

const distanceKm = (lat1, lon1, lat2, lon2) => {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Lead photo of the Wikipedia article called `title`, only if the article is
 * actually about somewhere near the place (guards against same-name places).
 */
const wikipediaImage = async (title, latitude, longitude) => {
  const key = `${title}|${Math.round(latitude * 10)}|${Math.round(longitude * 10)}`;
  const cached = wikiCache.get(key);

  if (fresh(cached)) return cached.url;

  // Backing off after a rate-limit response
  if (Date.now() < wikiBlockedUntil) return "";

  let url = "";

  try {
    const response = await axios.get(
      WIKI_SUMMARY_URL + encodeURIComponent(title.replace(/ /g, "_")),
      { headers: WIKI_HEADERS, timeout: 6000 },
    );

    const data = response.data || {};
    const thumb = data.thumbnail?.source;
    const coords = data.coordinates;

    const isNearby =
      coords &&
      Number.isFinite(latitude) &&
      distanceKm(latitude, longitude, coords.lat, coords.lon) <= 40;

    if (data.type === "standard" && thumb && isNearby) {
      url = thumb.replace(/\/\d+px-/, "/640px-");
    }
  } catch (error) {
    if (error.response?.status === 429) {
      // Rate limited: pause lookups for a minute and do NOT cache this as "no photo"
      wikiBlockedUntil = Date.now() + 60 * 1000;
      return "";
    }

    // 404 means there is no such article
  }

  wikiCache.set(key, { url, at: Date.now() });

  return url;
};

const THEMES = [
  { test: /market|bazaar|bazar|mall|shopping/, query: "indian street market bazaar", noCity: true },
  { test: /gate|dwar|darwaza|pol|archway/, query: "ancient gate india fort", noCity: true },
  { test: /tomb|mausoleum|samadhi|kabr|dargah/, query: "mughal tomb india", noCity: true },
  { test: /beach|coast|sea/, query: "beach india" },
  { test: /museum|gallery/, query: "museum india heritage" },
  { test: /statue|monument|memorial|artwork|sculpture/, query: "monument statue india" },
  { test: /castle|fort|palace/, query: "fort palace india" },
  { test: /temple|worship|hindu|shrine|mandir/, query: "temple india" },
  { test: /mosque|masjid|dargah/, query: "mosque india" },
  { test: /church|cathedral/, query: "church india" },
  { test: /park|garden|zoo/, query: "garden park india" },
  { test: /lake|river|waterfall|natural|nature|wildlife/, query: "lake nature india" },
];

const themeInfo = (query) => THEMES.find((t) => t.query === query);

const themeFor = (place) => {
  const text = [place.name, ...(place.categories || [])].join(" ").toLowerCase();
  const theme = THEMES.find((t) => t.test.test(text));

  return theme ? theme.query : "india tourism landmark";
};

const fetchPool = async (query) => {
  const cached = poolCache.get(query);

  if (fresh(cached)) return cached.photos;

  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey) return [];

  try {
    const response = await axios.get(PEXELS_URL, {
      headers: { Authorization: apiKey },
      params: { query, per_page: 30, orientation: "landscape" },
      timeout: 8000,
    });

    const photos = (response.data?.photos || [])
      .map((p) => p.src?.large || p.src?.medium || "")
      .filter(Boolean);

    if (photos.length) poolCache.set(query, { photos, at: Date.now() });

    return photos;
  } catch (error) {
    console.warn(`[Place Images] Pexels "${query}" failed: ${error.message}`);
    return [];
  }
};

const hashString = (value) => {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }

  return hash;
};

const runInBatches = async (items, size, worker) => {
  const results = [];

  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    results.push(...(await Promise.all(batch.map(worker))));
  }

  return results;
};

/**
 * Returns the places with an `image` for every entry that lacked one, and
 * `imageSource` set to "wikipedia" or "stock" so the UI can tell them apart.
 */
const WIKI_BUDGET_MS = 3500;

const wikiTitlesFor = (place, city) =>
  [place.name, city ? `${place.name}, ${city}` : ""].filter(Boolean);

const wikiKey = (title, place) =>
  `${title}|${Math.round(Number(place.latitude) * 10)}|${Math.round(Number(place.longitude) * 10)}`;

// Photo for this place if a Wikipedia lookup already finished (this search or an earlier one)
const peekWikipedia = (place, city) => {
  for (const title of wikiTitlesFor(place, city)) {
    const cached = wikiCache.get(wikiKey(title, place));

    if (fresh(cached) && cached.url) return cached.url;
  }

  return "";
};

const attachPlaceImages = async (places, { city = "" } = {}) => {
  // Step 1: the place's own Wikipedia photo. Lookups keep running after the
  // time budget, so slow ones still land in the cache for the next search.
  const lookups = runInBatches(places, 2, async (place) => {
    if (place.image) return;

    for (const title of wikiTitlesFor(place, city)) {
      const url = await wikipediaImage(title, Number(place.latitude), Number(place.longitude));

      if (url) return;
    }
  });

  await Promise.race([lookups, new Promise((resolve) => setTimeout(resolve, WIKI_BUDGET_MS))]);

  const withWiki = places.map((place) => {
    if (place.image) return place;

    const url = peekWikipedia(place, city);

    return url ? { ...place, image: url, imageSource: "wikipedia" } : place;
  });

  // Step 2: themed stock photos for the rest, without repeats
  const themes = [...new Set(withWiki.filter((p) => !p.image).map(themeFor))];
  const pools = await Promise.all(
    themes.map((theme) => fetchPool((themeInfo(theme)?.noCity ? theme : `${city} ${theme}`).trim()))
  );
  const poolByTheme = new Map(themes.map((theme, i) => [theme, pools[i]]));

  // Fall back to the theme without the city if the city query found nothing
  for (const theme of themes) {
    if (!poolByTheme.get(theme)?.length) {
      poolByTheme.set(theme, await fetchPool(theme));
    }
  }

  const used = new Map();

  return withWiki.map((place) => {
    if (place.image) return place;

    const theme = themeFor(place);
    const pool = poolByTheme.get(theme) || [];

    if (!pool.length) return place;

    if (!used.has(theme)) used.set(theme, new Set());

    const taken = used.get(theme);
    let index = hashString(String(place.placeId || place.name)) % pool.length;

    if (taken.size < pool.length) {
      while (taken.has(index)) index = (index + 1) % pool.length;
    }

    taken.add(index);

    return { ...place, image: pool[index], imageSource: "stock" };
  });
};

module.exports = { attachPlaceImages, distanceKm };
