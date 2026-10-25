require("dotenv").config();

const mongoose = require("mongoose");
const axios = require("axios");

const cloudinary = require("../config/cloudinary");
const Stay = require("../models/Stay");

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://localhost:27017/voyara_db";

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
 * Keep track of Pexels photos already selected
 * during this execution.
 *
 * This helps avoid using the same photo for
 * multiple stays in the same run.
 */
const usedPexelsPhotoIds = new Set();

/*
 * Search Pexels for a stay/accommodation image.
 */
const findPexelsImage = async (stay) => {
  const city = stay.city || "";
  const state = stay.state || "";

  const queries = [
    `"${stay.name}" hotel`,
    `${stay.name} ${city} hotel`,
    `${city} hotel ${state} India`,
    `${city} accommodation India`,
  ];

  for (const query of queries) {
    try {
      console.log(
        `   → Pexels search: ${query}`
      );

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
            per_page: 20,
            page: 1,
          },

          timeout: 20000,
        }
      );

      const photos =
        response.data?.photos || [];

      if (!photos.length) {
        await sleep(1000);
        continue;
      }

      /*
       * Prefer unused photos.
       */
      const unusedPhotos =
        photos.filter(
          (photo) =>
            !usedPexelsPhotoIds.has(
              photo.id
            )
        );

      if (!unusedPhotos.length) {
        await sleep(1000);
        continue;
      }

      /*
       * Try to find a photo whose alt text
       * relates to the stay/city/hotel.
       */
      const stayName =
        stay.name.toLowerCase();

      const cityName =
        city.toLowerCase();

      const suitablePhoto =
        unusedPhotos.find((photo) => {
          const alt =
            (photo.alt || "").toLowerCase();

          return (
            alt.includes(stayName) ||
            alt.includes(cityName) ||
            alt.includes("hotel") ||
            alt.includes("resort") ||
            alt.includes("villa") ||
            alt.includes("hotel room") ||
            alt.includes("accommodation")
          );
        }) ||
        unusedPhotos[0];

      usedPexelsPhotoIds.add(
        suitablePhoto.id
      );

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

      /*
       * If Pexels rate-limits us, stop trying
       * additional queries for this stay.
       */
      if (
        error.response?.status === 429
      ) {
        throw new Error(
          "Pexels API rate limit reached."
        );
      }

      await sleep(2000);
    }
  }

  return null;
};

/*
 * Download image from Pexels.
 */
const downloadImage = async (
  imageUrl
) => {
  const response = await axios.get(
    imageUrl,
    {
      responseType: "arraybuffer",
      timeout: 30000,
    }
  );

  return Buffer.from(response.data);
};

/*
 * Upload image buffer to Cloudinary.
 */
const uploadBufferToCloudinary = (
  buffer,
  stay
) => {
  return new Promise(
    (resolve, reject) => {
      const publicId =
        `voyara/stays/${slugify(
          stay.name
        )}-${String(stay._id)}`;

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
              secureUrl:
                result.secure_url,

              publicId:
                result.public_id,
            });
          }
        );

      uploadStream.end(buffer);
    }
  );
};

/*
 * Update MongoDB.
 */
const updateStay = async (
  stay,
  imageUrl,
  publicId
) => {
  const updated =
    await Stay.findByIdAndUpdate(
      stay._id,
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
      `Stay not found: ${stay.name}`
    );
  }

  return updated;
};

/*
 * Process one stay.
 */
const processStay = async (stay) => {
  console.log(
    `\nProcessing: ${stay.name}`
  );

  /*
   * Skip if already has Cloudinary image.
   */
  if (
    stay.cloudinaryPublicId &&
    stay.image &&
    stay.image.includes(
      "res.cloudinary.com"
    )
  ) {
    console.log(
      "   ✓ Already has Cloudinary image"
    );

    return "skipped";
  }

  const pexelsImage =
    await findPexelsImage(stay);

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
      stay
    );

  console.log(
    `   ✓ Cloudinary: ${cloudinaryImage.publicId}`
  );

  console.log(
    "   → Updating MongoDB..."
  );

  await updateStay(
    stay,
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
const uploadStayImages = async () => {
  console.log("");
  console.log(
    "========================================"
  );
  console.log(
    " VOYARA STAY IMAGE UPLOAD"
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

  console.log(
    "✓ MongoDB connected"
  );

  /*
   * Only process stays that have actually
   * been saved in our MongoDB collection.
   */
  const stays =
    await Stay.find({
      isActive: true,
    }).sort({
      createdAt: 1,
    });

  console.log(
    `✓ Found ${stays.length} saved stays`
  );

  if (!stays.length) {
    console.log(
      "✗ No saved stays found in MongoDB"
    );

    await mongoose.disconnect();

    return;
  }

  let successCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (
    let index = 0;
    index < stays.length;
    index++
  ) {
    const stay = stays[index];

    console.log("");
    console.log(
      `========== [${index + 1}/${stays.length}] ${stay.name} ==========`
    );

    try {
      const result =
        await processStay(stay);

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
     * Delay between stays.
     */
    await sleep(2000);
  }

  console.log("");
  console.log(
    "========================================"
  );
  console.log(
    " STAY IMAGE UPLOAD COMPLETE"
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
    `📍 Total:    ${stays.length}`
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

uploadStayImages().catch(
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