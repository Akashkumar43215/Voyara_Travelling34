# VOYARA Design System

The single reference for how VOYARA looks and behaves. Goal: **a traveler moving from one page to another should never feel they changed websites.**

The style is "bright blue travel-booking": a flat white-card layout on a light grey page, a bold blue brand, and one shared blue banner on every inner page. It follows the common look of large booking sites but uses VOYARA's own name, copy and data.

Related: [PRD.md](PRD.md) · [CORE_STYLE.md](CORE_STYLE.md) · [AGENTS.md](AGENTS.md)

---

## 1. Principles

1. **One look.** Same banner, background, cards and buttons on every page.
2. **Clear next step.** One strong primary button per screen area, in the brand gradient.
3. **Price is always visible.** From the room step on, a price box follows the traveler.
4. **Phone first.** Nothing wider than the screen. Controls are easy to tap.
5. **Calm, flat, readable.** White cards, soft shadows, plenty of space, bold headings.
6. **Light and dark.** Every page works in both modes (section 12). The brand blue and the blue banner stay the same.
7. **Honest labels.** Real facts say "listed". Generated values say "typical".

---

## 2. Colour

Tokens live as CSS variables at the top of `mmt.css` (brand) and `unified.css` (page). Use the variable, not a raw hex, in new code.

### Brand

| Token | Value | Use |
|---|---|---|
| `--mmt-blue` | `#008cff` | Links, active tab, icons, focus |
| `--mmt-blue-dark` | `#065af3` | Gradient end, hover |
| `--mmt-gradient` | `linear-gradient(93deg, #53b2fe, #065af3)` | Primary buttons, logo, search button |
| `--hero-from` / `--hero-to` | `#0a2a5e` / `#0f55c8` | Page banner gradient |
| `--mmt-orange` | `#f26a1b` | Brand sub-line, small tags |
| `--gold-light` | `#ffd24d` | The one highlighted word in a banner title, "listed" accents |
| `--mmt-green` | `#2b9348` | Success, "Veg options", savings |
| `--mmt-red` | `#eb2026` | Errors, cancel, remove |

### Neutrals

| Token | Value | Use |
|---|---|---|
| `--page-bg` / `--bg-main` | `#f2f2f2` | Page background |
| `--bg-card` | `#ffffff` | Cards, forms |
| `--bg-subtle` | `#f4f6f9` | Quiet panels inside cards |
| `--bg-dark` | `#0f1b2d` | Footer, dark summary bars |
| `--ink` / `--text-main` | `#1a1a1a` | Headings and body |
| `--text-muted` | `#4a4a4a` | Secondary text |
| `--text-light` | `#9b9b9b` | Hints, fine print |
| `--border` | `#e7e7e7` | Dividers, input borders |

Status pills: confirmed = green on pale green, pending = amber on pale amber, cancelled = red on pale red. Never colour alone: pair it with a word or icon.

**Contrast:** body text on white and white text on the banner both pass WCAG AA. Do not put grey text on the blue banner. Banner text is white, sub-text is white at 82%.

---

## 3. Typography

| | |
|---|---|
| Font | **Lato** (400, 700, 900), loaded from Google Fonts in `index.html`. Fallback: system UI |
| Headings | Weight 900, tight letter-spacing (`-0.01em`), `text-wrap: balance` |
| Body | Weight 400 to 700, line-height about 1.5 to 1.6, `text-wrap: pretty` |

| Role | Size | Notes |
|---|---|---|
| Banner title | `clamp(1.9rem, 4vw, 2.9rem)` | White, one word in yellow |
| Section title | `clamp(1.5rem, 2.4vw, 2rem)` | |
| Card title | 1.1 to 1.25rem | Weight 900 |
| Body | 0.95 to 1rem | |
| Small / labels | 0.75 to 0.9rem | Uppercase labels use letter-spacing `0.08` to `0.12em` |
| Price (total) | 1.5 to 2rem | Weight 900, brand blue |

On phones, **text inside form fields is 16px** so iPhones do not zoom when a field is tapped.

---

## 4. Space, shape, depth

| Token | Value |
|---|---|
| Container | max 1192px, side padding 1rem (0.9rem under 480px). Max 1360px above 1600px |
| Section padding | 2.5rem on phones, more on desktop |
| Gaps | 0.5, 0.75, 1, 1.25, 1.5, 2rem (stay on this scale) |
| `--card-radius` | 14px for cards and panels |
| Buttons, chips, pills | Fully round (`999px`) |
| Inputs | 8 to 12px radius |
| `--card-shadow` | `0 1px 4px rgba(0,0,0,.12), 0 8px 24px -14px rgba(10,42,94,.25)` |
| Hover (mouse only) | Lift 2 to 4px and a deeper shadow. Never on touch screens |

---

## 5. Layout

### Page shell

```
Navbar (sticky, white; transparent over the Home photo)
PageHero banner (every inner page)
Page body on grey (#f2f2f2) -> white cards
Footer (dark)
```

### Breakpoints

| Width | Behaviour |
|---|---|
| 1200px and up | Full desktop menu, 3-column card grids, side filters and sticky price box |
| 901 to 1199px | Laptop. Same layout, tighter sort tabs |
| up to 900px | Menu collapses into the menu button. Tap targets 40 to 44px. Side panels stack |
| up to 768px | 16px field text, 44px field height, smaller banner padding, tables scroll inside their box |
| up to 480px | Single column grids, wrapped date and guest fields, full-width buttons |
| Landscape phone (height up to 520px) | Shorter banners, no scroll-to-top button |
| 1600px and up | Wider container, readable line length |

Test every change at **320, 390, 768, 1280** and ideally 1920.

---

## 6. Components

### 6.1 PageHero (the banner)

`client/src/components/PageHero.jsx`. Use it at the top of every inner page.

| Prop | Meaning |
|---|---|
| `eyebrow` | Small badge text, e.g. "STEP 4 OF 9 · MEALS & FACILITIES" |
| `icon` | A Lucide icon element for the badge |
| `title` | Page title. Wrap one word in `<span>` to make it yellow |
| `subtitle` | One or two short lines |
| `actions` | Buttons on the right (use `className="page-hero-btn"`) |
| `children` | Content under the text, e.g. a search card (`className="page-hero-card"`) |
| `compact` | Slimmer banner for step pages |
| `center` | Centre the text (search landing pages) |

```jsx
<PageHero
  compact
  eyebrow="STEP 2 OF 9 · TRIP DETAILS"
  icon={<MapPin />}
  title="Plan Your Stay"
  subtitle="Select your room, travel dates, and number of guests."
  actions={<button className="page-hero-btn" onClick={() => navigate(-1)}><ArrowLeft size={17} /> Back to Stays</button>}
/>
```

Rules: one banner per page, always the first thing under the navbar, no custom colours. Home keeps its photo hero and Login/Register show the same blue band behind the card.

### 6.2 Navbar

White bar, brand logo (blue gradient square, "VOYARA", orange "SMART TRAVEL INDIA"), icon-over-label tabs (Home, Destinations, Stays, Trips, Favorites), Admin button only for admins, user chip and Logout. Active tab: blue text, pale blue background, blue underline. Under 900px it becomes a menu button with a full list. Over the Home photo it is transparent with white text, and turns white after scrolling.

### 6.3 Buttons

| Type | Class | Look | Use |
|---|---|---|---|
| Primary | `.btn .btn-primary`, `.search-btn` | Blue gradient, white bold text, round, soft glow | The main action |
| Secondary | `.btn-secondary`, `.btn-outline` | White or outlined | Other actions |
| Banner | `.page-hero-btn` | Translucent white on the banner | Back, quick actions |
| Admin | `.btn-admin` | Dark with yellow text | Admin only |
| Danger | cancel styles | Red text or red fill | Cancel, remove |

States: hover darkens the gradient, focus shows a visible ring, disabled is greyed and not clickable. Minimum height 40px (44px on phones for main actions). Only **one** primary button per card or bar.

### 6.4 Cards

White background, 14px radius, the card shadow, 1.25 to 1.75rem inside padding. Types: place card, hotel card (photo, name, stars, rating chip, distances, facilities, price, "Select Stay"), room card, booking card, add-on card (`.addon-card`), stat card, price summary.

Selected state: blue border and a pale blue background plus a check mark.

### 6.5 Forms

Label above the field, 44px high fields, 8 to 12px radius, `--border` border, blue focus border and ring. Errors: red text under the field, never only a red border. Password fields have a show/hide button that is at least 40px wide. Date fields use the native date input. Steppers (rooms, adults, children) have 40px round buttons.

### 6.6 Chips, badges, pills

Round, small bold text. Use for: quick destinations, amenities, "Free cancellation" (green), "listed" (blue), "FEATURED" (orange), booking status. Quick-pick chips are at least 38px tall on phones.

### 6.7 Tables and lists

Header row in light grey or brand navy, zebra rows optional, 0.75rem cell padding. Under 768px a table scrolls inside its own box, never the page.

### 6.8 Price summary

`TripPriceSummary.jsx`, fed by `useTripQuote`. Lists room, meals, travel, activities, taxes, then a large total in brand blue. Sticky beside the content on desktop, below it on phones. Always shows the server's amount.

### 6.8b About and Contact

| Piece | Look |
|---|---|
| Stat tiles | Blue gradient tiles with a big yellow number that counts up |
| Step and feature cards | White cards, a pale-blue icon square, lift on hover |
| Real vs demo | Two cards with a green (real) or orange (demo) top edge |
| FAQ | `details` rows that open with a turning chevron and a soft rise |
| Call-to-action band | Blue gradient band with one primary and one banner-style button |
| Contact form | White card, labels above 46px fields, a blue focus ring, red message under a bad field, a character counter, a full-width blue **Send message** button, then a green success panel |
| Info card | Icon squares with Email, Phone, Support hours and Address, plus a Quick help card of links |

About and Contact appear in the navbar with an icon and a label, exactly like the other items. On narrow laptops (901 to 1139px) the whole bar tightens its spacing and drops the user-name chip and the "Smart Travel India" sub-line to make room, so all seven items keep their icon and label.

### 6.9 Feedback

| Situation | Treatment |
|---|---|
| Loading | Centered spinner or skeleton with a short line of text |
| Empty | Icon, one-line explanation, one clear button (e.g. "Plan Your First Trip") |
| Error | Plain sentence of what went wrong and a retry. Never a blank page |
| Success | Green check, bold message, the reference code |
| Notice | Soft amber or blue strip with a close button |

### 6.10 Scroll-to-top

Round blue button at the bottom right, appears after scrolling. Moves up when a bottom bar is showing. Hidden on short landscape screens.

### 6.11 Images

Always have a photo. Use `loading="lazy"`, a fixed aspect ratio so layout does not jump, `object-fit: cover`, and a soft placeholder if a photo fails. Cloudinary URLs use `f_auto,q_auto` and a width.

---

## 7. Page templates

| Template | Pages | Structure |
|---|---|---|
| Landing | Home, Stays (search) | Large hero (photo on Home, banner on Stays) with a white search card |
| Listing | Destinations, Places, Explore, Stays results, Favorites | Banner, filters or search row, grid or list of cards |
| Step | Dates, Availability, Meals, Travel, Preview | Compact banner with step badge and Back, main column of cards, sticky price box |
| Checkout | Traveler details, Review, Payment | Compact banner, form or summary cards, price box |
| Account | My Trips, Login, Register | Banner (My Trips) or banner band behind a centred card (auth) |
| Content | About, Contact | Banner, then sections of cards on grey and light-blue bands, a form card beside an info card |
| Dashboard | Admin | Banner, stat cards, tables |
| Detail | Place, hotel details window | Hero photo, facts, reviews |

---

## 8. Motion

The site is meant to feel alive but never slow. All motion lives in `src/animations.css` and a few small components and hooks.

| Effect | Where | How |
|---|---|---|
| Page transition | Every page change | A soft 0.4s fade (`.page-transition`, keyed by the route). Opacity only, so fixed bars never jump |
| Scroll reveal | Cards, hotel and place cards, favorites, bookings, section headings | `hooks/useScrollReveal.js` fades each one up the first time it scrolls into view, with a small stagger. The classes are removed afterwards, so hover effects work as usual |
| Hero text | Home hero and every page banner | Badge, title, text and buttons rise in one after the other (`rise`). The soft glow in banners drifts slowly |
| Photo slideshow | Home hero | `components/HeroSlides.jsx`. Six photos (the hero image plus five states) cross-fade every 6.5s with a slow Ken Burns zoom. A caption links to the state, dots jump to a photo |
| Featured Journeys | Home | `components/FeaturedSlider.jsx`. Large slides move sideways every 7s, can be swiped on a phone, work with the arrow keys, and the text staggers in on each slide |
| Top Destinations row | Home | Drifts along by itself every few seconds, pauses when you touch or hover it, loops back to the start |
| Counting numbers | Home stats | `components/CountUp.jsx` counts up when first seen |
| Scroll progress | Top of every page | A thin blue-to-orange line (`components/ScrollProgress.jsx`) |
| Hover and press | Buttons, nav icons, cards | Buttons shrink slightly when pressed. Primary buttons get a light sweep on hover. Nav icons lift |
| Small touches | Price total, theme button, menus, modals | The total pops when it changes, the sun/moon swaps with a spin, the phone menu slides down item by item, modals fade and scale in |
| Place photo | Place details | Slow Ken Burns zoom |

**Rules**

- Animate `opacity` and `transform` only. Keep effects between 0.2 and 0.9 seconds, except the slow background drifts.
- Never leave content hidden. Reveal classes are removed when done, and a safety timer removes them after 1.6s.
- Never put `transform` or `filter` on a wrapper that holds fixed bars (that is why the page transition is opacity only).
- Autoplay must stop on hover and focus, while the tab is hidden, and for visitors who ask for reduced motion.
- **Reduced motion:** `prefers-reduced-motion: reduce` turns it all off. Animations are disabled in CSS, the slideshow and slider do not autoplay, numbers show their final value, and nothing is held back for reveal. Test with the browser's "reduce motion" setting.
- Use `animation-fill-mode: backwards` (not `both`) for entrance animations, so the final state comes from the normal styles.
- New carousel: use `hooks/useCarousel.js`, give it `aria-roledescription="carousel"`, dots with labels and at least 30px tap targets.

## 9. Accessibility

- Every icon-only button has an `aria-label`.
- Every field has a visible label or an `aria-label`.
- Focus is always visible. The whole flow works with a keyboard.
- Tap targets are at least 40px (44px for main actions on phones).
- Text contrast meets AA. Meaning is never carried by colour alone.
- Headings go in order. Each page has one `h1`, set by `PageHero`.
- The document title changes per page (`RouteTitle`).

---

## 10. CSS architecture

Files load in this order from `client/src/main.jsx`. Later files win ties.

| Order | File | Purpose |
|---|---|---|
| 1 | `styles.css` | Base, reset, layout and older page styles |
| 2 | `premium.css` | Refinements |
| 3 | `booking.css` | Checkout pages |
| 4 | `mmt.css` | **Brand tokens and navbar, buttons, cards** |
| 5 | `hotels.css`, `hotels-near.css` | Hotel results and distance UI |
| 6 | `addons.css` | Meals, travel and activities pages, price summary |
| 6b | `about-contact.css` | About page, Contact page and the admin message list |
| 6c | `admin.css`, `admin-manage.css`, `reviews-extra.css`, `assistant.css` | Admin dashboard and tools, review photos and votes, the assistant widget |
| 6d | `i18n.css` | Language menu, Devanagari and Odia fonts, and the **fixed-size navbar** (tabs, buttons and brand keep one size in English, Hindi and Odia) |
| 7 | `unified.css` | **Shared banner, page background, same-look overrides** |
| 8 | `responsive.css` | **Mobile, touch and wide-screen polish** |
| 9 | `animations.css` | **Motion**: transitions, reveal, slideshow, slider, hover effects |
| 10 | `dark-auto.css` | **Generated** dark-mode versions of every light colour (do not edit) |
| 11 | `dark.css` | **Hand-tuned dark mode**: tokens, the toggle button, special cases (last) |

Rules for new styles:

- Use variables for colours, radius and shadow.
- Put brand or global changes in `mmt.css` or `unified.css`, page-specific styles in that page's file, and device-size fixes in `responsive.css`.
- Name classes by feature (`hotel-card`, `addon-card`), not by look (`blue-box`).
- Avoid `!important`. It is used only in `unified.css` to keep banner text white.
- Add a CSS file to `main.jsx` and **restart the Vite dev server**, otherwise the import is not picked up.
- The earlier green theme is kept as `client/theme-backups/*.green-backup.css.txt` for reference only.

## 11. Dark mode

A round sun/moon button in the navbar (`ThemeToggle`, on every page and in the phone menu) switches between light and dark.

| Behaviour | Detail |
|---|---|
| First visit | Follows the device setting (`prefers-color-scheme`) |
| After a click | The choice is saved in `localStorage` (`voyara_theme`) and wins over the device setting |
| No flash | A tiny script in `index.html` sets `data-theme` on `<html>` before the first paint |
| How it works | `ThemeContext` sets `<html data-theme="dark">`. All dark styles live under `:root[data-theme="dark"]` |
| Browser parts | `color-scheme` is set, so scrollbars, date pickers and form controls follow the theme |

**Dark palette**

| Token | Light | Dark |
|---|---|---|
| `--page-bg` | `#f2f2f2` | `#0b1220` |
| `--bg-card` | `#ffffff` | `#141c2e` |
| `--bg-subtle` | `#f4f6f9` | `#1a2438` |
| `--ink` / `--text-main` | `#1a1a1a` | `#e8edf5` |
| `--text-muted` | `#4a4a4a` | `#aab5c8` |
| `--border` | `#e7e7e7` | `#263149` |
| `--primary-dark` (blue text) | `#0b5fd6` | `#7cc0ff` |
| Banner `--hero-from` / `--hero-to` | `#0a2a5e` / `#0f55c8` | `#071a3d` / `#0a3a94` |

The brand gradient buttons, the orange and yellow accents and the footer stay as they are. Photos are dimmed slightly (`brightness(.92)`).

**How the dark styles are made**

1. `client/scripts/generate-dark.mjs` reads every light stylesheet and writes `src/dark-auto.css`: each light background becomes a dark one, each dark text colour becomes light, each light border becomes subtle. Text on coloured backgrounds (orange tags, blue buttons) is kept.
2. `src/dark.css` holds the hand-tuned parts: the tokens, the toggle, and the special cases.

**When you change the light CSS, run `npm run dark` (in `client/`) and commit the new `dark-auto.css`.** Never edit `dark-auto.css` by hand.

Rules for new styles:

- Use the colour variables. They switch automatically.
- If you must write a literal colour (`#fff`, `#f2f2f2`, dark text), the generator handles it. Re-run `npm run dark`.
- A background that uses `var(--ink)` or `var(--text-main)` would flip to light in dark mode. Give it a real colour, or add a fix in `dark.css`.
- Inline `style={{ background: "#fff" }}` is not covered. Use a class.
- Check both themes at 320 and 1280px, and check text contrast in dark mode.

## 12. Do and don't

| Do | Don't |
|---|---|
| Start every inner page with `PageHero` | Invent a new header style for one page |
| Use one primary button per area | Put several gradient buttons side by side |
| Use the grey page and white cards | Use white text on a light background |
| Test at 320px | Assume desktop is enough |
| Check light **and** dark mode | Leave a hard-coded `#fff` panel in a new component without re-running `npm run dark` |
| Say "listed" only for real facts | Present generated amenities as verified |
| Show the server's price | Calculate a price in the browser |
