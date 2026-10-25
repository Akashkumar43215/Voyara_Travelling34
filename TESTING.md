# VOYARA Testing

What is tested, how to run it, how to add tests, and what to check by hand before a release.

Related: [AGENTS.md](AGENTS.md) · [SECURITY.md](SECURITY.md) · [CORE_STYLE.md](CORE_STYLE.md) · [ARCHITECTURE.md](ARCHITECTURE.md)

---

## 1. Strategy

Test the things where a mistake is expensive first: **money, availability and security**. Everything else is checked by hand against a checklist (section 5), with a browser audit for layout (section 6).

| Layer | How | State |
|---|---|---|
| Server logic and the API (pricing, bookings, payments, reviews, admin, assistant, texts) | Automated unit and integration tests, Node's built-in runner | **127 tests, all passing** |
| API routes with a database | Manual and scripted requests | Manual (section 4) |
| Website screens and the booking journey | Manual checklist plus a browser audit | Manual |
| Layout at many screen sizes | Browser audit with Playwright | Ad hoc, not yet in the repo |
| About and Contact | Browser script: navbar links and highlight, counters, FAQ, `#faq` scroll, form errors, focus, success, prefill, admin inbox and mark-as-read | Ad hoc, not yet in the repo |
| Motion | Browser script: slideshow and slider advance, dots and arrows work, numbers reach their final value, cards reveal and none stay hidden, progress line moves, reduced motion stops autoplay and shows everything | Ad hoc, not yet in the repo |
| Light / dark mode | Browser script: first visit follows the device, click toggles and saves, reload keeps it, no flash, keyboard works. Colour audit lists light panels and low-contrast text on every page in dark mode | Ad hoc, not yet in the repo |
| Client unit tests, end-to-end tests in CI | | Not yet. See section 8 |

## 2. Running the automated tests

From the project root:

```bash
npm test
```

This runs `node --test "tests/*.test.js"` in `server/`. No network or API key is needed. The unit tests need no database. `tests/api.integration.test.js` starts a throwaway `mongod` on a free port and deletes it afterwards (it never touches your real data). Every test is fast (the whole suite finishes in about a second).

To run one file:

```bash
cd server
node --test tests/addonCatalog.test.js
```

To run tests whose name contains a word:

```bash
node --test --test-name-pattern="travel" tests/*.test.js
```

**A change is not done until `npm test` passes.**

## 3. What the automated tests cover

| File | Tests | What it proves |
|---|---|---|
| `tests/addonCatalog.test.js` | 12 | **Pricing.** Room-only price with 5% tax. Meal prices scale with the room price within the floor and cap. Children eat for half. Full board maths. AC costs more than non-AC and is charged per day and vehicle. A bike has no AC. Too few seats are rejected. Unknown modes are rejected. Activities are priced per person or per group. Real nearby places get a stable price. Unknown activity ids and too many activities are rejected. **Prices sent by the page are ignored.** The same activity added twice is charged once |
| `tests/stayProfile.test.js` | 8 | **Hotel profiles.** The same hotel always gets the same profile. Generated values stay in range. The listing price equals the Standard Room price used for booking. Luxury names cost more. Free cancellation depends only on the hotel id. Real reviews replace the generated rating. Facilities the property lists come first and are marked. The facility extractor reads only what the map data records |
| `tests/security.test.js` | 4 | **Input cleaning.** MongoDB operator keys (`$gt`) are removed from the body. Dotted keys are removed. Operator keys in the query string are dropped. Arrays are cleaned item by item |
| `tests/env.test.js` | 5 | **Startup checks.** A missing JWT secret stops the server. Production rejects a weak secret. Production needs `MONGO_URI`. A strong production setup passes with only warnings. Missing optional keys only warn |

| `tests/contactValidation.test.js` | 7 | **Contact form.** A good message passes and is tidied (email lowercased, spaces collapsed). Every subject offered on the page is accepted. Empty fields are reported one by one. Bad email addresses are rejected. Too short and too long messages are rejected. Objects, arrays and non-text values are rejected (no operator injection). Control characters are removed but line breaks stay |

| `tests/assistantEngine.test.js` | 12 | **Travel assistant.** Intents, trip details (days, people, budget), place and state matching, estimates that equal the real pricing, bookings shown only when given, cancellation text matches the rules |
| `tests/bookingValidation.test.js` | 8 | **Booking input.** Nights come from the dates, past dates, whole-number guests and rooms, wrong types, pricing refuses negative, fractional and huge values |
| `tests/emailAndAi.test.js` | 12 | **Email, AI and CSV.** No SMTP means nothing is sent, email text is escaped and cannot inject headers, the Claude call (mocked) falls back safely, CSV cells cannot run as spreadsheet formulas |
| `tests/api.integration.test.js` | 1 file, 9 checks | **The real API against a throwaway MongoDB.** Login and server-side price, ownership of bookings, cancelled bookings cannot be paid, **simultaneous bookings never oversell a room**, admin rights are read from the database, admin search, filters, CSV export, refund and role changes, assistant privacy. It starts its own `mongod`; if none is found it **skips** (set `MONGOD_PATH`) |

| `tests/razorpayService.test.js` | 7 | **Gateway helpers.** Off without keys, only the public key id is shared, checkout and webhook signatures (wrong secret, other order, odd values, re-formatted body), paise conversion, request shapes |
| `tests/payments.integration.test.js` | 1 file, 11 checks | **Online payment with a fake Razorpay.** Demo endpoint switched off, server-set amount, owner only, forged and cross-order signatures refused, webhook confirms and ignores wrong amounts, late payment on a cancelled booking is refunded, gateway refunds on cancel (user and admin), a refused refund keeps the booking |

Change-dates checks live in `tests/api.integration.test.js` (re-pricing with meals and travel days, availability that ignores the booking itself, a paid booking keeping its total, owner only, started or cancelled stays refused, two people moving into the last room at once) and `validateDates` in `tests/bookingValidation.test.js`.

| `tests/reviews.integration.test.js` | 1 file, 9 checks + 1 | **Review votes and photos with a fake Cloudinary.** Votes never leak who voted, one vote per person, no vote on your own review, sort by helpful, photos only for the owner, real image bytes only (a `.jpg` that is a script is refused), at most 3, 3 MB limit, failed uploads leave nothing behind, Cloudinary cleanup on delete, admin rights read from the database |
| `tests/i18n.test.js` | 14 | **English / Hindi / Odia texts.** Same structured keys, same `{placeholders}`, each Odia and Hindi text is in its own script, every text the code shows through `tx` / `tg` / `t` / `plural` has an Odia and a Hindi translation, the server messages, the add-on catalog, the Contact settings and all 36 states and 234 places are translated, sentence templates match real server messages, and `tx` / `tg` / `plural` / `dateLocale` are defined wherever they are used |

The assistant tests also cover the one-tap "Start booking" card (destination, dates a week out, guests, rooms).

Total: 127.

Smoke check used while building the Odia and Hindi sites (not part of `npm test`): bundle every page with esbuild and render it on the server in English, Hindi and Odia. All 33 pages and components rendered without an error in all three languages.

## 4. Manual API checks

Use the Postman folder, curl or any REST client. Start the server (`npm run dev:server`) with a database.

| Check | Request | Expect |
|---|---|---|
| Health | `GET /api/health` | 200, database connected |
| Register short password | `POST /api/auth/register` with `abc` | 400 with a clear message |
| Register and login | register, then `POST /api/auth/login` | token returned |
| Me without token | `GET /api/auth/me` | 401 |
| Quote | `POST /api/addons/quote` with room, meals, vehicle, activities | totals add up, tax 5% |
| Tampered price | `POST /api/bookings` with a `totalAmount` field changed | Ignored. Stored total equals the server's |
| Availability | `POST /api/bookings/check-availability` for a room | rooms left, drops after a booking, returns after a cancel |
| Create, pay | `POST /api/bookings`, `PATCH /:id/payment` | status `confirmed`, payment `paid` |
| Cancel with free cancellation | `GET /:id/cancellation`, `PATCH /:id/cancel` | full refund shown, then `cancelled` |
| Cancel inside 24 hours | same | no refund, note says so |
| Other user's booking | request another user's id | not found or not allowed |
| Admin without role | `GET /api/admin/stats` as normal user | 403 |
| Admin with role | `make-admin`, log in again | 200 with stats including `services` |
| Upload without login | `POST /api/upload/image` | 401 |
| Operator injection | login with `{"email": {"$gt": ""}}` | rejected |
| Rate limit | `RATE_LIMIT=on`, 21 wrong logins | the 21st is blocked (429) |
| Send a message | `POST /api/contact` with a good body | 201, and it appears in `GET /api/admin/messages` |
| Bad message | `POST /api/contact` with an empty name, bad email, short message | 400 with an error per field |
| Bot trap | `POST /api/contact` with `website` filled | 201 but nothing stored |
| Messages need admin | `GET /api/admin/messages` without a token, then as a normal user | 401, then 403 |
| Mark read | `PATCH /api/admin/messages/:id/read`, then a bad id | 200 and the unread count drops, then 400 |

## 5. Manual checklist: booking journey

Do this on a phone-sized window (390px) and a desktop window (1280px). Use dates far in the future so rooms are free.

| # | Step | Expect |
|---|---|---|
| 1 | Home: type a city, pick a suggestion, set dates and guests, Search | Goes to the places page |
| 2 | Places: select two places | "2 selected" bar appears, Continue works. Photos load |
| 3 | Stays: hotels load | Each card shows a distance to **each** picked place. Filters and sort work |
| 4 | Open a hotel's details | Facilities, contact, restaurants, reviews. "listed" only on real facts |
| 5 | Select stay, Continue | Dates page. Hotel and places shown |
| 6 | Pick a room, dates, guests, Search Availability | Availability page shows rooms left |
| 7 | Meals | Plans and single meals change the price box. Food excluded costs nothing |
| 8 | Travel and activities | Pick a cab and an activity. Skipping both also works |
| 9 | Trip preview | Everything chosen is listed, price matches |
| 10 | Traveler details (login if asked) | After login you return to the same trip |
| 11 | Review, Confirm | Booking created, price equals the preview |
| 12 | Payment (demo) | Confirmation with a `VOY-...` reference |
| 13 | My Trips | Booking with extras listed. Cancel shows the refund first |
| 14 | Cancel | Status `cancelled`. Booking the same room and dates works again |
| 15 | Admin | Totals and services update |

Also check **About and Contact**: both open from the navbar and the footer and the right menu item is highlighted. On About the numbers count up, each question opens and closes, and `/about#faq` scrolls to the questions. On Contact an empty send shows four errors and focuses the first bad field, a bad email shows only that error, a good message shows the success panel, and "Send another message" gives a clean form. A logged-in visitor's name and email are filled in. The message then appears on the Admin page with a new-message badge, and "Mark as read" lowers the badge.

Also check **motion**: the Home photo changes about every 6.5 seconds, Featured Journeys slides on its own and responds to the arrows, dots, a swipe and the arrow keys, the Top Destinations row drifts, numbers count up, cards rise as you scroll and nothing is left invisible. Then turn on "reduce motion" in your system settings: everything should be still and fully visible.

Also check **dark mode**: press the sun/moon button in the navbar, then repeat the journey. Nothing should be white, unreadable or cut off, and the choice should survive a reload. A device set to dark should start in dark on a first visit.

Also check: Destinations (36 cards, region filter), a state page, a place page (favorite and review), Favorites, Login and Register errors, a wrong URL (Not Found page), and the menu button on a phone.

## 6. Layout audit (responsive)

A Playwright script (Microsoft Edge) opened about 29 screens at each width, including the booking journey, the filter drawer, the hotel details window, the cancel window, the phone menu and the admin dashboard. It reported:

- sideways scrolling (page wider than the screen)
- elements wider than the screen
- text that is cut off
- buttons or links smaller than 40px
- script errors in the console

Widths used: 320, 360, 390, 414, 768, 1024, 1280, 1440, 1920, and a phone on its side (844 x 390).

Last result: no sideways scrolling or cut-off text at any width, tap-target findings reduced from about 500 to 0, journey completes from 320 to 768 and wider. One known false alarm: a place image that grows slightly on hover at 320px looks "too wide" to the script but is clipped and does not scroll the page.

These scripts are not in the repository yet. To keep them, add them as `e2e/` and run them before each release (section 8).

**Manual version:** in Chrome or Edge DevTools use the device toolbar and walk the journey at 320, 390, 768 and 1280. Look for sideways scroll, overlapping text, tiny buttons and anything cut off.

## 7. Writing a test

Use Node's built-in runner and the strict assert module. Put the file in `server/tests/` named `thing.test.js`.

```js
const test = require("node:test");
const assert = require("node:assert/strict");

const { priceBooking } = require("../services/addonCatalog");

const base = { roomPricePerNight: 2500, rooms: 1, nights: 2, adults: 2, children: 0 };

test("room only: 5% tax on the room total", () => {
  const r = priceBooking(base);

  assert.equal(r.ok, true);
  assert.equal(r.roomTotal, 5000);
  assert.equal(r.taxes, 250);
  assert.equal(r.totalAmount, 5250);
});
```

Rules:

- One behaviour per test, with a name that reads like a sentence: `"travel: a bike has no AC option"`.
- Test **results**, not implementation.
- Include the unhappy path: invalid input, unknown ids, limits, empty values.
- Keep tests free of network, database and random data. Pass in fixed inputs.
- When you fix a bug, add a test that fails before the fix.
- For env checks, set `process.env` inside the test and restore it afterwards.

Always add tests for: pricing, availability, cancellation and refund rules, anything that checks a role or a user, and input cleaning.

## 8. Roadmap

| Item | Why |
|---|---|
| Move the browser audit into `e2e/` with Playwright | Repeatable layout and journey checks |
| Route tests with `supertest` and `mongodb-memory-server` | Test auth, bookings, admin and uploads without a real database |
| Client tests (Vitest and React Testing Library) for `useTripQuote`, `utils/trip.js`, `RequireLogin` | Protect the trip hand-off between steps |
| CI on every push (install, `npm test`, `npm run build`, `npm audit --omit=dev`) | Catch problems before merging |
| Coverage report | See what is untested |
| Cancellation and refund unit tests (extract the rule to a service) | The refund rule is only checked by hand today |

## 9. Before a release

- [ ] `npm test` passes (127 of 127 or more)
- [ ] `npm run build` succeeds
- [ ] `npm audit --omit=dev` shows no high or critical issues
- [ ] Booking journey checklist (section 5) done at 390px and 1280px
- [ ] Manual API security checks (section 4) done
- [ ] Production checklist in [SECURITY.md](SECURITY.md#7-production-checklist) done
