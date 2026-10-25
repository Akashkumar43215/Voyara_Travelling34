require("dotenv").config();

const mongoose = require("mongoose");
const axios = require("axios");

const cloudinary = require("../config/cloudinary");
const TouristPlace = require("../models/TouristPlace");

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/voyara_db";

const PEXELS_API_URL =
  "https://api.pexels.com/v1/search";

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/*
 * Search Pexels for a tourist-place image.
 */
const findPexelsImage = async (place) => {
  const queries = [
    `${place.name} India`,
    `${place.name} tourism India`,
    `${place.name} travel India`,
  ];

  for (const query of queries) {
    try {
      console.log(`   → Pexels search: ${query}`);

      const response = await axios.get(
        PEXELS_API_URL,
        {
          headers: {
            Authorization: process.env.PEXELS_API_KEY,
          },
          params: {
            query,
            orientation: "landscape",
            size: "large",
            per_page: 15,
            page: 1,
          },
          timeout: 20000,
        }
      );

      const photos = response.data?.photos || [];

      if (!photos.length) {
        await sleep(1500);
        continue;
      }

      /*
       * Try to find a photo whose alt text
       * actually relates to the tourist place.
       */
      const placeName = place.name.toLowerCase();

      const suitablePhoto =
        photos.find((photo) => {
          const alt = (photo.alt || "").toLowerCase();

          return (
            alt.includes(placeName) ||
            alt.includes("india") ||
            alt.includes("temple") ||
            alt.includes("fort") ||
            alt.includes("palace") ||
            alt.includes("monument") ||
            alt.includes("beach") ||
            alt.includes("lake") ||
            alt.includes("mountain") ||
            alt.includes("waterfall") ||
            alt.includes("tourism") ||
            alt.includes("travel")
          );
        }) || photos[0];

      return {
        imageUrl:
          suitablePhoto.src?.large2x ||
          suitablePhoto.src?.large ||
          suitablePhoto.src?.original,

        photographer:
          suitablePhoto.photographer,

        photographerUrl:
          suitablePhoto.photographer_url,

        pexelsUrl:
          suitablePhoto.url,

        photoId:
          suitablePhoto.id,
      };
    } catch (error) {
      console.log(
        `   ✗ Pexels error: ${error.message}`
      );

      if (error.response) {
        console.log(
          `   Status: ${error.response.status}`
        );
      }

      await sleep(3000);
    }
  }

  return null;
};

/*
 * Download image from Pexels.
 */
const downloadImage = async (imageUrl) => {
  const response = await axios.get(imageUrl, {
    responseType: "arraybuffer",
    timeout: 30000,
  });

  return Buffer.from(response.data);
};

/*
 * Upload image buffer to Cloudinary.
 */
const uploadBufferToCloudinary = (
  buffer,
  place
) => {
  return new Promise((resolve, reject) => {
    const publicId =
      `voyara/places/${slugify(place.name)}`;

    const uploadStream =
      cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          overwrite: true,
          resource_type: "image",
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          resolve({
            secureUrl: result.secure_url,
            publicId: result.public_id,
          });
        }
      );

    uploadStream.end(buffer);
  });
};

/*
 * Update MongoDB.
 */
const updatePlace = async (
  place,
  imageUrl,
  publicId
) => {
  const updated =
    await TouristPlace.findByIdAndUpdate(
      place._id,
      {
        $set: {
          image: imageUrl,
          cloudinaryPublicId: publicId,
        },
      },
      {
        new: true,
      }
    );

  if (!updated) {
    throw new Error(
      `Tourist place not found in MongoDB: ${place.name}`
    );
  }

  return updated;
};

/*
 * Process one tourist place.
 */
const processPlace = async (place) => {
  console.log(
    `\nProcessing: ${place.name}`
  );

  /*
   * Skip if already has Cloudinary image.
   */
  if (
    place.cloudinaryPublicId &&
    place.image &&
    place.image.includes(
      "res.cloudinary.com"
    )
  ) {
    console.log(
      "   ✓ Already has Cloudinary image"
    );

    return "skipped";
  }

  const pexelsImage =
    await findPexelsImage(place);

  if (!pexelsImage) {
    throw new Error(
      "No suitable Pexels image found"
    );
  }

  console.log(
    `   ✓ Photographer: ${pexelsImage.photographer}`
  );

  console.log(
    `   ✓ Pexels Photo ID: ${pexelsImage.photoId}`
  );

  console.log(
    "   → Downloading Pexels image..."
  );

  const imageBuffer =
    await downloadImage(
      pexelsImage.imageUrl
    );

  console.log(
    `   ✓ Downloaded ${Math.round(
      imageBuffer.length / 1024
    )} KB`
  );

  console.log(
    "   → Uploading to Cloudinary..."
  );

  const cloudinaryImage =
    await uploadBufferToCloudinary(
      imageBuffer,
      place
    );

  console.log(
    `   ✓ Cloudinary: ${cloudinaryImage.publicId}`
  );

  console.log(
    "   → Updating MongoDB..."
  );

  await updatePlace(
    place,
    cloudinaryImage.secureUrl,
    cloudinaryImage.publicId
  );

  console.log(
    "   ✓ MongoDB updated"
  );

  return "success";
};

/*
 * Main.
 */
const uploadPlaceImages = async () => {
  console.log("");
  console.log(
    "========================================"
  );
  console.log(
    " VOYARA TOURIST PLACE IMAGE UPLOAD"
  );
  console.log(
    " Pexels → Node → Cloudinary → MongoDB"
  );
  console.log(
    "========================================"
  );
  console.log("");

  if (!process.env.PEXELS_API_KEY) {
    throw new Error(
      "PEXELS_API_KEY is missing from server/.env"
    );
  }

  await mongoose.connect(MONGO_URI);

  console.log("✓ MongoDB connected");

  /*
   * Get all tourist places.
   */
  const places =
    await TouristPlace.find({})
      .sort({ name: 1 });

  console.log(
    `✓ Found ${places.length} tourist places`
  );

  if (!places.length) {
    console.log(
      "✗ No tourist places found in MongoDB"
    );

    await mongoose.disconnect();
    return;
  }

  let successCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (
    let index = 0;
    index < places.length;
    index++
  ) {
    const place = places[index];

    console.log("");
    console.log(
      `========== [${index + 1}/${places.length}] ${place.name} ==========`
    );

    try {
      const result =
        await processPlace(place);

      if (result === "success") {
        successCount++;
      }

      if (result === "skipped") {
        skippedCount++;
      }
    } catch (error) {
      failedCount++;

      console.error(
        `   ✗ FAILED: ${error.message}`
      );
    }

    /*
     * Small delay between places.
     */
    await sleep(2000);
  }

  console.log("");
  console.log(
    "========================================"
  );
  console.log(
    " TOURIST PLACE IMAGE UPLOAD COMPLETE"
  );
  console.log(
    "========================================"
  );
  console.log(
    `✓ Uploaded: ${successCount}`
  );
  console.log(
    `↪ Skipped:  ${skippedCount}`
  );
  console.log(
    `✗ Failed:   ${failedCount}`
  );
  console.log(
    `📍 Total:    ${places.length}`
  );
  console.log(
    "========================================"
  );
  console.log("");

  await mongoose.disconnect();

  console.log(
    "✓ MongoDB disconnected"
  );
};

uploadPlaceImages().catch(
  async (error) => {
    console.error("");
    console.error(
      "========================================"
    );
    console.error(
      " FATAL ERROR"
    );
    console.error(
      "========================================"
    );
    console.error(error);
    console.error("");

    try {
      await mongoose.disconnect();
    } catch {}

    process.exit(1);
  }
);