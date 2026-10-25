const test = require("node:test");
const assert = require("node:assert/strict");

const { buildStayProfile, hasFreeCancellation, standardRoomPrice } = require("../services/stayProfile");
const { extractFacilities } = require("../services/facilityExtractor");

const hotel = (id, name = "Hotel Test") => ({ placeId: id, name, categories: ["accommodation.hotel"] });

test("a hotel always gets the same profile", () => {
  assert.deepEqual(buildStayProfile(hotel("a1")), buildStayProfile(hotel("a1")));
});

test("generated values always stay in range", () => {
  for (let i = 0; i < 3000; i += 1) {
    const p = buildStayProfile(hotel(`id-${i}`, `Hotel ${i}`));

    assert.ok(p.rating >= 3.4 && p.rating <= 4.8, `rating ${p.rating}`);
    assert.ok(p.stars >= 2 && p.stars <= 5, `stars ${p.stars}`);
    assert.ok(p.price >= 500, `price ${p.price}`);
    assert.ok(p.originalPrice > p.price);
    assert.ok(p.reviewCount >= 40);
  }
});

test("the listing price equals the Standard Room price used for booking", () => {
  const stay = hotel("price-check", "Royal Palace Resort");
  const p = buildStayProfile(stay);

  assert.equal(p.price, standardRoomPrice(stay, p.stayType));
});

test("luxury names cost more than plain ones", () => {
  const plain = buildStayProfile(hotel("same-id", "City Inn"));
  const fancy = buildStayProfile(hotel("same-id", "Royal Palace"));

  assert.ok(fancy.price > plain.price);
});

test("free cancellation depends only on the hotel id", () => {
  const a = hasFreeCancellation({ placeId: "x1", name: "A" });
  const b = hasFreeCancellation({ placeId: "x1", name: "Totally different name" });

  assert.equal(a, b);
});

test("real traveler reviews replace the generated rating", () => {
  const p = buildStayProfile(hotel("rev"), { average: 4.9, count: 12 });

  assert.equal(p.rating, 4.9);
  assert.equal(p.reviewCount, 12);
  assert.equal(p.ratingIsReal, true);
});

test("facilities listed by the property come first and are marked", () => {
  const stay = { ...hotel("fac"), facilities: { verifiedAmenities: ["Swimming Pool"], stars: 5 } };
  const p = buildStayProfile(stay);

  assert.equal(p.amenities[0], "Swimming Pool");
  assert.deepEqual(p.amenitiesVerified, ["Swimming Pool"]);
  assert.equal(p.stars, 5);
  assert.equal(p.starsAreReal, true);
});

test("facility extractor reads only what the map data records", () => {
  const rich = extractFacilities({
    datasource: { raw: { internet_access: "wlan", stars: "4", parking: "surface", air_conditioning: "yes" } },
    contact: { phone: "+91 1" },
  });

  assert.deepEqual(rich.verifiedAmenities, ["Free WiFi", "Air Conditioning", "Parking"]);
  assert.equal(rich.stars, 4);
  assert.equal(rich.phone, "+91 1");

  const empty = extractFacilities({ datasource: { raw: { tourism: "hotel" } } });

  assert.deepEqual(empty.verifiedAmenities, []);
  assert.equal(empty.stars, null);
});
