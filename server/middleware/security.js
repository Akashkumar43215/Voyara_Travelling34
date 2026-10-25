const rateLimit = require("express-rate-limit");

const { isProduction } = require("../config/env");

// Limits protect a live site. While developing they only get in the way, so they are
// off unless RATE_LIMIT=on (the tests and production checks use that).
const limitsActive = isProduction || process.env.RATE_LIMIT === "on";

/**
 * Removes MongoDB operator keys ($gt, $ne ...) and dotted keys from request
 * data, so input like { "email": { "$gt": "" } } can never be used to change a
 * database query.
 */
const clean = (value) => {
  if (Array.isArray(value)) return value.map(clean);

  if (value && typeof value === "object") {
    const out = {};

    for (const [key, inner] of Object.entries(value)) {
      if (key.startsWith("$") || key.includes(".")) continue;
      out[key] = clean(inner);
    }

    return out;
  }

  return value;
};

const sanitizeInput = (req, res, next) => {
  if (req.body) req.body = clean(req.body);
  if (req.params) req.params = clean(req.params);

  // req.query is a getter in newer Express versions, so clean it in place
  if (req.query) {
    for (const key of Object.keys(req.query)) {
      if (key.startsWith("$") || key.includes(".")) delete req.query[key];
      else req.query[key] = clean(req.query[key]);
    }
  }

  next();
};

const limiter = ({ windowMinutes, max, message, onlyFailures = false }) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message },
    skip: () => !limitsActive,
    // for login: a successful login does not count, only wrong attempts do
    skipSuccessfulRequests: onlyFailures,
  });

// Everything under /api
const apiLimiter = limiter({
  windowMinutes: 15,
  max: 1500,
  message: "Too many requests. Please wait a few minutes and try again.",
});

// Login and sign-up: slows down password guessing
const authLimiter = limiter({
  windowMinutes: 15,
  max: 20,
  message: "Too many login attempts. Please wait 15 minutes and try again.",
  onlyFailures: true,
});

// Calls that spend map-service or image-service quota
const searchLimiter = limiter({
  windowMinutes: 1,
  max: 90,
  message: "You are searching too fast. Please slow down for a moment.",
});

// Booking actions
const bookingLimiter = limiter({
  windowMinutes: 15,
  max: 60,
  message: "Too many booking requests. Please wait a few minutes and try again.",
});

// Contact form: stops one visitor from flooding the inbox
const contactLimiter = limiter({
  windowMinutes: 15,
  max: 5,
  message: "You have sent several messages already. Please wait a little before sending another.",
});

module.exports = { sanitizeInput, apiLimiter, authLimiter, searchLimiter, bookingLimiter, contactLimiter };
