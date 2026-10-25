const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Check Authorization header
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login.",
      });
    }

    // Extract token
    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // Store authenticated user information
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    console.error("JWT Authentication Error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
    });
  }
};

// Like protect, but a visitor without a valid token just continues as a guest
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
      req.user = { userId: decoded.userId, role: decoded.role };
    } catch (error) {
      // expired or bad token: treat as a guest
    }
  }

  next();
};

// ======================================================
// ADMIN AUTHORIZATION
// ======================================================

// The role in the token can be up to 7 days old, so admin rights are read from the
// database on every admin request. Removing someone's admin role takes effect at once.
const adminOnly = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  try {
    const account = await User.findById(req.user.userId).select("role").lean();

    if (!account || account.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required.",
      });
    }

    req.user.role = account.role;

    return next();
  } catch (error) {
    console.error("Admin check error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not verify admin access.",
    });
  }
};

module.exports = {
  protect,
  optionalAuth,
  adminOnly,
};