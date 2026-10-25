/**
 * VOYARA travel assistant: a rule-based helper (no AI service, no API key).
 *
 * It reads the question with keyword rules, then answers from VOYARA's own data
 * (curated states and places) and the real booking rules. Everything here is a
 * pure function: the controller loads the data and passes it in, so this file is
 * easy to test and never touches the database or `req`.
 *
 * Money figures come from addonCatalog.priceBooking, the same function a real
 * booking uses, so an estimate here can never disagree with the price at checkout.
 */

const { priceBooking, TAX_RATE } = require("./addonCatalog");

const MAX_QUESTION_LENGTH = 300;

// The standard room price the hotel listings are built around (see stayProfile.js)
const TYPICAL_ROOM_PRICE = 2500;

const THEMES = {
  beach: /\b(beach|beaches|coast|coastal|sea|island|islands|surf)\b/,
  hills: /\b(hill|hills|mountain|mountains|snow|himalaya|himalayan|trek|trekking|valley|valleys)\b/,
  heritage: /\b(heritage|fort|forts|palace|palaces|history|historic|historical|monument|monuments|temple architecture)\b/,
  wildlife: /\b(wildlife|safari|tiger|tigers|national park|sanctuary|jungle|birds?)\b/,
  spiritual: /\b(spiritual|temple|temples|pilgrimage|holy|religious|ghat|ghats)\b/,
  adventure: /\b(adventure|rafting|paragliding|camping|diving|skiing)\b/,
};

const THEME_LABEL = {
  beach: "beaches",
  hills: "hills and mountains",
  heritage: "heritage",
  wildlife: "wildlife",
  spiritual: "spiritual places",
  adventure: "adventure",
};

const lower = (value) => String(value || "").toLowerCase();

const cleanQuestion = (value) => {
  if (typeof value !== "string") return "";

  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_QUESTION_LENGTH);
};

/* ----------------------------------------------------------------------------
 * READING THE QUESTION
 * -------------------------------------------------------------------------- */

const has = (text, pattern) => pattern.test(text);

/** The one thing the traveler is asking about. First match wins, most specific first. */
const detectIntent = (rawText) => {
  const text = lower(cleanQuestion(rawText));

  if (!text) return "empty";
  if (has(text, /\b(my|mine)\b.*\b(booking|bookings|trip|trips|reservation|reservations|orders?)\b/) || has(text, /\b(booking|trip) status\b/)) return "my_bookings";
  if (has(text, /\b(cancel|cancellation|refund|refunds|money back)\b/)) return "cancellation";
  if (has(text, /\b(pay|payment|paid|card|upi|checkout)\b/)) return "payment";
  if (has(text, /\b(price|prices|pricing|cost|tax|taxes|gst|charges?|fees?|how much)\b/) && !has(text, /\b(days?|nights?|budget|under|below)\b/)) return "pricing";
  if (has(text, /\b(how (do|can|to)|steps?|process)\b.*\b(book|booking|reserve)\b/) || has(text, /\bhow does (it|this|voyara) work\b/)) return "how_to_book";
  if (has(text, /\b(contact|support|help ?line|customer care|phone number|email address|talk to|human)\b/)) return "contact";
  if (has(text, /\b(hi|hello|hey|hii+|namaste|good (morning|afternoon|evening))\b/) && text.split(" ").length <= 4) return "greeting";
  if (has(text, /\b(thanks|thank you|thx|great|awesome)\b/) && text.split(" ").length <= 5) return "thanks";
  if (has(text, /\b(best time|when to (visit|go)|which month|season|weather)\b/)) return "best_time";
  if (has(text, /\b(plan|itinerary|suggest|recommend|ideas?|trip|tour|weekend|honeymoon|holiday|vacation|getaway|budget|under|\d+ ?(days?|nights?))\b/) || Object.values(THEMES).some((re) => re.test(text))) return "plan";

  return "other";
};

/** Days, nights, travellers and budget (in rupees) mentioned in the question. */
const parseTrip = (rawText) => {
  const text = lower(cleanQuestion(rawText));
  const trip = { nights: null, days: null, people: null, budget: null };

  let m = text.match(/(\d{1,2})\s*(?:-|to)?\s*(?:\d{1,2}\s*)?(nights?|days?)\b/);

  if (m) {
    const n = Math.min(30, Number(m[1]));

    if (/^night/.test(m[2])) {
      trip.nights = n;
      trip.days = n + 1;
    } else {
      trip.days = n;
      trip.nights = Math.max(1, n - 1);
    }
  } else if (/\bweekend\b/.test(text)) {
    trip.days = 3;
    trip.nights = 2;
  }

  m = text.match(/(\d{1,2})\s*(?:people|persons?|adults?|travell?ers?|friends|members|of us|guests|pax)\b/);

  if (m) trip.people = Math.min(20, Math.max(1, Number(m[1])));
  else if (/\b(couple|honeymoon|two of us)\b/.test(text)) trip.people = 2;
  else if (/\b(solo|alone|myself)\b/.test(text)) trip.people = 1;
  else if (/\bfamily\b/.test(text)) trip.people = 4;

  m = text.match(/(?:₹|rs\.?|inr|under|below|within|budget(?: of| is)?|around|upto|up to)\s*₹?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|thousand|lakhs?|lacs?|l)?\b/);

  if (m) {
    let amount = Number(m[1].replace(/,/g, ""));

    if (m[2]) amount *= /^(k|thousand)$/.test(m[2]) ? 1000 : 100000;
    // "under 5 days" is a length of stay, not a budget
    if (amount >= 500) trip.budget = Math.round(amount);
  }

  return trip;
};

const detectThemes = (text) => Object.keys(THEMES).filter((key) => THEMES[key].test(lower(text)));

/** States and places named in the question. The longest name wins ("Goa" vs "Old Goa"). */
const findMentions = (rawText, catalog) => {
  const text = ` ${lower(cleanQuestion(rawText)).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ")} `;
  const contains = (name) => name.length >= 3 && text.includes(` ${lower(name).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim()} `);

  const places = catalog.places.filter((p) => contains(p.name)).sort((a, b) => b.name.length - a.name.length);
  const states = catalog.states.filter((s) => contains(s.name)).sort((a, b) => b.name.length - a.name.length);

  // a city that has curated places, e.g. "Jaipur"
  const cities = [...new Set(catalog.places.map((p) => p.city).filter(Boolean))]
    .filter(contains)
    .sort((a, b) => b.length - a.length);

  return { place: places[0] || null, state: states[0] || null, city: cities[0] || null };
};

/* ----------------------------------------------------------------------------
 * ANSWER PIECES
 * -------------------------------------------------------------------------- */

const inr = (amount) => `₹${Math.round(amount).toLocaleString("en-IN")}`;

const placeCard = (place) => ({
  title: place.name,
  subtitle: [place.city, place.state].filter(Boolean).join(", ") + (place.rating ? ` · ★ ${place.rating}` : ""),
  image: place.image || "",
  to: `/place/${place.slug}?state=${place.stateSlug}`,
});

const stateCard = (state) => ({
  title: state.name,
  subtitle: `${state.region}${state.bestTimeToVisit ? ` · best: ${state.bestTimeToVisit}` : ""}`,
  image: state.image || "",
  to: `/places/${state.slug}`,
});

const isoDay = (date) => date.toISOString().slice(0, 10);

/**
 * A card that opens the booking flow with the trip already filled in: the destination,
 * dates (a week from today, the traveler can change them on the next page) and guests.
 */
const startBookingCard = ({ place, label, trip, now }) => {
  if (!place || !Number.isFinite(Number(place.latitude)) || !Number.isFinite(Number(place.longitude))) return null;

  const nights = trip.nights || 2;
  const adults = trip.people || 2;
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 7));
  const end = new Date(start.getTime() + nights * 24 * 60 * 60 * 1000);

  return {
    title: `Start booking: ${label}`,
    subtitle: `${nights} night${nights === 1 ? "" : "s"}, ${adults} traveller${adults === 1 ? "" : "s"}. Change dates on the next page`,
    to: "/real-places",
    cta: true,
    state: {
      location: {
        name: place.city || place.name,
        city: place.city || place.name,
        state: place.state,
        country: "India",
        latitude: Number(place.latitude),
        longitude: Number(place.longitude),
      },
      checkIn: isoDay(start),
      checkOut: isoDay(end),
      rooms: Math.max(1, Math.ceil(adults / 2)),
      adults,
      children: 0,
    },
  };
};

const rankedPlaces = (places) => [...places].sort((a, b) => (b.rating || 0) - (a.rating || 0));

/** Highest rated places, at most `perState` from each state so the list is varied. */
const diversePlaces = (places, limit, perState = 1) => {
  const used = {};
  const out = [];

  for (const place of rankedPlaces(places)) {
    used[place.stateSlug] = (used[place.stateSlug] || 0) + 1;
    if (used[place.stateSlug] > perState) continue;
    out.push(place);
    if (out.length === limit) break;
  }

  return out;
};

const placeMatchesTheme = (place, themes) => {
  const haystack = lower(`${(place.categories || []).join(" ")} ${place.name} ${place.description}`);

  return themes.some((key) => THEMES[key].test(haystack));
};

/** Indicative cost of a stay using the real pricing function and a typical 3-star room. */
const estimateTrip = ({ nights, people }) => {
  const adults = people || 2;
  const priced = priceBooking({
    roomPricePerNight: TYPICAL_ROOM_PRICE,
    rooms: Math.max(1, Math.ceil(adults / 2)),
    nights,
    adults,
    children: 0,
    meals: { breakfast: true, dinner: true },
  });

  return priced.ok ? { total: priced.totalAmount, adults, nights, rooms: Math.max(1, Math.ceil(adults / 2)) } : null;
};

const estimateText = (estimate, budget) => {
  if (!estimate) return "";

  let line = `Rough cost for ${estimate.adults} traveller${estimate.adults === 1 ? "" : "s"}, ${estimate.nights} night${estimate.nights === 1 ? "" : "s"}: about ${inr(estimate.total)} for a typical hotel room with breakfast and dinner, including ${Math.round(TAX_RATE * 100)}% tax. Travel to the destination is not included.`;

  if (budget) {
    if (estimate.total <= budget) line += ` That fits your ${inr(budget)} budget.`;
    else line += ` That is above your ${inr(budget)} budget. Choose a budget hotel, drop dinner or shorten the stay to bring it down.`;
  }

  return line;
};

/* ----------------------------------------------------------------------------
 * ANSWERS
 * -------------------------------------------------------------------------- */

const BASE_SUGGESTIONS = ["Plan a 3 day trip to Goa", "Beach trip under 20000", "What is the cancellation policy?", "How do I book?"];

const reply = (text, extra = {}) => ({ reply: text, cards: [], suggestions: BASE_SUGGESTIONS.slice(0, 3), ...extra });

const answerPlan = (text, catalog, now = new Date()) => {
  const trip = parseTrip(text);
  const themes = detectThemes(text);
  const where = findMentions(text, catalog);

  let places = [];
  let heading;

  if (where.place) {
    const inSameState = catalog.places.filter((p) => p.stateSlug === where.place.stateSlug && p.slug !== where.place.slug);
    places = [where.place, ...rankedPlaces(inSameState).slice(0, 3)];
    heading = `${where.place.name} is in ${where.place.city}, ${where.place.state}. Here is a good base for the trip.`;
  } else if (where.city) {
    places = rankedPlaces(catalog.places.filter((p) => p.city === where.city)).slice(0, 4);
    heading = `Top places to see in ${where.city}:`;
  } else if (where.state) {
    const all = catalog.places.filter((p) => p.stateSlug === where.state.slug);
    const themed = themes.length ? all.filter((p) => placeMatchesTheme(p, themes)) : [];
    places = rankedPlaces(themed.length ? themed : all).slice(0, 4);
    heading = `${where.state.name}: ${where.state.description}`;
  } else if (themes.length) {
    const themed = catalog.places.filter((p) => placeMatchesTheme(p, themes));
    places = diversePlaces(themed, 4);
    heading = `Great places for ${themes.map((t) => THEME_LABEL[t]).join(" and ")} across India:`;
  }

  if (!places.length) {
    return reply(
      "Tell me where you want to go, or what kind of trip you like (beach, hills, heritage, wildlife, spiritual), and for how many days. For example: \"4 day heritage trip in Rajasthan under 30000\".",
      { suggestions: ["Plan a 3 day trip to Goa", "Wildlife trip for 4 days", "Hill trip for a family of 4"] }
    );
  }

  // one tap into the booking flow when the question names a single destination
  const destination = where.place ? { place: where.place, label: where.place.city || where.place.name } : where.city || where.state ? { place: places[0], label: where.city || where.state.name } : null;
  const booking = destination ? startBookingCard({ ...destination, trip, now }) : null;

  const parts = [heading];
  const estimate = trip.nights ? estimateTrip(trip) : null;

  if (estimate) parts.push(estimateText(estimate, trip.budget));
  else parts.push("Tell me how many days and travellers and I will estimate the cost.");

  parts.push("Tap a place to see details, then pick a hotel to start booking.");

  return reply(parts.join("\n\n"), {
    cards: [...(booking ? [booking] : []), ...places.map(placeCard)],
    suggestions: where.state ? [`Best time to visit ${where.state.name}`, "How do I book?", "Cancellation policy"] : ["How do I book?", "Cancellation policy", "Plan a 3 day trip to Goa"],
  });
};

const answerBestTime = (text, catalog) => {
  const where = findMentions(text, catalog);
  const state = where.state || (where.place && catalog.states.find((s) => s.slug === where.place.stateSlug));

  if (!state) {
    return reply("Which state or place? For example: \"Best time to visit Kerala\".", { suggestions: ["Best time to visit Goa", "Best time to visit Rajasthan", "Best time to visit Kerala"] });
  }

  return reply(
    state.bestTimeToVisit
      ? `The best time to visit ${state.name} is ${state.bestTimeToVisit}.`
      : `I do not have a best-season note for ${state.name} yet.`,
    { cards: [stateCard(state)] }
  );
};

const answerOther = (text, catalog, now) => {
  const where = findMentions(text, catalog);

  if (where.place) {
    const p = where.place;
    const bits = [p.description, p.timings && `Timings: ${p.timings}.`, p.entryFee && `Entry: ${p.entryFee}.`].filter(Boolean);

    return reply(`${p.name}, ${p.city}, ${p.state}. ${bits.join(" ")}`, { cards: [placeCard(p)], suggestions: [`Best time to visit ${p.state}`, "How do I book?", "Cancellation policy"] });
  }

  if (where.state || where.city) return answerPlan(text, catalog, now);

  return reply("I can help with places to visit, trip ideas with a cost estimate, how booking and payment work, cancellations and refunds, and your own bookings. What would you like to know?");
};

const answerMyBookings = (bookings, loggedIn) => {
  if (!loggedIn) {
    return reply("Please log in so I can look up your bookings.", { cards: [{ title: "Log in", subtitle: "Then ask me again", to: "/login" }], suggestions: ["How do I book?", "Cancellation policy"] });
  }

  if (!bookings.length) {
    return reply("You have no bookings yet. Tell me where you want to go and I will help you plan.", { suggestions: ["Plan a 3 day trip to Goa", "Beach trip under 20000"] });
  }

  const lines = bookings.map((b) => {
    const dest = b.destination?.name || b.destination?.city || "your trip";
    const when = b.checkIn ? new Date(b.checkIn).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";
    const paid = b.paymentStatus === "paid" ? "paid" : `payment ${b.paymentStatus || "pending"}`;

    return `${b.bookingReference}: ${dest}${when ? `, check-in ${when}` : ""}, ${b.status}, ${paid}, ${inr(b.pricing?.totalAmount || 0)}`;
  });

  return reply(`Your latest bookings:\n${lines.join("\n")}\n\nOpen My Trips to see the full details, pay or cancel.`, {
    cards: [{ title: "My Trips", subtitle: "Manage your bookings", to: "/trips" }],
    suggestions: ["What is the cancellation policy?", "How do I pay?"],
  });
};

const STATIC_ANSWERS = {
  cancellation: {
    text:
      "Cancellation rules:\n• Hotels that offer free cancellation refund the full amount if you cancel more than 24 hours before check-in.\n• Inside 24 hours, or at hotels without free cancellation, the booking can still be cancelled but is non-refundable.\n• You cannot cancel once the stay has started.\n• If nothing was paid, there is nothing to refund.\nOpen My Trips, choose the booking and tap cancel to see exactly what applies to you.",
    cards: [{ title: "My Trips", subtitle: "Cancel or view a booking", to: "/trips" }],
    suggestions: ["How do I book?", "How do I pay?", "Show my bookings"],
  },
  payment: {
    text:
      "Payment on VOYARA is a demo for now: you review your trip, tap pay and the booking is confirmed. Please do not enter real card details anywhere on this site. A real payment gateway is planned.",
    suggestions: ["How do I book?", "What is the cancellation policy?"],
  },
  pricing: {
    text:
      "The total is your room (per night x rooms x nights) plus any meals, local travel and activities you add, plus 5% tax. Prices are worked out on our server, so the amount you see in the price box is the amount you pay. Hotel prices on the site are typical figures for the demo.",
    suggestions: ["Plan a 3 day trip to Goa", "Cancellation policy"],
  },
  how_to_book: {
    text:
      "Booking takes a few steps:\n1. Search a city or pick a state and choose places.\n2. Choose a hotel near them.\n3. Pick dates and a room, then check availability.\n4. Add meals, local travel and activities if you want.\n5. Log in, enter traveller details, review and pay.\nYour booking then appears under My Trips.",
    cards: [{ title: "Start planning", subtitle: "Search places and hotels", to: "/real-places" }],
    suggestions: ["Plan a 3 day trip to Goa", "How do I pay?", "Cancellation policy"],
  },
  contact: {
    text: "You can reach the team from the Contact page. Send a message and we usually reply within one working day.",
    cards: [{ title: "Contact us", subtitle: "Send a message", to: "/contact" }],
    suggestions: ["Cancellation policy", "How do I book?"],
  },
  greeting: {
    text: "Hello! I am the VOYARA travel assistant. I can suggest places, estimate a trip cost, explain booking and cancellation, and show your bookings. What are you planning?",
    suggestions: BASE_SUGGESTIONS,
  },
  thanks: { text: "You are welcome! Ask me anything else about your trip.", suggestions: BASE_SUGGESTIONS.slice(0, 3) },
  empty: { text: "Type a question and I will help. For example: \"Plan a 3 day trip to Goa\".", suggestions: BASE_SUGGESTIONS },
};

/**
 * @param input { text, catalog: { states, places }, bookings: [], loggedIn }
 * @returns { intent, reply, cards, suggestions }
 */
const answer = ({ text, catalog, bookings = [], loggedIn = false, now = new Date() }) => {
  const question = cleanQuestion(text);
  const intent = detectIntent(question);
  let result;

  if (STATIC_ANSWERS[intent]) {
    const s = STATIC_ANSWERS[intent];
    result = reply(s.text, { cards: s.cards || [], suggestions: s.suggestions || BASE_SUGGESTIONS });
  } else if (intent === "my_bookings") result = answerMyBookings(bookings, loggedIn);
  else if (intent === "best_time") result = answerBestTime(question, catalog);
  else if (intent === "plan") result = answerPlan(question, catalog, now);
  else result = answerOther(question, catalog, now);

  return { intent, ...result };
};

module.exports = {
  MAX_QUESTION_LENGTH,
  cleanQuestion,
  detectIntent,
  parseTrip,
  detectThemes,
  findMentions,
  estimateTrip,
  answer,
};
