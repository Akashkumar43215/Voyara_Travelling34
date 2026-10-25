const mongoose = require("mongoose");

const Booking = require("../models/Booking");
const razorpay = require("../services/razorpayService");
const { sendBookingEmail } = require("../services/emailService");

/**
 * Online payments (Razorpay). See services/razorpayService.js for the rules.
 *
 * A booking becomes paid in exactly one place: markPaid. It is reached from the
 * browser's signed callback (verifyPayment) and from Razorpay's signed webhook,
 * whichever comes first. Both are idempotent, so the second one changes nothing.
 */

const getPaymentConfig = (req, res) => res.status(200).json({ success: true, data: razorpay.publicConfig() });

/**
 * Marks a booking paid, once, with the gateway's ids. Returns the booking, or null when
 * it was already paid or was cancelled in the meantime.
 */
const markPaid = (filter, { orderId, paymentId }) =>
  Booking.findOneAndUpdate(
    { ...filter, status: { $ne: "cancelled" }, paymentStatus: { $ne: "paid" } },
    {
      status: "confirmed",
      paymentStatus: "paid",
      payment: { provider: "razorpay", orderId, paymentId, paidAt: new Date() },
    },
    { new: true }
  );

const ownBooking = (req) => {
  const { bookingId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(bookingId)) return null;

  return Booking.findOne({ _id: bookingId, user: req.user.userId });
};

const reject = (res, status, message) => res.status(status).json({ success: false, message });

// POST /api/bookings/:bookingId/payment/order
const createPaymentOrder = async (req, res) => {
  try {
    if (!razorpay.isConfigured()) return reject(res, 400, "Online payment is not switched on.");

    const booking = await ownBooking(req);

    if (!booking) return reject(res, 404, "Booking not found.");
    if (booking.status === "cancelled") return reject(res, 400, "This booking was cancelled, so it cannot be paid. Please make a new booking.");
    if (booking.paymentStatus === "paid") return reject(res, 400, "This booking has already been paid.");

    // The amount is whatever the server priced the booking at. Nothing from the request is used.
    const amount = Number(booking.pricing?.totalAmount || 0);

    if (!(amount > 0)) return reject(res, 400, "This booking has no amount to pay.");

    const order = await razorpay.createOrder({
      amount,
      receipt: booking.bookingReference,
      notes: { bookingId: String(booking._id), reference: booking.bookingReference },
    });

    await Booking.updateOne({ _id: booking._id }, { "payment.provider": "razorpay", "payment.orderId": order.id });

    return res.status(200).json({
      success: true,
      data: {
        keyId: process.env.RAZORPAY_KEY_ID,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        reference: booking.bookingReference,
      },
    });
  } catch (error) {
    console.error("Create Payment Order Error:", error.response?.data?.error?.description || error.message);

    return reject(res, 502, "The payment service is not available right now. Please try again.");
  }
};

// POST /api/bookings/:bookingId/payment/verify   body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body || {};

    const booking = await ownBooking(req);

    if (!booking) return reject(res, 404, "Booking not found.");

    // The order must be the one we created for THIS booking, and the signature must be Razorpay's
    if (typeof orderId !== "string" || orderId !== booking.payment?.orderId || !razorpay.verifyPaymentSignature({ orderId, paymentId, signature })) {
      return reject(res, 400, "The payment could not be verified.");
    }

    if (booking.paymentStatus === "paid") {
      return res.status(200).json({ success: true, message: "This booking is already paid.", data: booking });
    }

    const paid = await markPaid({ _id: booking._id }, { orderId, paymentId });

    if (!paid) {
      // cancelled while the payment was in flight: give the money back
      await refundQuietly(paymentId, booking.pricing?.totalAmount, booking.bookingReference);

      return reject(res, 409, "This booking was cancelled, so your payment is being refunded.");
    }

    sendBookingEmail("paid", paid);

    return res.status(200).json({ success: true, message: "Payment received. Your booking is confirmed.", data: paid });
  } catch (error) {
    console.error("Verify Payment Error:", error.message);

    return reject(res, 500, "Failed to confirm the payment.");
  }
};

const refundQuietly = async (paymentId, amount, reference) => {
  try {
    await razorpay.refundPayment(paymentId, amount, { reason: "Booking was cancelled before payment finished", reference });
  } catch (error) {
    console.error("Automatic refund failed for", reference, error.response?.data?.error?.description || error.message);
  }
};

// POST /api/payments/razorpay/webhook   (mounted with express.raw in app.js: the body is a Buffer)
const razorpayWebhook = async (req, res) => {
  try {
    if (!razorpay.verifyWebhookSignature(req.body, req.headers["x-razorpay-signature"])) {
      return reject(res, 400, "Invalid signature.");
    }

    const event = JSON.parse(req.body.toString("utf8"));
    const payment = event?.payload?.payment?.entity;

    if (!["payment.captured", "order.paid"].includes(event?.event) || !payment?.order_id || !payment?.id) {
      return res.status(200).json({ success: true, message: "Ignored." });
    }

    const booking = await Booking.findOne({ "payment.orderId": payment.order_id });

    if (!booking) return res.status(200).json({ success: true, message: "Unknown order, ignored." });

    // Never trust an amount we did not price
    if (Number(payment.amount) !== razorpay.toPaise(booking.pricing?.totalAmount)) {
      console.error("Webhook amount mismatch for", booking.bookingReference);

      return res.status(200).json({ success: true, message: "Amount mismatch, ignored." });
    }

    if (booking.paymentStatus !== "paid") {
      const paid = await markPaid({ _id: booking._id }, { orderId: payment.order_id, paymentId: payment.id });

      if (paid) sendBookingEmail("paid", paid);
      else if (booking.status === "cancelled") await refundQuietly(payment.id, booking.pricing?.totalAmount, booking.bookingReference);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Razorpay Webhook Error:", error.message);

    // a 5xx makes Razorpay retry, which is what we want for a temporary fault
    return reject(res, 500, "Webhook failed.");
  }
};

/**
 * Sends a refund through the gateway when the booking was paid online.
 * Resolves true when nothing needed refunding or the refund started; throws when the gateway refused.
 */
const refundThroughGateway = async (booking, amount) => {
  if (!(amount > 0) || booking.payment?.provider !== "razorpay" || !booking.payment?.paymentId) return false;

  await razorpay.refundPayment(booking.payment.paymentId, amount, { reference: booking.bookingReference });

  return true;
};

module.exports = { getPaymentConfig, createPaymentOrder, verifyPayment, razorpayWebhook, refundThroughGateway };
