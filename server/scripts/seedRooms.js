const mongoose = require("mongoose");
const dotenv = require("dotenv");

const Stay = require("../models/Stay");
const { ensureDefaultRooms } = require("../services/roomService");

dotenv.config();

/**
 * Creates the default room types for every saved stay that has none.
 * (Rooms are also created automatically when a stay is saved or opened,
 * so this script is only needed to backfill older data.)
 */
const seedRooms = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("✓ MongoDB connected");

    const stays = await Stay.find({ isActive: true });

    if (!stays.length) {
      console.log("✗ No saved stays found.");
      console.log("Please select and save a stay from the VOYARA Stays page first.");
      process.exit(1);
    }

    console.log(`✓ Found ${stays.length} saved stay(s)`);

    let created = 0;

    for (const stay of stays) {
      console.log(`\n🏨 ${stay.name}`);

      const added = await ensureDefaultRooms(stay);

      console.log(added ? `✓ Created ${added} room type(s)` : "↪ Rooms already exist");

      created += added;
    }

    console.log("\n================================");
    console.log("ROOM SEED COMPLETE");
    console.log("================================");
    console.log(`✓ Room types created: ${created}`);
    console.log(`📍 Total stays: ${stays.length}`);
    console.log("================================");

    process.exit(0);
  } catch (error) {
    console.error("\n✗ Room seeding failed:");
    console.error(error.message);

    process.exit(1);
  }
};

seedRooms();
