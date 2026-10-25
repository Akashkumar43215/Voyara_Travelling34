const mongoose = require("mongoose");

const User = require("../models/User");
const Booking = require("../models/Booking");
const { sendBookingEmail } = require("../services/emailService");
const { refundThroughGateway } = require("./paymentController");

const STATUSES = ["pending", "confirmed", "cancelled"];
const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const oneOf = (value, allowed) => (typeof value === "string" && allowed.includes(value) ? value : null);

const plainText = (value, max = 80) => (typeof value === "string" ? value.trim().slice(0, max) : "");

// ======================================================
// BOOKINGS: list with search, filters and pages
// ======================================================

/** Turns ?q=&status=&paymentStatus= into a Mongo filter. Only plain strings are used. */
const bookingFilter = (query) => {
  const filter = {};
  const status = oneOf(query.status, STATUSES);
  const paymentStatus = oneOf(query.paymentStatus, PAYMENT_STATUSES);
  const q = plainText(query.q);

  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;

  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ bookingReference: rx }, { "traveler.name": rx }, { "traveler.email": rx }, { "destination.name": rx }];
  }

  return filter;
};

const getAdminBookings = async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const filter = bookingFilter(req.query);

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Booking.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: bookings.length,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      data: bookings,
    });
  } catch (error) {
    console.error("Admin Bookings Error:", error.message);

    return res.status(500).json({ success: false, message: "Failed to load admin bookings." });
  }
};

// ======================================================
// BOOKINGS: CSV export
// ======================================================

// A cell starting with = + - @ can run as a formula when the file is opened in Excel
const csvCell = (value) => {
  let text = String(value ?? "");

  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;

  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const day = (date) => (date ? new Date(date).toISOString().slice(0, 10) : "");

const bookingsToCsv = (bookings) => {
  const header = ["Reference", "Booked on", "Traveler", "Email", "Phone", "Destination", "Hotel", "Room", "Check-in", "Check-out", "Nights", "Rooms", "Adults", "Children", "Status", "Payment", "Total (INR)", "Refund (INR)"];

  const lines = bookings.map((b) => [
    b.bookingReference,
    day(b.createdAt),
    b.traveler?.name,
    b.traveler?.email,
    b.traveler?.phone,
    b.destination?.name,
    b.accommodation?.name,
    b.room?.name,
    day(b.checkIn),
    day(b.checkOut),
    b.nights,
    b.rooms,
    b.adults,
    b.children,
    b.status,
    b.paymentStatus,
    b.pricing?.totalAmount,
    b.cancellation?.refundAmount || 0,
  ]);

  return [header, ...lines].map((row) => row.map(csvCell).join(",")).join("\r\n");
};

const exportBookings = async (req, res) => {
  try {
    const bookings = await Booking.find(bookingFilter(req.query)).sort({ createdAt: -1 }).limit(5000).lean();

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="voyara-bookings-${day(new Date())}.csv"`);

    // BOM so Excel reads the rupee sign and accents correctly
    return res.status(200).send(`﻿${bookingsToCsv(bookings)}`);
  } catch (error) {
    console.error("Admin Export Error:", error.message);

    return res.status(500).json({ success: false, message: "Failed to export bookings." });
  }
};

// ======================================================
// BOOKINGS: cancel (and optionally refund) as an admin
// ======================================================

const adminCancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID." });
    }

    const refund = req.body?.refund === true;
    const reason = plainText(req.body?.reason, 200);

    const existing = await Booking.findById(bookingId);

    if (!existing) return res.status(404).json({ success: false, message: "Booking not found." });

    const refundAmount = refund && existing.paymentStatus === "paid" ? Number(existing.pricing?.totalAmount || 0) : 0;

    if (existing.status !== "cancelled") {
      try {
        await refundThroughGateway(existing, refundAmount);
      } catch (refundError) {
        console.error("Gateway refund failed:", refundError.response?.data?.error?.description || refundError.message);

        return res.status(502).json({ success: false, message: "The gateway refused the refund. The booking was not cancelled." });
      }
    }

    // One atomic step: an already cancelled booking can never be cancelled (or refunded) twice
    const booking = await Booking.findOneAndUpdate(
      { _id: bookingId, status: { $ne: "cancelled" } },
      {
        status: "cancelled",
        ...(refundAmount > 0 ? { paymentStatus: "refunded" } : {}),
        cancellation: {
          cancelledAt: new Date(),
          refundAmount,
          cancelledBy: "admin",
          note: `Cancelled by VOYARA support${reason ? `: ${reason}` : ""}. ${refundAmount > 0 ? "Full refund issued." : "No refund."}`,
        },
      },
      { new: true }
    );

    if (!booking) return res.status(400).json({ success: false, message: "This booking is already cancelled." });

    sendBookingEmail("cancelled", booking);

    return res.status(200).json({ success: true, message: refundAmount > 0 ? "Booking cancelled and refunded." : "Booking cancelled.", data: booking });
  } catch (error) {
    console.error("Admin Cancel Error:", error.message);

    return res.status(500).json({ success: false, message: "Failed to cancel the booking." });
  }
};

// ======================================================
// TRAVELERS
// ======================================================

const getAdminUsers = async (req, res) => {
  try {
    const q = plainText(req.query.q);
    const filter = q ? { $or: [{ name: new RegExp(escapeRegex(q), "i") }, { email: new RegExp(escapeRegex(q), "i") }] } : {};

    const users = await User.find(filter).sort({ createdAt: -1 }).limit(100).lean();

    const counts = await Booking.aggregate([
      { $match: { user: { $in: users.map((u) => u._id) } } },
      { $group: { _id: "$user", bookings: { $sum: 1 }, spent: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$pricing.totalAmount", 0] } } } },
    ]);

    const byUser = new Map(counts.map((c) => [String(c._id), c]));

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users.map((u) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
        bookings: byUser.get(String(u._id))?.bookings || 0,
        spent: byUser.get(String(u._id))?.spent || 0,
      })),
    });
  } catch (error) {
    console.error("Admin Users Error:", error.message);

    return res.status(500).json({ success: false, message: "Failed to load travelers." });
  }
};

const setUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const role = req.body?.role;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user ID." });
    }

    if (role !== "user" && role !== "admin") {
      return res.status(400).json({ success: false, message: "Role must be user or admin." });
    }

    // Stops an admin locking everyone out by removing their own access
    if (String(userId) === String(req.user.userId) && role !== "admin") {
      return res.status(400).json({ success: false, message: "You cannot remove your own admin access." });
    }

    const user = await User.findByIdAndUpdate(userId, { role }, { new: true }).lean();

    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    return res.status(200).json({ success: true, message: `${user.name} is now ${user.role}.`, data: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error("Admin Role Error:", error.message);

    return res.status(500).json({ success: false, message: "Failed to change the role." });
  }
};

// ======================================================
// REVENUE OVER TIME (paid bookings, by booking date)
// ======================================================

const getRevenueSeries = async (req, res) => {
  try {
    const monthly = req.query.range === "12m";
    const now = new Date();

    const since = monthly
      ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1))
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29));

    const rows = await Booking.aggregate([
      { $match: { paymentStatus: "paid", createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: monthly ? "%Y-%m" : "%Y-%m-%d", date: "$createdAt" } }, revenue: { $sum: "$pricing.totalAmount" }, bookings: { $sum: 1 } } },
    ]);

    const byKey = new Map(rows.map((r) => [r._id, r]));
    const points = [];

    for (let i = 0; i < (monthly ? 12 : 30); i += 1) {
      const d = monthly
        ? new Date(Date.UTC(since.getUTCFullYear(), since.getUTCMonth() + i, 1))
        : new Date(Date.UTC(since.getUTCFullYear(), since.getUTCMonth(), since.getUTCDate() + i));

      const key = d.toISOString().slice(0, monthly ? 7 : 10);

      points.push({ label: key, revenue: byKey.get(key)?.revenue || 0, bookings: byKey.get(key)?.bookings || 0 });
    }

    return res.status(200).json({ success: true, range: monthly ? "12m" : "30d", data: points });
  } catch (error) {
    console.error("Admin Revenue Error:", error.message);

    return res.status(500).json({ success: false, message: "Failed to load revenue." });
  }
};

module.exports = {
  getAdminBookings,
  exportBookings,
  adminCancelBooking,
  getAdminUsers,
  setUserRole,
  getRevenueSeries,
  bookingsToCsv,
  csvCell,
};
