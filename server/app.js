const fs = require("fs");
const path = require("path");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const mongoose = require("mongoose");

const { isProduction } = require("./config/env");
const {
  sanitizeInput,
  apiLimiter,
  authLimiter,
  searchLimiter,
  bookingLimiter,
  contactLimiter,
} = require("./middleware/security");

const uploadRoutes = require("./routes/uploadRoutes");
const locationRoutes = require("./routes/locationRoutes");
const authRoutes = require("./routes/authRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const adminRoutes = require("./routes/adminRoutes");
const roomRoutes = require("./routes/roomRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const favoriteRoutes = require("./routes/favoriteRoutes");
const addonRoutes = require("./routes/addonRoutes");
const stateRoutes = require("./routes/stateRoutes");
const placeRoutes = require("./routes/placeRoutes");
const contactRoutes = require("./routes/contactRoutes");
const assistantRoutes = require("./routes/assistantRoutes");
const { razorpayWebhook } = require("./controllers/paymentController");
const { isConfigured: onlinePaymentOn } = require("./services/razorpayService");

const app = express();

// Behind a host's load balancer (Render, Railway, Nginx...) the real client
// address is in X-Forwarded-For. Needed for correct rate limiting.
if (isProduction) app.set("trust proxy", 1);

app.disable("x-powered-by");

// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        // Razorpay's checkout script and frame are allowed only when online payment is on
        "script-src": ["'self'", ...(onlinePaymentOn() ? ["https://checkout.razorpay.com"] : [])],
        "frame-src": onlinePaymentOn() ? ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com"] : ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
        // photos come from Cloudinary, Pexels and Wikimedia
        "img-src": ["'self'", "data:", "blob:", "https:"],
        "connect-src": ["'self'", ...(onlinePaymentOn() ? ["https://api.razorpay.com", "https://lumberjack.razorpay.com"] : [])],
        "frame-ancestors": ["'self'"],
        "object-src": ["'none'"],
        "upgrade-insecure-requests": isProduction ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// ---------------------------------------------------------------------------
// CORS: CLIENT_URL (comma-separated) lists the sites allowed to call the API.
// Development allows any origin. In production with no CLIENT_URL only
// same-origin requests work, which is right when this server also serves the site.
// ---------------------------------------------------------------------------
const allowedOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : !isProduction,
    credentials: true,
  })
);

app.use(compression());

if (process.env.NODE_ENV !== "test") {
  app.use(morgan(isProduction ? "combined" : "dev"));
}

// Razorpay's webhook is signed over the exact bytes it sends, so it gets the RAW body.
// It must be mounted before express.json, which would change those bytes.
app.post("/api/payments/razorpay/webhook", express.raw({ type: "application/json", limit: "100kb" }), razorpayWebhook);

// Small bodies only: nothing here needs more than a few kilobytes
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(sanitizeInput);

// ---------------------------------------------------------------------------
// Health check (no database details in production)
// ---------------------------------------------------------------------------
const DB_STATES = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };

app.get("/api/health", (req, res) => {
  const status = DB_STATES[mongoose.connection.readyState] || "unknown";
  const healthy = status === "connected";

  const body = {
    success: healthy,
    message: healthy ? "VOYARA API is running" : "VOYARA API is running but the database is not connected",
    database: isProduction
      ? { status }
      : {
          status,
          name: mongoose.connection.name || "voyara_db",
          host: mongoose.connection.host || "localhost",
        },
  };

  res.status(healthy ? 200 : 503).json(body);
});

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
app.use("/api", apiLimiter);

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/location", searchLimiter, locationRoutes);
app.use("/api/addons", searchLimiter, addonRoutes);
app.use("/api/bookings", bookingLimiter, bookingRoutes);
app.use("/api/contact", contactLimiter, contactRoutes);
app.use("/api/assistant", searchLimiter, assistantRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/states", stateRoutes);
app.use("/api/places", placeRoutes);
app.use("/api/upload", uploadRoutes);

// Unknown API address
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "That API endpoint does not exist.",
  });
});

// ---------------------------------------------------------------------------
// Serve the built website (client/dist) when it exists, so one server can host
// both. Any non-API address returns the app, which handles its own routing.
// ---------------------------------------------------------------------------
const clientDist = path.join(__dirname, "..", "client", "dist");

if ((isProduction || process.env.SERVE_CLIENT === "true") && fs.existsSync(path.join(clientDist, "index.html"))) {
  // Hashed files in /assets never change, so browsers may keep them for a year
  app.use(
    "/assets",
    express.static(path.join(clientDist, "assets"), { maxAge: "365d", immutable: true })
  );
  app.use(express.static(clientDist, { maxAge: "1h" }));

  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// ---------------------------------------------------------------------------
// Errors: never reveal internals for server faults in production
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Bad JSON in a request
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "The request was not valid JSON." });
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({ success: false, message: "The request was too large." });
  }

  // File upload problems (wrong type, too big)
  if (err.name === "MulterError" || err.message === "Only image files are allowed.") {
    return res.status(400).json({ success: false, message: err.message });
  }

  const status = err.status || err.statusCode || 500;

  if (status >= 500) {
    console.error("Unhandled server error:", err.stack || err.message);
  }

  return res.status(status).json({
    success: false,
    message: status >= 500 && isProduction ? "Something went wrong on our side. Please try again." : err.message || "Internal Server Error",
  });
});

module.exports = app;
