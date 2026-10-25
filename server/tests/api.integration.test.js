/**
 * End-to-end tests of the real Express app against a throwaway MongoDB.
 * They skip themselves when no local `mongod` can be found (see helpers/testDb.js).
 */
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "integration-test-secret-integration-test";
process.env.RATE_LIMIT = "off";
delete process.env.SMTP_HOST;
delete process.env.ANTHROPIC_API_KEY;

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const { findMongod, startTestDb } = require("./helpers/testDb");

const binary = findMongod();
const skip = binary ? false : "mongod was not found: set MONGOD_PATH to run the API integration tests";

test("API integration", { skip }, async (t) => {
  const db = await startTestDb(binary);
  await mongoose.connect(db.uri);

  const app = require("../app");
  const Room = require("../models/Room");
  const Stay = require("../models/Stay");
  const User = require("../models/User");
  const Booking = require("../models/Booking");

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

    return { status: response.status, json, text, headers: response.headers };
  };

  const signUp = async (name) => {
    const email = `${name}@example.com`;
    await call("POST", "/api/auth/register", { name: `${name} tester`, email, password: "abcdef12" });
    const login = await call("POST", "/api/auth/login", { email, password: "abcdef12" });

    return { email, token: login.json.token, id: login.json.data.id };
  };

  const ann = await signUp("ann");
  const bob = await signUp("bob");

  const stay = await Stay.create({ name: "Test Hotel", address: "a", lat: 1, lon: 1, geoapifyPlaceId: "p1", category: "hotel" });
  const makeRoom = (totalRooms = 1) => Room.create({ stay: stay._id, name: "Standard", pricePerNight: 2500, maxGuests: 2, totalRooms, availableRooms: totalRooms });

  const bookingBody = (room, extra = {}) => ({
    destination: { name: "Goa" },
    traveler: { name: "Ann", email: "ann@example.com", phone: "9999999999" },
    accommodation: { name: "Test Hotel", placeId: "p1" },
    room: { id: String(room._id) },
    checkIn: "2030-01-10",
    checkOut: "2030-01-12",
    rooms: 1,
    adults: 2,
    children: 0,
    ...extra,
  });

  const book = (room, extra, user = ann) => call("POST", "/api/bookings", bookingBody(room, extra), user.token);

  await t.test("login protects bookings and the server sets the price", async () => {
    const room = await makeRoom(5);

    assert.equal((await call("POST", "/api/bookings", bookingBody(room))).status, 401);

    const created = await book(room, { pricing: { totalAmount: 1 }, totalAmount: 1 });

    assert.equal(created.status, 201);
    assert.equal(created.json.data.pricing.totalAmount, 5250);
  });

  await t.test("nights come from the dates, past dates and bad numbers are refused", async () => {
    const room = await makeRoom(5);

    const stretched = await book(room, { checkIn: "2030-03-01", checkOut: "2030-03-03", nights: 50 });
    assert.equal(stretched.json.data.pricing.totalAmount, 5250);
    assert.equal(stretched.json.data.nights, 2);

    for (const bad of [{ checkIn: "2020-04-01", checkOut: "2020-04-03" }, { adults: 1.5 }, { rooms: -1 }, { destination: "Goa" }]) {
      const r = await book(room, { checkIn: "2030-05-01", checkOut: "2030-05-03", ...bad });
      assert.equal(r.status, 400, JSON.stringify(bad));
      assert.equal(r.json.error, undefined, "no internal error text");
    }
  });

  await t.test("a booking can only be seen, paid or cancelled by its owner", async () => {
    const room = await makeRoom(5);
    const mine = (await book(room)).json.data;

    const list = await call("GET", "/api/bookings/my", null, bob.token);
    assert.ok(list.json.data.every((b) => String(b._id) !== String(mine._id)));
    assert.equal((await call("PATCH", `/api/bookings/${mine._id}/payment`, null, bob.token)).status, 404);
    assert.equal((await call("PATCH", `/api/bookings/${mine._id}/cancel`, null, bob.token)).status, 404);
  });

  await t.test("a cancelled booking cannot be paid, and double payment is refused", async () => {
    const room = await makeRoom(5);
    const first = (await book(room, { checkIn: "2030-06-01", checkOut: "2030-06-03" })).json.data;

    assert.equal((await call("PATCH", `/api/bookings/${first._id}/payment`, null, ann.token)).status, 200);
    assert.equal((await call("PATCH", `/api/bookings/${first._id}/payment`, null, ann.token)).status, 400);

    const second = (await book(room, { checkIn: "2030-07-01", checkOut: "2030-07-03" })).json.data;
    await call("PATCH", `/api/bookings/${second._id}/cancel`, null, ann.token);

    const pay = await call("PATCH", `/api/bookings/${second._id}/payment`, null, ann.token);
    assert.equal(pay.status, 400);
    assert.equal((await Booking.findById(second._id)).status, "cancelled");
  });

  await t.test("simultaneous bookings never sell more rooms than exist", async () => {
    for (const total of [1, 3]) {
      const room = await makeRoom(total);
      const results = await Promise.all(Array.from({ length: 8 }, () => book(room)));
      const created = results.filter((r) => r.status === 201).length;
      const stored = await Booking.countDocuments({ "room.id": String(room._id) });

      assert.ok(created >= 1 && created <= total, `created ${created} of ${total}`);
      assert.equal(stored, created);
      assert.equal(results.filter((r) => r.status === 409).length, 8 - created);
    }
  });

  await t.test("admin rights are read from the database, not from the token", async () => {
    assert.equal((await call("GET", "/api/admin/stats", null, ann.token)).status, 403);
    assert.equal((await call("GET", "/api/admin/stats")).status, 401);

    const forged = jwt.sign({ userId: bob.id, role: "admin" }, process.env.JWT_SECRET);
    assert.equal((await call("GET", "/api/admin/stats", null, forged)).status, 403);
    assert.equal((await call("GET", "/api/admin/stats", null, jwt.sign({ userId: bob.id, role: "admin" }, "wrong-secret-wrong-secret-wrong"))).status, 401);

    await User.updateOne({ _id: ann.id }, { role: "admin" });
    assert.equal((await call("GET", "/api/admin/stats", null, ann.token)).status, 200);

    await User.updateOne({ _id: ann.id }, { role: "user" });
    assert.equal((await call("GET", "/api/admin/stats", null, ann.token)).status, 403);
  });

  await t.test("admin: search, filter, export, cancel with refund, travelers and revenue", async () => {
    await User.updateOne({ _id: ann.id }, { role: "admin" });
    const admin = ann.token;

    const room = await makeRoom(20);
    const paid = (await book(room, { checkIn: "2031-01-10", checkOut: "2031-01-12", traveler: { name: "Zed Paid", email: "zed@example.com", phone: "9999999999" } }, bob)).json.data;
    await call("PATCH", `/api/bookings/${paid._id}/payment`, null, bob.token);
    const unpaid = (await book(room, { checkIn: "2031-02-10", checkOut: "2031-02-12", traveler: { name: "=cmd|calc", email: "evil@example.com", phone: "9999999999" } }, bob)).json.data;

    // search and filters
    const byName = await call("GET", "/api/admin/bookings?q=zed", null, admin);
    assert.equal(byName.json.data.length, 1);
    assert.equal(byName.json.data[0].bookingReference, paid.bookingReference);
    assert.ok((await call("GET", "/api/admin/bookings?paymentStatus=paid", null, admin)).json.data.every((b) => b.paymentStatus === "paid"));
    assert.equal((await call("GET", "/api/admin/bookings?q=.*", null, admin)).json.total, 0, "search text is not a regex");
    assert.equal((await call("GET", "/api/admin/bookings?status[$ne]=x", null, admin)).status, 200);
    assert.equal((await call("GET", "/api/admin/bookings?limit=1&page=2", null, admin)).json.data.length, 1);

    // export
    const csv = await call("GET", "/api/admin/bookings/export?q=evil", null, admin);
    assert.equal(csv.status, 200);
    assert.ok(csv.headers.get("content-type").startsWith("text/csv"));
    assert.ok(csv.text.includes("'=cmd|calc"), "formula is defused");
    assert.equal((await call("GET", "/api/admin/bookings/export", null, bob.token)).status, 403);

    // admin cancel with refund
    const cancelled = await call("PATCH", `/api/admin/bookings/${paid._id}/cancel`, { refund: true, reason: "hotel closed" }, admin);
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.json.data.paymentStatus, "refunded");
    assert.equal(cancelled.json.data.cancellation.refundAmount, 5250);
    assert.equal(cancelled.json.data.cancellation.cancelledBy, "admin");
    assert.equal((await call("PATCH", `/api/admin/bookings/${paid._id}/cancel`, { refund: true }, admin)).status, 400, "no second refund");

    const noRefund = await call("PATCH", `/api/admin/bookings/${unpaid._id}/cancel`, {}, admin);
    assert.equal(noRefund.json.data.cancellation.refundAmount, 0);
    assert.equal((await call("PATCH", `/api/admin/bookings/${unpaid._id}/cancel`, {}, bob.token)).status, 403);

    // travelers and roles
    const users = await call("GET", "/api/admin/users", null, admin);
    assert.ok(users.json.data.every((u) => u.password === undefined));
    assert.ok(users.json.data.find((u) => u.email === "bob@example.com").bookings > 0);
    assert.equal((await call("PATCH", `/api/admin/users/${ann.id}/role`, { role: "user" }, admin)).status, 400, "cannot demote yourself");
    assert.equal((await call("PATCH", `/api/admin/users/${bob.id}/role`, { role: "superuser" }, admin)).status, 400);
    assert.equal((await call("PATCH", `/api/admin/users/${bob.id}/role`, { role: "admin" }, admin)).json.data.role, "admin");
    assert.equal((await call("PATCH", `/api/admin/users/${bob.id}/role`, { role: "user" }, admin)).json.data.role, "user");

    // revenue
    const days = await call("GET", "/api/admin/revenue", null, admin);
    const months = await call("GET", "/api/admin/revenue?range=12m", null, admin);
    assert.equal(days.json.data.length, 30);
    assert.equal(months.json.data.length, 12);
    // only ann's earlier paid booking counts: the other paid one was refunded
    assert.equal(days.json.data.reduce((sum, p) => sum + p.revenue, 0), 5250);
    assert.equal(months.json.data.reduce((sum, p) => sum + p.revenue, 0), 5250);
  });

  await t.test("changing dates: re-priced, checked, owner only, and a paid booking keeps its total", async () => {
    const { priceBooking } = require("../services/addonCatalog");
    const room = await makeRoom(1);
    const change = (booking, body, user = ann) => call("PATCH", `/api/bookings/${booking._id}/dates`, body, user.token);
    const meals = { breakfast: true, dinner: true };
    const transport = { mode: "cab", ac: true, vehicles: 1, days: 3 };

    const b = (await book(room, { checkIn: "2032-01-10", checkOut: "2032-01-12", meals, transport })).json.data;
    const expected = (nights, days) =>
      priceBooking({ roomPricePerNight: 2500, rooms: 1, nights, adults: 2, children: 0, meals, transport: { ...transport, days } }).totalAmount;

    assert.equal(b.pricing.totalAmount, expected(2, 3));

    // preview changes nothing
    const preview = await change(b, { checkIn: "2032-01-10", checkOut: "2032-01-14", dryRun: true });
    assert.equal(preview.status, 200);
    assert.equal(preview.json.data.newTotal, expected(4, 5));
    assert.equal((await Booking.findById(b._id)).nights, 2);

    // bad requests
    assert.equal((await change(b, { checkIn: "2032-01-10", checkOut: "2032-01-12" })).status, 400, "same dates");
    assert.equal((await change(b, { checkIn: "2020-01-10", checkOut: "2020-01-12" })).status, 400, "past");
    assert.equal((await change(b, { checkIn: "2032-01-10", checkOut: "2032-03-12" })).status, 400, "over 30 nights");
    assert.equal((await change(b, { checkIn: "2032-01-14", checkOut: "2032-01-12" })).status, 400, "reversed");
    assert.equal((await change(b, { checkIn: { $gt: "" }, checkOut: "2032-01-12" })).status, 400, "wrong type");
    assert.equal((await change(b, { checkIn: "2032-01-10", checkOut: "2032-01-14" }, bob)).status, 404, "not the owner");

    // a real change: longer stay, travel days follow, price is the server's
    const done = await change(b, { checkIn: "2032-01-10", checkOut: "2032-01-14", totalAmount: 1, pricing: { totalAmount: 1 } });
    assert.equal(done.status, 200);
    const after = await Booking.findById(b._id);
    assert.equal(after.nights, 4);
    assert.equal(after.addons.transport.days, 5);
    assert.equal(after.pricing.totalAmount, expected(4, 5));

    // its own old dates never block it (1 room only): shift by one day, overlapping itself
    assert.equal((await change(b, { checkIn: "2032-01-11", checkOut: "2032-01-15" })).status, 200);

    // another booking holds the only room for other dates
    const other = (await book(room, { checkIn: "2032-02-01", checkOut: "2032-02-05" }, bob)).json.data;
    const blocked = await change(b, { checkIn: "2032-02-02", checkOut: "2032-02-06" });
    assert.equal(blocked.status, 409);
    assert.equal((await Booking.findById(b._id)).nights, 4);
    assert.ok(other);

    // paid: the total may not change, but the days may
    const paid = (await book(await makeRoom(5), { checkIn: "2032-05-10", checkOut: "2032-05-12" })).json.data;
    await call("PATCH", `/api/bookings/${paid._id}/payment`, null, ann.token);
    const longer = await change(paid, { checkIn: "2032-05-10", checkOut: "2032-05-13" });
    assert.equal(longer.status, 400);
    assert.equal(longer.json.data.newTotal > longer.json.data.oldTotal, true);
    assert.equal((await Booking.findById(paid._id)).nights, 2);

    const shifted = await change(paid, { checkIn: "2032-06-01", checkOut: "2032-06-03" });
    assert.equal(shifted.status, 200);
    assert.equal((await Booking.findById(paid._id)).paymentStatus, "paid");

    // cancelled bookings and started stays cannot be changed
    await call("PATCH", `/api/bookings/${paid._id}/cancel`, null, ann.token);
    assert.equal((await change(paid, { checkIn: "2032-07-01", checkOut: "2032-07-03" })).status, 400);

    // a stay that has already started (dates set directly: the API would refuse past dates)
    const started = (await book(await makeRoom(5), { checkIn: "2032-09-10", checkOut: "2032-09-12" })).json.data;
    await Booking.collection.updateOne({ _id: new mongoose.Types.ObjectId(started._id) }, { $set: { checkIn: new Date(Date.now() - 86400000), checkOut: new Date(Date.now() + 86400000) } });

    const tooLate = await change(started, { checkIn: "2032-10-01", checkOut: "2032-10-03" });
    assert.equal(tooLate.status, 400);
    assert.ok(tooLate.json.message.includes("already started"));
  });

  await t.test("two travelers moving into the last room at once: only one keeps it", async () => {
    const room = await makeRoom(1);
    const a = (await book(room, { checkIn: "2033-01-01", checkOut: "2033-01-03" }, ann)).json.data;
    const c = (await book(room, { checkIn: "2033-02-01", checkOut: "2033-02-03" }, bob)).json.data;

    const results = await Promise.all([
      call("PATCH", `/api/bookings/${a._id}/dates`, { checkIn: "2033-03-01", checkOut: "2033-03-03" }, ann.token),
      call("PATCH", `/api/bookings/${c._id}/dates`, { checkIn: "2033-03-01", checkOut: "2033-03-03" }, bob.token),
    ]);

    const inMarch = await Booking.countDocuments({ "room.id": String(room._id), checkIn: new Date("2033-03-01") });

    assert.ok(inMarch <= 1, `${inMarch} bookings for one room`);
    assert.ok(results.some((r) => r.status === 200) || results.every((r) => r.status === 409));
    assert.equal(results.filter((r) => r.status === 200).length, inMarch);
  });

  await t.test("the assistant answers guests and keeps bookings private", async () => {
    const guest = await call("POST", "/api/assistant", { message: "show my bookings" });
    assert.equal(guest.status, 200);
    assert.equal(guest.json.data.cards[0].to, "/login");

    assert.equal((await call("POST", "/api/assistant", { message: { $gt: "" } })).status, 400);

    const mine = await call("POST", "/api/assistant", { message: "show my bookings" }, bob.token);
    assert.ok(mine.json.data.reply.includes("VOY-"));
    assert.ok(!mine.json.data.reply.includes("ann"), "never another user's data");
  });

  await t.test("bad JSON and unknown routes get clean errors", async () => {
    const bad = await fetch(`${base}/api/bookings`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${ann.token}` }, body: "{bad" });
    assert.equal(bad.status, 400);
    assert.equal((await call("GET", "/api/nope")).status, 404);
    assert.equal((await call("POST", "/api/bookings", null, ann.token)).status, 400);
  });
});
