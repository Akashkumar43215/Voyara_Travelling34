/**
 * Review helpful votes and photos, against a throwaway MongoDB with a fake Cloudinary.
 * Skips itself when no local `mongod` can be found (see helpers/testDb.js).
 */
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "integration-test-secret-integration-test";
process.env.RATE_LIMIT = "off";
process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
process.env.CLOUDINARY_API_KEY = "test-key";
process.env.CLOUDINARY_API_SECRET = "test-secret";

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const { findMongod, startTestDb } = require("./helpers/testDb");
const { detectImageType } = require("../services/imageCheck");

const binary = findMongod();
const skip = binary ? false : "mongod was not found: set MONGOD_PATH to run the review integration tests";

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]);
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), Buffer.alloc(16)]);

test("image type is read from the bytes", () => {
  assert.equal(detectImageType(PNG), "png");
  assert.equal(detectImageType(JPEG), "jpeg");
  assert.equal(detectImageType(WEBP), "webp");
  assert.equal(detectImageType(Buffer.from("<svg onload=alert(1)></svg>")), null);
  assert.equal(detectImageType(Buffer.from("MZ executable pretending to be a photo")), null);
  assert.equal(detectImageType(Buffer.alloc(4)), null);
  assert.equal(detectImageType("not a buffer"), null);
  assert.equal(detectImageType(null), null);
});

test("Reviews: helpful votes and photos", { skip }, async (t) => {
  const db = await startTestDb(binary);
  await mongoose.connect(db.uri);

  const cloudinary = require("../config/cloudinary");
  const app = require("../app");
  const Review = require("../models/Review");
  const User = require("../models/User");

  // a fake Cloudinary
  const cloud = { uploaded: 0, destroyed: [], failAt: 0 };
  cloudinary.uploader.upload_stream = (options, callback) => ({
    end: () => {
      cloud.uploaded += 1;

      if (cloud.failAt && cloud.uploaded === cloud.failAt) return callback(new Error("cloud down"));

      return callback(null, { secure_url: `https://res.cloudinary.com/test/img-${cloud.uploaded}.png`, public_id: `voyara/reviews/img-${cloud.uploaded}` });
    },
  });
  cloudinary.uploader.destroy = async (publicId) => {
    cloud.destroyed.push(publicId);
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

    return { status: response.status, json, text };
  };

  const upload = async (reviewId, files, token) => {
    const form = new FormData();
    for (const { name, data, type } of files) form.append("photos", new Blob([data], { type }), name);

    const response = await fetch(`${base}/api/reviews/${reviewId}/photos`, { method: "POST", headers: token ? { authorization: `Bearer ${token}` } : {}, body: form });

    return { status: response.status, json: await response.json().catch(() => null) };
  };

  const signUp = async (name) => {
    await call("POST", "/api/auth/register", { name: `${name} tester`, email: `${name}@example.com`, password: "abcdef12" });
    const login = await call("POST", "/api/auth/login", { email: `${name}@example.com`, password: "abcdef12" });

    return { token: login.json.token, id: login.json.data.id };
  };

  const ann = await signUp("ann");
  const bob = await signUp("bob");
  const cy = await signUp("cy");

  const post = (user, rating, comment = "Lovely") => call("POST", "/api/reviews/place/hawa-mahal", { rating, comment }, user.token);
  const annReview = (await post(ann, 5)).json.data;
  const bobReview = (await post(bob, 3, "Crowded")).json.data;

  const list = (token, query = "") => call("GET", `/api/reviews/place/hawa-mahal${query}`, null, token);

  await t.test("trip details are kept when valid and dropped when not", async () => {
    const path = "/api/reviews/stay/trip-details-stay";
    const saved = await call("POST", path, {
      rating: 4,
      travellerType: "couple",
      travelMonth: "2026-10",
      roomType: "Deluxe Room",
      categoryRatings: { location: 5, food: 9, bogus: 3 },
    }, ann.token);

    assert.equal(saved.status, 200);
    assert.equal(saved.json.data.travellerType, "couple");
    assert.equal(saved.json.data.travelMonth, "2026-10");
    assert.equal(saved.json.data.roomType, "Deluxe Room");
    assert.deepEqual(saved.json.data.categoryRatings, { location: 5 });

    const bad = await call("POST", path, { rating: 4, travellerType: "pirate", travelMonth: "soon" }, ann.token);

    assert.equal(bad.json.data.travellerType, "");
    assert.equal(bad.json.data.travelMonth, "");
    assert.deepEqual(bad.json.data.categoryRatings, {});
  });

  await t.test("listing reviews never leaks who voted", async () => {
    const r = await list();

    assert.equal(r.json.count, 2);
    assert.ok(!r.text.includes("helpfulBy"));
    assert.ok(r.json.data.every((x) => x.helpfulCount === 0 && x.iVoted === false && Array.isArray(x.photos)));
  });

  await t.test("a helpful vote toggles, counts once per person and is not allowed on your own review", async () => {
    assert.equal((await call("POST", `/api/reviews/${annReview._id}/helpful`)).status, 401);
    assert.equal((await call("POST", `/api/reviews/${annReview._id}/helpful`, null, ann.token)).status, 400, "own review");
    assert.equal((await call("POST", `/api/reviews/${"a".repeat(24)}/helpful`, null, bob.token)).status, 404);

    const vote = await call("POST", `/api/reviews/${annReview._id}/helpful`, null, bob.token);
    assert.deepEqual(vote.json.data, { iVoted: true, helpfulCount: 1 });

    assert.equal((await call("POST", `/api/reviews/${annReview._id}/helpful`, null, cy.token)).json.data.helpfulCount, 2);

    // what each viewer sees
    assert.equal((await list(bob.token)).json.data.find((x) => x._id === annReview._id).iVoted, true);
    assert.equal((await list()).json.data.find((x) => x._id === annReview._id).iVoted, false);

    // tapping again removes the vote
    assert.deepEqual((await call("POST", `/api/reviews/${annReview._id}/helpful`, null, bob.token)).json.data, { iVoted: false, helpfulCount: 1 });

    // the database never holds a duplicate vote
    await call("POST", `/api/reviews/${annReview._id}/helpful`, null, bob.token);
    await Promise.all([bob, bob, bob].map((u) => call("POST", `/api/reviews/${bobReview._id}/helpful`, null, cy.token).then(() => u)));
    const stored = await Review.findById(annReview._id).select("+helpfulBy");
    assert.equal(new Set(stored.helpfulBy.map(String)).size, stored.helpfulBy.length);
  });

  await t.test("sort=helpful puts the most helpful review first", async () => {
    const r = await list(undefined, "?sort=helpful");

    assert.equal(r.json.data[0]._id, annReview._id);
    assert.ok(r.json.data[0].helpfulCount >= r.json.data[1].helpfulCount);
  });

  await t.test("photos: only the owner, only real images, at most 3", async () => {
    const png = (n) => ({ name: `p${n}.png`, data: PNG, type: "image/png" });

    assert.equal((await upload(annReview._id, [png(1)])).status, 401);
    assert.equal((await upload(annReview._id, [png(1)], bob.token)).status, 404, "not the owner");
    assert.equal((await upload(annReview._id, [], ann.token)).status, 400, "no files");

    const disguised = await upload(annReview._id, [{ name: "cat.jpg", data: Buffer.from("<script>alert(1)</script> not an image at all"), type: "image/jpeg" }], ann.token);
    assert.equal(disguised.status, 400, "a file named .jpg whose bytes are not an image");
    assert.equal(cloud.uploaded, 0, "nothing was sent to Cloudinary");

    const notImageType = await upload(annReview._id, [{ name: "a.pdf", data: PNG, type: "application/pdf" }], ann.token);
    assert.equal(notImageType.status, 400);

    const first = await upload(annReview._id, [png(1), { name: "b.jpg", data: JPEG, type: "image/jpeg" }], ann.token);
    assert.equal(first.status, 200);
    assert.equal(first.json.data.photos.length, 2);
    assert.ok(first.json.data.photos[0].url.startsWith("https://res.cloudinary.com/"));
    assert.ok(!JSON.stringify(first.json).includes("publicId"), "internal ids stay on the server");

    assert.equal((await upload(annReview._id, [png(3), png(4)], ann.token)).status, 400, "would be 4 photos");
    assert.equal((await upload(annReview._id, [{ name: "c.webp", data: WEBP, type: "image/webp" }], ann.token)).status, 200);
    assert.equal((await upload(annReview._id, [png(5)], ann.token)).status, 400, "already 3");

    const tooBig = await upload(annReview._id, [{ name: "big.png", data: Buffer.concat([PNG, Buffer.alloc(3 * 1024 * 1024)]), type: "image/png" }], bob.token);
    assert.equal(tooBig.status, 400, "over 3 MB is refused");

    assert.equal((await list()).json.data.find((x) => x._id === annReview._id).photos.length, 3);
  });

  await t.test("removing a photo deletes it from Cloudinary too; admins can remove any", async () => {
    cloud.destroyed.length = 0;

    assert.equal((await call("DELETE", `/api/reviews/${annReview._id}/photos/0`, null, bob.token)).status, 403);
    assert.equal((await call("DELETE", `/api/reviews/${annReview._id}/photos/9`, null, ann.token)).status, 404);

    const r = await call("DELETE", `/api/reviews/${annReview._id}/photos/0`, null, ann.token);
    assert.equal(r.status, 200);
    assert.equal(r.json.data.photos.length, 2);
    assert.equal(cloud.destroyed.length, 1);

    await User.updateOne({ _id: cy.id }, { role: "admin" });
    assert.equal((await call("DELETE", `/api/reviews/${annReview._id}/photos/0`, null, cy.token)).status, 200);
    assert.equal(cloud.destroyed.length, 2);
  });

  await t.test("a failed upload leaves nothing behind", async () => {
    cloud.destroyed.length = 0;
    const before = (await Review.findById(bobReview._id)).photos.length;

    cloud.failAt = cloud.uploaded + 2; // the second photo of this request fails
    const r = await upload(bobReview._id, [{ name: "a.png", data: PNG, type: "image/png" }, { name: "b.png", data: PNG, type: "image/png" }], bob.token);
    cloud.failAt = 0;

    assert.equal(r.status, 502);
    assert.equal((await Review.findById(bobReview._id)).photos.length, before, "the review has no half-added photos");
    assert.equal(cloud.destroyed.length, 1, "the photo that did upload was removed again");
  });

  await t.test("photo upload says so when Cloudinary is not set up", async () => {
    const saved = process.env.CLOUDINARY_API_SECRET;
    delete process.env.CLOUDINARY_API_SECRET;

    const r = await upload(bobReview._id, [{ name: "a.png", data: PNG, type: "image/png" }], bob.token);
    process.env.CLOUDINARY_API_SECRET = saved;

    assert.equal(r.status, 503);
  });

  await t.test("deleting a review removes its photos from Cloudinary", async () => {
    cloud.destroyed.length = 0;
    const withPhotos = await Review.findById(annReview._id);
    const count = withPhotos.photos.length;

    assert.ok(count > 0);
    assert.equal((await call("DELETE", `/api/reviews/${annReview._id}`, null, ann.token)).status, 200);
    assert.equal(cloud.destroyed.length, count);
  });

  await t.test("the star rating rules still hold", async () => {
    assert.equal((await post(cy, 6)).status, 400);
    assert.equal((await post(cy, 4.5)).status, 400);
    assert.equal((await call("POST", "/api/reviews/hotel/x", { rating: 3 }, cy.token)).status, 400);
  });
});
