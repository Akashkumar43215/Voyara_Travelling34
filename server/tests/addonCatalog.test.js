const test = require("node:test");
const assert = require("node:assert/strict");

const { mealPrices, priceBooking, geoActivityPrice } = require("../services/addonCatalog");

const base = { roomPricePerNight: 2500, rooms: 1, nights: 2, adults: 2, children: 1 };

const price = (extra = {}) => priceBooking({ ...base, ...extra });

test("room only: 5% tax on the room total", () => {
  const r = price();

  assert.equal(r.ok, true);
  assert.equal(r.roomTotal, 5000);
  assert.equal(r.addonsTotal, 0);
  assert.equal(r.taxes, 250);
  assert.equal(r.totalAmount, 5250);
});

test("meal prices scale with the room price and stay within limits", () => {
  assert.deepEqual(mealPrices(2500), { breakfast: 250, lunch: 400, dinner: 450 });

  const cheap = mealPrices(100);
  const dear = mealPrices(100000);

  assert.equal(cheap.breakfast, 180); // factor floor 0.7
  assert.equal(dear.breakfast, 630); // factor cap 2.5
});

test("full board: children eat for half, priced per night", () => {
  const r = price({ meals: { breakfast: true, lunch: true, dinner: true } });

  // 1,100 per person per night x (2 adults + 1 child at half = 2.5) x 2 nights
  assert.equal(r.mealsTotal, 5500);
  assert.equal(r.totalAmount, Math.round((5000 + 5500) * 1.05));
});

test("travel: AC costs more than non-AC and is charged per day and vehicle", () => {
  const ac = price({ transport: { mode: "cab", ac: true, days: 3, vehicles: 1 } });
  const nonAc = price({ transport: { mode: "cab", ac: false, days: 3, vehicles: 1 } });

  assert.equal(ac.transportTotal, 2200 * 3);
  assert.equal(nonAc.transportTotal, 1800 * 3);
});

test("travel: a bike has no AC option", () => {
  const r = price({ transport: { mode: "bike", ac: true } });

  assert.equal(r.ok, false);
  assert.match(r.message, /not available/i);
});

test("travel: rejects too few seats for the guests", () => {
  const r = price({ transport: { mode: "bike", ac: false, vehicles: 1 } }); // 3 guests, 2 seats

  assert.equal(r.ok, false);
  assert.match(r.message, /more vehicles/i);
});

test("travel: an unknown mode is rejected", () => {
  assert.equal(price({ transport: { mode: "helicopter" } }).ok, false);
});

test("activities: priced per person, or per group for transfers", () => {
  const r = price({ activities: [{ id: "exp-city-tour" }, { id: "exp-airport-transfer" }] });

  assert.equal(r.activitiesTotal, 900 * 3 + 900); // 3 guests, plus one group transfer
});

test("activities: real nearby places get a stable price", () => {
  assert.equal(geoActivityPrice("geo:abc"), geoActivityPrice("geo:abc"));

  const p = geoActivityPrice("geo:abc");
  assert.ok(p >= 100 && p <= 800);
});

test("activities: unknown ids and too many are rejected", () => {
  assert.equal(price({ activities: [{ id: "exp-free-money" }] }).ok, false);
  assert.equal(price({ activities: [{ id: "nonsense" }] }).ok, false);

  const many = Array.from({ length: 11 }, (_, i) => ({ id: `geo:${i}` }));
  assert.equal(price({ activities: many }).ok, false);
});

test("prices sent by the page are ignored", () => {
  const honest = price({ activities: [{ id: "exp-spa" }] });
  const cheat = price({ activities: [{ id: "exp-spa", price: 1, pricePerUnit: 1, total: 1 }] });

  assert.equal(cheat.activitiesTotal, honest.activitiesTotal);
  assert.equal(cheat.totalAmount, honest.totalAmount);
});

test("the same activity added twice is only charged once", () => {
  const r = price({ activities: [{ id: "exp-spa" }, { id: "exp-spa" }] });

  assert.equal(r.activities.length, 1);
});
