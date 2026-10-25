const express = require("express");

const {
  createBooking,
  getMyBookings,
  completeDemoPayment,
  checkAvailability,
  getCancellationQuote,
  cancelBooking,
} = require("../controllers/bookingController");

const { changeBookingDates } = require("../controllers/bookingChangeController");

const {
  getPaymentConfig,
  createPaymentOrder,
  verifyPayment,
} = require("../controllers/paymentController");

const {
  protect,
} = require("../middleware/authMiddleware");

const router = express.Router();

// ======================================================
// CHECK ROOM AVAILABILITY
// ======================================================

// Read-only, so visitors can check availability before logging in
router.post(
  "/check-availability",
  checkAvailability
);

// ======================================================
// CREATE BOOKING
// ======================================================

// User must be logged in
router.post(
  "/",
  protect,
  createBooking
);

// ======================================================
// GET CURRENT USER'S BOOKINGS
// ======================================================

router.get(
  "/my",
  protect,
  getMyBookings
);

// ======================================================
// ONLINE PAYMENT (Razorpay)
// ======================================================

// Tells the page whether to show the demo or the real checkout
router.get("/payment-config", getPaymentConfig);

router.post("/:bookingId/payment/order", protect, createPaymentOrder);
router.post("/:bookingId/payment/verify", protect, verifyPayment);

// ======================================================
// COMPLETE DEMO PAYMENT
// ======================================================

router.patch(
  "/:bookingId/payment",
  protect,
  completeDemoPayment
);

// ======================================================
// CANCELLATION (policy preview, then cancel)
// ======================================================

// Move a booking to new dates (body.dryRun previews the price without saving)
router.patch(
  "/:bookingId/dates",
  protect,
  changeBookingDates
);

router.get(
  "/:bookingId/cancellation",
  protect,
  getCancellationQuote
);

router.patch(
  "/:bookingId/cancel",
  protect,
  cancelBooking
);

module.exports = router;