const test = require("node:test");
const assert = require("node:assert/strict");

const { validateContact, SUBJECTS } = require("../services/contactValidation");

const good = {
  name: "Priya Nair",
  email: "Priya@Example.com",
  subject: "Booking help",
  message: "I would like to change the dates of my booking.",
};

test("a good message passes and is tidied (email lowercased, spaces collapsed)", () => {
  const r = validateContact({ ...good, name: "  Priya    Nair ", subject: "  Booking   help " });

  assert.equal(r.ok, true);
  assert.equal(r.data.name, "Priya Nair");
  assert.equal(r.data.email, "priya@example.com");
  assert.equal(r.data.subject, "Booking help");
});

test("every subject offered on the page is accepted", () => {
  for (const subject of SUBJECTS) assert.equal(validateContact({ ...good, subject }).ok, true, subject);
});

test("missing or empty fields are reported per field", () => {
  const r = validateContact({ name: "", email: "", subject: "", message: "" });

  assert.equal(r.ok, false);
  assert.ok(r.errors.name && r.errors.email && r.errors.subject && r.errors.message);
});

test("a bad email address is rejected", () => {
  for (const email of ["priya", "priya@", "priya@example", "a b@example.com"]) {
    const r = validateContact({ ...good, email });
    assert.equal(r.ok, false, email);
    assert.ok(r.errors.email, email);
  }
});

test("too short or too long messages are rejected", () => {
  assert.ok(validateContact({ ...good, message: "Hi" }).errors.message);
  assert.ok(validateContact({ ...good, message: "x".repeat(2001) }).errors.message);
  assert.equal(validateContact({ ...good, message: "x".repeat(2000) }).ok, true);
});

test("objects and arrays are rejected instead of being stored (no operator injection)", () => {
  assert.equal(validateContact({ ...good, email: { $gt: "" } }).ok, false);
  assert.equal(validateContact({ ...good, name: ["a", "b"] }).ok, false);
  assert.equal(validateContact(null).ok, false);
  assert.equal(validateContact("hello").ok, false);
});

test("control characters are removed but line breaks in the message stay", () => {
  const r = validateContact({ ...good, message: "Line one\u0000\u0007\nLine two is here" });

  assert.equal(r.ok, true);
  assert.equal(r.data.message, "Line one\nLine two is here");
});
