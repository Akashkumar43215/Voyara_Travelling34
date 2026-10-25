const State = require("../models/State");
const TouristPlace = require("../models/TouristPlace");
const Booking = require("../models/Booking");

const { answer, cleanQuestion, detectIntent, findMentions, MAX_QUESTION_LENGTH } = require("../services/assistantEngine");
const { askClaude } = require("../services/aiAssistant");

// States and places change rarely, so keep them in memory for a few minutes
const CATALOG_TTL_MS = 10 * 60 * 1000;
let catalogCache = { at: 0, data: null };

const loadCatalog = async () => {
  if (catalogCache.data && Date.now() - catalogCache.at < CATALOG_TTL_MS) return catalogCache.data;

  const [states, places] = await Promise.all([
    State.find().select("name slug region description bestTimeToVisit image").lean(),
    TouristPlace.find().select("name slug state stateSlug city categories description rating image timings entryFee").lean(),
  ]);

  catalogCache = { at: Date.now(), data: { states, places } };

  return catalogCache.data;
};

// POST /api/assistant   body: { message }
// Open to visitors. A logged-in user (optionalAuth) can also ask about their own bookings.
const chat = async (req, res) => {
  try {
    const { message } = req.body || {};

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ success: false, message: "Please type a question." });
    }

    if (message.length > MAX_QUESTION_LENGTH * 2) {
      return res.status(400).json({ success: false, message: `Please keep your question under ${MAX_QUESTION_LENGTH} characters.` });
    }

    const loggedIn = Boolean(req.user?.userId);
    let bookings = [];

    // Bookings are private: only ever this user's own, newest first
    if (loggedIn && detectIntent(cleanQuestion(message)) === "my_bookings") {
      bookings = await Booking.find({ user: req.user.userId })
        .sort({ createdAt: -1 })
        .limit(3)
        .select("bookingReference destination checkIn status paymentStatus pricing.totalAmount")
        .lean();
    }

    const catalog = await loadCatalog();

    const result = answer({ text: message, catalog, bookings, loggedIn });

    // Only questions the rules could not place go to the AI (when a key is set).
    // A question that names a known place or state is already answered from our own data.
    const question = cleanQuestion(message);
    const mentions = result.intent === "other" ? findMentions(question, catalog) : null;

    if (mentions && !mentions.place && !mentions.state && !mentions.city) {
      const aiReply = await askClaude({ question, mentions });

      if (aiReply) {
        result.reply = aiReply;
        result.cards = [];
        result.source = "ai";
      }
    }

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Assistant Error:", error.message);

    return res.status(500).json({ success: false, message: "The assistant is unavailable right now. Please try again." });
  }
};

module.exports = { chat };
