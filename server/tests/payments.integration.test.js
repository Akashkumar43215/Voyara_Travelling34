/**
 * Online payment (Razorpay) tested end to end against a throwaway MongoDB.
 * Razorpay's servers are replaced by a recording fake, so no network is used.
 * Skips itself when no local `mongod` can be found (see helpers/testDb.js).
 */
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "integration-test-secret-integration-test";
process.env.RATE_LIMIT = "off";
process.env.RAZORPAY_KEY_ID = "rzp_test_unit";
process.env.RAZORPAY_KEY_SECRET = "unit-test-key-secret";
process.env.RAZORPAY_WEBHOOK_SECRET = "unit-test-webhook-secret";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const mongoose = require("mongoose");

const { findMongod, startTestDb } = require("./helpers/testDb");
const razorpay = require("../services/razorpayService");
const { hasFreeCancellation } = require("../services/stayProfile");

const binary = findMongod();
const skip = binary ? false : "mongod was not found: set MONGOD_PATH to run the payment integration tests";

const sign = (secret, data) => crypto.createHmac("sha256", secret).update(data).digest("hex");

test("Razorpay payments", { skip }, async (t) => {
  const db = await startTestDb(binary);
  await mongoose.connect(db.uri);

  const app = require("../app");
  const Room = require("../models/Room");
  const Stay = require("../models/Stay");
  const User = require("../models/User");
  const Booking = require("../models/Booking");

  // a fake Razorpay that records what the server asked it to do
  const gateway = { calls: [], failRefunds: false };
  razorpay.http.post = async (url, body) => {
    gateway.calls.push({ url, body });

    if (url.endsWith("/orders")) return { data: { id: `order_${gateway.calls.length}`, amount: body.amount, currency: body.currency } };
    if (gateway.failRefunds) throw Object.assign(new Error("refused"), { response: { data: { error: { description: "refused" } } } });

    return { data: { id: "rfnd_1" } };
  };

  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;

  t.after(async () => {
    server.close();
    await mongoose.disconnect();
    await db.stop();
  });

  const call = async (method, path, body, token) => {
    const response = await fetch(base + path, {
      method,
      headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    let json;
    try { json = JSON.parse(text); } catch { json = null; }

    return { status: response.status, json, headers: response.headers };
  };

  const webhook = (payload, secret = process.env.RAZORPAY_WEBHOOK_SECRET, signature) => {
    const raw = Buffer.from(JSON.stringify(payload));

    return fetch(`${base}/api/payments/razorpay/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-razorpay-signature": signature ?? sign(secret, raw) },
      body: raw,
    }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));
  };

  const signUp = async (name) => {
    await call("POST", "/api/auth/register", { name: `${name} tester`, email: `${name}@example.com`, password: "abcdef12" });
    const login = await call("POST", "/api/auth/login", { email: `${name}@example.com`, password: "abcdef12" });

    return { token: login.json.token, id: login.json.data.id };
  };

  const ann = await signUp("ann");
  const bob = await signUp("bob");

  const stay = await Stay.create({ name: "Test Hotel", address: "a", lat: 1, lon: 1, geoapifyPlaceId: "p1", category: "hotel" });
  const room = await Room.create({ stay: stay._id, name: "Standard", pricePerNight: 2500, maxGuests: 2, totalRooms: 100, availableRooms: 100 });

  // a hotel id that offers free cancellation, and one that does not
  const freeId = Array.from({ length: 200 }, (_, i) => `hotel-${i}`).find((id) => hasFreeCancellation({ placeId: id, name: "H" }));
  const strictId = Array.from({ length: 200 }, (_, i) => `hotel-${i}`).find((id) => !hasFreeCancellation({ placeId: id, name: "H" }));

  let counter = 0;
  const book = async (placeId = freeId) => {
    counter += 1;
    const isoDay = (offset) => new Date(Date.UTC(2031, 5, 1 + offset)).toISOString().slice(0, 10);
    const r = await call(
      "POST",
      "/api/bookings",
      {
        destination: { name: "Goa" },
        traveler: { name: "Ann", email: "ann@example.com", phone: "9999999999" },
        accommodation: { name: "H", placeId },
        room: { id: String(room._id) },
        checkIn: isoDay(counter),
        checkOut: isoDay(counter + 1),
        rooms: 1,
        adults: 2,
        children: 0,
      },
      ann.token
    );

    assert.equal(r.status, 201, JSON.stringify(r.json));
    return r.json.data;
  };

  const payOrder = (booking, token = ann.token) => call("POST", `/api/bookings/${booking._id}/payment/order`, null, token);

  const checkoutSignature = (orderId, paymentId) => sign(process.env.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`);

  await t.test("the page is told online payment is on, without the secret", async () => {
    const r = await call("GET", "/api/bookings/payment-config");

    assert.equal(r.json.data.mode, "razorpay");
    assert.equal(r.json.data.keyId, "rzp_test_unit");
    assert.ok(!JSON.stringify(r.json).includes(process.env.RAZORPAY_KEY_SECRET));
  });

  await t.test("the demo payment endpoint is switched off, so it cannot skip paying", async () => {
    const b = await book();
    const r = await call("PATCH", `/api/bookings/${b._id}/payment`, null, ann.token);

    assert.equal(r.status, 403);
    assert.equal((await Booking.findById(b._id)).paymentStatus, "pending");
  });

  await t.test("the security headers allow Razorpay's checkout only now that it is on", async () => {
    const csp = (await call("GET", "/api/health")).headers.get("content-security-policy");

    assert.ok(csp.includes("script-src 'self' https://checkout.razorpay.com"));
    assert.ok(csp.includes("frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com"));
  });

  await t.test("the order amount is the server's price, in paise, for the owner only", async () => {
    const b = await book();

    assert.equal((await payOrder(b)).status, 200);

    const order = gateway.calls.filter((c) => c.url.endsWith("/orders")).pop();

    assert.equal(order.body.amount, b.pricing.totalAmount * 100);
    assert.equal(order.body.currency, "INR");
    assert.equal(order.body.receipt, b.bookingReference);

    assert.equal((await payOrder(b, bob.token)).status, 404, "another user cannot start a payment");
    assert.equal((await call("POST", `/api/bookings/${b._id}/payment/order`)).status, 401);
  });

  await t.test("a payment confirms only with Razorpay's signature for this booking's order", async () => {
    const b = await book();
    const { orderId } = (await payOrder(b)).json.data;
    const verify = (body, token = ann.token) => call("POST", `/api/bookings/${b._id}/payment/verify`, body, token);

    const forged = await verify({ razorpay_order_id: orderId, razorpay_payment_id: "pay_1", razorpay_signature: "0".repeat(64) });
    assert.equal(forged.status, 400);
    assert.equal(
      (await verify({ razorpay_order_id: "order_other", razorpay_payment_id: "pay_1", razorpay_signature: checkoutSignature("order_other", "pay_1") })).status,
      400,
      "a valid signature for a different order is refused"
    );
    assert.equal((await verify({ razorpay_order_id: orderId, razorpay_payment_id: "pay_1", razorpay_signature: checkoutSignature(orderId, "pay_1") }, bob.token)).status, 404);
    assert.equal((await Booking.findById(b._id)).paymentStatus, "pending");

    const ok = await verify({ razorpay_order_id: orderId, razorpay_payment_id: "pay_1", razorpay_signature: checkoutSignature(orderId, "pay_1") });
    assert.equal(ok.status, 200);
    assert.equal(ok.json.data.status, "confirmed");
    assert.equal(ok.json.data.payment.paymentId, "pay_1");

    // the same callback again changes nothing
    assert.equal((await verify({ razorpay_order_id: orderId, razorpay_payment_id: "pay_1", razorpay_signature: checkoutSignature(orderId, "pay_1") })).status, 200);
    assert.equal((await payOrder(b)).status, 400, "no second payment for a paid booking");
  });

  await t.test("the webhook confirms a booking when the browser never came back", async () => {
    const b = await book();
    const { orderId } = (await payOrder(b)).json.data;
    const event = (amount) => ({ event: "payment.captured", payload: { payment: { entity: { id: "pay_w1", order_id: orderId, amount } } } });

    assert.equal((await webhook(event(b.pricing.totalAmount * 100), undefined, "f".repeat(64))).status, 400, "bad signature");
    assert.equal((await webhook(event(b.pricing.totalAmount * 100), "some-other-secret")).status, 400, "wrong secret");
    assert.equal((await Booking.findById(b._id)).paymentStatus, "pending");

    assert.equal((await webhook(event(100))).status, 200);
    assert.equal((await Booking.findById(b._id)).paymentStatus, "pending", "a wrong amount never confirms");

    assert.equal((await webhook(event(b.pricing.totalAmount * 100))).status, 200);
    const paid = await Booking.findById(b._id);
    assert.equal(paid.paymentStatus, "paid");
    assert.equal(paid.status, "confirmed");

    assert.equal((await webhook(event(b.pricing.totalAmount * 100))).status, 200, "repeated webhooks are harmless");
    assert.equal((await webhook({ event: "payment.captured", payload: { payment: { entity: { id: "x", order_id: "order_unknown", amount: 1 } } } })).status, 200);
    assert.equal((await webhook({ event: "something.else" })).status, 200);
  });

  await t.test("a payment that lands on a cancelled booking is refunded automatically", async () => {
    const b = await book();
    const { orderId } = (await payOrder(b)).json.data;

    await call("PATCH", `/api/bookings/${b._id}/cancel`, null, ann.token);
    gateway.calls.length = 0;

    await webhook({ event: "payment.captured", payload: { payment: { entity: { id: "pay_late", order_id: orderId, amount: b.pricing.totalAmount * 100 } } } });

    assert.equal((await Booking.findById(b._id)).paymentStatus, "pending", "a cancelled booking is not revived");
    const refund = gateway.calls.find((c) => c.url.includes("/payments/pay_late/refund"));
    assert.ok(refund, "the gateway was asked to refund");
    assert.equal(refund.body.amount, b.pricing.totalAmount * 100);
  });

  const payFully = async (placeId) => {
    const b = await book(placeId);
    const { orderId } = (await payOrder(b)).json.data;
    const r = await call("POST", `/api/bookings/${b._id}/payment/verify`, { razorpay_order_id: orderId, razorpay_payment_id: `pay_${b.bookingReference}`, razorpay_signature: checkoutSignature(orderId, `pay_${b.bookingReference}`) }, ann.token);
    assert.equal(r.status, 200);

    return b;
  };

  await t.test("cancelling a paid booking with free cancellation refunds through the gateway", async () => {
    const b = await payFully(freeId);
    gateway.calls.length = 0;

    const r = await call("PATCH", `/api/bookings/${b._id}/cancel`, null, ann.token);

    assert.equal(r.status, 200);
    assert.equal(r.json.data.paymentStatus, "refunded");

    const refund = gateway.calls.find((c) => c.url.includes("/refund"));
    assert.ok(refund.url.includes(`pay_${b.bookingReference}`));
    assert.equal(refund.body.amount, b.pricing.totalAmount * 100);
  });

  await t.test("a non-refundable booking is cancelled without calling the gateway", async () => {
    const b = await payFully(strictId);
    gateway.calls.length = 0;

    const r = await call("PATCH", `/api/bookings/${b._id}/cancel`, null, ann.token);

    assert.equal(r.status, 200);
    assert.equal(r.json.data.cancellation.refundAmount, 0);
    assert.equal(gateway.calls.length, 0);
  });

  await t.test("if the gateway refuses the refund, the booking is NOT cancelled", async () => {
    const b = await payFully(freeId);
    gateway.failRefunds = true;

    const r = await call("PATCH", `/api/bookings/${b._id}/cancel`, null, ann.token);
    gateway.failRefunds = false;

    assert.equal(r.status, 502);
    const after = await Booking.findById(b._id);
    assert.equal(after.status, "confirmed");
    assert.equal(after.paymentStatus, "paid");

    assert.equal((await call("PATCH", `/api/bookings/${b._id}/cancel`, null, ann.token)).status, 200, "works once the gateway is back");
  });

  await t.test("an admin refund also goes through the gateway", async () => {
    await User.updateOne({ _id: bob.id }, { role: "admin" });
    const b = await payFully(strictId);
    gateway.calls.length = 0;

    const r = await call("PATCH", `/api/admin/bookings/${b._id}/cancel`, { refund: true, reason: "hotel closed" }, bob.token);

    assert.equal(r.status, 200);
    assert.equal(r.json.data.paymentStatus, "refunded");
    assert.ok(gateway.calls.some((c) => c.url.includes("/refund") && c.body.amount === b.pricing.totalAmount * 100));
  });
});
