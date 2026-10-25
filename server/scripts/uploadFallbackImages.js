require("dotenv").config();

const mongoose = require("mongoose");
const path = require("path");
const cloudinary = require("../config/cloudinary");
const TouristPlace = require("../models/TouristPlace");

const fallbackImages = [
  {
    slug: "mehrangarh-fort",
    fileName: "mehrangarh-fort.jpg",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Mehrangarh_Fort_(25017238857).jpg",
  },
  {
    slug: "konark-sun-temple",
    fileName: "konark-sun-temple.jpg",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Sun_Temple,.jpg",
  },
  {
    slug: "lingaraj-temple",
    fileName: "lingaraj-temple.jpg",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Lingaraj_Temple,_Bhubaneswar,_Odisha.jpg",
  },
  {
    slug: "hampi-ruins",
    fileName: "hampi-ruins.jpg",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Hampi_Ruins_(20010113510).jpg",
  },
  {
    slug: "kaziranga-national-park",
    fileName: "kaziranga-national-park.jpg",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Kaziranga_National_Park_in_Assam_10.jpg",
  },
];

const uploadFallbackImages = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("===============================================");
    console.log("Connected to MongoDB");
    console.log("Starting local image upload...");
    console.log("===============================================");

    let uploaded = 0;
    let skipped = 0;
    let failed = 0;

    for (const item of fallbackImages) {
      console.log("\n-----------------------------------------------");
      console.log(`Processing: ${item.slug}`);

      const place = await TouristPlace.findOne({
        slug: item.slug,
      });

      if (!place) {
        console.log("Place not found in database.");
        failed++;
        continue;
      }

      // Skip if already migrated
      if (place.cloudinaryPublicId) {
        console.log("Skipped: Already using Cloudinary.");
        skipped++;
        continue;
      }

      const imagePath = path.join(
        __dirname,
        "..",
        "fallback-images",
        item.fileName
      );

      console.log(`Local image: ${imagePath}`);

      try {
        console.log("Uploading local image to Cloudinary...");

        const result = await cloudinary.uploader.upload(
          imagePath,
          {
            folder: "voyara/places",
            public_id: item.slug,
            resource_type: "image",
            overwrite: true,
          }
        );

        place.image = result.secure_url;
        place.cloudinaryPublicId = result.public_id;

        // Store image source information
        place.source = "Wikimedia Commons";
        place.sourceUrl = item.sourceUrl;

        await place.save();

        console.log("Upload successful.");
        console.log(`Place: ${place.name}`);
        console.log(`Cloudinary URL: ${result.secure_url}`);
        console.log(`Public ID: ${result.public_id}`);

        uploaded++;
      } catch (uploadError) {
        console.error(
          `Upload failed for ${place.name}:`,
          uploadError.message
        );

        failed++;
      }
    }

    console.log("\n===============================================");
    console.log("Local Image Upload Completed");
    console.log("===============================================");
    console.log(`Uploaded : ${uploaded}`);
    console.log(`Skipped  : ${skipped}`);
    console.log(`Failed   : ${failed}`);
    console.log("===============================================");
  } catch (error) {
    console.error(
      "Upload Script Error:",
      error.message
    );
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB connection closed.");
  }
};

uploadFallbackImages();