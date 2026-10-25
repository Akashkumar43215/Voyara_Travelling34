/**
 * Turns compact rows into full curated-place objects.
 *
 * Row: [wikipediaTitle, slug, name, city, state, stateSlug, lat, lon, kind, description]
 *
 * `wikipediaTitle` may list alternatives separated by "|" and is only used by
 * scripts/fetchCuratedImages.js. The finished photos live in Cloudinary under
 * voyara/places-v2/<slug> and are attached by the seed script.
 *
 * kind: heritage | religious | nature | landmark | cultural
 */

const SOURCE_BY_KIND = {
  heritage: "Curated Heritage",
  religious: "Curated Cultural",
  nature: "Curated Nature",
  landmark: "Curated Landmarks",
  cultural: "Curated Cultural",
};

const CATEGORIES_BY_KIND = {
  heritage: ["tourism", "heritage", "landmarks", "attraction"],
  religious: ["tourism", "heritage", "cultural attractions", "attraction"],
  nature: ["tourism", "natural", "attraction"],
  landmark: ["tourism", "landmarks", "attraction"],
  cultural: ["tourism", "cultural attractions", "museum", "attraction"],
};

const hashString = (value) => {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }

  return hash;
};

const buildPlaces = (rows) =>
  rows.map(
    ([wikiTitle, slug, name, city, state, stateSlug, latitude, longitude, kind, description]) => ({
      wikiTitle,
      name,
      slug,
      state,
      stateSlug,
      city,
      address: `${name}, ${city}, ${state}`,
      latitude,
      longitude,
      categories: CATEGORIES_BY_KIND[kind],
      description,
      image: "",
      cloudinaryPublicId: `voyara/places-v2/${slug}`,
      imageAlt: `${name} in ${city}`,
      source: SOURCE_BY_KIND[kind],
      rating: Math.round((4.5 + (hashString(slug) % 5) / 10) * 10) / 10,
    }),
  );

module.exports = { buildPlaces };
