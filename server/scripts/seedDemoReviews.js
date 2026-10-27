/**
 * Adds SAMPLE reviews to some hotels so the review screens can be seen with data.
 * Every one is marked isDemo in the database and shows a "Sample" tag on the website.
 *
 *   node scripts/seedDemoReviews.js            -> add sample reviews (needs the API running)
 *   node scripts/seedDemoReviews.js --remove   -> delete every sample review again
 *
 * The hotels are read from the running API (API_URL, default http://localhost:5000) for
 * Goa and Patna. Running it twice does not add duplicates.
 */
require("dotenv").config();

const mongoose = require("mongoose");
const Review = require("../models/Review");

const API_URL = process.env.API_URL || "http://localhost:5000";

const AREAS = [
  { name: "Goa", lat: 15.5, lon: 73.8, hotels: 8 },
  { name: "Patna", lat: 25.5941, lon: 85.1376, hotels: 6 },
];

const NAMES = ["Anand Y.", "Vijay C.", "Sachin K.", "Amit B.", "Gaurav S.", "Parth S.", "Neha R.", "Priya N.", "Rohit M.", "Sneha D.", "Imran A.", "Kavya P."];

// General comments only: nothing here claims a fact about a particular hotel
const COMMENTS = {
  5: ["Wonderful stay. Clean rooms and very helpful staff.", "Great value, comfortable beds and a smooth check-in.", "Loved it. We would stay here again.", ""],
  4: ["Good stay overall. Rooms were clean and the location was convenient.", "Comfortable and friendly. A few small things could be better.", "Nice hotel for the price.", ""],
  3: ["Average stay. Rooms were fine but nothing special.", "Okay for a short trip.", ""],
  2: ["Rooms needed better upkeep.", "Not what we expected for the price.", ""],
  1: ["Disappointing stay.", ""],
};

// small repeatable pseudo-random numbers, so the same hotel always gets the same sample reviews
const seeded = (text) => {
  let h = 2166136261;

  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;

  return () => {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;

    return h / 4294967296;
  };
};

const pickRating = (rand) => {
  const r = rand();

  return r < 0.42 ? 5 : r < 0.75 ? 4 : r < 0.87 ? 3 : r < 0.95 ? 2 : 1;
};

const fetchHotels = async (area) => {
  const res = await fetch(`${API_URL}/api/location/stays?lat=${area.lat}&lon=${area.lon}&radius=15000&limit=30`);
  const body = await res.json();

  return (body.data || []).slice(0, area.hotels);
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/voyara_db");

  if (process.argv.includes("--remove")) {
    const result = await Review.deleteMany({ isDemo: true });

    console.log(`Removed ${result.deletedCount} sample reviews.`);
    await mongoose.disconnect();
    return;
  }

  let added = 0;

  for (const area of AREAS) {
    const hotels = await fetchHotels(area);

    if (hotels.length === 0) console.warn(`No hotels came back for ${area.name}. Is the API running at ${API_URL}?`);

    for (const hotel of hotels) {
      if (await Review.exists({ itemType: "stay", itemId: hotel.placeId })) continue;

      const rand = seeded(hotel.placeId);
      const count = 6 + Math.floor(rand() * 9);

      const docs = Array.from({ length: count }, (_, i) => {
        const rating = pickRating(rand);
        const options = COMMENTS[rating];

        return {
          user: new mongoose.Types.ObjectId(),
          userName: NAMES[Math.floor(rand() * NAMES.length)],
          itemType: "stay",
          itemId: hotel.placeId,
          rating,
          comment: options[Math.floor(rand() * options.length)],
          isDemo: true,
          createdAt: new Date(Date.now() - (i * 9 + Math.floor(rand() * 8)) * 86400000),
        };
      });

      await Review.insertMany(docs);
      added += docs.length;
      console.log(`${area.name}: ${hotel.name} <- ${docs.length} sample reviews`);
    }
  }

  console.log(`Added ${added} sample reviews. Remove them any time with: node scripts/seedDemoReviews.js --remove`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect();
  process.exit(1);
});
