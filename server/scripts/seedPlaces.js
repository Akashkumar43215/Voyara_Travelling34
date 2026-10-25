require('dotenv').config();
const mongoose = require('mongoose');
const TouristPlace = require('../models/TouristPlace');
const baseCuratedPlaces = require('../data/curatedPlacesData');
const extraCuratedPlaces = [
  ...require('../data/curatedPlacesExtra'),
  ...require('../data/curatedPlacesExtra2'),
];

// wikiTitle is only a hint for the photo-fetching script, not part of the stored place
const curatedPlaces = [
  ...baseCuratedPlaces,
  ...extraCuratedPlaces.map(({ wikiTitle, ...place }) => place),
];

/**
 * Public image URL for a curated place. Uses the Cloudinary photo when
 * Cloudinary is configured; otherwise the stock image in curatedPlacesData.js.
 */
const resolvePlaceImage = (place) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  if (cloudName && place.cloudinaryPublicId) {
    return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,w_900/${place.cloudinaryPublicId}`;
  }

  return place.image;
};

/**
 * Seed all curated Indian tourist places into MongoDB
 * Uses bulk upsert (stateSlug + slug as unique key) to prevent duplicates
 */
const seedPlaces = async () => {
  try {
    console.log(`[Seed Places] Preparing to seed ${curatedPlaces.length} tourist places...`);

    const operations = curatedPlaces.map((place) => ({
      updateOne: {
        filter: { stateSlug: place.stateSlug, slug: place.slug },
        update: { $set: { ...place, image: resolvePlaceImage(place) } },
        upsert: true
      }
    }));

    const result = await TouristPlace.bulkWrite(operations);
    const totalCount = await TouristPlace.countDocuments();

    console.log(`[Seed Places] Tourist places synced successfully:`);
    console.log(`  - Upserted: ${result.upsertedCount}`);
    console.log(`  - Matched:  ${result.matchedCount}`);
    console.log(`  - Total in Database: ${totalCount}`);

    return { success: true, count: totalCount };
  } catch (error) {
    console.error(`[Seed Places Error] ${error.message}`);
    throw error;
  }
};

/**
 * Auto-seed called on server startup
 */
const autoSeedPlaces = async () => {
  try {
    const count = await TouristPlace.countDocuments();
    const outdatedImages = await TouristPlace.countDocuments({
      source: { $regex: /^Curated/ },
      cloudinaryPublicId: { $not: /^voyara\/places-v2\// },
    });
    if (count < curatedPlaces.length || outdatedImages > 0) {
      console.log(`[Database Init] Current place count is ${count}/${curatedPlaces.length}. Running place sync...`);
      await seedPlaces();
    } else {
      console.log(`[Database Init] All ${count} tourist places already verified in database.`);
    }
  } catch (error) {
    console.warn(`[Database Init Warning] Auto-seeding places deferred: ${error.message}`);
  }
};

// Run directly from CLI: node server/scripts/seedPlaces.js
if (require.main === module) {
  const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/voyara_db';
  mongoose
    .connect(mongoURI)
    .then(async () => {
      console.log(`[Seed CLI] Connected to MongoDB`);
      await seedPlaces();
      await mongoose.disconnect();
      console.log('[Seed CLI] Disconnected. Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(`[Seed CLI Error]: ${err.message}`);
      process.exit(1);
    });
}

module.exports = { seedPlaces, autoSeedPlaces };
