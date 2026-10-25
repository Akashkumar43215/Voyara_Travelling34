const User = require("../models/User");
const Booking = require("../models/Booking");
const ContactMessage = require("../models/ContactMessage");

// ======================================================
// ADMIN DASHBOARD STATISTICS
// ======================================================

const getAdminStats = async (req, res) => {
  try {
    // Total registered users
    const totalUsers = await User.countDocuments();

    // Total bookings
    const totalBookings = await Booking.countDocuments();

    // Confirmed bookings
    const confirmedBookings =
      await Booking.countDocuments({
        status: "confirmed",
      });

    // Pending bookings
    const pendingBookings =
      await Booking.countDocuments({
        status: "pending",
      });

    // Cancelled bookings
    const cancelledBookings =
      await Booking.countDocuments({
        status: "cancelled",
      });

    // Paid bookings
    const paidBookings =
      await Booking.countDocuments({
        paymentStatus: "paid",
      });

    // Calculate revenue from paid bookings
    const revenueResult = await Booking.aggregate([
      {
        $match: {
          paymentStatus: "paid",
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: "$pricing.totalAmount",
          },
        },
      },
    ]);

    const totalRevenue =
      revenueResult.length > 0
        ? revenueResult[0].totalRevenue
        : 0;

    // ------------------------------------------------
    // SERVICES: meals, local travel and activities
    // (bookings that are not cancelled)
    // ------------------------------------------------
    const active = { status: { $ne: "cancelled" } };

    const [serviceTotals] = await Booking.aggregate([
      { $match: active },
      {
        $group: {
          _id: null,
          mealsRevenue: { $sum: "$pricing.mealsTotal" },
          transportRevenue: { $sum: "$pricing.transportTotal" },
          activitiesRevenue: { $sum: "$pricing.activitiesTotal" },
          withMeals: { $sum: { $cond: [{ $gt: ["$pricing.mealsTotal", 0] }, 1, 0] } },
          withTransport: { $sum: { $cond: [{ $gt: ["$pricing.transportTotal", 0] }, 1, 0] } },
          withActivities: { $sum: { $cond: [{ $gt: ["$pricing.activitiesTotal", 0] }, 1, 0] } },
        },
      },
    ]);

    const topActivities = await Booking.aggregate([
      { $match: active },
      { $unwind: "$addons.activities" },
      { $group: { _id: "$addons.activities.name", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const transportModes = await Booking.aggregate([
      { $match: { ...active, "addons.transport.mode": { $nin: ["", null] } } },
      { $group: { _id: "$addons.transport.label", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const mealPlans = await Booking.aggregate([
      { $match: active },
      {
        $group: {
          _id: {
            b: "$addons.meals.breakfast",
            l: "$addons.meals.lunch",
            d: "$addons.meals.dinner",
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const planName = ({ b, l, d }) => {
      const parts = [b && "Breakfast", l && "Lunch", d && "Dinner"].filter(Boolean);

      if (parts.length === 0) return "Room only";
      if (parts.length === 3) return "Full board";
      return parts.join(" + ");
    };

    const [totalMessages, unreadMessages] = await Promise.all([
      ContactMessage.countDocuments(),
      ContactMessage.countDocuments({ status: "new" }),
    ]);

    const services = {
      withMeals: serviceTotals?.withMeals || 0,
      withTransport: serviceTotals?.withTransport || 0,
      withActivities: serviceTotals?.withActivities || 0,
      mealsRevenue: serviceTotals?.mealsRevenue || 0,
      transportRevenue: serviceTotals?.transportRevenue || 0,
      activitiesRevenue: serviceTotals?.activitiesRevenue || 0,
      topActivities: topActivities.map((a) => ({ name: a._id, count: a.count })),
      transportModes: transportModes.map((t) => ({ name: t._id, count: t.count })),
      // null, missing and false meals all mean "not chosen", so same-named plans are merged
      mealPlans: Object.entries(
        mealPlans.reduce((acc, m) => {
          const name = planName(m._id || {});
          acc[name] = (acc[name] || 0) + m.count;
          return acc;
        }, {})
      )
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    };

    return res.status(200).json({
      success: true,

      data: {
        totalUsers,
        totalBookings,
        confirmedBookings,
        pendingBookings,
        cancelledBookings,
        paidBookings,
        totalRevenue,
        services,
        messages: { total: totalMessages, unread: unreadMessages },
      },
    });
  } catch (error) {
    console.error(
      "Admin Stats Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load admin statistics.",
    });
  }
};

module.exports = {
  getAdminStats,
};
