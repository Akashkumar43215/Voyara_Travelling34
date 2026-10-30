# VOYARA: Eraser diagrams

How to use: open https://app.eraser.io, create a **diagram file**, paste a code block below into the code pane (left side), and the diagram draws itself. Diagram 1 is the architecture, diagram 2 the booking workflow, diagram 3 the database.

Facts come from `ARCHITECTURE.md` and `docs/SYSTEM_DESIGN.md`. Optional services (Razorpay, email, Google Places, Claude) only run when their key is set in `server/.env`.

---

## 1. System architecture (cloud architecture diagram)

```
title VOYARA System Architecture
direction right
colorMode pastel
styleMode shadow

Traveler [icon: user, color: blue]
Admin [icon: shield, color: red]

// ---------------- Frontend ----------------
Website [icon: monitor, color: blue] {
  React 18 + Vite 6 [icon: react]
  React Router 7 pages [icon: layout]
  Auth, Language EN HI OR, Theme context [icon: settings]
  Trip state in router state [icon: shopping-cart]
  Axios api.js with JWT [icon: send]
}

// ---------------- Backend ----------------
Express API [icon: nodejs, color: green] {
  Security: helmet, CORS, rate limits, sanitize [icon: lock]
  Auth middleware: protect, adminOnly [icon: key]

  Routes [icon: git-branch] {
    auth [icon: user]
    location [icon: map-pin]
    addons [icon: plus-circle]
    bookings [icon: calendar]
    rooms [icon: home]
    reviews [icon: star]
    favorites [icon: heart]
    states and places [icon: globe]
    contact [icon: mail]
    assistant [icon: message-circle]
    admin [icon: shield]
    upload [icon: upload]
  }

  Services [icon: cpu] {
    geoapifyService [icon: map]
    stayProfile and facilityExtractor [icon: list]
    stayPhotoService and stayImageService [icon: image]
    placeImageService [icon: image]
    roomService [icon: home]
    addonCatalog and pricing [icon: dollar-sign]
    bookingValidation [icon: check-square]
    assistantEngine [icon: message-square]
    emailService [icon: mail]
    razorpayService [icon: credit-card]
  }
}

// ---------------- Database ----------------
MongoDB Atlas [icon: mongodb, color: green] {
  users [icon: database]
  bookings [icon: database]
  stays and rooms [icon: database]
  reviews and favorites [icon: database]
  states and tourist places [icon: database]
  stayphotos cache [icon: database]
  contact messages [icon: database]
}

// ---------------- External services ----------------
Geoapify [icon: map, color: orange]
Wikipedia and Wikimedia Commons [icon: globe, color: orange]
Pexels stock photos [icon: image, color: orange]
Cloudinary [icon: cloud, color: orange]
Google Places, optional [icon: google, color: gray]
Razorpay, optional [icon: credit-card, color: gray]
SMTP email, optional [icon: mail, color: gray]
Claude AI, optional [icon: cpu, color: gray]

// ---------------- Connections ----------------
Traveler > Website: browses, searches, books
Admin > Website: dashboard
Website > Express API: REST JSON over /api
Express API > MongoDB Atlas: Mongoose
Services > Geoapify: city search, places, hotels, restaurants
Services > Wikipedia and Wikimedia Commons: place and hotel photos
Services > Pexels stock photos: fallback stay photos
Services > Cloudinary: store and serve images
Services > Google Places, optional: real hotel photos
Services > Razorpay, optional: online payment
Services > SMTP email, optional: booking emails
Services > Claude AI, optional: assistant answers
Routes > Services: controllers call services
Services > MongoDB Atlas: models
```

---

## 2. Booking workflow (sequence diagram)

```
title VOYARA Booking Workflow
autoNumber

Traveler [icon: user]
Website [icon: monitor]
API [icon: nodejs]
Geoapify [icon: map]
MongoDB [icon: mongodb]
Payment [icon: credit-card]
Email [icon: mail]

// 1. Account
Traveler > Website: Register or log in
Website > API: POST /auth/register, /auth/login
API > MongoDB: users (bcrypt password)
API --> Website: JWT token
Website > Website: store token, attach to every request

// 2. Search
Traveler > Website: Type a city
Website > API: GET /location/autocomplete
API > Geoapify: autocomplete
Geoapify --> API: matches
API --> Website: suggestions

Traveler > Website: Search city, dates, guests
Website > API: GET /location/places
par [parallel] {
  API > MongoDB: curated places for the area
  API > Geoapify: tourist places
}
API --> Website: places with photos, curated first

// 3. Stays
Traveler > Website: Pick places, Continue
Website > API: GET /location/stays
API > Geoapify: hotels around the area
API > MongoDB: reviews and cached photos
API --> Website: hotels with distance, profile, rating, photo

Traveler > Website: View details, pick a hotel
Website > API: POST /location/stays/save
API > MongoDB: save Stay and 3 default Rooms

// 4. Dates and availability
Traveler > Website: Pick room, dates, guests
Website > API: POST /bookings/check-availability
API > MongoDB: count overlapping bookings
API --> Website: rooms left

// 5. Extras
Traveler > Website: Choose meals, travel, activities
Website > API: POST /addons/quote
API --> Website: full price breakdown

// 6. Confirm
Traveler > Website: Traveler details, review, Confirm
Website > API: POST /bookings with token
API > API: re-price on the server, validate
API > MongoDB: create Booking, status pending
API --> Website: booking reference VOY-...

// 7. Payment
alt [online payment on] {
  Website > Payment: Razorpay checkout
  Payment --> API: signed webhook
} else [demo payment] {
  Website > API: PATCH /bookings/:id/payment
}
API > MongoDB: paymentStatus paid, status confirmed
API > Email: confirmation email, if SMTP is set
API --> Website: confirmation page

// 8. After booking
Traveler > Website: My Trips, change dates, cancel
Website > API: PATCH or DELETE /bookings/:id
API > MongoDB: update booking, free rooms, refund if eligible
```

---

## 3. Database (entity relationship diagram)

```
users [icon: user, color: blue] {
  id string pk
  name string
  email string unique
  password string
  role string
}

states [icon: globe, color: green] {
  id string pk
  name string unique
  slug string unique
  image string
}

touristplaces [icon: map-pin, color: green] {
  id string pk
  stateSlug string
  slug string
  name string
  city string
  latitude number
  longitude number
  image string
}

stays [icon: home, color: orange] {
  id string pk
  geoapifyPlaceId string
  name string
  address string
  city string
  state string
  latitude number
  longitude number
  category string
  image string
  rating number
}

rooms [icon: bed, color: orange] {
  id string pk
  stay string
  name string
  pricePerNight number
  maxGuests number
  totalRooms number
  availableRooms number
}

bookings [icon: calendar, color: red] {
  id string pk
  bookingReference string unique
  user string
  tripId string
  destination object
  accommodation string
  room string
  checkIn date
  checkOut date
  rooms number
  adults number
  children number
  nights number
  pricing object
  addons object
  payment object
  cancellation object
  status string
  paymentStatus string
}

reviews [icon: star, color: purple] {
  id string pk
  user string
  itemType string
  itemId string
  rating number
  comment string
  travellerType string
  travelMonth string
  roomType string
  categoryRatings map
  photos array
}

favorites [icon: heart, color: purple] {
  id string pk
  user string
  itemType string
  itemId string
  name string
  image string
}

stayphotos [icon: image, color: gray] {
  id string pk
  placeId string unique
  urls array
  photos array
  checkedAt date
}

contactmessages [icon: mail, color: gray] {
  id string pk
  name string
  email string
  subject string
  message string
  status string
}

states.id < touristplaces.stateSlug
users.id < bookings.user
stays.id < rooms.stay
stays.id < bookings.accommodation
rooms.id < bookings.room
users.id < reviews.user
users.id < favorites.user
stays.geoapifyPlaceId - stayphotos.placeId
```
