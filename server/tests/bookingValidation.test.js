const test = require("node:test");
const assert = require("node:assert/strict");

const { MAX_TRIP_CITIES, findTripOverlap, validateBookingInput, validateDates, validateTripId } = require("../services/bookingValidation");
const { priceBooking } = require("../services/addonCatalog");

const NOW = new Date("2030-01-01T10:00:00Z");

const good = {
  destination: { name: "Goa" },
  traveler: { name: "Ann Lee", email: "Ann@X.com", phone: "99999 99999" },
  accommodation: { name: "Test Hotel" },
  room: { id: "abc" },
  checkIn: "2030-01-10",
  checkOut: "2030-01-12",
  rooms: 1,
  adults: 2,
  children: 0,
  nights: 99, // ignored
};

const check = (changes) => validateBookingInput({ ...good, ...changes }, NOW);

test("a good booking passes and nights come from the dates, not the page", () => {
  const r = check({});

  assert.equal(r.ok, true);
  assert.equal(r.data.nights, 2);
  assert.equal(r.data.traveler.email, "ann@x.com");
});

test("a longer stay cannot be sent as one night", () => {
  assert.equal(check({ checkIn: "2030-02-01", checkOut: "2030-02-11", nights: 1 }).data.nights, 10);
});

test("past dates and reversed dates are rejected, today is allowed", () => {
  assert.equal(check({ checkIn: "2029-12-31", checkOut: "2030-01-02" }).ok, false);
  assert.equal(check({ checkIn: "2030-01-12", checkOut: "2030-01-10" }).ok, false);
  assert.equal(check({ checkIn: "2030-01-01", checkOut: "2030-01-02" }).ok, true);
});

test("a stay longer than 30 nights is rejected", () => {
  assert.equal(check({ checkIn: "2030-02-01", checkOut: "2030-04-01" }).ok, false);
});

test("guests and rooms must be whole numbers in range", () => {
  for (const bad of [{ adults: 1.5 }, { rooms: -1 }, { rooms: 0 }, { rooms: 11 }, { adults: 0 }, { children: -1 }, { children: 1.5 }, { adults: "abc" }, { rooms: 2, adults: 1 }]) {
    assert.equal(check(bad).ok, false, JSON.stringify(bad));
  }

  assert.equal(check({ children: "2" }).data.children, 2);
});

test("wrong types are rejected instead of crashing", () => {
  const bad = [
    { destination: "Goa" },
    { destination: { name: 5 } },
    { traveler: { name: 1, email: "a@b.co", phone: "9999999999" } },
    { traveler: null },
    { room: { id: { $ne: 1 } } },
    { checkIn: 20300110 },
    { accommodation: null },
  ];

  for (const changes of bad) assert.equal(check(changes).ok, false, JSON.stringify(changes));
  assert.equal(validateBookingInput(undefined, NOW).ok, false);
});

test("traveler details are checked", () => {
  assert.equal(check({ traveler: { ...good.traveler, email: "nope" } }).ok, false);
  assert.equal(check({ traveler: { ...good.traveler, phone: "123" } }).ok, false);
  assert.equal(check({ traveler: { ...good.traveler, name: "A" } }).ok, false);
});

test("validateDates is shared by new bookings and date changes", () => {
  assert.equal(validateDates("2030-01-10", "2030-01-13", NOW).data.nights, 3);
  assert.equal(validateDates("2030-01-10", "2030-01-10", NOW).ok, false);
  assert.equal(validateDates("2029-12-01", "2029-12-03", NOW).ok, false);
  assert.equal(validateDates("2030-01-10", undefined, NOW).ok, false);
  assert.equal(validateDates("nope", "2030-01-12", NOW).ok, false);
  assert.equal(validateDates("2030-01-02", "2030-03-30", NOW).ok, false);
});

test("pricing refuses negative, fractional and huge values", () => {
  const base = { roomPricePerNight: 2500, rooms: 1, nights: 2, adults: 2, children: 0 };

  assert.equal(priceBooking(base).totalAmount, 5250);

  for (const bad of [{ rooms: -1 }, { rooms: 1e9 }, { nights: 1e9 }, { nights: 0.5 }, { roomPricePerNight: -100 }, { adults: 1.5 }, { children: -1 }]) {
    assert.equal(priceBooking({ ...base, ...bad }).ok, false, JSON.stringify(bad));
  }
});

test("trip ids: empty for a single booking, otherwise only the website's own format", () => {
  assert.equal(check({}).data.tripId, "");
  assert.equal(check({ tripId: "trip_abc123def456ghi7" }).data.tripId, "trip_abc123def456ghi7");

  for (const bad of ["x", "trip_", "trip_short", "trip_ok12345678$", { $gt: "" }, 12345678, "../../etc"]) {
    assert.equal(validateTripId(bad).ok, false, String(bad));
    assert.equal(check({ tripId: bad }).ok, false, String(bad));
  }
});

test("trip stops may touch (check-out day = next check-in day) but never overlap", () => {
  const stop = (a, b) => ({ checkIn: new Date(a), checkOut: new Date(b) });
  const others = [stop("2030-01-10", "2030-01-12"), stop("2030-01-15", "2030-01-18")];
  const d = (s) => new Date(s);

  assert.equal(findTripOverlap(others, d("2030-01-12"), d("2030-01-14")), null, "starts the day the first ends");
  assert.equal(findTripOverlap(others, d("2030-01-13"), d("2030-01-15")), null, "ends the day the second starts");
  assert.equal(findTripOverlap(others, d("2030-01-18"), d("2030-01-20")), null, "after everything");
  assert.equal(findTripOverlap(others, d("2030-01-11"), d("2030-01-13")), others[0], "starts inside the first");
  assert.equal(findTripOverlap(others, d("2030-01-09"), d("2030-01-11")), others[0], "ends inside the first");
  assert.equal(findTripOverlap(others, d("2030-01-08"), d("2030-01-20")), others[0], "wraps around both");
  assert.equal(findTripOverlap([], d("2030-01-10"), d("2030-01-12")), null);
  assert.equal(MAX_TRIP_CITIES, 6);
});
