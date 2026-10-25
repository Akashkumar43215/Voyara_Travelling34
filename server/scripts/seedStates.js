require('dotenv').config();
const mongoose = require('mongoose');
const State = require('../models/State');
const statesData = require('../data/statesData');

/**
 * Build the public image URL for a state. When Cloudinary is configured the
 * state's uploaded photo is used; otherwise the stock image in statesData.js.
 */
const resolveStateImage = (state) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  if (cloudName && state.cloudinaryPublicId) {
    return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,w_900/${state.cloudinaryPublicId}`;
  }

  return state.image;
};

/**
 * Seed all 36 Indian States and Union Territories into MongoDB
 * Uses bulk upsert to ensure zero duplicates upon repeated execution.
 */
const seedStates = async () => {
  try {
    console.log(`[Seed States] Preparing to seed ${statesData.length} States & UTs into MongoDB...`);

    const operations = statesData.map((state) => ({
      updateOne: {
        filter: { slug: state.slug },
        update: { $set: { ...state, image: resolveStateImage(state) } },
        upsert: true
      }
    }));

    const result = await State.bulkWrite(operations);
    const totalCount = await State.countDocuments();

    console.log(`[Seed States] Successfully synced states in database:`);
    console.log(`  - Matched: ${result.matchedCount}`);
    console.log(`  - Upserted: ${result.upsertedCount}`);
    console.log(`  - Total States & UTs in Database: ${totalCount}`);

    return { success: true, count: totalCount };
  } catch (error) {
    console.error(`[Seed States Error] Failed to seed states: ${error.message}`);
    throw error;
  }
};

/**
 * Auto-seed function called during server startup
 */
const autoSeedStates = async () => {
  try {
    const count = await State.countDocuments();
    const missingImageRef = await State.countDocuments({ cloudinaryPublicId: { $in: ['', null] } });
    if (count < 36 || missingImageRef > 0) {
      console.log(`[Database Init] Current state count is ${count}/36. Running automated state sync...`);
      await seedStates();
    } else {
      console.log(`[Database Init] All 36 States & UTs already verified in database.`);
    }
  } catch (error) {
    console.warn(`[Database Init Warning] Auto-seeding states deferred: ${error.message}`);
  }
};

// If run directly from command line (e.g. `node server/scripts/seedStates.js`)
if (require.main === module) {
  const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/voyara_db';
  mongoose
    .connect(mongoURI)
    .then(async () => {
      console.log(`[Seed CLI] Connected to MongoDB at ${mongoURI}`);
      await seedStates();
      await mongoose.disconnect();
      console.log('[Seed CLI] Disconnected. Seeding complete.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(`[Seed CLI Error]: ${err.message}`);
      process.exit(1);
    });
}

module.exports = { seedStates, autoSeedStates };

