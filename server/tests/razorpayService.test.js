const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const razorpay = require("../services/razorpayService");

const hmac = (secret, data) => crypto.createHmac("sha256", secret).update(data).digest("hex");

const withEnv = (vars, fn) => {
  const saved = {};

  for (const key of Object.keys(vars)) {
    saved[key] = process.env[key];
    if (vars[key] === undefined) delete process.env[key];
    else process.env[key] = vars[key];
  }

  try {
    return fn();
  } finally {
    for (const key of Object.keys(saved)) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
};

const KEYS = { RAZORPAY_KEY_ID: "rzp_test_x", RAZORPAY_KEY_SECRET: "secret-x", RAZORPAY_WEBHOOK_SECRET: "hook-x" };

test("without keys it is off and the page is told demo", () => {
  withEnv({ RAZORPAY_KEY_ID: undefined, RAZORPAY_KEY_SECRET: undefined }, () => {
    assert.equal(razorpay.isConfigured(), false);
    assert.deepEqual(razorpay.publicConfig(), { mode: "demo" });
    assert.equal(razorpay.verifyPaymentSignature({ orderId: "o", paymentId: "p", signature: "00" }), false);
  });
});

test("with keys only the public key id is shared", () => {
  withEnv(KEYS, () => {
    assert.deepEqual(razorpay.publicConfig(), { mode: "razorpay", keyId: "rzp_test_x" });
  });
});

test("the checkout signature must be the HMAC of order|payment with the key secret", () => {
  withEnv(KEYS, () => {
    const good = hmac("secret-x", "order_1|pay_1");

    assert.equal(razorpay.verifyPaymentSignature({ orderId: "order_1", paymentId: "pay_1", signature: good }), true);
    assert.equal(razorpay.verifyPaymentSignature({ orderId: "order_1", paymentId: "pay_2", signature: good }), false);
    assert.equal(razorpay.verifyPaymentSignature({ orderId: "order_2", paymentId: "pay_1", signature: good }), false);
    assert.equal(razorpay.verifyPaymentSignature({ orderId: "order_1", paymentId: "pay_1", signature: hmac("other", "order_1|pay_1") }), false);
  });
});

test("odd signature values are rejected, not thrown on", () => {
  withEnv(KEYS, () => {
    for (const signature of [undefined, null, 5, {}, "", "zz", "abc", "0".repeat(10), "0".repeat(65)]) {
      assert.equal(razorpay.verifyPaymentSignature({ orderId: "o", paymentId: "p", signature }), false, String(signature));
    }

    assert.equal(razorpay.verifyPaymentSignature({ orderId: { $ne: 1 }, paymentId: "p", signature: "00" }), false);
  });
});

test("the webhook signature is over the exact raw bytes", () => {
  withEnv(KEYS, () => {
    const raw = Buffer.from('{"event":"payment.captured"}');

    assert.equal(razorpay.verifyWebhookSignature(raw, hmac("hook-x", raw)), true);
    assert.equal(razorpay.verifyWebhookSignature(Buffer.from('{"event": "payment.captured"}'), hmac("hook-x", raw)), false, "a re-formatted body fails");
    assert.equal(razorpay.verifyWebhookSignature(raw, hmac("wrong", raw)), false);
    assert.equal(razorpay.verifyWebhookSignature(raw.toString(), hmac("hook-x", raw)), false, "a parsed or string body is refused");
  });

  withEnv({ ...KEYS, RAZORPAY_WEBHOOK_SECRET: undefined }, () => {
    const raw = Buffer.from("{}");

    assert.equal(razorpay.verifyWebhookSignature(raw, hmac("", raw)), false, "no webhook secret means nothing is accepted");
  });
});

test("amounts are sent in paise and rounded", () => {
  assert.equal(razorpay.toPaise(5250), 525000);
  assert.equal(razorpay.toPaise(10.005), 1001);
  assert.equal(razorpay.toPaise("100"), 10000);
});

test("createOrder and refundPayment send the right requests", async () => {
  await withEnv(KEYS, async () => {
    const original = razorpay.http.post;
    const calls = [];

    razorpay.http.post = async (url, body, options) => {
      calls.push({ url, body, options });
      return { data: { id: "x" } };
    };

    try {
      await razorpay.createOrder({ amount: 5250, receipt: "VOY-1", notes: { a: 1 } });
      await razorpay.refundPayment("pay/1", 5250, { r: 1 });
    } finally {
      razorpay.http.post = original;
    }

    assert.equal(calls[0].url, "https://api.razorpay.com/v1/orders");
    assert.deepEqual(calls[0].body, { amount: 525000, currency: "INR", receipt: "VOY-1", notes: { a: 1 } });
    assert.deepEqual(calls[0].options.auth, { username: "rzp_test_x", password: "secret-x" });
    assert.equal(calls[1].url, "https://api.razorpay.com/v1/payments/pay%2F1/refund", "ids are URL-encoded");
    assert.equal(calls[1].body.amount, 525000);
  });
});
