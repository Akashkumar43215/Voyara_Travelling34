# VOYARA: Smart Travel India

Plan and book a trip across India in one flow. Explore all **36 states and union territories**, pick the places you want to visit, find hotels **near those places**, then add meals, local travel and activities before you pay.

Built with the MERN stack (MongoDB, Express, React, Node.js). Responsive from a 320px phone to a wide desktop.

> **Demo status:** payment is a demo (no real money moves) until you add Razorpay keys, and hotel prices are generated. See [Real data and demo data](#real-data-and-demo-data).

## Documentation

| File | What is in it |
|---|---|
| [PRD.md](PRD.md) | Product requirements: problem, goals, users, features, success checks, roadmap |
| [ARCHITECTURE.md](ARCHITECTURE.md) | How the system is built: layers, routes, data, pricing, external services, deployment |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | Colours, type, components, page banner, layout, responsive rules, CSS order |
| [SECURITY.md](SECURITY.md) | Security model, rules for contributors, known gaps, production checklist |
| [CORE_STYLE.md](CORE_STYLE.md) | Coding style for server, client, CSS and API |
| [TESTING.md](TESTING.md) | Automated tests, manual checklists, layout audit, roadmap |
| [AGENTS.md](AGENTS.md) | Instructions for AI coding agents and new developers |
| [docs/PROJECT_DOCUMENTATION.md](docs/PROJECT_DOCUMENTATION.md) | Full guide: user and admin guides, API reference, troubleshooting (also as a Word file) |
| [docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md) | Diagrams, booking sequence, data model, scaling trade-offs (also as a Word file) |

## What it does

| Step | What the traveler does |
|---|---|
| 1. Explore | Browse 36 states and UTs and 234 curated landmarks, or search any city |
| 2. Places | Pick several places to visit (P1, P2, P3...) |
| 3. Hotels | Hotels around those places, with the distance to each one. Filter by budget, stars, rating, free cancellation and amenities. Sort by distance, price or rating |
| 4. Rooms | Choose dates, guests and a room type, and check availability |
| 5. Meals & facilities | Food included or excluded; breakfast, lunch and dinner one by one; hotel facilities; real restaurants nearby |
| 6. Travel & activities (optional) | Cab, SUV, bike or bus (AC or non-AC), plus experiences and nearby attractions |
| 7. Preview, details, review | See the whole trip and the full price, enter traveler details |
| 8. Payment | Demo payment, or Razorpay checkout when keys are set |

| 9. My Trips | View bookings and **cancel** them, with free-cancellation refunds |
| Also | An **About** page (story, how it works, honest real-vs-demo list, FAQ) and a **Contact** page with a working message form |

Also: change the dates of a booking (My Trips), reviews with photos and "helpful" votes, favorites, a travel **assistant** (rule based, optional Claude AI) that can open the booking flow with the trip filled in, booking emails (optional), a language switch in the navbar (English, Hindi and Odia; every page, server message and curated place is translated, and the navbar keeps one size in all three), an admin dashboard (revenue chart, bookings search and CSV export, cancel and refund, user roles, contact inbox), one consistent design on every page, a **light / dark mode** button (it follows your device setting and remembers your choice), and a lively feel: a Home photo slideshow, a Featured Journeys slider, pages that fade in, cards that rise as you scroll, counting numbers and smooth hover effects (all switched off for visitors who ask for reduced motion).

## Real data and demo data

- **Real:** hotel names and locations, restaurants, nearby places and attractions (from Geoapify / OpenStreetMap), and a hotel's Wi-Fi, parking, phone and website **when the map data lists them** (marked "listed" in the app).
- **Demo:** prices, most star classes and amenities, meal prices, vehicle rates and activity fees. They are generated, stable per hotel, and calculated on the server. Payment is a demo, so no money is charged.

## Tech stack

| Part | Technology |
|---|---|
| Client | React 18, Vite 6, React Router 7, Axios, Lucide icons, plain CSS |
| Server | Node.js 18+, Express 4, Mongoose 8, JWT, bcryptjs |
| Security | Helmet, rate limiting, input sanitising, locked-down CORS and uploads |
| Services | MongoDB (Atlas or local), Cloudinary (images), Geoapify (map data), Pexels (stock photos), Wikipedia (place photos). Optional: Razorpay (payments), SMTP via nodemailer (emails), Anthropic Claude (assistant) |

## Getting started

**You need:** Node.js 18 or newer, and MongoDB (local, or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster).

```bash
# 1. Install everything
npm run install:all

# 2. Configure the server
cp server/.env.example server/.env      # Windows: copy server\.env.example server\.env
#    then open server/.env and fill it in

# 3. Start the server (terminal 1)
npm run dev:server

# 4. Start the website (terminal 2)
npm run dev:client
```

Open **http://localhost:5173**. The API runs on http://localhost:5000. On first start the server loads the 36 states and 234 places by itself.

### Commands

| Command | What it does |
|---|---|
| `npm run install:all` | Installs server and client packages |
| `npm run dev:server` | API with auto-restart |
| `npm run dev:client` | Website with hot reload |
| `npm run build` | Builds the website into `client/dist` |
| `npm start` | Runs the server for production (serves the built website too) |
| `npm test` | Runs the automated tests |
| `npm run dark --prefix client` | Rebuilds the generated dark-mode CSS after you change light colours |
| `npm run make-admin -- you@example.com` | Makes a user an admin (add `--remove` to undo) |

### Settings (`server/.env`)

| Setting | Needed? | What it is |
|---|---|---|
| `MONGO_URI` | Yes | Your MongoDB connection string |
| `JWT_SECRET` | Yes | Long random secret for logins. Make one: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `GEOAPIFY_API_KEY` | Recommended | City search, nearby places, hotels, restaurants |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Recommended | State and place photos |
| `PEXELS_API_KEY` | Recommended | Stock photos for hotels and places without their own |
| `CLIENT_URL` | If hosted separately | Your website's address, for CORS |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Optional | Booking emails. Off without `SMTP_HOST` and `MAIL_FROM` |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Optional | Real payments. Without them the demo payment is used |
| `ANTHROPIC_API_KEY` | Optional | Lets the assistant answer questions it cannot place by rules. Off by default |
| `NODE_ENV` | | `development` or `production` |
| `RATE_LIMIT` | | `on` turns rate limits on in development |

The server checks these at startup and tells you exactly what is missing. **Never commit `.env`.** See [SECURITY.md](SECURITY.md).

### Your contact details

The Contact page and its details come from `client/src/config/site.js`. They are **placeholders** (`support@voyara.example`, `+91 00000 00000`). Replace them with your real email, phone, hours and address before you go live.

### Make yourself an admin

Register on the site, then run this in the project folder, and log out and in again:

```bash
npm run make-admin -- you@example.com
```

## Tests

```bash
npm test
```

127 tests cover pricing, booking rules and date changes, payments (Razorpay signatures, webhook, refunds), reviews, admin tools, the assistant, emails, security, the startup checks, and the English / Hindi / Odia texts. The integration tests start a throwaway `mongod` and skip if none is found (set `MONGOD_PATH`). Details and manual checklists: [TESTING.md](TESTING.md).

## Putting it online

The server can host the website too, so one deployment is enough:

1. Build the website: `npm run build`
2. Set these on your host: `NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET` (32+ random characters), `GEOAPIFY_API_KEY`, `CLOUDINARY_*`, `PEXELS_API_KEY`
3. Start with `npm start`. The host must run the build step first and provide a port in `PORT`.

Works on Render, Railway, a VPS, or any Node host. If you host the website separately (for example on Vercel), set `CLIENT_URL` on the server and `VITE_API_URL` when building the client (see `client/.env.example`).

Check `GET /api/health` once it is live, and go through the [production checklist](SECURITY.md#7-production-checklist) first.

## Project layout

```
client/            React website
  src/pages/       One file per page
  src/components/  Shared pieces (PageHero, navbar, price summary, reviews...)
  src/config/      site.js (contact details and subjects: edit before going live)
  src/hooks/       useTripQuote, useScrollReveal, useCarousel
  src/i18n/        English, Hindi and Odia texts (Hindi and Odia load only when chosen)
  src/utils/       Trip and distance helpers
  src/*.css        Styles, loaded in order (see DESIGN_SYSTEM.md)
  theme-backups/   Earlier green theme, kept for reference
server/
  controllers/     Request handlers
  models/          Mongoose models (User, Booking, Room, Stay, ...)
  routes/          API routes
  services/        Pricing, hotel profiles, map and image lookups
  middleware/      Auth and security
  config/          Startup checks, database, Cloudinary
  data/            Curated states and places
  scripts/         Seeding and admin tools
  tests/           Automated tests
docs/              Project documentation and system design (Markdown and Word)
postman/           API collection
```

## API overview

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Places | `GET /api/states`, `GET /api/places`, `GET /api/location/places` |
| Hotels | `GET /api/location/stays`, `GET /api/rooms/stay/:id` |
| Add-ons | `GET /api/addons/restaurants`, `/activities`, `/catalog`, `POST /api/addons/quote` |
| Bookings | `POST /api/bookings` (optional `tripId` links the stops of a multi-city trip), `GET /api/bookings/my`, `GET /:id/cancellation`, `PATCH /:id/cancel`, `PATCH /:id/dates` (change dates, `dryRun` previews), `PATCH /:id/payment` |
| Reviews & favorites | `/api/reviews/...`, `/api/favorites/...` |
| Contact | `POST /api/contact` (public, rate limited) |
| Admin | `GET /api/admin/stats`, `GET /api/admin/bookings?q=&status=&paymentStatus=&page=&limit=`, `GET /api/admin/bookings/export` (CSV), `PATCH /api/admin/bookings/:id/cancel` (optional refund), `GET /api/admin/users`, `PATCH /api/admin/users/:id/role`, `GET /api/admin/revenue?range=30d|12m`, `GET /api/admin/messages`, `PATCH /api/admin/messages/:id/read`, `POST /api/upload/...` (admin only) |
| Health | `GET /api/health` |

Full reference with access rules and a sample request: [docs/PROJECT_DOCUMENTATION.md](docs/PROJECT_DOCUMENTATION.md#9-api-reference).

## Known limits

- Payment is a demo until you set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` (see `docs/DEPLOYMENT.md`). Try it with Razorpay TEST keys before using live keys.
- Hotel prices, stars and most amenities are generated demo data (see above).
- The last-room race is guarded by a recount after each booking, not by a database transaction. A production system would reserve rooms atomically.
- Hindi and Odia texts were written without a native-speaker review. Live-map hotel names and assistant replies stay in English.
- Map data is community-sourced, so some areas have fewer hotels and details than others.

The full list and the planned fixes are in [ARCHITECTURE.md](ARCHITECTURE.md#9-known-limits-and-the-planned-fix) and [SECURITY.md](SECURITY.md#5-known-gaps).

## Contributing

Read [AGENTS.md](AGENTS.md) and [CORE_STYLE.md](CORE_STYLE.md) first. Keep `npm test` green, keep secrets out of git, and follow the [design system](DESIGN_SYSTEM.md).

## License

Academic and demonstration project.
