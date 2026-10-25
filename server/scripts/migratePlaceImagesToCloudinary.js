require("dotenv").config();

const mongoose = require("mongoose");
const cloudinary = require("../config/cloudinary");
const TouristPlace = require("../models/TouristPlace");

const migrateImages = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);

    console.log("===============================================");
    console.log("Connected to MongoDB");
    console.log("Starting Cloudinary image migration...");
    console.log("===============================================");

    const places = await TouristPlace.find({});

    console.log(`Found ${places.length} tourist places.`);

    let migrated = 0;
    let skipped = 0;
    let failed = 0;

    for (const place of places) {
      console.log("\n-----------------------------------------------");
      console.log(`Processing: ${place.name}`);

      // Skip places that already have a Cloudinary image
      if (place.cloudinaryPublicId) {
        console.log("Skipped: Already using Cloudinary.");
        skipped++;
        continue;
      }

      // Skip places without an image
      if (!place.image) {
        console.log("Skipped: No image URL found.");
        skipped++;
        continue;
      }

      // Skip local/invalid URLs
      if (
        !place.image.startsWith("http://") &&
        !place.image.startsWith("https://")
      ) {
        console.log("Skipped: Image URL is not valid.");
        skipped++;
        continue;
      }

      try {
        console.log("Uploading image to Cloudinary...");

        const result = await cloudinary.uploader.upload(
          place.image,
          {
            folder: "voyara/places",
            public_id: place.slug,
            resource_type: "image",
            overwrite: true,
          }
        );

        // Update MongoDB
        place.image = result.secure_url;
        place.cloudinaryPublicId = result.public_id;

        await place.save();

        console.log("Migration successful.");
        console.log(`Cloudinary URL: ${result.secure_url}`);
        console.log(`Public ID: ${result.public_id}`);

        migrated++;
      } catch (uploadError) {
        console.error(
          `Migration failed for ${place.name}:`,
          uploadError.message
        );

        failed++;
      }
    }

    console.log("\n===============================================");
    console.log("Cloudinary Migration Completed");
    console.log("===============================================");
    console.log(`Total places : ${places.length}`);
    console.log(`Migrated     : ${migrated}`);
    console.log(`Skipped      : ${skipped}`);
    console.log(`Failed       : ${failed}`);
    console.log("===============================================");
  } catch (error) {
    console.error(
      "Migration Error:",
      error.message
    );
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB connection closed.");
  }
};

migrateImages();