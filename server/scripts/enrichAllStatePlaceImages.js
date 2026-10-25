/**
 * ============================================================
 * VOYARA — ALL INDIA TOURIST PLACE IMAGE ENRICHMENT
 * ============================================================
 *
 * PURPOSE
 * -------
 * Build a permanent tourist-place image database for:
 *
 *   28 States + 8 Union Territories = 36 destinations
 *
 * Pipeline:
 *
 *   MongoDB States
 *        ↓
 *   Geoapify tourist places
 *        ↓
 *   Geoapify image
 *        ↓
 *   Relevant Wikimedia image
 *        ↓
 *   State Cloudinary fallback
 *        ↓
 *   Download image
 *        ↓
 *   Cloudinary upload
 *        ↓
 *   MongoDB TouristPlace
 *
 * IMAGE PRIORITY
 * --------------
 *   1. Geoapify place image
 *   2. Relevant Wikimedia image
 *   3. State Cloudinary image fallback
 *
 * TEST MODE
 * ---------
 *
 * PowerShell:
 *
 *   $env:VOYARA_TEST_STATE="Rajasthan"
 *
 * Run:
 *
 *   node scripts/enrichAllStatePlaceImages.js
 *
 * ALL STATES / UTs:
 *
 *   Remove-Item Env:VOYARA_TEST_STATE
 *
 *   node scripts/enrichAllStatePlaceImages.js
 *
 * ============================================================
 */

require("dotenv").config();

const axios = require("axios");

const connectDB = require("../config/db");
const State = require("../models/State");
const TouristPlace = require("../models/TouristPlace");
const cloudinary = require("../config/cloudinary");

const {
  searchPlacesByState,
  getPlaceDetails,
} = require("../services/geoapifyService");

/* ============================================================
   CONFIGURATION
   ============================================================ */

const MAX_PLACES_PER_STATE = 30;

/*
 * Process only one place at a time.
 * This greatly reduces external API pressure.
 */
const PLACE_BATCH_SIZE = 1;

const REQUEST_TIMEOUT = 20000;

const CLOUDINARY_FOLDER = "voyara/tourist-places";

const WIKIMEDIA_API_URL =
  "https://commons.wikimedia.org/w/api.php";

/*
 * Multi-word place:
 *   require at least 2 meaningful matching words.
 *
 * Single-word place:
 *   require 1 meaningful matching word.
 */
const MIN_WIKIMEDIA_RELEVANCE = 2;

/*
 * Delay between states.
 */
const STATE_DELAY_MS = 2000;

/*
 * Delay before Cloudinary operations.
 */
const IMAGE_DELAY_MS = 1500;

/*
 * Delay between Wikimedia queries.
 */
const WIKIMEDIA_QUERY_DELAY_MS = 1500;

/*
 * Wikimedia download timeout.
 */
const IMAGE_DOWNLOAD_TIMEOUT = 30000;

/* ============================================================
   HELPERS
   ============================================================ */

/**
 * Sleep helper.
 */
const sleep = (ms) =>
  new Promise((resolve) =>
    setTimeout(resolve, ms)
  );

/**
 * Convert text into a safe slug.
 */
const slugify = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * Normalize text for comparisons.
 */
const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Extract useful words from a place name.
 */
const getMeaningfulWords = (
  placeName = ""
) => {
  const stopWords = new Set([
    /* Common language words */
    "the",
    "and",
    "of",
    "in",
    "on",
    "at",
    "to",
    "for",
    "a",
    "an",
    "is",
    "near",
    "india",

    /* Generic tourist/location words */
    "fort",
    "temple",
    "museum",
    "park",
    "lake",
    "beach",
    "bridge",
    "palace",
    "garden",
    "waterfall",
    "falls",
    "hill",
    "hills",
    "mount",
    "mountain",
    "river",
    "dam",
    "island",
    "islands",
    "sanctuary",
    "national",
    "heritage",
    "monument",
    "memorial",
    "tower",
    "cave",
    "caves",
    "church",
    "mosque",
    "cathedral",
    "basilica",
    "resort",
    "viewpoint",
    "station",
    "market",
    "marketplace",
    "zoo",
  ]);

  return normalizeText(placeName)
    .split(" ")
    .filter(
      (word) =>
        word.length >= 4 &&
        !stopWords.has(word)
    );
};

/**
 * Check whether a URL looks like a valid HTTP image URL.
 */
const isValidHttpUrl = (value) => {
  if (
    !value ||
    typeof value !== "string"
  ) {
    return false;
  }

  return /^https?:\/\//i.test(
    value.trim()
  );
};

/**
 * Check if URL already belongs to Cloudinary.
 */
const isCloudinaryUrl = (url = "") =>
  url.includes("res.cloudinary.com") ||
  url.includes("cloudinary.com");

/**
 * Build a stable Cloudinary public ID.
 */
const buildCloudinaryPublicId = ({
  stateSlug,
  placeSlug,
}) =>
  `${CLOUDINARY_FOLDER}/${stateSlug}/${placeSlug}`;

/**
 * Extract a string metadata value.
 */
const extractMetadataValue = (
  metadata,
  key
) => {
  const value =
    metadata?.[key]?.value;

  if (
    typeof value === "string" &&
    value.trim()
  ) {
    return value.trim();
  }

  return "";
};

/* ============================================================
   GEOAPIFY IMAGE
   ============================================================ */

/**
 * Extract an image URL from a Geoapify
 * place-details response.
 */
const extractGeoapifyImage = (
  data
) => {
  const properties =
    data?.features?.[0]
      ?.properties ||
    data?.properties ||
    data ||
    {};

  const candidates = [
    properties?.wiki_and_media?.image,
    properties?.wiki_and_media
      ?.image_url,
    properties?.image,
    properties?.image_url,
  ];

  for (const candidate of candidates) {
    if (isValidHttpUrl(candidate)) {
      return candidate;
    }
  }

  return "";
};

/* ============================================================
   WIKIMEDIA RELEVANCE
   ============================================================ */

/**
 * Calculate relevance between a place name
 * and Wikimedia title.
 */
const calculateWikimediaRelevance = (
  placeName,
  title
) => {
  const words =
    getMeaningfulWords(placeName);

  if (!words.length) {
    return 0;
  }

  const normalizedTitle =
    normalizeText(title);

  const titleWords =
    new Set(
      normalizedTitle.split(" ")
    );

  let score = 0;

  for (const word of words) {
    if (titleWords.has(word)) {
      score += 1;
    }
  }

  const requiredScore =
    words.length === 1
      ? 1
      : MIN_WIKIMEDIA_RELEVANCE;

  if (score < requiredScore) {
    return 0;
  }

  return score;
};

/* ============================================================
   WIKIMEDIA LOCATION VALIDATION
   ============================================================ */

/**
 * Known city/location names.
 *
 * This is deliberately conservative.
 *
 * The important purpose is to reject obvious conflicts such as:
 *
 *   Requested:
 *      Rajasthan
 *
 *   Candidate:
 *      Ashok Stambh Vaishali.jpg
 *
 * We don't want the image merely because
 * "Ashok Stambh" matches.
 */
const KNOWN_LOCATION_WORDS =
  new Set([
    "vaishali",
    "patna",
    "gaya",
    "muzaffarpur",
    "darbhanga",
    "bhagalpur",

    "delhi",

    "mumbai",
    "pune",
    "nagpur",
    "nashik",

    "kolkata",
    "siliguri",

    "chennai",
    "madurai",
    "coimbatore",

    "hyderabad",
    "warangal",

    "bengaluru",
    "bangalore",
    "mysore",
    "mysuru",

    "kochi",
    "ernakulam",

    "lucknow",
    "agra",
    "varanasi",
    "kanpur",

    "jaipur",
    "jodhpur",
    "udaipur",
    "bikaner",
    "ajmer",
    "jaisalmer",
    "kota",
    "pushkar",

    "bhubaneswar",
    "puri",
    "cuttack",
    "konark",

    "amritsar",

    "srinagar",

    "shimla",
    "manali",

    "goa",

    "indore",
    "bhopal",

    "ahmedabad",
    "surat",

    "dehradun",
    "haridwar",

    "ranchi",

    "guwahati",

    "panaji",
  ]);

/**
 * Check whether title contains a conflicting
 * known location.
 */
const findConflictingLocation = ({
  normalizedTitle,
  cityWords,
  stateWords,
}) => {
  const titleWords =
    new Set(
      normalizedTitle.split(" ")
    );

  for (const location of KNOWN_LOCATION_WORDS) {
    if (!titleWords.has(location)) {
      continue;
    }

    /*
     * If this location is actually the current city/state,
     * it is not a conflict.
     */
    if (
      cityWords.includes(location) ||
      stateWords.includes(location)
    ) {
      continue;
    }

    return location;
  }

  return "";
};

/* ============================================================
   WIKIMEDIA IMAGE SEARCH
   ============================================================ */

/**
 * Search Wikimedia Commons by place name.
 *
 * IMPORTANT:
 * We do NOT use arbitrary nearby images.
 *
 * The candidate must:
 *   1. Match the actual place name.
 *   2. Not contain an obvious conflicting location.
 *   3. Prefer city/state context.
 */
const findRelevantWikimediaImage =
  async ({
    placeName,
    city,
    stateName,
  }) => {
    const queries = [
      `"${placeName}" "${city || ""}" "${stateName}"`,
      `"${placeName}" "${stateName}"`,
      `"${placeName}" India`,
    ];

    const placeWords =
      getMeaningfulWords(
        placeName
      );

    const cityWords =
      getMeaningfulWords(
        city || ""
      );

    const stateWords =
      getMeaningfulWords(
        stateName
      );

    if (!placeWords.length) {
      return null;
    }

    for (const query of queries) {
      try {
        const response =
          await axios.get(
            WIKIMEDIA_API_URL,
            {
              params: {
                action: "query",
                format: "json",
                generator: "search",
                gsrsearch: query,
                gsrnamespace: 6,
                gsrlimit: 8,
                prop: "imageinfo",
                iiprop:
                  "url|extmetadata",
                iiurlwidth: 960,
                origin: "*",
              },

              timeout:
                REQUEST_TIMEOUT,

              headers: {
                "User-Agent":
                  "VOYARA-MERN/1.0 (travel portal image importer)",
              },
            }
          );

        const pages =
          response.data?.query
            ?.pages || {};

        const pageList =
          Object.values(pages);

        let bestCandidate =
          null;

        for (const page of pageList) {
          const title =
            page?.title || "";

          const normalizedTitle =
            normalizeText(title);

          /*
           * ----------------------------------------------------
           * PLACE MATCH
           * ----------------------------------------------------
           */

          const relevance =
            calculateWikimediaRelevance(
              placeName,
              title
            );

          if (!relevance) {
            continue;
          }

          const titleWords =
            new Set(
              normalizedTitle.split(" ")
            );

          const placeMatches =
            placeWords.filter(
              (word) =>
                titleWords.has(word)
            ).length;

          /*
           * ----------------------------------------------------
           * LOCATION CONTEXT
           * ----------------------------------------------------
           */

          const hasCityMatch =
            cityWords.length > 0 &&
            cityWords.some(
              (word) =>
                titleWords.has(word)
            );

          const hasStateMatch =
            stateWords.length > 0 &&
            stateWords.some(
              (word) =>
                titleWords.has(word)
            );

          /*
           * Reject obvious conflicting locations.
           */

          const conflictingLocation =
            findConflictingLocation({
              normalizedTitle,
              cityWords,
              stateWords,
            });

          if (conflictingLocation) {
            console.log(
              `      [Wikimedia] ✗ Location conflict: ${title}`
            );

            continue;
          }

          /*
           * ----------------------------------------------------
           * IMAGE VALIDATION
           * ----------------------------------------------------
           */

          const imageInfo =
            page?.imageinfo?.[0];

          if (!imageInfo) {
            continue;
          }

          const imageUrl =
            imageInfo.thumburl ||
            imageInfo.url ||
            "";

          if (
            !isValidHttpUrl(
              imageUrl
            )
          ) {
            continue;
          }

          /*
           * ----------------------------------------------------
           * EXACT PLACE MATCH
           * ----------------------------------------------------
           */

          const normalizedPlace =
            normalizeText(
              placeName
            );

          const exactPlaceMatch =
            normalizedTitle.includes(
              normalizedPlace
            );

          /*
           * ----------------------------------------------------
           * SCORE
           * ----------------------------------------------------
           */

          let score = relevance;

          if (hasCityMatch) {
            score += 3;
          }

          if (hasStateMatch) {
            score += 2;
          }

          if (exactPlaceMatch) {
            score += 3;
          }

          /*
           * If city is known, weak matches with no location
           * context are accepted only when the COMPLETE place
           * name appears in the Wikimedia title.
           */

          if (
            cityWords.length > 0 &&
            !hasCityMatch &&
            !hasStateMatch &&
            !exactPlaceMatch
          ) {
            continue;
          }

          const candidate = {
            imageUrl,
            title,
            relevance: score,
            placeMatches,
            hasCityMatch,
            hasStateMatch,
            exactPlaceMatch,
            metadata:
              imageInfo.extmetadata ||
              {},
          };

          /*
           * ----------------------------------------------------
           * BEST CANDIDATE
           * ----------------------------------------------------
           */

          if (!bestCandidate) {
            bestCandidate =
              candidate;
            continue;
          }

          if (
            candidate.relevance >
            bestCandidate.relevance
          ) {
            bestCandidate =
              candidate;
            continue;
          }

          if (
            candidate.relevance ===
              bestCandidate.relevance &&
            candidate.exactPlaceMatch &&
            !bestCandidate.exactPlaceMatch
          ) {
            bestCandidate =
              candidate;
          }
        }

        if (bestCandidate) {
          console.log(
            `      [Wikimedia] ✓ ${placeName}`
          );

          console.log(
            `      [Wikimedia]   ${bestCandidate.title}`
          );

          return bestCandidate;
        }
      } catch (error) {
        const status =
          error?.response
            ?.status;

        if (status === 429) {
          const retryAfterHeader =
            error?.response
              ?.headers?.[
              "retry-after"
            ];

          const retryAfter =
            Number(
              retryAfterHeader
            ) || 15;

          console.warn(
            `      [Wikimedia] ⚠️ Rate limited for "${placeName}".`
          );

          console.warn(
            `      [Wikimedia] Waiting ${retryAfter}s...`
          );

          await sleep(
            Math.min(
              Math.max(
                retryAfter,
                10
              ),
              60
            ) * 1000
          );

          /*
           * Retry the same query after the
           * server-requested delay.
           */
          continue;
        }

        console.warn(
          `      [Wikimedia] Search failed for "${placeName}": ${error.message}`
        );
      }

      await sleep(
        WIKIMEDIA_QUERY_DELAY_MS
      );
    }

    return null;
  };

/* ============================================================
   GEOAPIFY IMAGE LOOKUP
   ============================================================ */

/**
 * Get image from Geoapify place details.
 */
const findGeoapifyImage =
  async ({
    placeId,
    placeName,
  }) => {
    if (!placeId) {
      return "";
    }

    try {
      const details =
        await getPlaceDetails(
          placeId
        );

      const image =
        extractGeoapifyImage(
          details
        );

      if (image) {
        console.log(
          `      [Geoapify] ✓ ${placeName}`
        );

        return image;
      }
    } catch (error) {
      console.warn(
        `      [Geoapify] ${placeName}: ${error.message}`
      );
    }

    return "";
  };

/* ============================================================
   IMAGE RESOLUTION
   ============================================================ */

/**
 * Resolve the best available image.
 *
 * Priority:
 *
 *   1. Geoapify
 *   2. Relevant Wikimedia
 *   3. State Cloudinary fallback
 */
const resolvePlaceImage =
  async ({
    place,
    state,
  }) => {
    /*
     * ----------------------------------------------------------
     * 1. Geoapify image
     * ----------------------------------------------------------
     */

    if (place.placeId) {
      const geoImage =
        await findGeoapifyImage({
          placeId:
            place.placeId,

          placeName:
            place.name,
        });

      if (geoImage) {
        return {
          url: geoImage,
          source: "Geoapify",
          sourceUrl: geoImage,
          metadata: null,
        };
      }
    }

    /*
     * ----------------------------------------------------------
     * 2. Relevant Wikimedia image
     * ----------------------------------------------------------
     */

    const wikiImage =
      await findRelevantWikimediaImage({
        placeName:
          place.name,

        city:
          place.city,

        stateName:
          state.name,
      });

    if (wikiImage?.imageUrl) {
      return {
        url:
          wikiImage.imageUrl,

        source:
          "Wikimedia Commons",

        sourceUrl:
          wikiImage.imageUrl,

        metadata:
          wikiImage.metadata,

        title:
          wikiImage.title,
      };
    }

    /*
     * ----------------------------------------------------------
     * 3. State Cloudinary fallback
     * ----------------------------------------------------------
     */

    if (
      isValidHttpUrl(
        state.image
      )
    ) {
      console.log(
        `      [Fallback] Using state image for ${place.name}`
      );

      return {
        url:
          state.image,

        source:
          "State Cloudinary fallback",

        sourceUrl:
          state.image,

        metadata: null,
      };
    }

    return {
      url: "",
      source: "None",
      sourceUrl: "",
      metadata: null,
    };
  };

/* ============================================================
   IMAGE DOWNLOAD
   ============================================================ */

/**
 * Download an image ourselves before sending it
 * to Cloudinary.
 *
 * This is important because:
 *
 *   Cloudinary → Wikimedia
 *
 * direct remote fetching can cause Wikimedia
 * rate limiting.
 *
 * Instead:
 *
 *   Wikimedia
 *       ↓
 *   VOYARA server
 *       ↓
 *   image buffer
 *       ↓
 *   Cloudinary
 */
const downloadImage = async ({
  imageUrl,
  source,
}) => {
  if (
    !isValidHttpUrl(
      imageUrl
    )
  ) {
    return null;
  }

  /*
   * Already stored in Cloudinary.
   * No need to download again.
   */
  if (
    isCloudinaryUrl(
      imageUrl
    )
  ) {
    return {
      buffer: null,
      contentType:
        "image/jpeg",
      alreadyCloudinary:
        true,
    };
  }

  try {
    const headers = {
      "User-Agent":
        "VOYARA-MERN/1.0 (travel portal image importer)",
      Accept:
        "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    };

    const response =
      await axios.get(
        imageUrl,
        {
          responseType:
            "arraybuffer",

          timeout:
            IMAGE_DOWNLOAD_TIMEOUT,

          maxContentLength:
            15 * 1024 * 1024,

          maxBodyLength:
            15 * 1024 * 1024,

          headers,
        }
      );

    return {
      buffer:
        Buffer.from(
          response.data
        ),

      contentType:
        response.headers?.[
          "content-type"
        ] || "image/jpeg",

      alreadyCloudinary:
        false,
    };
  } catch (error) {
    const status =
      error?.response
        ?.status;

    if (status === 429) {
      const retryAfterHeader =
        error?.response
          ?.headers?.[
          "retry-after"
        ];

      const retryAfter =
        Number(
          retryAfterHeader
        ) || 20;

      console.warn(
        `      [Image Download] ⚠️ ${source} rate limited. Waiting ${retryAfter}s...`
      );

      await sleep(
        Math.min(
          Math.max(
            retryAfter,
            10
          ),
          60
        ) * 1000
      );

      /*
       * Retry once.
       */
      try {
        const retryResponse =
          await axios.get(
            imageUrl,
            {
              responseType:
                "arraybuffer",

              timeout:
                IMAGE_DOWNLOAD_TIMEOUT,

              maxContentLength:
                15 * 1024 * 1024,

              maxBodyLength:
                15 * 1024 * 1024,

              headers: {
                "User-Agent":
                  "VOYARA-MERN/1.0 (travel portal image importer)",
                Accept:
                  "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
              },
            }
          );

        return {
          buffer:
            Buffer.from(
              retryResponse.data
            ),

          contentType:
            retryResponse.headers?.[
              "content-type"
            ] || "image/jpeg",

          alreadyCloudinary:
            false,
        };
      } catch (retryError) {
        console.warn(
          `      [Image Download] Retry failed: ${retryError.message}`
        );

        return null;
      }
    }

    console.warn(
      `      [Image Download] Failed: ${error.message}`
    );

    return null;
  }
};

/* ============================================================
   CLOUDINARY
   ============================================================ */

/**
 * Upload image to Cloudinary.
 *
 * IMPORTANT:
 *
 * Remote Wikimedia images are downloaded first.
 *
 * We do NOT make Cloudinary directly fetch
 * upload.wikimedia.org.
 */
const uploadImageToCloudinary =
  async ({
    imageUrl,
    publicId,
    source,
  }) => {
    if (
      !isValidHttpUrl(
        imageUrl
      )
    ) {
      return null;
    }

    /*
     * If the image is already Cloudinary,
     * keep the existing URL.
     *
     * The public ID is not fabricated for the
     * source asset.
     */
    if (
      isCloudinaryUrl(
        imageUrl
      )
    ) {
      return {
        url: imageUrl,

        publicId: "",

        alreadyCloudinary:
          true,
      };
    }

    const downloaded =
      await downloadImage({
        imageUrl,
        source,
      });

    if (!downloaded) {
      return null;
    }

    /*
     * Safety check.
     */
    if (
      downloaded.alreadyCloudinary
    ) {
      return {
        url: imageUrl,
        publicId: "",
        alreadyCloudinary: true,
      };
    }

    try {
      const result =
        await new Promise(
          (
            resolve,
            reject
          ) => {
            const uploadStream =
              cloudinary.uploader.upload_stream(
                {
                  public_id:
                    publicId,

                  resource_type:
                    "image",

                  overwrite:
                    true,

                  unique_filename:
                    false,

                  use_filename:
                    false,
                },

                (
                  error,
                  result
                ) => {
                  if (error) {
                    reject(
                      error
                    );
                  } else {
                    resolve(
                      result
                    );
                  }
                }
              );

            uploadStream.end(
              downloaded.buffer
            );
          }
        );

      return {
        url:
          result.secure_url ||
          result.url,

        publicId:
          result.public_id,

        alreadyCloudinary:
          false,
      };
    } catch (error) {
      console.warn(
        `      [Cloudinary] Upload failed: ${error.message}`
      );

      return null;
    }
  };

/* ============================================================
   MONGODB UPSERT
   ============================================================ */

/**
 * Save / update a tourist place.
 *
 * Stable application key:
 *
 *   stateSlug + placeSlug
 */
const saveTouristPlace =
  async ({
    place,
    state,
    imageResult,
    imageSource,
    imageSourceUrl,
    imageMetadata,
  }) => {
    const stateSlug =
      state.slug ||
      slugify(
        state.name
      );

    const placeSlug =
      place.slug ||
      slugify(
        place.name
      );

    const document = {
      name:
        place.name,

      slug:
        placeSlug,

      state:
        state.name,

      stateSlug,

      city:
        place.city || "",

      address:
        place.address ||
        `${place.name}, ${state.name}`,

      latitude:
        place.latitude ??
        null,

      longitude:
        place.longitude ??
        null,

      categories:
        Array.isArray(
          place.categories
        )
          ? place.categories
          : [],

      description:
        place.description ||
        `Tourist destination in ${state.name}.`,

      image:
        imageResult?.url ||
        "",

      cloudinaryPublicId:
        imageResult?.publicId ||
        "",

      imageAlt:
        place.name,

      /*
       * Place data source.
       */
      source:
        "Geoapify",

      sourceUrl:
        place.placeId
          ? "https://www.geoapify.com/"
          : "",

      /*
       * Actual image source.
       */
      imageSource:
        imageSource ||
        "",

      imageSourceUrl:
        imageSourceUrl ||
        "",

      /*
       * Wikimedia metadata.
       */
      imageCredit:
        extractMetadataValue(
          imageMetadata,
          "Artist"
        ),

      imageLicense:
        extractMetadataValue(
          imageMetadata,
          "LicenseShortName"
        ),

      imageLicenseUrl:
        extractMetadataValue(
          imageMetadata,
          "LicenseUrl"
        ),

      imageTitle:
        extractMetadataValue(
          imageMetadata,
          "ImageDescription"
        ),

      timings:
        place.timings ||
        "9:00 AM – 5:30 PM",

      entryFee:
        place.entryFee ||
        "Free / Nominal",

      rating:
        Number(
          place.rating
        ) || 0,

      distance:
        place.distance ??
        null,
    };

    const saved =
      await TouristPlace.findOneAndUpdate(
        {
          stateSlug,
          slug:
            placeSlug,
        },

        {
          $set:
            document,
        },

        {
          new:
            true,

          upsert:
            true,

          setDefaultsOnInsert:
            true,
        }
      );

    return saved;
  };

/* ============================================================
   PROCESS ONE PLACE
   ============================================================ */

/**
 * Process one tourist place.
 */
const processPlace =
  async ({
    place,
    state,
    index,
    total,
  }) => {
    console.log(
      `\n   [${index}/${total}] ${place.name}`
    );

    /*
     * Resolve image.
     */
    const resolved =
      await resolvePlaceImage({
        place,
        state,
      });

    if (!resolved.url) {
      console.log(
        `      [Image] ✗ No image found`
      );

      return {
        success: false,
        reason:
          "No image found",
        place,
      };
    }

    /*
     * Build stable Cloudinary ID.
     */
    const stateSlug =
      state.slug ||
      slugify(
        state.name
      );

    const placeSlug =
      place.slug ||
      slugify(
        place.name
      );

    const publicId =
      buildCloudinaryPublicId({
        stateSlug,
        placeSlug,
      });

    /*
     * Upload.
     */
    await sleep(
      IMAGE_DELAY_MS
    );

    const uploaded =
      await uploadImageToCloudinary({
        imageUrl:
          resolved.url,

        publicId,

        source:
          resolved.source,
      });

    if (!uploaded) {
      console.log(
        `      [Image] ✗ Cloudinary upload failed`
      );

      return {
        success: false,
        reason:
          "Cloudinary upload failed",
        place,
      };
    }

    /*
     * Save MongoDB.
     */
    const saved =
      await saveTouristPlace({
        place,

        state,

        imageResult:
          uploaded,

        imageSource:
          resolved.source,

        imageSourceUrl:
          resolved.sourceUrl,

        imageMetadata:
          resolved.metadata,
      });

    console.log(
      `      [Cloudinary] ✓ ${uploaded.url}`
    );

    console.log(
      `      [MongoDB] ✓ ${saved.name}`
    );

    return {
      success: true,

      place,

      saved,

      imageSource:
        resolved.source,
    };
  };

/* ============================================================
   PROCESS STATE
   ============================================================ */

/**
 * Process one state / UT.
 */
const processState =
  async (
    state,
    stateIndex,
    totalStates
  ) => {
    console.log(
      "\n============================================================"
    );

    console.log(
      `STATE ${stateIndex}/${totalStates}: ${state.name}`
    );

    console.log(
      "============================================================"
    );

    /*
     * Fetch tourist places from Geoapify.
     *
     * IMPORTANT:
     * Disable the image enrichment inside the
     * Geoapify service because this script owns
     * the permanent image pipeline.
     */

    let places = [];

    try {
      places =
        await searchPlacesByState({
          stateName:
            state.name,

          limit:
            MAX_PLACES_PER_STATE,

          enrichImages:
            false,
        });
    } catch (error) {
      console.error(
        `   [Geoapify] Failed for ${state.name}: ${error.message}`
      );

      return {
        state:
          state.name,

        places: 0,

        success: 0,

        failed: 0,

        error:
          error.message,
      };
    }

    /*
     * Remove duplicate places.
     */
    const seen =
      new Set();

    places =
      places.filter(
        (place) => {
          const key =
            `${normalizeText(
              place.name
            )}|${Number(
              place.latitude
            ).toFixed(
              5
            )}|${Number(
              place.longitude
            ).toFixed(
              5
            )}`;

          if (
            seen.has(key)
          ) {
            return false;
          }

          seen.add(key);

          return true;
        }
      );

    console.log(
      `   [Places] ${places.length} unique places found`
    );

    /*
     * Process sequentially.
     */
    let successCount =
      0;

    let failedCount =
      0;

    for (
      let start = 0;
      start < places.length;
      start +=
        PLACE_BATCH_SIZE
    ) {
      const batch =
        places.slice(
          start,
          start +
            PLACE_BATCH_SIZE
        );

      /*
       * Batch size is 1, so this is effectively
       * one place at a time.
       */
      const results =
        await Promise.all(
          batch.map(
            (
              place,
              batchIndex
            ) =>
              processPlace({
                place,

                state,

                index:
                  start +
                  batchIndex +
                  1,

                total:
                  places.length,
              })
          )
        );

      for (
        const result of
          results
      ) {
        if (
          result.success
        ) {
          successCount +=
            1;
        } else {
          failedCount +=
            1;
        }
      }
    }

    console.log(
      `\n   ${state.name} COMPLETE`
    );

    console.log(
      `   Places: ${places.length}`
    );

    console.log(
      `   Saved: ${successCount}`
    );

    console.log(
      `   Failed: ${failedCount}`
    );

    return {
      state:
        state.name,

      places:
        places.length,

      success:
        successCount,

      failed:
        failedCount,
    };
  };

/* ============================================================
   MAIN
   ============================================================ */

const main = async () => {
  console.log(
    "\n============================================================"
  );

  console.log(
    "VOYARA — INDIA-WIDE TOURIST PLACE IMAGE PIPELINE"
  );

  console.log(
    "============================================================\n"
  );

  try {
    /*
     * --------------------------------------------------------
     * DATABASE
     * --------------------------------------------------------
     */

    console.log(
      "[Startup] Connecting to MongoDB..."
    );

    await connectDB();

    console.log(
      "[Startup] MongoDB connected."
    );

    /*
     * --------------------------------------------------------
     * LOAD STATES / UTs
     * --------------------------------------------------------
     */

    const states =
      await State.find({})
        .sort({
          name: 1,
        })
        .lean();

    if (
      !states.length
    ) {
      throw new Error(
        "No states found in MongoDB."
      );
    }

    console.log(
      `[Startup] ${states.length} states / UTs loaded.`
    );

    /*
     * --------------------------------------------------------
     * TEST MODE
     * --------------------------------------------------------
     */

    const testState =
      process.env
        .VOYARA_TEST_STATE;

    let statesToProcess =
      states;

    if (testState) {
      statesToProcess =
        states.filter(
          (state) =>
            normalizeText(
              state.name
            ) ===
            normalizeText(
              testState
            )
        );

      if (
        !statesToProcess.length
      ) {
        throw new Error(
          `Test state "${testState}" was not found in MongoDB.`
        );
      }

      console.log(
        "\n============================================================"
      );

      console.log(
        `[TEST MODE] Processing ONLY: ${statesToProcess[0].name}`
      );

      console.log(
        "============================================================\n"
      );
    }

    /*
     * --------------------------------------------------------
     * SAFETY CHECK
     * --------------------------------------------------------
     */

    if (
      !testState &&
      states.length !== 36
    ) {
      console.warn(
        `\n[Warning] Expected 36 States/UTs but found ${states.length}.`
      );

      console.warn(
        "[Warning] The script will process the states currently present in MongoDB.\n"
      );
    }

    /*
     * --------------------------------------------------------
     * PROCESS
     * --------------------------------------------------------
     */

    const startedAt =
      Date.now();

    const results = [];

    for (
      let i = 0;
      i <
        statesToProcess.length;
      i++
    ) {
      const result =
        await processState(
          statesToProcess[i],

          i + 1,

          statesToProcess.length
        );

      results.push(
        result
      );

      /*
       * Give external APIs a break
       * between states.
       */
      if (
        i <
        statesToProcess.length -
          1
      ) {
        await sleep(
          STATE_DELAY_MS
        );
      }
    }

    /*
     * --------------------------------------------------------
     * FINAL SUMMARY
     * --------------------------------------------------------
     */

    const totalPlaces =
      results.reduce(
        (
          total,
          item
        ) =>
          total +
          (item.places ||
            0),
        0
      );

    const totalSaved =
      results.reduce(
        (
          total,
          item
        ) =>
          total +
          (item.success ||
            0),
        0
      );

    const totalFailed =
      results.reduce(
        (
          total,
          item
        ) =>
          total +
          (item.failed ||
            0),
        0
      );

    const durationSeconds =
      (
        (Date.now() -
          startedAt) /
        1000
      ).toFixed(1);

    console.log(
      "\n\n============================================================"
    );

    console.log(
      "VOYARA IMAGE PIPELINE COMPLETE"
    );

    console.log(
      "============================================================"
    );

    console.log(
      `States processed : ${statesToProcess.length}`
    );

    console.log(
      `Places discovered: ${totalPlaces}`
    );

    console.log(
      `Places saved     : ${totalSaved}`
    );

    console.log(
      `Places failed    : ${totalFailed}`
    );

    console.log(
      `Duration         : ${durationSeconds}s`
    );

    console.log(
      "============================================================\n"
    );

    /*
     * State-by-state report.
     */
    console.table(
      results.map(
        (item) => ({
          State:
            item.state,

          Places:
            item.places ||
            0,

          Saved:
            item.success ||
            0,

          Failed:
            item.failed ||
            0,

          Status:
            item.error
              ? "ERROR"
              : "OK",
        })
      )
    );

    console.log(
      "\n[Done] Processing completed."
    );
  } catch (error) {
    console.error(
      "\n============================================================"
    );

    console.error(
      "VOYARA IMAGE PIPELINE FAILED"
    );

    console.error(
      "============================================================"
    );

    console.error(
      error
    );

    process.exitCode =
      1;
  } finally {
    /*
     * Close MongoDB connection.
     */
    try {
      const mongoose =
        require("mongoose");

      if (
        mongoose.connection
          .readyState === 1
      ) {
        await mongoose.connection.close();

        console.log(
          "[Shutdown] MongoDB connection closed."
        );
      }
    } catch (error) {
      console.warn(
        `[Shutdown] Could not close MongoDB cleanly: ${error.message}`
      );
    }
  }
};

/* ============================================================
   RUN
   ============================================================ */

main();


