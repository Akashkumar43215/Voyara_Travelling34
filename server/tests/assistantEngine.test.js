const test = require("node:test");
const assert = require("node:assert/strict");

const { answer, detectIntent, parseTrip, findMentions, cleanQuestion, MAX_QUESTION_LENGTH } = require("../services/assistantEngine");
const { priceBooking } = require("../services/addonCatalog");

const catalog = {
  states: [
    { name: "Goa", slug: "goa", region: "West", description: "Beaches and churches.", bestTimeToVisit: "November to February" },
    { name: "Rajasthan", slug: "rajasthan", region: "North", description: "Forts and palaces.", bestTimeToVisit: "October to March" },
  ],
  places: [
    { name: "Calangute Beach", slug: "calangute-beach", state: "Goa", stateSlug: "goa", city: "Calangute", latitude: 15.54, longitude: 73.76, categories: ["beach"], description: "Busy sandy beach.", rating: 4.5 },
    { name: "Fort Aguada", slug: "fort-aguada", state: "Goa", stateSlug: "goa", city: "Candolim", latitude: 15.49, longitude: 73.77, categories: ["heritage"], description: "Portuguese fort.", rating: 4.6 },
    { name: "Hawa Mahal", slug: "hawa-mahal", state: "Rajasthan", stateSlug: "rajasthan", city: "Jaipur", latitude: 26.92, longitude: 75.82, categories: ["heritage"], description: "Palace of Winds.", rating: 4.8 },
    { name: "Amber Fort", slug: "amber-fort", state: "Rajasthan", stateSlug: "rajasthan", city: "Jaipur", latitude: 26.98, longitude: 75.85, categories: ["heritage", "fort"], description: "Hilltop fort.", rating: 4.7 },
  ],
};

test("intents are recognised", () => {
  assert.equal(detectIntent("What is the cancellation policy?"), "cancellation");
  assert.equal(detectIntent("how do I get a refund"), "cancellation");
  assert.equal(detectIntent("Show my bookings"), "my_bookings");
  assert.equal(detectIntent("how do I book a hotel"), "how_to_book");
  assert.equal(detectIntent("can I pay by UPI"), "payment");
  assert.equal(detectIntent("hello"), "greeting");
  assert.equal(detectIntent("best time to visit goa"), "best_time");
  assert.equal(detectIntent("plan a 3 day trip to goa"), "plan");
  assert.equal(detectIntent("   "), "empty");
  assert.equal(detectIntent({ $gt: "" }), "empty");
});

test("trip details are read from the question", () => {
  assert.deepEqual(parseTrip("3 day trip, 2 people, under 20000"), { nights: 2, days: 3, people: 2, budget: 20000 });
  assert.equal(parseTrip("budget of 1.5 lakh").budget, 150000);
  assert.equal(parseTrip("under 25k").budget, 25000);
  assert.equal(parseTrip("2 nights in goa").days, 3);
  assert.equal(parseTrip("honeymoon").people, 2);
  assert.equal(parseTrip("weekend trip").nights, 2);
});

test("'under 5 days' is a length of stay, not a budget", () => {
  assert.equal(parseTrip("trip under 5 days").budget, null);
});

test("places and states are found by name, longest first", () => {
  const found = findMentions("tell me about calangute beach in goa", catalog);

  assert.equal(found.place.slug, "calangute-beach");
  assert.equal(found.state.slug, "goa");
  assert.equal(findMentions("things in jaipur", catalog).city, "Jaipur");
  assert.equal(findMentions("no such place", catalog).place, null);
});

test("a trip plan suggests places and an estimate that matches the real pricing", () => {
  const r = answer({ text: "3 day trip to Goa for 2 people under 20000", catalog });
  const expected = priceBooking({
    roomPricePerNight: 2500, rooms: 1, nights: 2, adults: 2, children: 0, meals: { breakfast: true, dinner: true },
  }).totalAmount;

  assert.equal(r.intent, "plan");
  assert.ok(r.cards.length > 0 && r.cards.every((c) => c.to.startsWith("/place/") || c.to.startsWith("/places/") || c.to === "/real-places"));
  assert.ok(r.reply.includes(expected.toLocaleString("en-IN")), r.reply);
  assert.ok(r.reply.includes("fits your"));
});

test("a trip to one destination offers a one-tap start of the booking flow", () => {
  const now = new Date("2030-01-01T10:00:00Z");
  const r = answer({ text: "3 day trip to Goa for 4 people", catalog, now });
  const cta = r.cards.find((c) => c.cta);

  assert.equal(r.cards[0], cta, "the booking card comes first");
  assert.equal(cta.to, "/real-places");
  assert.equal(cta.state.location.country, "India");
  assert.equal(cta.state.location.state, "Goa");
  assert.ok(Number.isFinite(cta.state.location.latitude) && Number.isFinite(cta.state.location.longitude));
  assert.equal(cta.state.checkIn, "2030-01-08");
  assert.equal(cta.state.checkOut, "2030-01-10");
  assert.equal(cta.state.adults, 4);
  assert.equal(cta.state.rooms, 2);
});

test("no booking card without a single destination", () => {
  assert.ok(!answer({ text: "wildlife trip for 3 days", catalog }).cards.some((c) => c.cta));
});

test("a budget that is too small is said so", () => {
  assert.ok(answer({ text: "3 day trip to Goa under 3000", catalog }).reply.includes("above your"));
});

test("a theme without a place suggests only matching places, one per state", () => {
  const r = answer({ text: "heritage trip for 4 days", catalog });
  const states = r.cards.map((c) => c.to.split("?state=")[1]);

  assert.equal(r.cards.length, 2);
  assert.equal(new Set(states).size, states.length);
  assert.ok(!r.cards.some((c) => c.title === "Calangute Beach"));
});

test("best time comes from the state record", () => {
  assert.ok(answer({ text: "best time to visit Goa", catalog }).reply.includes("November to February"));
  assert.ok(answer({ text: "best time to visit Fort Aguada", catalog }).reply.includes("November to February"));
});

test("my bookings needs a login and lists only the bookings it is given", () => {
  const guest = answer({ text: "show my bookings", catalog, loggedIn: false });

  assert.equal(guest.cards[0].to, "/login");

  const user = answer({
    text: "show my bookings",
    catalog,
    loggedIn: true,
    bookings: [{ bookingReference: "VOY-1-1111", destination: { name: "Goa" }, checkIn: "2030-01-10", status: "confirmed", paymentStatus: "paid", pricing: { totalAmount: 5250 } }],
  });

  assert.ok(user.reply.includes("VOY-1-1111") && user.reply.includes("₹5,250"));
  assert.ok(answer({ text: "show my bookings", catalog, loggedIn: true, bookings: [] }).reply.includes("no bookings"));
});

test("the cancellation answer matches the booking rules", () => {
  const r = answer({ text: "cancellation policy", catalog }).reply;

  assert.ok(r.includes("24 hours") && r.includes("non-refundable"));
});

test("unknown questions get a helpful fallback, never an error", () => {
  const r = answer({ text: "qwerty zzz", catalog });

  assert.equal(r.intent, "other");
  assert.ok(r.reply.length > 20 && r.suggestions.length > 0);
});

test("input is cleaned and capped", () => {
  assert.equal(cleanQuestion("  hi\u0000   there \n"), "hi there");
  assert.equal(cleanQuestion("a".repeat(1000)).length, MAX_QUESTION_LENGTH);
  assert.equal(cleanQuestion(null), "");
});
