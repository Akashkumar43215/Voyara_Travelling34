# AGENTS.md

Instructions for AI coding agents (Claude Code, Codex, Cursor, Copilot and similar) and for new developers working on **VOYARA**, a MERN travel portal for India. Read this first. Details live in the linked files.

| Need | File |
|---|---|
| What we are building and why | [PRD.md](PRD.md) |
| How the system fits together | [ARCHITECTURE.md](ARCHITECTURE.md), [docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md) |
| Look and feel | [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) |
| Code conventions | [CORE_STYLE.md](CORE_STYLE.md) |
| Security rules | [SECURITY.md](SECURITY.md) |
| Tests | [TESTING.md](TESTING.md) |
| Run it, API, settings | [README.md](README.md), [docs/PROJECT_DOCUMENTATION.md](docs/PROJECT_DOCUMENTATION.md) |

## Project in one paragraph

Travelers search a city, pick places, find hotels near those places, choose room, meals, travel and activities, pay (demo), and manage bookings. Admins see bookings and revenue. React 18 + Vite client in `client/`, Express 4 + Mongoose 8 API in `server/`, MongoDB. In production one Node process serves both.

## Commands

Run from the project root (`Voyara_Mern/`).

| Task | Command |
|---|---|
| Install everything | `npm run install:all` |
| API with auto-restart (port 5000) | `npm run dev:server` |
| Website with hot reload (port 5173) | `npm run dev:client` |
| Production build of the website | `npm run build` |
| Production start | `npm start` |
| **Server tests (must pass)** | `npm test` |
| Make a user admin | `npm run make-admin -- email@example.com` (`--remove` to undo) |
| Rebuild the generated dark-mode CSS | `npm run dark --prefix client` (after changing any light colour) |

The host is Windows with Git Bash and PowerShell. Use forward slashes in Bash, quote paths with spaces.

## Layout

```
client/src/
  pages/         one file per screen (About and Contact included)
  components/    shared pieces (PageHero, Navbar, TripPriceSummary ...)
  hooks/ utils/  useTripQuote, useScrollReveal, useCarousel, trip.js (trip state), geo.js, motion.js
  config/        site.js (contact details and subjects)
  context/       AuthContext
  services/api.js  the shared Axios instance and the API call functions
  *.css          loaded in this order from main.jsx:
                 styles, premium, booking, mmt, hotels, hotels-near, addons, about-contact, unified, responsive,
                 animations (motion), dark-auto (GENERATED, do not edit), dark (hand-tuned dark mode)
server/
  routes/ -> controllers/ -> services/ -> models/
  middleware/    authMiddleware (protect, adminOnly), security, uploadMiddleware
  config/env.js  startup checks
  data/          curated states and places
  scripts/       seeding and admin tools
  tests/         node:test files
```

## Rules that must not be broken

1. **Never read, print, log or commit `server/.env`.** It holds real keys. Use `server/.env.example` for names. If you see a secret, do not repeat it.
2. **The server decides every price.** Never accept a price, total or tax from the browser. All pricing goes through `server/services/addonCatalog.js` (`priceBooking`). The quote endpoint and the booking endpoint must use the same function.
3. **Protect routes on the server.** Anything that changes data, shows personal data or is for admins needs `protect`, and admin things also `adminOnly`. Hiding a button is not protection.
4. **Every booking query filters by the logged-in user** (`req.user.userId`) unless it is an admin route.
5. **Do not weaken security settings** in `app.js`, `middleware/security.js` or `config/env.js` to make something easier. Fix the cause.
6. **Payment is a demo until Razorpay keys are set.** Card or UPI details must never reach this server: only Razorpay's own checkout takes them. The amount comes from the booking in the database, a payment counts only with a valid Razorpay signature (`services/razorpayService.js`), and with keys set the demo endpoint is switched off. Do not weaken any of that.
7. **Do not copy a third party's brand, text or images.** The look is "MakeMyTrip-style" (blue, flat cards) but VOYARA has its own name, copy and data.
8. **Never `git commit` or `git push` unless the user asks.** The repo has no commits and a placeholder remote.
9. Keep generated hotel data **stable**: the same hotel id must always give the same price and profile (`services/stayProfile.js`). Use the `>>>` operator in hashes, never `>>` (negative modulo bug).
10. Real map facts beat generated ones. Mark real ones "listed", never present a generated amenity as verified.

## Working rules

- Match the surrounding code: same naming, comment density and idioms (see [CORE_STYLE.md](CORE_STYLE.md)). Plain JavaScript, no TypeScript, no new framework without asking.
- Make the smallest change that solves the task. Do not refactor unrelated code or rename things "while you are there".
- Add a dependency only when really needed, and say why. Run `npm audit --omit=dev` after.
- Browser API calls use the shared Axios instance from `client/src/services/api.js` (it sets the base URL). Add new calls there as exported functions rather than building URLs in pages.
- New page: lazy route in `App.jsx`, banner with `PageHero`, use design tokens, test at 320, 390, 768 and 1280px.
- New style: put it in the right file (see order above). Prefer existing classes and variables. `unified.css` and `responsive.css` load last and win ties.
- New or changed server logic that touches money, availability or security needs a test in `server/tests/`.
- Controller response shape is always `{ success, message }` or `{ success, data }` (plus `count` for lists). Use correct status codes.
- Validate input types in controllers. Do not trust `req.body` or `req.query`.
- Do not add comments that only restate the code. Do comment non-obvious rules (the cancellation rule, the overlap check).

## Gotchas

- **Contact details are placeholders.** `client/src/config/site.js` holds the email, phone, hours, address and the list of subjects. The subject list must match `SUBJECTS` in `server/services/contactValidation.js`. Never invent real contact details: tell the owner to replace them.
- **Contact form:** the server (`validateContact`) is the authority. The page checks the same rules only for a faster answer. The hidden `website` field is a bot trap: keep it empty for people and never show it. Messages are plain text: render them as text, never as HTML.
- **Dark mode:** `client/src/dark-auto.css` is generated from the light CSS by `client/scripts/generate-dark.mjs`. After you change colours in a light stylesheet, run `npm run dark --prefix client` and commit the result. Never edit `dark-auto.css` by hand. Hand fixes go in `dark.css`. A background that uses `var(--ink)` flips to light in dark mode, so avoid it. Always check both themes.
- **Motion:** all animation lives in `animations.css`, `hooks/useScrollReveal.js`, `hooks/useCarousel.js` and the slider components. Animate only opacity and transform, never put `transform` or `filter` on a wrapper around fixed bars, and make autoplay stop for reduced motion (`utils/motion.js` has `prefersReducedMotion`). Card-like elements fade in on scroll through the selector list in `useScrollReveal.js`: add a new card class there if it should reveal too. Do not name a new element's inner tag `span` inside `.hero-stats`: older `span` rules there restyle it.
- **Languages (English, Hindi, Odia):** two kinds of text live in `client/src/i18n/`. Short **structured keys** (`nav.home`) are in `translations.js` for all three languages. Everything else is keyed by the **English text itself**: write `tx("Where do you want to go?")` in a component (`const { t: tx } = useLanguage()`), `tg(...)` outside components, `plural(tx, n, "{n} Room", "{n} Rooms")` for counts, and put `"Where do you want to go?": "..."` in the Odia files (`or-ui-1..4.js`) and Hindi file (`hi-ui.js`). A text with no translation is shown as written, so nothing breaks. Odia is complete: screens, the server's messages (`or-server.js`, applied to every API reply in `services/api.js`), the add-on catalog, and the 36 states and 234 curated places (`or-data.js`). The Odia texts load only when someone picks Odia (`or-phrases.js`, `ensureLanguage`). Hindi is complete too, same layout (`hi-ui.js`, `hi-data.js`, `hi-phrases.js`). Odia and Hindi texts are machine-written and should be read by a native speaker. `server/tests/i18n.test.js` fails when a text used in the code, a server message, a catalog item, a curated place or a Contact setting has no Odia or Hindi text, or when a `{placeholder}` differs. Data that comes from the live map (hotel and restaurant names) is not translated. Dates use the language's month names (`dateLocale()`).
- **Reviews:** photos go to Cloudinary only after the file's real bytes are checked as JPEG, PNG or WebP (`services/imageCheck.js`), never by file name or Content-Type. Admin rights for deleting reviews and photos are read from the database, not from the token.
- **Vite does not pick up a newly added CSS `import`** until you restart `npm run dev:client`. A browser hard refresh (Ctrl+Shift+R) clears old CSS.
- Windows display scaling of 125% or more narrows the viewport, so the desktop menu may collapse. Test with the browser zoomed out.
- Rate limits are **off in development**. Turn them on with `RATE_LIMIT=on` to test them. They are always on in production.
- Geoapify, Pexels and Wikimedia are rate-limited. Keep the caches, time budgets and back-off. Do not call them in a loop.
- `AuthContext` signs a user out only on a real 401 or 403 from `/auth/me`. Keep it that way, or a slow server logs everybody out.
- The booking flow carries the trip in router state (`utils/trip.js`). New steps must forward it with `stateForNext`.
- **Multi-city trips:** each city is a normal single-city flow whose result is saved as a "leg" in `utils/tripCart.js` (sessionStorage, 3 hours). `TripBuilder` adds legs ("Add another city"), `Dates` starts the next city when the last one ends, and `TripCheckout` (`/trip-checkout`) creates one booking per leg, all with the same `tripId`. Every city is priced, paid and cancelled on its own (`Payment` walks through the unpaid ones, `MyTrips` has "Pay now"). The server is the authority for the rules (no overlapping dates inside a trip, 6 cities at most, in `bookingController` and `services/bookingValidation.js`); the pages only check them for a faster answer. A single-city booking sends no `tripId` and is unchanged.
- Availability is computed from overlapping bookings, not stored. Never add a stored counter without a migration plan.
- Local MongoDB may not be installed. The owner runs their own MongoDB or Atlas. Do not assume one.

## Definition of done

A change is done when:

- [ ] `npm test` passes and, for new money or security logic, new tests exist
- [ ] `npm run build` succeeds with no errors
- [ ] The affected flow was tried in the browser at phone and desktop width, in light **and** dark mode, no console errors, no sideways scroll
- [ ] No secret, key or personal data was added to the code, docs or logs
- [ ] The docs that describe the change are updated (README, API list, PRD, DESIGN_SYSTEM as relevant)
- [ ] You report honestly what was and was not verified

## Useful facts

| Fact | Value |
|---|---|
| Admin check | `req.user.role === "admin"` in `adminOnly` |
| Booking statuses | `pending`, `confirmed`, `cancelled`. Payment: `pending`, `paid`, `failed`, `refunded` |
| Tax | 5% of room plus add-ons |
| Free cancellation | Full refund if the hotel offers it and check-in is more than 24h away |
| Curated data | 36 states and UTs, 234 places, each with a unique image |
| Brand colours | Blue `#008cff` to `#065af3`, banner `#0a2a5e` to `#0f55c8`, orange `#f26a1b`, yellow `#ffd24d` |

- **Navbar size:** the navbar must not change size when the language changes. Tabs, buttons, language button and brand have fixed sizes in the last block of `client/src/i18n.css`; keep new navbar items inside that scheme and check English, Hindi and Odia at 1280px and 1536px.
