require("dotenv").config();

const mongoose = require("mongoose");
const cloudinary = require("../config/cloudinary");
const TouristPlace = require("../models/TouristPlace");

const fallbackImages = {
  "mehrangarh-fort": {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/9/9f/Mehrangarh_Fort_%2825017238857%29.jpg",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Mehrangarh_Fort_(25017238857).jpg",
  },

  "konark-sun-temple": {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/2/26/Sun_Temple%2C.jpg",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Sun_Temple,.jpg",
  },

  "lingaraj-temple": {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/3/39/Lingaraj_Temple%2C_Bhubaneswar%2C_Odisha.jpg",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Lingaraj_Temple,_Bhubaneswar,_Odisha.jpg",
  },

  "hampi-ruins": {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/f/f9/Hampi_Ruins_%2820010113510%29.jpg",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Hampi_Ruins_(20010113510).jpg",
  },

  "kaziranga-national-park": {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/0/0a/Kaziranga_National_Park_in_Assam_10.jpg",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Kaziranga_National_Park_in_Assam_10.jpg",
  },
};

const migrateFailedImages = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("===============================================");
    console.log("Connected to MongoDB");
    console.log("Starting failed image recovery...");
    console.log("===============================================");

    let migrated = 0;
    let skipped = 0;
    let failed = 0;

    for (const [slug, imageData] of Object.entries(fallbackImages)) {
      console.log("\n-----------------------------------------------");
      console.log(`Processing: ${slug}`);

      const place = await TouristPlace.findOne({ slug });

      if (!place) {
        console.log("Place not found in database.");
        failed++;
        continue;
      }

      if (place.cloudinaryPublicId) {
        console.log("Skipped: Already using Cloudinary.");
        skipped++;
        continue;
      }

      try {
        console.log("Uploading replacement image...");

        const result = await cloudinary.uploader.upload(
          imageData.imageUrl,
          {
            folder: "voyara/places",
            public_id: slug,
            resource_type: "image",
            overwrite: true,
          }
        );

        place.image = result.secure_url;
        place.cloudinaryPublicId = result.public_id;

        // Store image source information
        place.source = "Wikimedia Commons";
        place.sourceUrl = imageData.sourceUrl;

        await place.save();

        console.log("Migration successful.");
        console.log(`Place: ${place.name}`);
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
    console.log("Failed Image Recovery Completed");
    console.log("===============================================");
    console.log(`Migrated : ${migrated}`);
    console.log(`Skipped  : ${skipped}`);
    console.log(`Failed   : ${failed}`);
    console.log("===============================================");
  } catch (error) {
    console.error(
      "Recovery Script Error:",
      error.message
    );
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB connection closed.");
  }
};

migrateFailedImages();