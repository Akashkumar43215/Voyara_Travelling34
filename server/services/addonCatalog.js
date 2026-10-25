/**
 * Add-ons that go with a hotel booking: meals (breakfast / lunch / dinner),
 * optional local travel (car, bike, bus; AC or non-AC) and extra activities.
 *
 * Every price here is calculated on the SERVER from the room price and the
 * traveler's choices. The website only sends what was chosen, never prices,
 * so a booking can't be underpaid by editing the page.
 *
 * Prices are indicative demo prices for this project.
 */

const TAX_RATE = 0.05;

/* ----------------------------------------------------------------------------
 * MEALS
 * Priced per person per night. Pricier hotels charge more for the same meal, so
 * the amount scales with the room price (about ₹2,500 a night is the base).
 * -------------------------------------------------------------------------- */

const MEAL_BASE = { breakfast: 250, lunch: 400, dinner: 450 };

const MEAL_LABELS = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

const mealFactor = (roomPricePerNight) =>
  Math.round(Math.min(2.5, Math.max(0.7, Number(roomPricePerNight || 0) / 2500)) * 10) / 10;

const roundTo = (value, step) => Math.round(value / step) * step;

/** Per person, per night price of each meal at a hotel with this room price. */
const mealPrices = (roomPricePerNight) => {
  const factor = mealFactor(roomPricePerNight);

  return {
    breakfast: roundTo(MEAL_BASE.breakfast * factor, 10),
    lunch: roundTo(MEAL_BASE.lunch * factor, 10),
    dinner: roundTo(MEAL_BASE.dinner * factor, 10),
  };
};

const MEAL_PLANS = [
  { id: "room-only", label: "Room only", short: "No meals", description: "Food excluded. Eat at nearby restaurants.", meals: [] },
  { id: "breakfast", label: "Room + Breakfast", short: "B", description: "Breakfast included every morning.", meals: ["breakfast"] },
  { id: "half-board", label: "Half board", short: "B + D", description: "Breakfast and dinner included.", meals: ["breakfast", "dinner"] },
  { id: "full-board", label: "Full board", short: "B + L + D", description: "Breakfast, lunch and dinner included.", meals: ["breakfast", "lunch", "dinner"] },
];

/* ----------------------------------------------------------------------------
 * TRAVEL (optional)
 * Per vehicle, per day, with a driver (bikes are self-ride).
 * -------------------------------------------------------------------------- */

const TRANSPORT_MODES = {
  cab: {
    label: "Cab (sedan)",
    seats: 4,
    description: "Private car with driver, up to 80 km a day. Fuel and tolls included.",
    prices: { ac: 2200, nonAc: 1800 },
  },
  suv: {
    label: "SUV / Innova",
    seats: 6,
    description: "Roomy family car with driver, up to 80 km a day.",
    prices: { ac: 3400, nonAc: 2800 },
  },
  bike: {
    label: "Bike / Scooter",
    seats: 2,
    description: "Self-ride rental with helmets. Fuel extra. Licence needed.",
    prices: { nonAc: 600 },
  },
  bus: {
    label: "Tempo Traveller / Bus",
    seats: 14,
    description: "Group vehicle with driver for bigger parties.",
    prices: { ac: 5500, nonAc: 4200 },
  },
};

/* ----------------------------------------------------------------------------
 * ACTIVITIES
 * 1. A fixed list of experiences (ids start with "exp-").
 * 2. Real nearby attractions and activities from the map data (ids start with
 *    "geo:"), priced by a stable amount worked out from the place id.
 * -------------------------------------------------------------------------- */

const EXPERIENCES = [
  { id: "exp-city-tour", name: "Guided city sightseeing (half day)", unit: "person", price: 900, description: "Local guide, covers the top sights." },
  { id: "exp-food-walk", name: "Local street-food walk", unit: "person", price: 700, description: "Taste the city's best snacks with a guide." },
  { id: "exp-culture-show", name: "Cultural evening show", unit: "person", price: 600, description: "Folk music and dance with dinner snacks." },
  { id: "exp-adventure", name: "Adventure activity pass", unit: "person", price: 1200, description: "Choose from rides, trails and outdoor fun." },
  { id: "exp-spa", name: "Spa & wellness session", unit: "person", price: 1500, description: "60-minute massage at a partner spa." },
  { id: "exp-airport-transfer", name: "Airport / station pickup & drop", unit: "group", price: 900, description: "One transfer each way for your whole group." },
];

const hashString = (value) => {
  let hash = 0;

  for (let i = 0; i < String(value).length; i += 1) {
    hash = (hash * 31 + String(value).charCodeAt(i)) >>> 0;
  }

  return hash;
};

/** Indicative entry / guide fee per person for a real nearby place: 100 to 800. */
const geoActivityPrice = (id) => 100 + (hashString(id) % 15) * 50;

const MAX_ACTIVITIES = 10;

/* ----------------------------------------------------------------------------
 * PRICING
 * -------------------------------------------------------------------------- */

const asBool = (value) => value === true || value === "true";

/**
 * @param input {
 *   roomPricePerNight, nights, adults, children,
 *   meals: { breakfast, lunch, dinner },
 *   transport: { mode, ac, vehicles, days } | null,
 *   activities: [{ id, name }]
 * }
 * @returns { ok: true, ...breakdown } or { ok: false, message }
 */
const priceAddons = (input) => {
  const nights = Math.max(1, Number(input.nights) || 1);
  const adults = Math.max(1, Number(input.adults) || 1);
  const children = Math.max(0, Number(input.children) || 0);
  const guests = adults + children;

  // ---- meals
  const chosen = {
    breakfast: asBool(input.meals?.breakfast),
    lunch: asBool(input.meals?.lunch),
    dinner: asBool(input.meals?.dinner),
  };

  const prices = mealPrices(input.roomPricePerNight);
  const perPersonPerNight = ["breakfast", "lunch", "dinner"].reduce(
    (sum, key) => sum + (chosen[key] ? prices[key] : 0),
    0
  );

  // children eat for half
  const guestUnits = adults + children * 0.5;
  const mealsTotal = Math.round(perPersonPerNight * guestUnits * nights);

  // ---- transport
  let transport = null;
  let transportTotal = 0;

  const t = input.transport;

  if (t && t.mode && t.mode !== "none") {
    const mode = TRANSPORT_MODES[t.mode];

    if (!mode) return { ok: false, message: "Unknown travel option selected." };

    const ac = asBool(t.ac);
    const perDay = ac ? mode.prices.ac : mode.prices.nonAc;

    if (!perDay) {
      return { ok: false, message: `${mode.label} is not available as ${ac ? "AC" : "non-AC"}.` };
    }

    const vehicles = Math.min(10, Math.max(1, Math.round(Number(t.vehicles) || 1)));
    const days = Math.min(30, Math.max(1, Math.round(Number(t.days) || nights + 1)));

    if (mode.seats * vehicles < guests) {
      return {
        ok: false,
        message: `${mode.label} seats ${mode.seats}. For ${guests} guests please add more vehicles.`,
      };
    }

    transportTotal = perDay * days * vehicles;

    transport = {
      mode: t.mode,
      label: mode.label,
      ac,
      vehicles,
      days,
      perDay,
      total: transportTotal,
    };
  }

  // ---- activities
  const rawActivities = Array.isArray(input.activities) ? input.activities : [];

  if (rawActivities.length > MAX_ACTIVITIES) {
    return { ok: false, message: `You can add up to ${MAX_ACTIVITIES} activities.` };
  }

  const seen = new Set();
  const activities = [];
  let activitiesTotal = 0;

  for (const item of rawActivities) {
    const id = String(item?.id || "");

    if (!id || seen.has(id)) continue;
    seen.add(id);

    let unit = "person";
    let price;
    let name = String(item.name || "").slice(0, 120);

    if (id.startsWith("exp-")) {
      const exp = EXPERIENCES.find((e) => e.id === id);

      if (!exp) return { ok: false, message: "An activity you selected is no longer available." };

      unit = exp.unit;
      price = exp.price;
      name = exp.name;
    } else if (id.startsWith("geo:") && id.length > 4) {
      price = geoActivityPrice(id);
      name = name || "Local attraction";
    } else {
      return { ok: false, message: "An activity you selected is not valid." };
    }

    const persons = unit === "group" ? 1 : guests;
    const total = price * persons;

    activitiesTotal += total;
    activities.push({ id, name, unit, persons, pricePerUnit: price, total });
  }

  return {
    ok: true,
    meals: {
      ...chosen,
      perPersonPerNight,
      guestUnits,
      total: mealsTotal,
    },
    transport,
    activities,
    mealsTotal,
    transportTotal,
    activitiesTotal,
    addonsTotal: mealsTotal + transportTotal + activitiesTotal,
  };
};

/** Room + add-ons + 5% taxes: the amounts a booking is charged. */
const priceBooking = ({ roomPricePerNight, rooms, nights, ...rest }) => {
  // Refuse nonsense before any money is worked out (negative, fractional or huge values)
  const price = Number(roomPricePerNight);

  if (!Number.isFinite(price) || price < 0) return { ok: false, message: "Invalid room pricing information." };
  if (!Number.isInteger(Number(rooms)) || rooms < 1 || rooms > 10) return { ok: false, message: "Choose between 1 and 10 rooms." };
  if (!Number.isInteger(Number(nights)) || nights < 1 || nights > 30) return { ok: false, message: "Choose between 1 and 30 nights." };

  for (const key of ["adults", "children"]) {
    const value = rest[key];

    if (value !== undefined && value !== null && (!Number.isInteger(Number(value)) || Number(value) < 0 || Number(value) > 50)) {
      return { ok: false, message: "Invalid number of guests." };
    }
  }

  const addons = priceAddons({ roomPricePerNight, nights, ...rest });

  if (!addons.ok) return addons;

  const roomTotal = Number(roomPricePerNight) * Number(rooms) * Number(nights);
  const subtotal = roomTotal + addons.addonsTotal;
  const taxes = Math.round(subtotal * TAX_RATE);

  return {
    ...addons,
    roomTotal,
    taxes,
    totalAmount: subtotal + taxes,
  };
};

module.exports = {
  TAX_RATE,
  MEAL_LABELS,
  MEAL_PLANS,
  TRANSPORT_MODES,
  EXPERIENCES,
  mealPrices,
  geoActivityPrice,
  priceAddons,
  priceBooking,
};
