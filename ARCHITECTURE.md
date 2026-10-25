# VOYARA Architecture

The working reference for how the system is built. For diagrams, the full booking sequence and scaling trade-offs see [docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md).

Related: [PRD.md](PRD.md) · [SECURITY.md](SECURITY.md) · [CORE_STYLE.md](CORE_STYLE.md) · [AGENTS.md](AGENTS.md)

---

## 1. Overview

```
Browser (React 18, Vite build)
        |  REST + JSON  (/api/...)
        v
Express 4 API  ---------------------------> MongoDB (Atlas or local)
   |   |   |
   |   |   +--> Cloudinary   (store and serve images)
   |   +------> Pexels, Wikipedia / Wikimedia   (photos)
   +----------> Geoapify (OpenStreetMap data: city search, places, hotels, restaurants)
```

| Part | Technology | Where |
|---|---|---|
| Website | React 18, Vite 6, React Router 7, Axios, Lucide, plain CSS | `client/` |
| API | Node 18+, Express 4, Mongoose 8, JWT, bcryptjs, Multer | `server/` |
| Database | MongoDB | `MONGO_URI` |
| Production | One Node process serves `/api` and `client/dist` | `server/app.js` |

Development: website on `:5173`, API on `:5000`. The website calls `/api` by default. Set `VITE_API_URL` only if the API is on another host.

---

## 2. Server

### 2.1 Request path

```
request -> helmet -> CORS -> compression -> logger -> JSON body (100 kb)
        -> sanitizeInput -> rate limiter -> route -> [protect] -> [adminOnly]
        -> controller -> service(s) / model(s) -> JSON response
        -> (central error handler)
```

### 2.2 Layers and what belongs where

| Layer | Folder | Does | Does not |
|---|---|---|---|
| Routes | `routes/` | Map URL and method to a controller, attach `protect` / `adminOnly` | Logic |
| Controllers | `controllers/` | Check input, call services and models, shape `{ success, ... }` | Long calculations, direct HTTP to other services |
| Services | `services/` | Real logic: pricing, hotel profiles, facility reading, image lookup, Geoapify | Know about `req` or `res` |
| Models | `models/` | Schema, validation, indexes | Business rules |
| Middleware | `middleware/` | Auth, security, uploads | Anything route specific |
| Config | `config/` | `env.js` startup checks, DB and Cloudinary setup | |

### 2.3 Mounted routes (`server/app.js`)

| Mount | Limiter | Controller area |
|---|---|---|
| `/api/auth` | login and register: `authLimiter` | register, login, me |
| `/api/location` | `searchLimiter` | autocomplete, places, stays, save stay |
| `/api/addons` | `searchLimiter` | restaurants, activities, catalog, quote |
| `/api/bookings` | `bookingLimiter` | availability, create, my, payment, cancellation, cancel, change dates |
| `/api/contact` | `contactLimiter` (5 per 15 min) | send a message from the Contact page |
| `/api/admin` | `apiLimiter` | stats, bookings (search, filter, CSV export, cancel and refund), travelers and roles, revenue, messages (admin only) |
| `/api/assistant` | `searchLimiter` | travel assistant (rule based, optional Claude) |
| `/api/rooms` | `apiLimiter` | rooms by stay, one room |
| `/api/reviews` | `apiLimiter` | list, save, delete |
| `/api/favorites` | `apiLimiter` | list, toggle |
| `/api/states`, `/api/places` | `apiLimiter` | curated data |
| `/api/upload` | `apiLimiter` | image upload (admin only) |
| `/api/health` | none | DB status (503 when down) |

Full endpoint table: [docs/PROJECT_DOCUMENTATION.md](docs/PROJECT_DOCUMENTATION.md#9-api-reference).

### 2.4 Startup (`server.js`)

1. `validateEnv()` stops the process on missing `MONGO_URI` or `JWT_SECRET`, or a weak secret in production. It prints warnings for missing optional keys.
2. Connect MongoDB.
3. Auto-seed states and places when the database is empty.
4. Listen on `PORT`.
5. On `SIGTERM` or `SIGINT`: stop accepting requests, finish current ones, close the database.

### 2.5 Services

| Service | Job |
|---|---|
| `addonCatalog.js` | **Pricing.** Meal, vehicle and activity prices, `priceAddons`, `priceBooking` (tax 5%). The only place money is calculated |
| `stayProfile.js` | Stable generated price, stars, rating, amenities and free-cancellation flag from a hotel id. Real facts override |
| `facilityExtractor.js` | Reads real facilities, stars, contact details and opening hours from map tags |
| `roomService.js` | Creates the three default rooms for a stay, prices scaled from the standard room price |
| `geoapifyService.js` | Calls to Geoapify |
| `contactValidation.js` | Checks and tidies a Contact form message (pure logic, tested) |
| `stayImageService.js`, `placeImageService.js` | Hotel and place photos (Pexels, Wikipedia), with back-off and time budgets |

---

## 3. Client

### 3.1 Structure

```
src/
  main.jsx          entry, loads CSS in order
  App.jsx           lazy routes, ErrorBoundary, RouteTitle, ScrollToTop, RequireLogin guards
  pages/            22 screens (About and Contact included)
  components/       PageHero, Navbar, Footer, DestinationSearch, TripPriceSummary,
                    FavoriteButton, ReviewsSection, RequireLogin, ErrorBoundary, ...
  components/       also: ThemeToggle, HeroSlides, FeaturedSlider, CountUp, ScrollProgress
  hooks/            useTripQuote, useScrollReveal, useCarousel
  utils/            trip.js, geo.js, motion.js
  config/           site.js (contact details, contact subjects)
  context/          AuthContext, ThemeContext
  services/api.js   Axios instance and API functions
  *.css             light styles, animations.css, then dark-auto.css (generated) and dark.css
```

### 3.2 Routing

All pages are lazy loaded. Booking pages (`/booking-details`, `/trip-review`, `/payment`) are wrapped in `RequireLogin`, which keeps the trip in router state while the user logs in and returns. `/admin` checks the role in the page and the server enforces it again. Unknown URLs show a Not Found page.

### 3.3 State

| State | Where | Why |
|---|---|---|
| Logged-in user and token | `AuthContext` (token in `localStorage` as `voyara_token`) | Needed everywhere |
| The trip being built | Router state, built and forwarded with `utils/trip.js` (`tripFromState`, `quoteRequest`, `stateForNext`) | Nothing is stored on the server until the booking is created |
| Live price | `useTripQuote` calls `POST /addons/quote` | The server is the only price authority |
| Theme (light or dark) | `ThemeContext`, saved in `localStorage` as `voyara_theme`, applied as `data-theme` on `<html>` before first paint | Follows the device on a first visit, then remembers the choice |
| Page data (lists, filters) | Component state | Not shared |

`AuthContext` clears the token only on a 401 or 403 from `/auth/me`. A network error or 429 does not log the user out.

### 3.3b Look and motion

- **Dark mode:** `scripts/generate-dark.mjs` reads the light stylesheets and writes `dark-auto.css`. `dark.css` holds the hand-tuned parts. Run `npm run dark` in `client/` after changing light colours.
- **Motion:** `animations.css` plus `useScrollReveal` (cards fade up as they scroll into view), `useCarousel` (autoplay, pause on hover), `HeroSlides` (Home photo slideshow), `FeaturedSlider`, `CountUp` and `ScrollProgress`. Page changes fade through a keyed wrapper in `App.jsx`. Reduced motion turns it all off.
- **Contact page:** posts to `POST /api/contact`. Contact details come from `config/site.js`.

### 3.4 Booking journey

```
/ -> /real-places -> /stays -> /dates -> /availability -> /meals -> /add-ons
  -> /trip-builder -> /booking-details* -> /trip-review* -> /payment* -> /trip-confirmation -> /trips
                                                       (* login required)
```

---

## 4. Data

| Collection | Key fields | Notes |
|---|---|---|
| `users` | name, email (unique), password (bcrypt, `select: false`), role `user`/`admin` | Admin only via script. `adminOnly` re-reads the role from the database on every admin request |
| `states` | name, slug, region, image, popularPlaces | 36 records, text index |
| `touristplaces` | name, slug, stateSlug, lat, lon, image, rating | 234 curated, index `stateSlug+slug`, text index |
| `stays` | name, address, lat, lon, geoapifyPlaceId, category, rating | Saved when a traveler picks a hotel |
| `rooms` | stay, name, pricePerNight, maxGuests, totalRooms, amenities | 3 per stay |
| `bookings` | bookingReference (unique), user, destination, selectedPlaces, traveler, accommodation, room, dates, guests, pricing, addons, cancellation, status, paymentStatus | Copies hotel and price data at booking time |
| `reviews` | user, itemType (`place`/`stay`), itemId, rating, comment | Unique per user and item |
| `contactmessages` | name, email, subject, message, user (optional), status `new`/`read` | From the Contact page. Read by admins only |
| `favorites` | user, itemType, itemId, display fields | Unique per user and item |

**Availability** is computed, not stored: for a room and dates, total rooms minus the rooms of every `pending` or `confirmed` booking that overlaps (`existing.checkIn < new.checkOut` and `existing.checkOut > new.checkIn`). Cancelling removes the booking from the count.

**Booking status:** `pending` to `confirmed` (on payment) or `cancelled`. Payment status: `pending`, `paid`, `failed`, `refunded`.

---

## 5. Pricing

```
roomTotal      = roomPricePerNight x rooms x nights
mealsTotal     = per-person-per-night meal price x (adults + children x 0.5) x nights
transportTotal = vehicle rate (AC / non-AC) x days x vehicles
activitiesTotal= per-person or per-group activity price
taxes          = 5% of (roomTotal + mealsTotal + transportTotal + activitiesTotal)
totalAmount    = roomTotal + addonsTotal + taxes
```

Meal base prices (breakfast 250, lunch 400, dinner 450) scale with the room price using a factor clamped to 0.7 to 2.5. Vehicles: cab, SUV, bike (non-AC only), bus. Activities: six fixed experiences and nearby attractions with a stable formula price.

The browser sends **choices only** (room id, counts, meal plan, vehicle, activity ids). `POST /addons/quote` and `POST /bookings` call the same `priceBooking`.

---

## 6. External services

| Service | Used for | Failure behaviour |
|---|---|---|
| Geoapify | City search, tourist places, hotels, restaurants, raw map tags | Curated places and saved stays still work. Thin place results are not cached |
| Pexels | Stock photos for hotels and places without their own | Skipped. Placeholder shown |
| Wikipedia / Wikimedia | Place photos | Back-off on 429, time budget |
| Cloudinary | Storage and delivery of state, place and hero photos | Fallback images in `server/fallback-images/` |

Caches and budgets: places results cached 1 hour in memory. Photo lookups have a time budget and 429 back-off so one slow service cannot freeze a page.

---

## 7. Deployment

Single deployment: build the website (`npm run build`), set `NODE_ENV=production` and the settings below, run `npm start`. The server serves `client/dist` and falls back to `index.html` for any non-`/api` path.

| Setting | Required | Purpose |
|---|---|---|
| `MONGO_URI` | yes | Database |
| `JWT_SECRET` | yes (32+ chars in production) | Signs logins |
| `NODE_ENV` | | `production` turns on strict mode |
| `PORT` | | Provided by most hosts |
| `CLIENT_URL` | if the site is on another host | CORS allow-list |
| `GEOAPIFY_API_KEY`, `CLOUDINARY_*`, `PEXELS_API_KEY` | recommended | Features above |
| `RATE_LIMIT=on` | | Turn limits on in development |

Health check: `GET /api/health` (200 connected, 503 not).

---

## 8. Design decisions

| Decision | Reason |
|---|---|
| Price computed on the server | Browser cannot change what is charged |
| Booking copies hotel and price data | History never changes when a hotel or price changes |
| Availability computed from bookings | No counter to drift out of sync, cancellation just works |
| Trip kept in router state | No half-made bookings in the database |
| Generated hotel profile is a pure function of the hotel id | Same hotel, same price, every time |
| Curated places always first | Useful output even when the map service is slow |
| One process in production | Simple to host, no CORS to manage |
| Plain CSS with tokens | No build complexity, easy to unify |

## 9. Known limits and the planned fix

| Limit | Fix |
|---|---|
| Payment | Razorpay is built in (order, signed callback, signed webhook, gateway refunds) but untested against the live gateway: try it with TEST keys first. Without keys the demo payment runs. No saved cards, no partial refunds, one currency (INR) |
| Last-room race | Handled: after saving, `createBooking` recounts only earlier bookings (lower `_id`) and undoes the booking if the room is over-full. A MongoDB transaction would be cleaner on a replica set |
| In-memory cache and rate limiter (one process) | Redis when running several processes |
| Generated hotel prices | Hotel partner API or a hotel-owner portal |
| Emails are optional and sent in-process (SMTP via nodemailer, off without `SMTP_HOST`) | A queue with retries |
| Admin cannot edit places and hotels | Add edit screens (bookings, refunds, CSV export and roles already exist) |
| Hindi and Odia are machine-written, live-map names and assistant replies stay English | Native review, translate assistant answers |

## 10. Adding things

| To add | Do this |
|---|---|
| An API endpoint | Route (with `protect` / `adminOnly` as needed) → controller (validate, respond) → service if there is logic → test if it touches money or security → add to the API table in the docs |
| A page | `pages/Name.jsx` → lazy route in `App.jsx` → `PageHero` → use design tokens → check at 320/390/768/1280 |
| A priced extra | Add to `addonCatalog.js`, include it in `priceBooking`, store it in `Booking.addons`, show it in the price summary, My Trips and admin, add tests |
| A model field | Update the schema, defaults for old documents, and any controller that creates the record |
