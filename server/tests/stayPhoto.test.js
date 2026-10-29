const test = require("node:test");
const assert = require("node:assert/strict");

const { samePlace, isSafeUrl, nameMatch, REF_PATTERN } = require("../services/stayPhotoService");

const stay = { name: "Hotel Taj Residency", latitude: 26.9, longitude: 75.8 };
const place = (name, latitude = 26.9, longitude = 75.8) => ({ displayName: { text: name }, location: { latitude, longitude } });

test("a Google place is accepted only when it is the same property", () => {
  assert.equal(samePlace(stay, place("Taj Residency Jaipur")), true);
  assert.equal(samePlace(stay, place("Completely Different Lodge")), false, "different name");
  assert.equal(samePlace(stay, place("Taj Residency Jaipur", 27.5, 75.8)), false, "too far away");
  assert.equal(samePlace({ ...stay, name: "Hotel" }, place("Hotel")), false, "a name with no distinctive word");
});

test("a Commons file name must mention the hotel", () => {
  assert.ok(nameMatch(stay, "Taj Residency front view.jpg") >= 0.5);
  assert.ok(nameMatch(stay, "Hawa Mahal at dusk.jpg") < 0.5);
});

test("only real Google photo references are accepted", () => {
  assert.ok(REF_PATTERN.test("places/ChIJabc-123/photos/AUy_x-9"));
  assert.ok(!REF_PATTERN.test("places/abc/photos/../../secret"));
  assert.ok(!REF_PATTERN.test("https://evil.example/x"));
});

test("hotel websites that point at the server's own network are never fetched", async () => {
  for (const bad of ["http://127.0.0.1/", "http://localhost:5000/", "http://10.0.0.5/", "http://192.168.1.1/", "http://169.254.169.254/latest/meta-data", "http://[::1]/", "file:///etc/passwd", "ftp://example.com/", "http://user:pw@example.com/"]) {
    assert.equal(await isSafeUrl(bad), false, bad);
  }

  assert.equal(await isSafeUrl("http://8.8.8.8/"), true);
});
