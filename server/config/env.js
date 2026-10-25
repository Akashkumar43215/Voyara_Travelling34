/**
 * Checks the environment once at startup so a bad setup fails loudly and early
 * instead of breaking on the first request.
 *
 * Required: MONGO_URI, JWT_SECRET (a strong one in production).
 * Optional features (their pages degrade gracefully): GEOAPIFY_API_KEY,
 * CLOUDINARY_*, PEXELS_API_KEY.
 */

const isProduction = process.env.NODE_ENV === "production";

const WEAK_SECRETS = ["your_jwt_secret_key_here", "secret", "changeme", "jwt_secret", "test"];

const validateEnv = () => {
  const errors = [];
  const warnings = [];

  if (!process.env.MONGO_URI) {
    if (isProduction) errors.push("MONGO_URI is not set.");
    else warnings.push("MONGO_URI is not set, using mongodb://127.0.0.1:27017/voyara_db");
  }

  const secret = process.env.JWT_SECRET || "";

  if (!secret) {
    errors.push("JWT_SECRET is not set. Logins cannot work without it.");
  } else if (isProduction && (secret.length < 32 || WEAK_SECRETS.includes(secret.toLowerCase()))) {
    errors.push("JWT_SECRET is too weak for production. Use a random value of at least 32 characters.");
  } else if (secret.length < 16 || WEAK_SECRETS.includes(secret.toLowerCase())) {
    warnings.push("JWT_SECRET looks weak. Change it before going live.");
  }

  if (isProduction && !process.env.CLIENT_URL) {
    warnings.push("CLIENT_URL is not set, so only the website served by this same server can call the API. If your website is hosted somewhere else, set CLIENT_URL to its address.");
  }

  if (!process.env.GEOAPIFY_API_KEY) {
    warnings.push("GEOAPIFY_API_KEY is not set: city search, nearby places, hotels and restaurants will not work.");
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    warnings.push("Cloudinary is not fully configured: place and state images will fall back to stock photos.");
  }

  if (!process.env.PEXELS_API_KEY) {
    warnings.push("PEXELS_API_KEY is not set: hotels and places without their own photo will have no stock photo.");
  }

  if (process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_SECRET) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      errors.push("Set both RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET, or neither.");
    }

    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
      const message = "RAZORPAY_WEBHOOK_SECRET is not set: payments will only confirm through the browser, and a closed tab could leave a paid booking unconfirmed.";
      if (isProduction) errors.push(message);
      else warnings.push(message);
    }

    if (isProduction && /^rzp_test_/.test(process.env.RAZORPAY_KEY_ID || "")) {
      warnings.push("RAZORPAY_KEY_ID is a TEST key: no real money will move.");
    }
  }

  if (!process.env.SMTP_HOST || !process.env.MAIL_FROM) {
    warnings.push("SMTP_HOST / MAIL_FROM are not set: booking emails are switched off.");
  }

  return { errors, warnings };
};

module.exports = { validateEnv, isProduction };
