const test = require("node:test");
const assert = require("node:assert/strict");

// validateEnv reads process.env each time it runs, but isProduction is fixed at load time,
// so load a fresh copy of the module for each environment.
const load = (env) => {
  const saved = { ...process.env };

  Object.keys(process.env).forEach((key) => {
    if (/^(NODE_ENV|MONGO_URI|JWT_SECRET|CLIENT_URL|GEOAPIFY_API_KEY|CLOUDINARY_.*|PEXELS_API_KEY)$/.test(key)) {
      delete process.env[key];
    }
  });

  Object.assign(process.env, env);

  delete require.cache[require.resolve("../config/env")];
  const result = require("../config/env").validateEnv();

  process.env = saved;
  delete require.cache[require.resolve("../config/env")];

  return result;
};

test("a missing JWT secret stops the server", () => {
  const { errors } = load({ MONGO_URI: "mongodb://x" });

  assert.ok(errors.some((e) => /JWT_SECRET/.test(e)));
});

test("production rejects a weak JWT secret", () => {
  const { errors } = load({ NODE_ENV: "production", MONGO_URI: "mongodb://x", JWT_SECRET: "changeme" });

  assert.ok(errors.some((e) => /too weak/.test(e)));
});

test("production needs MONGO_URI", () => {
  const { errors } = load({ NODE_ENV: "production", JWT_SECRET: "a".repeat(40) });

  assert.ok(errors.some((e) => /MONGO_URI/.test(e)));
});

test("a strong production setup passes with only warnings", () => {
  const { errors, warnings } = load({
    NODE_ENV: "production",
    MONGO_URI: "mongodb://x",
    JWT_SECRET: "x".repeat(48),
    CLIENT_URL: "https://example.com",
    GEOAPIFY_API_KEY: "k",
    CLOUDINARY_CLOUD_NAME: "c",
    CLOUDINARY_API_KEY: "k",
    CLOUDINARY_API_SECRET: "s",
    PEXELS_API_KEY: "p",
    SMTP_HOST: "smtp.example.com",
    MAIL_FROM: "VOYARA <no-reply@example.com>",
  });

  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test("missing optional keys only produce warnings", () => {
  const { errors, warnings } = load({ MONGO_URI: "mongodb://x", JWT_SECRET: "a-long-enough-development-secret" });

  assert.deepEqual(errors, []);
  assert.ok(warnings.some((w) => /GEOAPIFY/.test(w)));
});
