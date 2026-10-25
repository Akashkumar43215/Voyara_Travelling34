const express = require("express");

const { getMessages, markMessageRead } = require("../controllers/contactController");

const { getAdminStats } = require("../controllers/adminController");

const {
  getAdminBookings,
  exportBookings,
  adminCancelBooking,
  getAdminUsers,
  setUserRole,
  getRevenueSeries,
} = require("../controllers/adminManageController");

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();

// ======================================================
// ADMIN STATISTICS
// ======================================================

router.get(
  "/stats",
  protect,
  adminOnly,
  getAdminStats
);

// ======================================================
// ADMIN RECENT BOOKINGS
// ======================================================

router.get(
  "/bookings",
  protect,
  adminOnly,
  getAdminBookings
);

// ======================================================
// CONTACT MESSAGES (from the Contact page)
// ======================================================

router.get("/messages", protect, adminOnly, getMessages);
router.patch("/messages/:id/read", protect, adminOnly, markMessageRead);

router.get("/bookings/export", protect, adminOnly, exportBookings);
router.patch("/bookings/:bookingId/cancel", protect, adminOnly, adminCancelBooking);
router.get("/revenue", protect, adminOnly, getRevenueSeries);
router.get("/users", protect, adminOnly, getAdminUsers);
router.patch("/users/:userId/role", protect, adminOnly, setUserRole);

module.exports = router;