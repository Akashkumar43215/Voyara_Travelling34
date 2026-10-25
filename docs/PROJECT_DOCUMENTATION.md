# VOYARA: Project Documentation

**VOYARA** is a travel planning and hotel booking website for India, built with the MERN stack (MongoDB, Express, React, Node.js). A traveler explores all 36 states and union territories, picks places to visit, finds hotels near those places, adds meals, local travel and activities, pays (demo) and manages the trip later. An admin sees bookings, revenue and which services guests choose.

Companion document: [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) (architecture, data design, security, scaling).

## Contents

1. [Features](#1-features)
2. [Tech stack](#2-tech-stack)
3. [Project structure](#3-project-structure)
4. [Setup and running](#4-setup-and-running)
5. [Configuration](#5-configuration)
6. [User guide](#6-user-guide)
7. [Admin guide](#7-admin-guide)
8. [Website pages and routes](#8-website-pages-and-routes)
9. [API reference](#9-api-reference)
10. [Data models](#10-data-models)
11. [Business rules](#11-business-rules)
12. [Design system](#12-design-system)
13. [Testing](#13-testing)
14. [Deployment](#14-deployment)
15. [Troubleshooting](#15-troubleshooting)
16. [Real data vs demo data](#16-real-data-vs-demo-data)
17. [Glossary](#17-glossary)

---

## 1. Features

**For travelers**

| Area | What it does |
|---|---|
| Explore | 36 states and UTs, 234 curated landmarks (at least 5 per state), each with a photo, description, timings and fee |
| Search | Type any Indian city and get suggestions as you type |
| Places | Pick several places to visit (P1, P2, P3 ...). Real tourist places come from the map, curated ones come first |
| Hotels near places | Hotels around the places you picked, with the distance to **each** one. Filter by budget, stars, rating, distance, free cancellation and facilities. Sort by distance, price or rating |
| Hotel details | Photos, facilities (marked "listed" when the map data confirms them), contact details, nearby restaurants, reviews |
| Rooms and dates | Standard, Deluxe and Family rooms, dates, guests, live availability |
| Meals | Food excluded, or breakfast / lunch / dinner (B/L/D), half board, full board. Real restaurants nearby |
| Travel (optional) | Cab, SUV, bike or bus, AC or non-AC |
| Activities (optional) | Six experiences plus attractions near the hotel |
| Live price | One price box that updates at every step. It is worked out by the server |
| Booking | Traveler details, full review, demo payment, confirmation with a reference like `VOY-...` |
| My Trips | All bookings, with the extras you chose, and **cancellation** with an honest refund preview |
| Reviews and favorites | Rate and review places, save places |
| Change dates | Move a booking to other dates from My Trips. The price is recalculated by the server (a paid booking may only move to dates with the same total) |
| Review photos and votes | Add up to 3 photos to a review and mark reviews helpful |
| Assistant | Ask about places, plan a trip with an estimate, get help with your bookings. A "Start booking" card opens the booking flow with the trip filled in. Rule based, with optional Claude AI |
| Languages | English, Hindi and Odia from the navbar menu: every page, server message and curated place. The navbar keeps one size in every language |
| Emails (optional) | Booking confirmation and cancellation emails when SMTP is configured |
| Payment | Demo payment, or Razorpay checkout when keys are set |
| Accounts | Register, login, protected booking pages |
| About page | The story, how VOYARA works in five steps, what makes it different, a clear list of what is real and what is demo, and a FAQ |
| Contact page | Contact details, quick help links, and a message form with clear errors and a success screen. A logged-in visitor's name and email are filled in |
| Light and dark mode | A sun/moon button in the navbar. Follows the device setting on a first visit, remembers your choice, no white flash |
| A lively feel | Pages fade in, cards rise as you scroll, a Home photo slideshow, a Featured Journeys slider, counting numbers, smooth hover effects. All off for visitors who ask for reduced motion |
| Phones and tablets | Works from a 320px phone to a wide desktop |

**For admins**

| Area | What it does |
|---|---|
| Dashboard | Totals: users, bookings, revenue, confirmed and cancelled counts |
| Services | How many guests chose meals, travel and activities, the money from each, top activities, popular vehicles and meal plans |
| Bookings | Search, filter, page, export to CSV, cancel and refund |
| Users | List users and change roles |
| Revenue | Chart for 30 days or 12 months |
| Messages | Messages sent from the Contact page, with a new-message count and a Mark as read button |

---

## 2. Tech stack

| Part | Technology |
|---|---|
| Website | React 18, Vite 6, React Router 7, Axios, Lucide icons, plain CSS |
| Server | Node.js 18+, Express 4, Mongoose 8 |
| Database | MongoDB (Atlas or local) |
| Login | JSON Web Tokens, bcryptjs |
| Security | Helmet, express-rate-limit, input sanitising, CORS |
| Images | Cloudinary (storage), Pexels (stock photos), Wikipedia / Wikimedia (place photos) |
| Map data | Geoapify (OpenStreetMap): search, places, hotels, restaurants |
| Tests | Node's built-in test runner |

---

## 3. Project structure

```
Voyara_Mern/
├── package.json            Root scripts (install:all, dev:server, dev:client, build, start, test, make-admin)
├── README.md               Quick start
├── docs/                   This documentation and the system design
├── client/                 The website
│   ├── index.html
│   ├── vite.config.js
│   ├── public/             favicon, robots.txt
│   ├── theme-backups/      Earlier green theme, kept for reference
│   └── src/
│       ├── main.jsx        Entry point. Loads the style files in order
│       ├── App.jsx         Routes, login guards, error boundary
│       ├── pages/          One file per screen (22, About and Contact included)
│       ├── components/     PageHero, Navbar, Footer, DestinationSearch,
│       │                   TripPriceSummary, FavoriteButton, ReviewsSection,
│       │                   RequireLogin, ScrollToTop, ErrorBoundary, RouteTitle,
│       │                   ThemeToggle, LanguageToggle, AssistantWidget, HeroSlides, FeaturedSlider,
│       │                   CountUp, ScrollProgress, admin/ (dashboard parts)
│       ├── hooks/          useTripQuote (live price), useScrollReveal, useCarousel
│       ├── utils/          trip.js (carries the trip between pages), geo.js (distances), motion.js
│       ├── i18n/           translations, runtime, plural, hi-*.js and or-*.js (Hindi and Odia load only when chosen)
│       ├── config/         site.js (contact details and subjects: edit before going live)
│       ├── context/        AuthContext (who is logged in), ThemeContext (light or dark), LanguageContext
│       ├── services/api.js One Axios instance and every API call
│       └── *.css           styles, premium, booking, mmt, hotels, hotels-near, addons,
│                           about-contact, admin, admin-manage, reviews-extra, i18n, assistant,
│                           unified, responsive, animations,
│                           dark-auto (generated), dark (in that order)
└── server/
    ├── server.js           Starts everything: env check, database, seeding, shutdown
    ├── app.js              Express setup: security, routes, serving the website
    ├── config/             env.js (startup checks), db, cloudinary
    ├── routes/             URL to controller mapping (13 files)
    ├── controllers/        Request handlers (16 files)
    ├── services/           Pricing, booking rules, hotel profiles, facilities, images, Geoapify, Razorpay, email, assistant
    ├── middleware/         authMiddleware (protect, adminOnly), security, uploads
    ├── models/             User, State, TouristPlace, Stay, Room, Booking, Review, Favorite, ContactMessage
    ├── data/               Curated states and places
    ├── scripts/            Seeding, image tools, make-admin
    ├── tests/              127 automated tests
    └── .env.example        Template for your settings
```

---

## 4. Setup and running

**You need:** Node.js 18 or newer, and MongoDB (local, or a free MongoDB Atlas cluster).

```bash
# 1. Install the server and the website
npm run install:all

# 2. Create your settings file, then open server/.env and fill it in
cp server/.env.example server/.env        # Windows: copy server\.env.example server\.env

# 3. Start the server (terminal 1)       -> http://localhost:5000
npm run dev:server

# 4. Start the website (terminal 2)      -> http://localhost:5173
npm run dev:client
```

On the first start the server loads the 36 states and 234 places by itself. Open **http://localhost:5173**.

**Make yourself an admin**

1. Register on the site.
2. Run `npm run make-admin -- you@example.com`
3. Log out and log in again. An **Admin** button appears in the menu.
4. To remove admin rights: add `--remove`.

**All scripts**

| Command | What it does |
|---|---|
| `npm run install:all` | Installs server and client packages |
| `npm run dev:server` | Server with auto-restart (nodemon) |
| `npm run dev:client` | Website with hot reload (Vite) |
| `npm run build` | Builds the website into `client/dist` |
| `npm start` | Runs the server for production (serves the built website too) |
| `npm test` | Runs the automated tests |
| `npm run make-admin -- email [--remove]` | Grants or removes admin rights |
| `npm run dark --prefix client` | Rebuilds the generated dark-mode CSS after you change light colours |
| `npm run seed:states` / `seed:places` (in `server/`) | Reload states or places from the curated data |

---

## 5. Configuration

All server settings live in `server/.env`. **Never commit this file or share it.**

| Setting | Needed? | What it is |
|---|---|---|
| `PORT` | | Server port. Default 5000 |
| `NODE_ENV` | | `development` or `production` |
| `MONGO_URI` | **Yes** | MongoDB connection string |
| `JWT_SECRET` | **Yes** | Secret that signs logins. In production it must be 32+ characters and not a common word. Create one: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `CLIENT_URL` | If the site is hosted separately | The website's address (several allowed, comma separated) |
| `GEOAPIFY_API_KEY` | Recommended | Search, places, hotels, restaurants. Without it only curated places and saved hotels work |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Recommended | Image storage |
| `PEXELS_API_KEY` | Recommended | Stock photos for hotels and places without a picture |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Optional | Booking emails. Off without `SMTP_HOST` and `MAIL_FROM` |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Optional | Real payments. Without them the demo payment runs |
| `ANTHROPIC_API_KEY` | Optional | Assistant answers for questions the rules cannot place. Off by default |
| `RATE_LIMIT` | | Set `on` to test the rate limits in development |

Website setting (only when the API is hosted elsewhere): `client/.env` with `VITE_API_URL=https://api.example.com/api`.

The server checks these at startup. It stops with a clear message if something required is missing or unsafe, and prints warnings for the optional ones.

---

## 6. User guide

A traveler's path through the site, step by step.

| # | Screen | What to do |
|---|---|---|
| 1 | **Home** | Type a city, pick it from the suggestions, set check-in, check-out and guests, press **Search**. Or open **Destinations** to browse states |
| 2 | **Explore (places)** | Tap **Select Place** on the places you want to visit. Use the search box to narrow the list. Press **Continue to Stays** |
| 3 | **Stays (hotels)** | Hotels sorted by how close they are to your places. Use the filters on the left, open **View Details** for facilities, restaurants and reviews, then **Select Stay** |
| 4 | **Plan Your Stay** | Pick a room type, check dates and guests. Press **Search Availability** |
| 5 | **Availability** | Confirms rooms are free for your dates. Press **Continue to Meals** |
| 6 | **Meals and facilities** | Choose food excluded or a meal plan, see hotel facilities and restaurants nearby |
| 7 | **Travel and activities** | Optional. Add a vehicle and experiences, or skip |
| 8 | **Trip Preview** | The whole trip and its price in one place |
| 9 | **Traveler details** | Name, email and phone (login needed from here) |
| 10 | **Review** | Check everything, then **Confirm Booking** |
| 11 | **Payment** | Demo payment. Use the pre-filled test card. No money moves |
| 12 | **Confirmation** | Your booking reference |
| 13 | **My Trips** | All bookings. **Cancel** shows the exact refund before you confirm |

The price box on the right updates at every step. It is the amount that will be charged.

**Other pages:** **About** explains how VOYARA works and answers common questions (`/about`, questions at `/about#faq`). **Contact** (`/contact`) lets you send us a message. The sun/moon button in the navbar switches between light and dark mode.

---

## 7. Admin guide

Open **/admin** (the **Admin** button in the menu, visible only to admins).

- **Overview cards:** users, bookings, confirmed, cancelled, revenue.
- **Services:** number of bookings with meals, travel and activities, the revenue from each, the most booked activities, vehicle types and meal plans.
- **Revenue chart:** last 30 days or 12 months.
- **Bookings:** search by reference, traveler or hotel; filter by status and payment; page through; **export CSV**; **cancel** a booking, with an optional refund.
- **Users:** list users and make someone an admin or a normal user (you cannot remove your own admin rights).
- **Traveler table:** reference, traveler, hotel, dates, amount, status, payment status.
- **Messages:** the latest 10 messages from the Contact page, newest first, with the sender's name and email (a mailto link), a **new** badge on unread ones, and a **Mark as read** button. Reply to the sender by email.

Admin rights are checked on the server. A normal user who opens `/admin` is sent away, and the admin API answers 403.

---

## 8. Website pages and routes

| Route | Page | Login needed |
|---|---|---|
| `/` | Home: photo hero, search, top destinations | No |
| `/state-region` | All 36 states and UTs, filter by region | No |
| `/places/:stateId` | Places in one state | No |
| `/real-places` | Places around a searched city, with photos | No |
| `/place/:placeId` | One place: details, favorite, reviews | No (saving and reviewing need login) |
| `/stays` | Hotel search and results | No |
| `/dates` | Room, dates and guests | No |
| `/availability` | Room availability | No |
| `/meals` | Meals and facilities | No |
| `/add-ons` | Travel and activities | No |
| `/trip-builder` | Trip preview | No |
| `/booking-details` | Traveler details | **Yes** |
| `/trip-review` | Review and confirm | **Yes** |
| `/payment` | Demo payment | **Yes** |
| `/trip-confirmation` | Confirmation | Needs booking data |
| `/trips` | My Trips, cancellation | Yes |
| `/favorites` | Saved places | Yes |
| `/about` | About: story, steps, features, real vs demo, FAQ | No |
| `/contact` | Contact: details and message form | No |
| `/login`, `/register` | Account | No |
| `/admin` | Admin dashboard | Admin only |
| `*` | Not found page | No |

Pages load on demand (lazy loading), and an error in one page shows a friendly message instead of a blank screen.

---

## 9. API reference

Base path `/api`. Replies are JSON with `success` and either `data` or `message`. Protected routes need the header `Authorization: Bearer <token>`.

### Auth

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Public | Create an account (name 2 to 100, valid email, password 8 to 72 with a letter and a number) |
| POST | `/auth/login` | Public | Returns a token |
| GET | `/auth/me` | Login | The current user |

### States and places

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/states`, `/states/:id` | Public | States and UTs (id or slug) |
| GET | `/places`, `/places/:id` | Public | Curated places, filter by state |
| GET | `/location/autocomplete?text=` | Public | City suggestions |
| GET | `/location/places` | Public | Real places around a point, curated first |
| GET | `/location/stays` | Public | Hotels around a point, with distance to each picked place |
| POST | `/location/stays/save` | Public | Saves a chosen hotel and creates its rooms |

### Rooms, add-ons, bookings

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/rooms/stay/:stayId` | Public | Rooms of a hotel (created on demand) |
| GET | `/rooms/:roomId` | Public | One room |
| GET | `/addons/restaurants?lat&lon&radius&limit` | Public | Restaurants near a point |
| GET | `/addons/activities?lat&lon&radius` | Public | Experiences and nearby attractions |
| GET | `/addons/catalog?roomPrice` | Public | Meal plans, vehicles and activity prices |
| POST | `/addons/quote` | Public | Full price for a set of choices |
| POST | `/bookings/check-availability` | Public | Rooms left for a date range |
| POST | `/bookings` | Login | Create a booking (price recalculated on the server) |
| GET | `/bookings/my` | Login | My bookings |
| PATCH | `/bookings/:id/payment` | Login | Complete the demo payment |
| GET | `/bookings/:id/cancellation` | Login | What a cancel would refund |
| PATCH | `/bookings/:id/cancel` | Login | Cancel and free the rooms |
| POST | `/reviews/:reviewId/helpful` | Login | Add or remove your "helpful" vote (not on your own review) |
| POST | `/reviews/:reviewId/photos` | Login (owner) | Multipart field `photos`, up to 3 in total, JPEG, PNG or WebP, 3 MB each. Needs Cloudinary |
| DELETE | `/reviews/:reviewId/photos/:index` | Login (owner or admin) | Remove a photo (also from Cloudinary) |
| PATCH | `/bookings/:id/dates` | Login | Move to new dates. Body `{ checkIn, checkOut, dryRun }`. Re-priced by the server and availability-checked. An unpaid booking takes the new price; a paid booking may move only to dates with the same total. `dryRun: true` only previews |

`POST /addons/quote` body:

```json
{
  "roomId": "...", "rooms": 1, "nights": 2, "adults": 2, "children": 0,
  "meals": { "plan": "half-board" },
  "transport": { "mode": "cab", "ac": true, "days": 2 },
  "activities": ["exp-sightseeing"]
}
```

Reply: `roomTotal`, `mealsTotal`, `transportTotal`, `activitiesTotal`, `addonsTotal`, `taxes`, `totalAmount`.

### Reviews, favorites, admin, uploads, health

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/reviews/:itemType/:itemId` | Public | Reviews and average |
| POST | `/reviews/:itemType/:itemId` | Login | Add or update my review (1 to 5 stars) |
| DELETE | `/reviews/:reviewId` | Login | Delete my review |
| GET | `/favorites` | Login | My favorites |
| POST | `/favorites/toggle` | Login | Save or remove |
| GET | `/admin/stats` | Admin | Totals and services |
| GET | `/admin/bookings` | Admin | Bookings with `q`, `status`, `paymentStatus`, `page`, `limit` |
| GET | `/admin/bookings/export` | Admin | The same filter as a CSV file (spreadsheet formulas are defused) |
| PATCH | `/admin/bookings/:bookingId/cancel` | Admin | Cancel any booking; body `{ refund: true, reason }` refunds a paid one in full |
| GET | `/admin/users` | Admin | Travelers with booking count and amount paid |
| PATCH | `/admin/users/:userId/role` | Admin | `{ role: "user" | "admin" }`. You cannot demote yourself |
| GET | `/admin/revenue` | Admin | Paid revenue per day (`30d`) or month (`12m`) |
| POST | `/assistant` | Optional | `{ message }`. Rule-based travel assistant; uses Claude for unplaceable questions only when `ANTHROPIC_API_KEY` is set |
| GET | `/admin/messages` | Admin | Latest 50 messages from the Contact page, with the unread count |
| PATCH | `/admin/messages/:id/read` | Admin | Mark a message as read |
| POST | `/contact` | Public | Send a message from the Contact page (name, email, subject, message). Rate limited. A hidden `website` field is a bot trap |
| POST | `/upload/image`, `/upload/place/:placeId/image` | Admin | Upload an image |
| GET | `/health` | Public | 200 when the database is connected, 503 when not |

Errors use normal HTTP codes: 400 bad input, 401 not logged in, 403 not allowed, 404 not found, 429 too many requests, 500 server error.

Rate limits (production, or `RATE_LIMIT=on`): login and register 20 wrong tries per 15 minutes, search 90 per minute, booking 60 per 15 minutes, contact 5 messages per 15 minutes, everything else 1500 per 15 minutes.

---

## 10. Data models

| Model | Main fields | Notes |
|---|---|---|
| **User** | name, email (unique), password (bcrypt, never returned), role (`user` / `admin`) | |
| **State** | name, slug, type (State / UT), region, capital, image, description, popularPlaces, bestTimeToVisit | 36 records |
| **TouristPlace** | name, slug, state, stateSlug, city, latitude, longitude, categories, description, image, timings, entryFee, rating | 234 curated records |
| **Stay** | name, address, city, state, latitude, longitude, geoapifyPlaceId, category, image, rating | Saved when a traveler picks a hotel |
| **Room** | stay, name, pricePerNight, maxGuests, totalRooms, amenities | Three types are created per stay |
| **Booking** | bookingReference (unique), user, destination, selectedPlaces, traveler, accommodation, room, checkIn, checkOut, rooms, adults, children, nights, pricing, addons, cancellation, status, paymentStatus | Copies hotel and price data so history never changes |
| **Review** | user, itemType, itemId, rating, comment | One per user per item |
| **Favorite** | user, itemType, itemId, name, image, city, state, stateSlug | One per user per item |
| **ContactMessage** | name, email, subject, message, user (optional), status (`new` / `read`) | From the Contact page. Only admins can read them |

Booking `pricing`: `roomTotal`, `mealsTotal`, `transportTotal`, `activitiesTotal`, `addonsTotal`, `taxes`, `totalAmount`, `currency`.
Booking `addons`: `meals`, `transport`, `activities[]`.
Booking `cancellation`: `cancelledAt`, `refundAmount`, `note`.

---

## 11. Business rules

| Rule | Detail |
|---|---|
| Price | Always worked out by the server. Room (price x rooms x nights) + meals + travel + activities, plus 5% tax on room and add-ons |
| Meals | Per person per night. Children under 12 pay half. Price scales with the room's price |
| Travel | Per day. Bike is non-AC only. Optional |
| Activities | Per person. Optional |
| Places | Tourist places are optional when booking |
| Availability | A room is taken by every pending or confirmed booking that overlaps your dates. Cancelling frees it |
| Payment | Demo. Marks the booking paid and confirmed. No money moves |
| Cancellation | Full refund if the hotel offers free cancellation **and** check-in is more than 24 hours away. Otherwise cancelled with no refund |
| Reviews | One per person per place. You can change or delete yours |
| Passwords | 8 to 72 characters, at least one letter and one number |
| Admin | Granted only with `npm run make-admin` |

---

## 12. Design system

The site follows one look on every page, so moving between pages feels like one product.

| Element | Value |
|---|---|
| Main blue | `#008cff` to `#065af3` gradient |
| Banner | Dark blue gradient `#0a2a5e` to `#0f55c8`, white title with one yellow word (`#ffd24d`) |
| Accent | Orange `#f26a1b` (brand sub-line, tags) |
| Page background | Grey `#f2f2f2`, white cards with rounded corners (14px) |
| Font | Lato |
| Page banner | One shared component, `components/PageHero.jsx`, used by every inner page |
| Style files (load order) | `styles.css`, `premium.css`, `booking.css`, `mmt.css`, `hotels.css`, `hotels-near.css`, `addons.css`, `about-contact.css`, `unified.css`, `responsive.css`, `animations.css`, `dark-auto.css` (generated), `dark.css` |
| Dark mode | `<html data-theme="dark">`. Page `#0b1220`, cards `#141c2e`, text `#e8edf5`. Generated by `npm run dark` from the light styles, then hand-tuned in `dark.css` |
| Motion | `animations.css`: page fade, scroll reveal, hero slideshow, featured slider, hover and press feedback. Off for reduced motion |

**Responsive rules** (`responsive.css`): nothing wider than the screen, buttons and links at least 40 to 44px to tap, 16px text in fields on phones (stops iPhone zoom), safe-area spacing for phones with a notch, no sticky hover on touch screens, balanced headlines, and special handling for landscape phones and screens over 1600px.

To change the whole site's look, change the colours at the top of `mmt.css` and `unified.css`, then run `npm run dark --prefix client` so dark mode follows.

---

## 13. Testing

```bash
npm test
```

127 automated tests cover price calculation, generated hotel profiles, input sanitising, the startup checks, the Contact form rules, booking input and date changes, the assistant, emails and CSV safety, Razorpay signatures, webhook and refunds, review votes and photos, admin tools, and the English / Hindi / Odia texts. The integration tests start a throwaway `mongod` and skip if none is found (set `MONGOD_PATH`). See TESTING.md.

Manual checks used during development: a browser script walked the full booking journey at ten screen sizes (320px to 1920px, plus a phone on its side) and reported sideways scrolling, text cut off, small tap targets and script errors.

---

## 14. Deployment

One host runs both the API and the website.

1. Create a **MongoDB Atlas** cluster and copy its connection string.
2. On the host set: `NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET` (32+ random characters), `GEOAPIFY_API_KEY`, `CLOUDINARY_*`, `PEXELS_API_KEY`.
3. Build command: `npm run install:all && npm run build`
4. Start command: `npm start` (the host provides `PORT`).
5. Open `/api/health`. It should say the database is connected.
6. Register, then `npm run make-admin -- you@example.com` on the host.

**Before going live, check:**

- `JWT_SECRET` is a fresh random value, set once (not duplicated in the file).
- `server/.env` is never committed. It is already listed in `.gitignore`, so keep it that way.
- The API keys in your local `.env` were shared during development. Create new ones before launch.
- The payment is a demo. Replace it with a real gateway before charging real money (see SYSTEM_DESIGN, section 9).

If the website is hosted separately (Vercel, Netlify): set `CLIENT_URL` on the server to the website's address, and `VITE_API_URL` (ending in `/api`) when building the website.

---

## 15. Troubleshooting

| Problem | Likely cause and fix |
|---|---|
| Server stops at start with a list of settings | `MONGO_URI` or `JWT_SECRET` missing, or a weak secret in production. Fix `server/.env` |
| "Cannot connect to MongoDB" | MongoDB is not running, or Atlas does not allow your IP. Start it, or add your IP in Atlas Network Access |
| Menu items missing in the navbar | Windows display scaling at 125% or more can narrow the window. Zoom the browser out (Ctrl and minus) or use the menu icon |
| Style changes do not appear | Hard refresh with Ctrl+Shift+R. Restart `npm run dev:client` after adding a CSS import |
| Photos missing | Check `CLOUDINARY_*` and `PEXELS_API_KEY`. The free photo services rate-limit, so give it a minute |
| No hotels or places for a city | `GEOAPIFY_API_KEY` missing or its free quota is used up |
| "Invalid or expired authentication token" | Log in again. The website signs you out only on a real 401 or 403 |
| "Too many requests" | Rate limit in production. Wait, or raise the limits in `middleware/security.js` |
| Contact page shows `support@voyara.example` | These are placeholders. Edit `client/src/config/site.js` with your real email, phone, hours and address |
| "You have sent several messages already" on Contact | The contact rate limit (5 per 15 minutes) is on. Wait, or test with `RATE_LIMIT` unset in development |
| Dark mode looks wrong after a colour change | Run `npm run dark --prefix client` to rebuild `dark-auto.css` |
| Admin button missing | Run `make-admin` for your email, then log out and in |
| Port already in use | Another program uses 5000 or 5173. Close it or change `PORT` |

---

## 16. Real data vs demo data

| Real (from map data and curated lists) | Generated or demo |
|---|---|
| Hotel and restaurant names and locations | Hotel prices |
| Distances to places | Most star ratings and amenities (the app marks real ones "listed") |
| Nearby attractions | Meal prices, vehicle rates, activity fees |
| A hotel's Wi-Fi, parking, phone, website, stars **when the map lists them** | Free-cancellation flag |
| 36 states, 234 curated landmarks, their descriptions | Payment (demo) |

Generated values are stable: the same hotel always shows the same price and profile.

---

## 17. Glossary

| Term | Meaning |
|---|---|
| MERN | MongoDB, Express, React, Node.js |
| JWT | A signed token the browser sends to prove who you are |
| Geoapify | The map data service used for search, places, hotels and restaurants |
| OSM | OpenStreetMap, the community map data behind Geoapify |
| Curated place | A landmark added by hand, with a checked photo and description |
| Seeding | Loading the starting data (states and places) into an empty database |
| Rate limit | A cap on how many requests one visitor can send in a time window |
| CSP | Content Security Policy, a browser rule limiting where a page can load code from |
| Booking reference | The code like `VOY-32771335-8557` that identifies a booking |
