require("dotenv").config();

const mongoose = require("mongoose");
const axios = require("axios");

const cloudinary = require("../config/cloudinary");
const State = require("../models/State");
const statesData = require("../data/statesData");

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
 * Search Pexels for a tourism image.
 */
const findPexelsImage = async (state) => {
  const queries = [
    `${state.name} India tourism`,
    `${state.name} India travel`,
    `${state.name} India landmark`,
  ];

  for (const query of queries) {
    try {
      console.log(`   → Pexels search: ${query}`);

      const response = await axios.get(
        PEXELS_API_URL,
        {
          headers: {
            Authorization:
              process.env.PEXELS_API_KEY,
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
       * Prefer photos that have useful alt text.
       */
      const suitablePhoto =
        photos.find((photo) => {
          const alt =
            (photo.alt || "").toLowerCase();

          return (
            alt.includes(
              state.name.toLowerCase()
            ) ||
            alt.includes("india") ||
            alt.includes("temple") ||
            alt.includes("fort") ||
            alt.includes("palace") ||
            alt.includes("beach") ||
            alt.includes("mountain") ||
            alt.includes("lake") ||
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
 * Download the image from Pexels.
 */
const downloadImage = async (imageUrl) => {
  const response = await axios.get(imageUrl, {
    responseType: "arraybuffer",
    timeout: 30000,
  });

  return Buffer.from(response.data);
};

/*
 * Upload downloaded image buffer to Cloudinary.
 */
const uploadBufferToCloudinary = (
  buffer,
  state
) => {
  return new Promise((resolve, reject) => {
    const publicId =
      `voyara/states/${slugify(state.slug)}`;

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
const updateState = async (
  state,
  imageUrl,
  publicId
) => {
  const updated =
    await State.findOneAndUpdate(
      {
        slug: state.slug,
      },
      {
        $set: {
          image: imageUrl,
          cloudinaryPublicId:
            publicId,
        },
      },
      {
        new: true,
      }
    );

  if (!updated) {
    throw new Error(
      `State not found in MongoDB: ${state.name}`
    );
  }

  return updated;
};

/*
 * Process one state.
 */
const processState = async (state) => {
  console.log(
    `\nProcessing: ${state.name}`
  );

  const existing =
    await State.findOne({
      slug: state.slug,
    });

  if (!existing) {
    throw new Error(
      `State not found in MongoDB: ${state.name}`
    );
  }

  /*
   * Skip if already uploaded.
   */
  if (
    existing.cloudinaryPublicId &&
    existing.image &&
    existing.image.includes(
      "res.cloudinary.com"
    )
  ) {
    console.log(
      "   ✓ Already has Cloudinary image"
    );

    return "skipped";
  }

  const pexelsImage =
    await findPexelsImage(state);

  if (!pexelsImage) {
    throw new Error(
      "No suitable Pexels image found"
    );
  }

  console.log(
    `   ✓ Photographer: ${pexelsImage.photographer}`
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
      state
    );

  console.log(
    `   ✓ Cloudinary: ${cloudinaryImage.publicId}`
  );

  console.log(
    "   → Updating MongoDB..."
  );

  await updateState(
    state,
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
 *
 * TEST MODE:
 * Only first 2 states.
 */
const uploadStateImages = async () => {
  console.log("");
  console.log(
    "========================================"
  );
  console.log(
    " VOYARA STATE IMAGE TEST"
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
   * TEST ONLY 2 STATES.
   */
  const testStates = statesData;

  console.log(
    `✓ Testing ${testStates.length} states`
  );

  let successCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (
    let index = 0;
    index < testStates.length;
    index++
  ) {
    const state = testStates[index];

    console.log("");
    console.log(
      `========== [${index + 1}/${testStates.length}] ${state.name} ==========`
    );

    try {
      const result =
        await processState(state);

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

    await sleep(2000);
  }

  console.log("");
  console.log(
    "========================================"
  );
  console.log(
    " TEST COMPLETE"
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
    "========================================"
  );
  console.log("");

  await mongoose.disconnect();

  console.log(
    "✓ MongoDB disconnected"
  );
};

uploadStateImages().catch(
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