const test = require("node:test");
const assert = require("node:assert/strict");

const { sanitizeInput } = require("../middleware/security");

const run = (req) => {
  let called = false;
  sanitizeInput(req, {}, () => {
    called = true;
  });
  assert.equal(called, true);
  return req;
};

test("MongoDB operator keys are removed from the request body", () => {
  const req = run({ body: { email: { $gt: "" }, password: "x", nested: { a: { $ne: 1, ok: 2 } } }, params: {}, query: {} });

  assert.deepEqual(req.body.email, {});
  assert.deepEqual(req.body.nested, { a: { ok: 2 } });
  assert.equal(req.body.password, "x");
});

test("dotted keys are removed too", () => {
  const req = run({ body: { "a.b": 1, fine: 2 }, params: {}, query: {} });

  assert.deepEqual(req.body, { fine: 2 });
});

test("operator keys in the query string are dropped", () => {
  const req = run({ body: {}, params: {}, query: { $where: "1", city: "Jaipur" } });

  assert.equal(req.query.$where, undefined);
  assert.equal(req.query.city, "Jaipur");
});

test("arrays are cleaned item by item", () => {
  const req = run({ body: { list: [{ $gt: 1, a: 1 }, "text"] }, params: {}, query: {} });

  assert.deepEqual(req.body.list, [{ a: 1 }, "text"]);
});
