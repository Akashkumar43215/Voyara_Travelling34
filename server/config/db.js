const mongoose = require("mongoose");

/**
 * Connect to MongoDB
 * Supports both:
 * 1. Local MongoDB
 * 2. MongoDB Atlas
 */
const connectDB = async () => {
  try {
    const mongoURI =
      process.env.MONGO_URI ||
      "mongodb://127.0.0.1:27017/voyara_db";

    const conn = await mongoose.connect(mongoURI);

    console.log(
      `[Database] MongoDB Connected: ${conn.connection.host}`
    );

    console.log(
      `[Database] Database Name: ${conn.connection.name}`
    );

    return conn;
  } catch (error) {
    console.error(
      `[Database Error] Failed to connect to MongoDB: ${error.message}`
    );

    console.error(
      "[Database Advice] Check that MongoDB is running or verify MONGO_URI in server/.env"
    );

    // IMPORTANT:
    // Tell server.js that database connection failed.
    throw error;
  }
};

// MongoDB connection lifecycle events

mongoose.connection.on("connected", () => {
  console.log(
    "[Database Event] Mongoose connected to MongoDB"
  );
});

mongoose.connection.on("error", (err) => {
  console.error(
    `[Database Event] Mongoose connection error: ${err.message}`
  );
});

mongoose.connection.on("disconnected", () => {
  console.warn(
    "[Database Event] Mongoose disconnected from MongoDB"
  );
});

module.exports = connectDB;
