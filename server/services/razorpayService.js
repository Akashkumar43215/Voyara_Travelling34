/**
 * Razorpay payments: create an order, check signatures, refund.
 *
 * Card and UPI details never reach this server. The browser talks to Razorpay's own
 * checkout, and we only handle three things:
 *   1. createOrder   - the amount comes from the booking in OUR database, never from the page
 *   2. signatures    - a payment counts only when Razorpay's HMAC signature checks out
 *   3. refundPayment - refunds go back through the gateway
 *
 * Off until RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set. Then the demo payment
 * endpoint is switched off (see bookingController), so it cannot be used to skip paying.
 *
 * All amounts here are in rupees and are converted to paise (x100) at the edge.
 */

const crypto = require("crypto");
const axios = require("axios");

const API = "https://api.razorpay.com/v1";

// A single object so tests can swap the network call
const http = {
  post: (url, body, options) => axios.post(url, body, options),
};

const isConfigured = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

const auth = () => ({ username: process.env.RAZORPAY_KEY_ID, password: process.env.RAZORPAY_KEY_SECRET });

const toPaise = (rupees) => Math.round(Number(rupees) * 100);

/** Only the public key id goes to the browser, never the secret. */
const publicConfig = () => (isConfigured() ? { mode: "razorpay", keyId: process.env.RAZORPAY_KEY_ID } : { mode: "demo" });

const safeEqualHex = (expected, given) => {
  if (typeof given !== "string" || !/^[0-9a-f]+$/i.test(given) || given.length !== expected.length) return false;

  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(given, "hex"));
};

const hmac = (secret, data) => crypto.createHmac("sha256", secret).update(data).digest("hex");

/** Checks the three values Razorpay's checkout hands back after a payment. */
const verifyPaymentSignature = ({ orderId, paymentId, signature }) => {
  if (!isConfigured() || typeof orderId !== "string" || typeof paymentId !== "string") return false;

  return safeEqualHex(hmac(process.env.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`), signature);
};

/** Checks a webhook call. `rawBody` must be the exact bytes Razorpay sent. */
const verifyWebhookSignature = (rawBody, signature) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret || !Buffer.isBuffer(rawBody)) return false;

  return safeEqualHex(hmac(secret, rawBody), signature);
};

const createOrder = async ({ amount, receipt, notes }) => {
  const { data } = await http.post(`${API}/orders`, { amount: toPaise(amount), currency: "INR", receipt, notes }, { auth: auth(), timeout: 10000 });

  return data;
};

const refundPayment = async (paymentId, amount, notes) => {
  const { data } = await http.post(`${API}/payments/${encodeURIComponent(paymentId)}/refund`, { amount: toPaise(amount), notes }, { auth: auth(), timeout: 10000 });

  return data;
};

module.exports = {
  http,
  isConfigured,
  publicConfig,
  toPaise,
  verifyPaymentSignature,
  verifyWebhookSignature,
  createOrder,
  refundPayment,
};
