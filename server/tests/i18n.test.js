/**
 * Guards the English / Hindi / Odia texts of the website (client/src/i18n).
 * The client has no test runner of its own, so the server suite checks it.
 *
 *  - structured keys (nav.home ...) exist in all three languages with the same {placeholders}
 *  - every text the code shows through tx() / tg() / t() / plural() has a Hindi and an Odia translation
 *  - the server messages, the add-on catalog, the Contact settings and the curated states and places have one too
 *  - every Hindi and Odia text is really written in its own script
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const clientSrc = path.join(__dirname, "..", "..", "client", "src");
const serverRoot = path.join(__dirname, "..");

const importClient = (...parts) => import(pathToFileURL(path.join(clientSrc, ...parts)).href);

const SCRIPTS = {
  // U+0964 and U+0965 (the danda, the full stop of both scripts) sit in the Devanagari block
  // but Odia uses them too, so they do not count as Hindi letters
  hi: /[ऀ-ॣ०-ॿ]/,
  or: /[଀-୿]/,
};

const PHRASE_FILES = {
  hi: ["hi-ui.js", "hi-data.js"],
  or: ["or-ui-1.js", "or-ui-2.js", "or-ui-3.js", "or-ui-4.js", "or-server.js", "or-data.js"],
};

const LANGS = ["hi", "or"];

const placeholders = (text) => (text.match(/\{\w+\}/g) || []).sort().join(",");

let cached;

// everything the tests need, loaded once (the phrase files are plain ES modules without imports)
const load = async () => {
  if (cached) return cached;

  const main = await importClient("i18n", "translations.js");
  const phrases = {};

  for (const lang of LANGS) {
    const parts = await Promise.all(PHRASE_FILES[lang].map((f) => importClient("i18n", f)));

    phrases[lang] = Object.assign({}, ...parts.map((m) => Object.values(m)[0]));

    // the same merge ensureLanguage() does in the browser
    Object.assign(main.translations[lang], phrases[lang]);
    main.resetTemplates(lang);
  }

  cached = { ...main, phrases };

  return cached;
};

const isStructured = (key) => /^[a-z]+\.[a-zA-Z0-9.]+$/.test(key);

/* ------------------------------------------------------------------ structured keys */

test("every language has every structured key, and nothing extra", async () => {
  const { translations, phrases } = await load();

  // the Hindi and Odia tables also hold thousands of "English text": "translated text" entries, which are not keys
  const keysOf = (lang) => Object.keys(translations[lang]).filter((key) => !(key in (phrases[lang] || {}))).sort();

  assert.deepEqual(keysOf("hi"), keysOf("en"));
  assert.deepEqual(keysOf("or"), keysOf("en"));
});

test("the language list matches the dictionaries and the script checks", async () => {
  const { LANGUAGES, translations } = await load();

  assert.deepEqual(LANGUAGES.map((l) => l.code).sort(), Object.keys(translations).sort());

  for (const { code } of LANGUAGES) if (code !== "en") assert.ok(SCRIPTS[code], `no script check for ${code}`);
});

test("no text is empty", async () => {
  const { translations } = await load();

  for (const [lang, table] of Object.entries(translations)) {
    for (const [key, text] of Object.entries(table)) assert.ok(typeof text === "string" && text.trim(), `${lang}: ${key}`);
  }
});

test("each translation keeps the same {placeholders} as its English text", async () => {
  const { en, translations, phrases } = await load();

  for (const lang of LANGS) {
    for (const [key, text] of Object.entries(translations[lang])) {
      // a structured key is compared with its English text; a phrase is compared with its own key
      const english = key in phrases[lang] ? key : en[key];

      assert.ok(english !== undefined, `${lang}: ${key} has no English`);
      assert.equal(placeholders(text), placeholders(english), `${lang}: ${key}`);
    }
  }
});

test("Hindi and Odia texts are in their own script, not each other's", async () => {
  const { translations } = await load();

  // short labels that are the same in every language
  const sameEverywhere = new Set(["CVV", "₹30"]);

  for (const [lang, script] of Object.entries(SCRIPTS)) {
    for (const [key, text] of Object.entries(translations[lang])) {
      if (sameEverywhere.has(key)) continue;
      assert.ok(script.test(text), `${lang}: "${key}" has no letters of its script: ${text}`);
    }
  }

  for (const text of Object.values(translations.hi)) assert.ok(!SCRIPTS.or.test(text), `Odia letters in Hindi: ${text}`);
  for (const text of Object.values(translations.or)) assert.ok(!SCRIPTS.hi.test(text), `Hindi letters in Odia: ${text}`);
});

test("Hindi and Odia translate the same set of texts", async () => {
  const { phrases } = await load();

  const hi = new Set(Object.keys(phrases.hi));
  const or = new Set(Object.keys(phrases.or));

  assert.deepEqual([...or].filter((k) => !hi.has(k)), [], "in Odia but not in Hindi");
  assert.deepEqual([...hi].filter((k) => !or.has(k)), [], "in Hindi but not in Odia");
});

test("the lookup fills placeholders and falls back to English, then to the key", async () => {
  const { translate } = await load();

  assert.equal(translate("hi", "nav.welcome", { name: "Ann" }), "स्वागत है, Ann");
  assert.equal(translate("en", "nav.welcome", { name: "Ann" }), "Welcome, Ann");
  assert.equal(translate("or", "nav.welcome", { name: "Ann" }), "ସ୍ୱାଗତ, Ann");
  assert.equal(translate("en", "nav.welcome"), "Welcome, {name}", "a missing value leaves the placeholder");
  assert.equal(translate("fr", "nav.home"), "Home", "an unknown language uses English");
  assert.equal(translate("hi", "no.such.key"), "no.such.key");
  assert.equal(translate("hi", "A sentence nobody translated"), "A sentence nobody translated", "unknown text is shown as it is");
  assert.equal(translate("or", "A sentence nobody translated"), "A sentence nobody translated", "unknown text is shown as it is");
  assert.equal(translate("or", 42), 42, "numbers pass through");
  assert.equal(translate("hi", undefined), undefined);
});

test("a phrase with {values} also matches a sentence with real values (server messages)", async () => {
  const { translate, translations } = await load();

  for (const lang of LANGS) {
    const out = translate(lang, "Only 3 room(s) available for the selected dates.");

    assert.equal(out, translations[lang]["Only {n} room(s) available for the selected dates."].replace("{n}", "3"), lang);
    assert.ok(SCRIPTS[lang].test(out) && out.includes("3"), lang);
    assert.ok(translate(lang, "Free cancellation: the full amount of ₹5,250 will be refunded.").includes("₹5,250"), lang);
  }

  assert.equal(translate("en", "Only 3 room(s) available for the selected dates."), "Only 3 room(s) available for the selected dates.");
});

/* ------------------------------------------------------------------ texts used in the code */

const babelAvailable = () => {
  try {
    require.resolve("@babel/parser", { paths: [path.join(clientSrc, "..")] });
    return true;
  } catch {
    return false;
  }
};

const clientFiles = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name !== "i18n") clientFiles(full, out);
    } else if (/\.jsx?$/.test(entry.name)) out.push(full);
  }

  return out;
};

// the English texts passed to tx() / tg() / t() and the two texts of plural(), found with a real parser
const textsUsedInCode = () => {
  const base = path.join(clientSrc, "..");
  const parser = require(require.resolve("@babel/parser", { paths: [base] }));
  const traverse = require(require.resolve("@babel/traverse", { paths: [base] })).default;

  const used = new Map();

  const literals = (node, out) => {
    if (!node) return;
    if (node.type === "StringLiteral") out.push(node.value);
    else if (node.type === "ConditionalExpression") {
      literals(node.consequent, out);
      literals(node.alternate, out);
    } else if (node.type === "LogicalExpression") literals(node.right, out);
  };

  for (const file of clientFiles(clientSrc)) {
    const ast = parser.parse(fs.readFileSync(file, "utf8"), { sourceType: "module", plugins: ["jsx"] });

    traverse(ast, {
      CallExpression(p) {
        const callee = p.node.callee;
        if (callee.type !== "Identifier") return;

        const found = [];

        if (["tx", "tg", "t"].includes(callee.name)) literals(p.node.arguments[0], found);
        else if (callee.name === "plural") {
          literals(p.node.arguments[2], found);
          literals(p.node.arguments[3], found);
        }

        for (const text of found) if (!used.has(text)) used.set(text, path.relative(clientSrc, file));
      },
    });
  }

  return used;
};

// brand names and technical tokens that are the same in every language
const KEEP_ENGLISH = new Set(["VOYARA", "VOY-BOOKING", "you@example.com", "UPI", "AC"]);

test("every text shown through tx() / tg() / t() / plural() has a Hindi and an Odia translation", { skip: babelAvailable() ? false : "client dependencies are not installed" }, async () => {
  const { en, translations } = await load();

  const used = textsUsedInCode();

  assert.ok(used.size > 500, `only found ${used.size} texts in the code`);

  for (const lang of LANGS) {
    const missing = [];

    for (const [text, file] of used) {
      if (KEEP_ENGLISH.has(text) || !/[A-Za-z]{2,}/.test(text)) continue;

      // a structured key must exist in English, a phrase in the language's table
      if (isStructured(text) && !(text in translations[lang])) {
        if (!(text in en)) missing.push(`${text}  (${file}) not in the dictionary`);
      } else if (!(text in translations[lang])) missing.push(`${text}  (${file})`);
    }

    assert.deepEqual(missing, [], `${lang} is missing ${missing.length} texts:\n${missing.slice(0, 40).join("\n")}`);
  }
});

/* ------------------------------------------------------------------ server texts and data */

test("the add-on catalog the server sends (meals, travel, activities) is translated", async () => {
  const { translations } = await load();
  const { MEAL_PLANS, TRANSPORT_MODES, EXPERIENCES } = require(path.join(serverRoot, "services", "addonCatalog.js"));

  const texts = [
    ...MEAL_PLANS.flatMap((p) => [p.label, p.description]),
    ...Object.values(TRANSPORT_MODES).flatMap((m) => [m.label, m.description]),
    ...EXPERIENCES.flatMap((e) => [e.name, e.description]),
  ];

  for (const lang of LANGS) assert.deepEqual(texts.filter((text) => !(text in translations[lang])), [], lang);
});

test("the messages the server sends to the website are translated", async () => {
  const { translations } = await load();

  // only for internal use: never shown to a visitor
  const INTERNAL = new Set(["Ignored.", "Unknown order, ignored.", "Amount mismatch, ignored.", "email is not configured", "nothing to send", "send failed", "Webhook failed.", "Invalid signature.", "Booking was cancelled before payment finished"]);

  const messages = [];

  for (const dir of ["controllers", "services", "middleware"]) {
    for (const file of fs.readdirSync(path.join(serverRoot, dir)).filter((f) => f.endsWith(".js"))) {
      const source = fs.readFileSync(path.join(serverRoot, dir, file), "utf8");

      for (const match of source.matchAll(/\bmessage:\s*\n?\s*"((?:[^"\\\n]|\\.)+)"/g)) {
        const text = match[1];

        if (INTERNAL.has(text) || !/[A-Za-z]{4,}/.test(text)) continue;
        messages.push({ text, where: `${dir}/${file}` });
      }
    }
  }

  for (const lang of LANGS) {
    const missing = messages.filter((m) => !(m.text in translations[lang])).map((m) => `${m.text}  (${m.where})`);

    assert.deepEqual(missing, [], `${lang} is missing ${missing.length} server messages:\n${missing.join("\n")}`);
  }
});

test("every curated state and place has Hindi and Odia texts", async () => {
  const { translations } = await load();
  const data = path.join(serverRoot, "data");

  const states = require(path.join(data, "statesData.js"));
  const places = [...require(path.join(data, "curatedPlacesData.js")), ...require(path.join(data, "curatedPlacesExtra.js")), ...require(path.join(data, "curatedPlacesExtra2.js"))];

  const texts = [
    ...states.flatMap((s) => [s.name, s.capital, s.description, s.bestTimeToVisit, ...(s.popularPlaces || [])]),
    ...places.flatMap((p) => [p.name, p.state, p.city, p.description, p.timings, p.entryFee]),
  ].filter(Boolean);

  for (const lang of LANGS) {
    const missing = [...new Set(texts)].filter((text) => !(text in translations[lang]));

    assert.deepEqual(missing, [], `${lang} is missing ${missing.length} data texts:\n${missing.slice(0, 20).join("\n")}`);
  }
});

test("the Contact page details and subjects from config/site.js are translated", async () => {
  const { translations } = await load();
  const { SITE, CONTACT_SUBJECTS } = await importClient("config", "site.js");

  const texts = [SITE.hours, SITE.responseTime, ...SITE.address, ...CONTACT_SUBJECTS];

  for (const lang of LANGS) assert.deepEqual(texts.filter((text) => !(text in translations[lang])), [], lang);
});

test("tx, tg, plural, placeLine, dateLocale and useLanguage are defined wherever they are used", { skip: babelAvailable() ? false : "client dependencies are not installed" }, () => {
  // a build cannot see "tx is not defined": it only fails when that page is opened
  const base = path.join(clientSrc, "..");
  const parser = require(require.resolve("@babel/parser", { paths: [base] }));
  const traverse = require(require.resolve("@babel/traverse", { paths: [base] })).default;

  const NAMES = new Set(["tx", "tg", "plural", "placeLine", "dateLocale", "useLanguage"]);
  const problems = [];

  for (const file of clientFiles(clientSrc)) {
    const ast = parser.parse(fs.readFileSync(file, "utf8"), { sourceType: "module", plugins: ["jsx"] });

    traverse(ast, {
      ReferencedIdentifier(p) {
        if (NAMES.has(p.node.name) && !p.scope.hasBinding(p.node.name)) problems.push(`${p.node.name} in ${path.relative(clientSrc, file)}:${p.node.loc.start.line}`);
      },
    });
  }

  assert.deepEqual(problems, []);
});
