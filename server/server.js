require("dotenv").config();

const mongoose = require("mongoose");

const { validateEnv } = require("./config/env");

// Check the setup before anything else starts
const { errors, warnings } = validateEnv();

warnings.forEach((message) => console.warn(`[Config warning] ${message}`));

if (errors.length > 0) {
  console.error("===============================================");
  console.error("  VOYARA cannot start. Fix these problems first:");
  console.error("===============================================");
  errors.forEach((message) => console.error(`  - ${message}`));
  console.error("\nSee server/.env.example for every setting.");
  process.exit(1);
}

const app = require("./app");
const connectDB = require("./config/db");

const { autoSeedStates } = require("./scripts/seedStates");
const { autoSeedPlaces } = require("./scripts/seedPlaces");

const PORT = process.env.PORT || 5000;

let server;

/**
 * Start VOYARA backend
 *
 * Order:
 * 1. Connect MongoDB
 * 2. Load the states and curated places (only if missing or out of date)
 * 3. Start listening
 */
const startServer = async () => {
  try {
    await connectDB();
    console.log("[Startup] Database connection successful.");

    await autoSeedStates();
    await autoSeedPlaces();
    console.log("[Startup] Reference data ready.");

    server = app.listen(PORT, () => {
      console.log("===============================================");
      console.log(`  VOYARA Backend Server running on port ${PORT}`);
      console.log(`  Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`  Health Check: http://localhost:${PORT}/api/health`);
      console.log("===============================================");
    });
  } catch (error) {
    console.error("===============================================");
    console.error("  VOYARA Backend Startup Failed");
    console.error("===============================================");
    console.error(error.message);

    process.exit(1);
  }
};

/**
 * Stop cleanly: finish the requests in progress, close the database, then exit.
 * Hosts send SIGTERM when they restart or redeploy the app.
 */
const shutdown = (signal) => {
  console.log(`\n[Shutdown] ${signal} received, closing down...`);

  const finish = async () => {
    try {
      await mongoose.connection.close();
    } finally {
      process.exit(0);
    }
  };

  if (server) server.close(finish);
  else finish();

  // Do not hang forever if a connection refuses to close
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (err) => {
  console.error("Unhandled promise rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  process.exit(1);
});

startServer();
