# VOYARA: Product Requirements Document (PRD)

| | |
|---|---|
| **Product** | VOYARA, Smart Travel India |
| **Type** | Web app (MERN stack), responsive from 320px phones to wide desktops |
| **Status** | Version 1.0, feature complete for demo use. Payment is a demo |
| **Related** | [ARCHITECTURE.md](ARCHITECTURE.md), [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md), [SECURITY.md](SECURITY.md), [TESTING.md](TESTING.md), [docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md) |

---

## 1. Problem

Planning a trip in India today means jumping between many sites: one to find what to see, another to find a hotel, another for food, another for a cab. Hotel sites show hotels by city, not by **how close they are to the places the traveler actually wants to visit**. Extras such as meals, a vehicle and activities are chosen late or not at all, so the final price is a surprise.

## 2. Vision

One flow, from "where do I want to go" to a confirmed booking: pick the places, see hotels ranked by their distance to those places, add the food, travel and activities you want, see one honest price, and manage the trip afterwards.

## 3. Goals and non-goals

**Goals**

| # | Goal | How we know |
|---|---|---|
| G1 | A traveler can go from search to a confirmed booking in one continuous flow | The 13-step journey completes on phone, tablet and desktop |
| G2 | Hotels are found **near the chosen places**, with real distances | Every hotel card shows the distance to each picked place |
| G3 | The price is always correct and never manipulable from the browser | Server recomputes every price. Unit tests cover the maths |
| G4 | All 36 states and UTs are worth exploring | Every state and UT has at least 5 curated places, each with its own photo |
| G5 | The site feels like a mainstream booking site | One consistent blue design on every page |
| G6 | An admin can see what is happening | Dashboard shows bookings, revenue and which services guests buy |
| G7 | Safe to put online | Production checks, rate limits, no exposed admin or upload routes |

**Non-goals (version 1)**

- Taking real payments by default (the payment is a demo until Razorpay keys are set; the gateway is built in but untested against the live service).
- Real hotel inventory and live hotel prices (no free public hotel price API exists).
- A hotel-owner or restaurant-owner portal.
- Flights, trains and buses between cities.
- Native mobile apps, or languages other than English, Hindi and Odia.
- SMS. (Booking emails are built in and optional.)

## 4. Users

| Persona | Needs | Main screens |
|---|---|---|
| **Traveler** (main user) | Decide where to go, find a hotel close to the sights, know the full price, book, change plans | Home, Destinations, Stays, the booking steps, My Trips, Favorites |
| **Admin** (site owner) | See bookings and revenue, understand which extras sell | Admin dashboard |
| **Developer / reviewer** | Run, read and extend the project | README, docs, tests |

## 5. User journey

```
Search a city -> Pick places (P1, P2, P3) -> Hotels near those places -> Hotel details
-> Room + dates + guests -> Availability -> Meals (food in/out, B/L/D) -> Travel + activities (optional)
-> Trip preview -> Traveler details -> Review -> Demo payment -> Confirmation -> My Trips (cancel)
```

## 6. Functional requirements

Priority: **M** must have, **S** should have, **C** could have. All M and S items are built.

### 6.1 Explore

| ID | Requirement | Pri |
|---|---|---|
| FR-1 | List all 36 states and UTs, filter by region, search by name, capital or attraction | M |
| FR-2 | Show at least 5 curated places per state or UT with photo, description, timings, entry fee, rating | M |
| FR-3 | Search any Indian city with suggestions while typing | M |
| FR-4 | Show real tourist places around a searched city, curated places first, with photos | M |
| FR-5 | Place page with details, favorite button and reviews | S |

### 6.2 Hotels

| ID | Requirement | Pri |
|---|---|---|
| FR-6 | The traveler can pick several places (optional) and gets hotels around them | M |
| FR-7 | Each hotel shows its distance to **each** picked place | M |
| FR-8 | Filter by budget, star class, rating, distance, free cancellation, facilities. Sort by distance, price, rating, popularity | M |
| FR-9 | Hotel details: photos, facilities (marked "listed" when the map data confirms them), contact, nearby restaurants, reviews | M |
| FR-10 | Hotels that are unnamed or unusable are never shown | S |

### 6.3 Rooms, add-ons, price

| ID | Requirement | Pri |
|---|---|---|
| FR-11 | Three room types per hotel (Standard, Deluxe, Family) with price, guests and amenities | M |
| FR-12 | Live availability for the chosen dates | M |
| FR-13 | Meals: food excluded, or any mix of breakfast / lunch / dinner, with ready plans (breakfast, half board, full board). Children under 12 pay half | M |
| FR-14 | Real restaurants near the hotel | S |
| FR-15 | Optional local travel: cab, SUV, bike or bus, AC or non-AC, per day | M |
| FR-16 | Optional activities: fixed experiences and attractions near the hotel, per person | M |
| FR-17 | One live price box at every step: room + meals + travel + activities + 5% tax | M |
| FR-18 | The server works out the price. The browser sends choices only | M |

### 6.4 Booking and trips

| ID | Requirement | Pri |
|---|---|---|
| FR-19 | Traveler details form, full review, and a booking reference (`VOY-...`) | M |
| FR-20 | Booking pages need a login. The trip survives going to the login page and back | M |
| FR-21 | Demo payment that marks the booking paid and confirmed | M |
| FR-22 | My Trips lists bookings with the chosen extras | M |
| FR-23 | Cancel a booking. Show the refund before confirming. Full refund when the hotel offers free cancellation and check-in is more than 24 hours away, otherwise no refund. Cancelling frees the rooms | M |

### 6.5 Accounts and community

| ID | Requirement | Pri |
|---|---|---|
| FR-24 | Register and login (password 8 to 72 characters with a letter and a number) | M |
| FR-25 | Favorites: save and remove places | S |
| FR-26 | Reviews: one per person per item, 1 to 5 stars, can be changed or deleted | S |

### 6.6 Admin

| ID | Requirement | Pri |
|---|---|---|
| FR-27 | Admin-only dashboard: users, bookings, confirmed, cancelled, revenue | M |
| FR-28 | Services view: how many bookings include meals, travel, activities, the money from each, top activities, vehicles, meal plans | S |
| FR-29 | Admin-only list of all bookings | M |
| FR-30 | Admin rights are granted only from the command line | M |
| FR-31 | Light and dark mode: a button in the navbar, follows the device setting on the first visit, remembers the choice, no white flash, every page readable in both | S |
| FR-33 | An About page: story, how it works in five steps, what makes VOYARA different, a clear list of what is real and what is demo, a FAQ and calls to action. No invented claims, people or testimonials | S |
| FR-34 | A Contact page: contact details, quick links to help, and a message form (name, email, subject, message) that validates on the page and on the server, shows clear errors and a success state, and fills in a logged-in visitor's details | S |
| FR-35 | Messages are stored and shown to admins on the dashboard with a new-message count and a mark-as-read button. Spam is limited by a hidden trap field and a rate limit | S |
| FR-32 | A lively interface: page transitions, content that reveals on scroll, a Home photo slideshow, a Featured Journeys slider and subtle hover feedback. All of it respects the device's reduced-motion setting and never hides content | S |

## 7. Non-functional requirements

| Area | Requirement |
|---|---|
| **Responsive** | No sideways scrolling and tappable controls (at least 40 to 44px) from 320px to 1920px, plus a phone on its side. Inputs use 16px text on phones |
| **Consistency** | Every page uses the same banner, colours, cards and buttons ([DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)) |
| **Performance** | Pages load on demand. Repeat place searches are cached for an hour. A slow photo or map service must not freeze a page |
| **Resilience** | If the map service is down, curated places and saved hotels still work. A page error shows a friendly message, never a blank screen |
| **Security** | See [SECURITY.md](SECURITY.md). Production refuses weak settings |
| **Accuracy** | Price on screen equals price charged, to the rupee |
| **Accessibility** | Readable contrast, labelled controls, keyboard friendly, respects reduced-motion |
| **Maintainability** | Pricing in one service. Plain JavaScript. Tests for the money and security logic ([TESTING.md](TESTING.md)) |
| **Hosting** | One Node process can serve the API and the website. Needs MongoDB |

## 8. Success metrics

For a demo or portfolio product these are checks, not analytics:

| Metric | Target |
|---|---|
| Journey completion in the browser audit | Passes at every tested screen size |
| Layout problems in the responsive audit | 0 sideways scroll, 0 cut-off text |
| Price correctness tests | All pass |
| Server tests | 36 of 36 pass |
| States and UTs with 5+ curated places | 36 of 36 |
| Known security vulnerabilities in live dependencies | 0 |

If the product goes live, also track: search-to-booking conversion, cancellation rate, share of bookings with extras, average booking value, page load time.

## 9. Assumptions, risks and decisions

| Item | Decision or risk | Mitigation |
|---|---|---|
| No public MakeMyTrip API | The hotel flow is built in-house. No copying of anyone's brand or content | Own name, own copy and own data |
| Hotel prices are generated | A real hotel's real price is unknown | Generated values are stable per hotel and labelled as typical. Real facts are marked "listed" |
| Free map and photo services have limits | Slow or rate-limited responses | Caching, time budgets, back-off, curated fallbacks |
| Demo payment | No real money | Clearly labelled. Razorpay is built in and switches on with keys; test with TEST keys first |
| Last room race | Two bookings at the same instant | Guarded by a recount after saving. A database transaction would be cleaner (see ARCHITECTURE.md) |
| Community map data | Some areas have fewer hotels or details | Curated places always shown first |

## 10. Release scope

**Version 1.0 (done):** everything in section 6, the unified design, responsive layout, production hardening, light and dark mode, motion, About and Contact pages, 127 tests, documentation.

**Added since 1.0 (done):** change the dates of a booking, review photos and helpful votes, a travel assistant (rule based, optional Claude) with a one-tap booking card, optional booking emails, Razorpay payments and refunds, admin tools (bookings search, CSV export, cancel and refund, user roles, revenue chart), and the whole website in English, Hindi and Odia.

**Next (ideas, not committed):**

| Idea | Value |
|---|---|
| Test Razorpay with TEST keys, then go live | Take real bookings |
| Email verification and password reset | Fewer fake accounts |
| Hotel-owner portal for real prices, photos, rooms | Real inventory |
| Atomic room reservation | Remove the last-room race |
| Admin: edit places and hotels | Run the rest of the business from the dashboard |
| Saved trips and shareable itineraries | Retention |
| Client and end-to-end tests in CI | Safer changes |
| Native-speaker review of Hindi and Odia, more languages, translated assistant replies | Better wording, wider reach |
