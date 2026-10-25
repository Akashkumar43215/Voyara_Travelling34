# VOYARA Core Style Guide

How code is written in this project. The rule of thumb: **new code should look like it was written by the same person as the code around it.** When this guide and the surrounding code disagree on something small, follow the surrounding code.

Related: [AGENTS.md](AGENTS.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) · [SECURITY.md](SECURITY.md)

---

## 1. General

| Rule | Detail |
|---|---|
| Language | Plain JavaScript (ES2022). No TypeScript |
| Modules | **Server: CommonJS** (`require`, `module.exports`). **Client: ES modules** (`import`, `export`) |
| Indent | 2 spaces. No tabs |
| Quotes | Double quotes in JavaScript and JSX strings. (A few older client files use single quotes. Keep the file's own style when editing it, use double in new files) |
| Semicolons | Yes |
| Trailing commas | In multi-line objects, arrays and calls |
| Line length | About 100 characters. Break long lines |
| Naming | `camelCase` variables and functions, `PascalCase` components, models and classes, `UPPER_SNAKE_CASE` constants, `kebab-case` CSS classes and CSS file names |
| Files | Pages and components `PascalCase.jsx`. Server files `camelCase.js` with a role suffix (`bookingController.js`, `authRoutes.js`, `stayProfile.js`) |
| Declarations | `const` by default, `let` only when reassigned, never `var` |
| Functions | Arrow functions for components, handlers and helpers: `const name = () => {}` |
| Comparison | `===` and `!==` |
| Async | `async` / `await` with `try` / `catch`. No unhandled promises |
| Magic numbers | Name them: `const PLACES_CACHE_TTL_MS = 60 * 60 * 1000;` |
| Dead code | Delete it. Do not leave commented-out blocks |

No linter or formatter is configured yet. Until one is, format by hand to match this guide. (Adding ESLint and Prettier with these rules is a good future change.)

---

## 2. Server

### 2.1 Folder responsibilities

`routes` map URLs, `controllers` handle requests, `services` hold logic, `models` hold schemas. Keep each to its job ([ARCHITECTURE.md](ARCHITECTURE.md#22-layers-and-what-belongs-where)).

### 2.2 Routes

```js
const express = require("express");

const { getMyFavorites, toggleFavorite } = require("../controllers/favoriteController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getMyFavorites);
router.post("/toggle", protect, toggleFavorite);

module.exports = router;
```

- One router per area, mounted in `app.js`.
- Put `protect` (and `adminOnly`) on the route, not inside the controller.

### 2.3 Controllers

```js
// POST /api/favorites/toggle  (auth) - adds the item, or removes it if already saved
const toggleFavorite = async (req, res) => {
  try {
    const { itemType, itemId, name } = req.body;

    if (!ITEM_TYPES.includes(itemType) || !itemId || !name) {
      return res.status(400).json({ success: false, message: "itemType, itemId and name are required." });
    }

    // ... work ...

    return res.status(200).json({ success: true, data: favorite });
  } catch (error) {
    console.error("Toggle Favorite Error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to update favorite." });
  }
};
```

- A one-line comment above each controller: `// METHOD /api/path  (auth|admin|public) - what it does`.
- **Validate first**, return early, then do the work.
- Always `return res...`.
- Response shape: `{ success: true, data }` (add `count` for lists) or `{ success: false, message }`.
- Status codes: 200 OK, 201 created, 400 bad input, 401 not logged in, 403 not allowed, 404 not found, 409 conflict, 429 too many, 500 server error.
- Messages are plain English a traveler could read. No stack traces, no internals.
- Log with `console.error("Thing Error:", error.message)`. Never log secrets, tokens or whole request bodies.
- Take the user from `req.user.userId`, never from the body.
- Use `.lean()` for read-only queries. Select only the fields you need.

### 2.4 Services

- Pure functions where possible (input in, result out), so they are easy to test.
- No `req` or `res`.
- Money maths lives only in `addonCatalog.js`. Round to whole rupees with `Math.round`, in one place.
- External calls: time budget, cache and back-off. Never in an unbounded loop.
- Hash-based generated values use `>>> 0` (unsigned), never signed shifts.

### 2.5 Models

- Required fields, trims, `min`/`max`, `enum` for fixed lists.
- Add indexes for fields you query by, and unique indexes for natural keys.
- `timestamps: true`.
- Hidden fields use `select: false` (passwords).

### 2.6 Environment

- Read settings from `process.env` through `config/env.js` validation, not scattered across files.
- Add every new setting to `server/.env.example` (name and a placeholder only) and to the settings table in the README.

---

## 3. Client

### 3.1 Components

```jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";

import PageHero from "../components/PageHero";

const Favorites = () => {
  const [items, setItems] = useState([]);

  return (
    <div className="favorites-page">
      <PageHero eyebrow="Saved for later" icon={<Heart />} title="My Favorites" />
      {/* ... */}
    </div>
  );
};

export default Favorites;
```

- Function components with hooks. No class components (the one `ErrorBoundary` is the exception React requires).
- One component per file, default export, file name equals component name.
- Import order: React, third-party, then local (`../components`, `../services`, `../utils`).
- Early returns for loading, error and empty states, before the main JSX.
- Keep a page under about 600 lines of JSX where possible. Move repeated pieces into `components/`.
- `key` on every list item, with a stable id (not the array index when the list can change).
- Do not store derived values in state. Compute them (`useMemo` when expensive).
- Clean up effects (timers, listeners, in-flight requests) and guard against setting state after unmount.

### 3.2 Data and state

- API calls use the shared Axios instance in `services/api.js`. Add new calls there as exported functions.
- Never calculate prices in the browser. Ask `POST /addons/quote` through `useTripQuote`.
- Pass the trip between booking steps with `utils/trip.js` helpers (`tripFromState`, `stateForNext`). Do not invent a second way.
- Read auth from `useAuth()`. Do not read `localStorage` directly in pages.
- Show loading, empty and error states for every request.

### 3.3 Accessibility

- Icon-only buttons need `aria-label`.
- Use real `button` and `a` elements, not clickable `div`s.
- Inputs have labels.
- One `h1` per page (from `PageHero`).

### 3.4 CSS

- Plain CSS, class names by feature (`hotel-card`, `addon-card`, `page-hero-btn`).
- Colours, radius and shadows use variables ([DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)).
- Mobile and touch fixes go in `responsive.css`. Brand-wide changes in `mmt.css` or `unified.css`. Page-specific styles in that page's file.
- Respect the load order in `main.jsx`. Restart Vite after adding a CSS import.
- Avoid `!important` and avoid inline `style` except for values that are truly dynamic.
- Check every change at 320, 390, 768 and 1280px.

---

## 4. API conventions

| Rule | Example |
|---|---|
| Base path | `/api` |
| Nouns, plural, lowercase, kebab-case | `/bookings`, `/check-availability` |
| Verbs | `GET` read, `POST` create or compute, `PATCH` partial update, `DELETE` remove |
| Actions on a resource | `PATCH /bookings/:id/cancel` |
| Success | `{ "success": true, "data": ... }` |
| Failure | `{ "success": false, "message": "..." }` |
| Dates | ISO strings in requests (`YYYY-MM-DD`) |
| Money | Whole rupees (numbers), currency `INR` |
| Auth | `Authorization: Bearer <token>` |

---

## 5. Comments and docs

- Comment **why**, not what. Good: the cancellation rule, the overlap condition, a workaround. Bad: `// increment i`.
- Keep comments short and in plain English.
- Update the docs when behaviour changes: README (commands, settings), `docs/` (API), PRD (scope), DESIGN_SYSTEM (UI).
- Use real names in examples. Never put real keys, emails or tokens in docs.

## 6. Git

- Small, focused commits. One idea per commit.
- Message: short imperative first line (about 60 characters), then a blank line and details if needed.
  - Good: `Add free-cancellation refund preview to My Trips`
  - Bad: `fixes`, `update`, `final changes`
- Never commit `.env`, `node_modules`, `dist` or personal files.
- Do not commit or push unless the project owner asks.

## 7. Review checklist

- [ ] Follows the naming, quote and indent rules above
- [ ] Route has the right `protect` / `adminOnly`
- [ ] Input is validated, response shape and status code are right
- [ ] No price, role or user id trusted from the browser
- [ ] No secrets or personal data in code, logs or docs
- [ ] Loading, empty and error states exist
- [ ] Works at 320px and at 1280px, no console errors
- [ ] Tests added or updated for money and security logic, `npm test` passes
- [ ] Docs updated
