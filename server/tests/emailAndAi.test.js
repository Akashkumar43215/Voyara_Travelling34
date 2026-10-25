const test = require("node:test");
const assert = require("node:assert/strict");

const { sendBookingEmail, templates, escapeHtml } = require("../services/emailService");
const { askClaude, factsFor, SYSTEM_PROMPT } = require("../services/aiAssistant");
const { bookingsToCsv, csvCell } = require("../controllers/adminManageController");

const booking = {
  bookingReference: "VOY-1-1111",
  traveler: { name: "Ann <script>alert(1)</script>", email: "ann@x.com" },
  destination: { name: "Goa" },
  accommodation: { name: "Sea View" },
  room: { name: "Standard" },
  checkIn: "2030-01-10",
  checkOut: "2030-01-12",
  adults: 2,
  pricing: { totalAmount: 5250 },
  cancellation: { refundAmount: 5250 },
};

const withEnv = async (vars, fn) => {
  const saved = {};

  for (const key of Object.keys(vars)) {
    saved[key] = process.env[key];
    if (vars[key] === undefined) delete process.env[key];
    else process.env[key] = vars[key];
  }

  try {
    await fn();
  } finally {
    for (const key of Object.keys(saved)) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
};

/* ---------------- email ---------------- */

test("without SMTP settings nothing is sent and nothing throws", async () => {
  await withEnv({ SMTP_HOST: undefined, MAIL_FROM: undefined }, async () => {
    assert.deepEqual(await sendBookingEmail("paid", booking), { sent: false, reason: "email is not configured" });
  });
});

test("an unknown email type or a missing address sends nothing", async () => {
  assert.equal((await sendBookingEmail("nope", booking)).sent, false);
  assert.equal((await sendBookingEmail("paid", { ...booking, traveler: {} })).sent, false);
  assert.equal((await sendBookingEmail("paid", null)).sent, false);
});

test("email text from the traveler is escaped and cannot break the subject line", () => {
  const nasty = { ...booking, bookingReference: "VOY-1\r\nBcc: evil@x.com", traveler: { name: "<b>Ann</b>", email: "ann@x.com" } };
  const mail = templates.paid(nasty);

  assert.ok(!/[\r\n]/.test(mail.subject));
  assert.ok(!mail.html.includes("<b>Ann</b>"));
  assert.ok(mail.html.includes("&lt;b&gt;Ann&lt;/b&gt;"));
  assert.equal(escapeHtml('"&<>\''), "&quot;&amp;&lt;&gt;&#39;");
});

test("the cancellation email states the refund", () => {
  assert.ok(templates.cancelled(booking).text.includes("₹5,250"));
  assert.ok(templates.cancelled({ ...booking, cancellation: { refundAmount: 0 } }).text.includes("No refund"));
});

/* ---------------- AI assistant ---------------- */

test("AI is off without a key and never calls the network", async () => {
  await withEnv({ ANTHROPIC_API_KEY: undefined }, async () => {
    let called = false;
    const out = await askClaude({ question: "hi", fetchImpl: async () => { called = true; } });

    assert.equal(out, null);
    assert.equal(called, false);
  });
});

test("with a key the question and our facts are sent, and the text comes back", async () => {
  await withEnv({ ANTHROPIC_API_KEY: "test-key", ANTHROPIC_MODEL: undefined }, async () => {
    let sent;
    const fetchImpl = async (url, options) => {
      sent = { url, options, body: JSON.parse(options.body) };
      return { ok: true, json: async () => ({ content: [{ type: "text", text: "Visit in winter." }] }) };
    };

    const out = await askClaude({ question: "is it safe for solo women?", mentions: { state: { name: "Goa", description: "Beaches.", bestTimeToVisit: "Nov to Feb" } }, fetchImpl });

    assert.equal(out, "Visit in winter.");
    assert.equal(sent.url, "https://api.anthropic.com/v1/messages");
    assert.equal(sent.options.headers["x-api-key"], "test-key");
    assert.equal(sent.body.messages[0].content, "is it safe for solo women?");
    assert.ok(sent.body.system.includes(SYSTEM_PROMPT) && sent.body.system.includes("Nov to Feb"));
  });
});

test("API errors, bad replies and network failures fall back to null", async () => {
  await withEnv({ ANTHROPIC_API_KEY: "test-key" }, async () => {
    assert.equal(await askClaude({ question: "x", fetchImpl: async () => ({ ok: false, status: 500 }) }), null);
    assert.equal(await askClaude({ question: "x", fetchImpl: async () => ({ ok: true, json: async () => ({ content: [] }) }) }), null);
    assert.equal(await askClaude({ question: "x", fetchImpl: async () => { throw new Error("offline"); } }), null);
  });
});

test("an over-long AI reply is cut", async () => {
  await withEnv({ ANTHROPIC_API_KEY: "test-key" }, async () => {
    const long = "a".repeat(5000);
    const out = await askClaude({ question: "x", fetchImpl: async () => ({ ok: true, json: async () => ({ content: [{ type: "text", text: long }] }) }) });

    assert.equal(out.length, 900);
  });
});

test("facts always carry the booking rules", () => {
  assert.ok(factsFor(null).includes("5% tax") && factsFor({}).includes("24 hours"));
});

/* ---------------- CSV export ---------------- */

test("CSV cells that could run as spreadsheet formulas are defused", () => {
  assert.equal(csvCell("=HYPERLINK(1)"), "'=HYPERLINK(1)");
  assert.equal(csvCell("+91 99999"), "'+91 99999");
  assert.equal(csvCell("-1"), "'-1");
  assert.equal(csvCell("@cmd"), "'@cmd");
  assert.equal(csvCell("plain"), "plain");
});

test("CSV quotes commas, quotes and line breaks", () => {
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell("two\nlines"), '"two\nlines"');
});

test("the export has a header and one row per booking", () => {
  const csv = bookingsToCsv([{ ...booking, traveler: { name: "=1+1", email: "a@b.co", phone: "9" }, status: "confirmed", paymentStatus: "paid", nights: 2, rooms: 1, children: 0 }]);
  const lines = csv.split("\r\n");

  assert.equal(lines.length, 2);
  assert.ok(lines[0].startsWith("Reference,Booked on,Traveler"));
  assert.ok(lines[1].includes("'=1+1") && lines[1].includes("5250"));
});
