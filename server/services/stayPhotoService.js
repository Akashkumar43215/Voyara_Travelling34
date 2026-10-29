const dns = require("dns").promises;
const net = require("net");
const axios = require("axios");

const StayPhoto = require("../models/StayPhoto");
const { distanceKm } = require("./placeImageService");

/**
 * Real photos of each property. Free sources are tried first, in this order:
 *   1. the photo the map data links to the place (Wikimedia, via Geoapify place details)
 *   2. the main picture of the hotel's own website (its og:image)
 *   3. a Wikimedia Commons photo taken within 300 m whose file name mentions the hotel
 * and then Google Places, only when GOOGLE_PLACES_API_KEY is set.
 * A stay with no match keeps no image, and the website shows its "photo not available" tile.
 */

const GEOAPIFY_DETAILS_URL = "https://api.geoapify.com/v2/place-details";
const COMMONS_URL = "https://commons.wikimedia.org/w/api.php";
const SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const REF_PATTERN = /^places\/[\w-]+\/photos\/[\w-]+$/;
const MAX_LOOKUPS = 40; // per request; the rest are filled in on the next search
const CONCURRENCY = 6;
const MAX_PHOTOS = 5;
const MAX_DISTANCE_KM = 0.5;
const MAX_HTML_BYTES = 300 * 1024;
const FILLER = new Set(["the", "hotel", "and", "resort", "inn", "guest", "house", "stay", "stays"]);
const USER_AGENT = "VOYARA-MERN/1.0";

const googleKey = () => process.env.GOOGLE_PLACES_API_KEY || "";

const words = (text) =>
  String(text || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !FILLER.has(w));

/** Share of this stay's name words that also appear in `text` (0 to 1). */
const nameMatch = (stay, text) => {
  const mine = words(stay.name);
  const theirs = new Set(words(text));

  return mine.length ? mine.filter((w) => theirs.has(w)).length / mine.length : 0;
};

/** True when Google's place is this stay: within 500 m and at least half the name words match. */
const samePlace = (stay, place) => {
  const there = place.location;

  if (!there || distanceKm(stay.latitude, stay.longitude, there.latitude, there.longitude) > MAX_DISTANCE_KM) return false;

  return nameMatch(stay, place.displayName?.text) >= 0.5;
};

// ---------- free source 1: the photo linked from the map data ----------

const fromMapData = async (stay) => {
  if (!process.env.GEOAPIFY_API_KEY) return "";

  const response = await axios.get(GEOAPIFY_DETAILS_URL, {
    params: { id: stay.placeId, features: "details", apiKey: process.env.GEOAPIFY_API_KEY },
    timeout: 8000,
  });

  const details = (response.data?.features || []).find((f) => f?.properties?.feature_type === "details");
  const image = details?.properties?.wiki_and_media?.image || "";

  return /^https:\/\//i.test(image) ? image : "";
};

// ---------- free source 2: the hotel's own website ----------

const isPrivateAddress = (address) => {
  if (net.isIPv6(address)) {
    const a = address.toLowerCase();
    return a === "::1" || a === "::" || a.startsWith("fc") || a.startsWith("fd") || a.startsWith("fe8") || a.startsWith("::ffff:");
  }

  const [a, b] = address.split(".").map(Number);

  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
};

/** Only public http(s) addresses may be fetched, so a stay's website can never point the server at its own network. */
const isSafeUrl = async (value) => {
  let url;

  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (!/^https?:$/.test(url.protocol) || url.username || url.password) return false;

  try {
    const hosts = net.isIP(url.hostname) ? [{ address: url.hostname }] : await dns.lookup(url.hostname, { all: true });

    // shortcut: the address is checked here, not pinned for the request, so DNS rebinding is not covered; pin it if this ever fetches for untrusted users
    return hosts.length > 0 && hosts.every((h) => !isPrivateAddress(h.address));
  } catch {
    return false;
  }
};

const readHead = async (pageUrl) => {
  let current = pageUrl;

  for (let hop = 0; hop < 3; hop += 1) {
    if (!(await isSafeUrl(current))) return null;

    const response = await axios.get(current, {
      responseType: "stream",
      maxRedirects: 0,
      validateStatus: () => true,
      timeout: 5000,
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    });

    if (response.status >= 300 && response.status < 400 && response.headers.location) {
      response.data.destroy();
      current = new URL(response.headers.location, current).toString();
      continue;
    }

    if (response.status !== 200 || !/html/i.test(response.headers["content-type"] || "")) {
      response.data.destroy();
      return null;
    }

    return new Promise((resolve) => {
      let html = "";

      response.data.on("data", (chunk) => {
        html += chunk.toString("utf8");

        if (html.length > MAX_HTML_BYTES || /<\/head>/i.test(html)) {
          response.data.destroy();
          resolve({ html, url: current });
        }
      });
      response.data.on("end", () => resolve({ html, url: current }));
      response.data.on("error", () => resolve(null));
      response.data.on("close", () => resolve({ html, url: current }));
    });
  }

  return null;
};

const fromWebsite = async (stay) => {
  if (!stay.website) return "";

  const page = await readHead(stay.website);

  if (!page) return "";

  const tag = (page.html.match(/<meta\b[^>]*(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["'][^>]*>/i) || [])[0];
  const content = tag && (tag.match(/content=["']([^"']+)["']/i) || [])[1];

  if (!content) return "";

  try {
    const image = new URL(content.replace(/&amp;/g, "&"), page.url).toString();

    return /^https:\/\//i.test(image) ? image : "";
  } catch {
    return "";
  }
};

// ---------- free source 3: Wikimedia Commons, near the hotel and named after it ----------

const fromCommons = async (stay) => {
  const response = await axios.get(COMMONS_URL, {
    params: {
      action: "query",
      format: "json",
      generator: "geosearch",
      ggsnamespace: 6,
      ggsradius: 300,
      ggslimit: 20,
      ggscoord: `${stay.latitude}|${stay.longitude}`,
      prop: "imageinfo",
      iiprop: "url|mime",
      iiurlwidth: 1000,
      origin: "*",
    },
    timeout: 8000,
    headers: { "User-Agent": USER_AGENT },
  });

  const match = Object.values(response.data?.query?.pages || {}).find((page) => {
    const info = page.imageinfo?.[0];

    return /^image\/(jpeg|png|webp)$/.test(info?.mime || "") && nameMatch(stay, String(page.title).replace(/^File:/, "")) >= 0.5;
  });

  return match?.imageinfo?.[0]?.thumburl || "";
};

// ---------- paid fallback: Google Places ----------

const fromGoogle = async (stay) => {
  if (!googleKey()) return [];

  const response = await axios.post(
    SEARCH_URL,
    {
      textQuery: `${stay.name} ${stay.city || ""}`.trim(),
      locationBias: { circle: { center: { latitude: stay.latitude, longitude: stay.longitude }, radius: 500 } },
      maxResultCount: 3,
      regionCode: "IN",
    },
    {
      headers: { "X-Goog-Api-Key": googleKey(), "X-Goog-FieldMask": "places.displayName,places.location,places.photos.name" },
      timeout: 8000,
    },
  );

  const match = (response.data?.places || []).find((p) => p.photos?.length && samePlace(stay, p));

  return (match?.photos || []).map((p) => p.name).filter((n) => REF_PATTERN.test(n)).slice(0, MAX_PHOTOS);
};

/** Runs the sources in order; a source that fails is skipped. Returns { urls, photos } (direct links, Google references). */
const lookup = async (stay) => {
  let failed = false;
  const urls = [];

  for (const source of [fromMapData, fromWebsite, fromCommons]) {
    try {
      const url = await source(stay);

      if (url && !urls.includes(url)) urls.push(url);
    } catch (error) {
      failed = true;
      console.warn(`[Stay Photos] ${source.name} ${stay.name}: ${error.message}`);
    }
  }

  let photos = [];

  if (!urls.length) {
    try {
      photos = await fromGoogle(stay);
    } catch (error) {
      failed = true;
      console.warn(`[Stay Photos] google ${stay.name}: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  return { urls, photos, failed };
};

const inBatches = async (items, work) => {
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    await Promise.all(items.slice(i, i + CONCURRENCY).map(work));
  }
};

const googleLink = (ref, width) => `/api/location/stay-photo?ref=${encodeURIComponent(ref)}&w=${width}`;

/** Fills `image` (and `images`) for stays that have none. Never throws: a failure just leaves the stay as it was. */
const attachStayPhotos = async (stays) => {
  try {
    const missing = stays.filter((s) => !s.image && s.placeId && Number.isFinite(s.latitude) && Number.isFinite(s.longitude));
    const cached = await StayPhoto.find({ placeId: { $in: missing.map((s) => s.placeId) } }).lean();
    const byId = new Map(cached.map((c) => [c.placeId, c]));

    await inBatches(
      missing.filter((s) => !byId.has(s.placeId)).slice(0, MAX_LOOKUPS),
      async (stay) => {
        const { urls, photos, failed } = await lookup(stay);

        // a stay where a source errored is not cached as "no photo", so the next search tries it again
        if (failed && !urls.length && !photos.length) return;

        await StayPhoto.updateOne({ placeId: stay.placeId }, { $set: { urls, photos, checkedAt: new Date() } }, { upsert: true });
        byId.set(stay.placeId, { urls, photos });
      },
    );

    return stays.map((stay) => {
      const found = byId.get(stay.placeId);
      const images = [...(found?.urls || []), ...(found?.photos || []).map((p) => googleLink(p, 1200))];

      if (stay.image || !images.length) return stay;

      return {
        ...stay,
        image: found.urls?.[0] || googleLink(found.photos[0], 800),
        images,
        imageSource: found.urls?.length ? "web" : "google",
      };
    });
  } catch (error) {
    console.warn(`[Stay Photos] skipped: ${error.message}`);
    return stays;
  }
};

/** The picture address Google serves for a stored reference, or null (and the reference is forgotten) if it is gone. */
const resolvePhoto = async (ref, width) => {
  if (!googleKey() || !REF_PATTERN.test(ref) || !(await StayPhoto.exists({ photos: ref }))) return null;

  try {
    const response = await axios.get(`https://places.googleapis.com/v1/${ref}/media`, {
      headers: { "X-Goog-Api-Key": googleKey() },
      params: { maxWidthPx: width, skipHttpRedirect: true },
      timeout: 8000,
    });

    return response.data?.photoUri || null;
  } catch (error) {
    if (error.response?.status === 404) await StayPhoto.deleteMany({ photos: ref });
    return null;
  }
};

module.exports = { attachStayPhotos, resolvePhoto, samePlace, isSafeUrl, nameMatch, REF_PATTERN };
