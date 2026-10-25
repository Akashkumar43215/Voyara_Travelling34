# VOYARA Security

How VOYARA protects its users and data, what the rules are for contributors, and what to check before going live.

Related: [ARCHITECTURE.md](ARCHITECTURE.md) · [AGENTS.md](AGENTS.md) · [TESTING.md](TESTING.md)

---

## 1. Reporting a vulnerability

Please do **not** open a public issue for a security problem. Send the details privately to the project owner (add your contact here: `<security-contact>`), including what you found, how to repeat it, and what it could allow. You will get an answer as soon as possible. Please give a reasonable time to fix it before sharing it publicly.

## 2. What we protect

| Asset | Why it matters |
|---|---|
| Passwords | Reuse across sites makes a leak serious |
| Login tokens (JWT) | Whoever holds one acts as that user |
| Traveler details (name, email, phone) and bookings | Personal data |
| Prices and bookings | Money and trust |
| Admin access and uploads | Control of the site |
| API keys (`server/.env`) | Cost, abuse, account takeover of third-party accounts |

## 3. Security model

```
Request -> Helmet headers + CSP -> CORS -> body limit -> input sanitising
        -> rate limits -> JWT (protect) -> role check (adminOnly) -> controller
```

### 3.1 Authentication

| Control | Detail |
|---|---|
| Password storage | bcrypt, cost 12. The hash is never returned (`select: false`) |
| Password rules | 8 to 72 characters, at least one letter and one number |
| Tokens | JWT signed with `JWT_SECRET`, valid for 7 days |
| Secret strength | The server refuses to start in production if the secret is under 32 characters or on a list of weak values. It stops in any mode if the secret is missing |
| Login throttle | 20 failed login or register attempts per 15 minutes per address. Successful logins do not count |
| Logout on bad token | The website signs a user out only on a real 401 or 403, not on a slow network or a 429 |
| Email | Stored lowercase, unique |

### 3.2 Authorisation

| Rule | Enforced in |
|---|---|
| Booking, payment, cancel, my trips, favorites, review writing need a login | `protect` middleware on the route |
| Admin dashboard, all bookings, **uploads** need admin | `protect` plus `adminOnly` on the route |
| A user only sees and changes their own bookings | Queries filter by `req.user.userId` |
| Admin rights come only from a command line script | `npm run make-admin -- email` (on a server you control) |

The website also hides admin links from normal users, but that is only for convenience. The server is what enforces it.

### 3.3 Input handling

| Threat | Control |
|---|---|
| NoSQL injection | `sanitizeInput` removes keys that start with `$` or contain `.` from body, query and params, including inside arrays. Controllers check types |
| Oversized requests | JSON body limit 100 kb. Upload type and size limits in `uploadMiddleware` |
| Price tampering | The browser never sends a price. The server recomputes from the stored room price and catalog |
| Bad values | Counts, dates, mode names and activity ids are validated. Unknown ones are rejected |
| Injection into pages (XSS) | React escapes output. No `dangerouslySetInnerHTML` with user data. CSP restricts scripts |

### 3.4 Transport and browser protections

| Control | Detail |
|---|---|
| Helmet | Security headers including a Content Security Policy, and HSTS in production |
| CORS | Development allows the dev site. Production allows only `CLIENT_URL` (or same origin when one process serves everything) |
| HTTPS | Terminate TLS at the host (Render, Railway, nginx, Cloudflare). Do not serve production over plain HTTP |

### 3.5 Abuse and availability

| Limiter | Limit | Applies to |
|---|---|---|
| API | 1500 per 15 min | All `/api` |
| Auth | 20 per 15 min (failures only) | login, register |
| Search | 90 per minute | location, add-ons |
| Booking | 60 per 15 min | bookings |
| Contact | 5 per 15 min | contact form |

Limits are active in production, or in development with `RATE_LIMIT=on`. External calls (Geoapify, Pexels, Wikimedia) have caches, time budgets and back-off so users cannot burn the quota quickly or freeze a page.

### 3.5b The Contact form

| Risk | Control |
|---|---|
| Spam and floods | Rate limit of 5 messages per 15 minutes per address (production, or `RATE_LIMIT=on`), plus a hidden `website` field that only bots fill in: the server answers "sent" and stores nothing |
| Injection | Every field must be plain text. Objects and arrays are rejected, and control characters are removed |
| Oversized input | Name 2 to 100, subject 3 to 120, message 10 to 2000 characters, JSON body limit 100 kb |
| Script in a message | Messages are stored as text and shown by React as text, never as HTML |
| Reading other people's messages | Only `GET /api/admin/messages` can list them, and it needs login plus the admin role |
| Who sent it | When the sender is logged in their account is attached (a bad or missing token is simply ignored). Their email is whatever they typed, so reply by email only |

### 3.6 Error handling and logging

In production a server error returns a generic message, never a stack trace, and `/api/health` hides database details. Server logs use `morgan` and short error lines. **Never log passwords, tokens, full card data or API keys.**

### 3.7 Secrets

| Rule | Detail |
|---|---|
| Keep keys in `server/.env` only | Listed in `.gitignore`. Never commit it, paste it into chats, tickets or docs |
| `.env.example` has names only | No real values |
| One value per key | A duplicate `JWT_SECRET` line is confusing. Keep one |
| Rotate on exposure | If a key may have been seen by anyone else, create a new one and delete the old |
| Browser code | Only `VITE_` variables are visible to the browser. Never put a secret there |

### 3.8 Payments

Payment is a **demo** until Razorpay keys are set. With keys, the rules below are built in (see `services/razorpayService.js` and `controllers/paymentController.js`):

1. Card and UPI details are entered only in Razorpay's own window. They never touch this server.
2. The order is created on the server with the booking's server-computed amount. The page sends no amount.
3. A booking becomes paid only with a valid **Razorpay HMAC signature**: from the browser callback (checked with the key secret and tied to this booking's order id) or from the signed webhook (checked with the webhook secret over the raw body). Both are idempotent.
4. A webhook whose amount differs from the booking is ignored. A payment that arrives for a cancelled booking is refunded automatically.
5. With keys set, the demo payment endpoint answers 403, so it cannot be used to skip paying.
6. Refunds go through the gateway first. If the gateway refuses, the booking is not cancelled.
7. The security headers allow Razorpay's origins only while online payment is switched on.

Still to do before live money: test with Razorpay TEST keys and a public webhook URL, keep the key secret and webhook secret out of the repo, and rotate them if they are ever exposed.

---

## 4. Threats and responses

| Threat | Response |
|---|---|
| Credential stuffing, guessing | Login throttle, bcrypt cost 12, password rules |
| Stolen token | Tokens expire after 7 days. The token sits in `localStorage`, a known trade-off. Plan: a shorter life with refresh, or an httpOnly cookie |
| Forged token | Signature check with a strong secret |
| Someone reads another user's trip | User filter on every booking query |
| Normal user reaches admin | Server-side role check, 403 |
| Anonymous file upload | Upload routes need admin |
| Changing a price in the browser | Server computes it |
| Mongo operator injection | Sanitiser and type checks |
| Scraping and floods | Rate limits |
| Leaked API keys | `.env` not in git, rotation steps, key names only in docs |
| Clickjacking, MIME sniffing | Helmet headers |
| Verbose errors | Generic messages in production |
| Vulnerable dependency | `npm audit --omit=dev` before release (currently 0 findings). `nodemon` is a dev-only tool |

## 5. Known gaps

| Gap | Risk | Plan |
|---|---|---|
| Token kept in `localStorage` | XSS could read it | CSP and escaping reduce this. Move to an httpOnly cookie later |
| No email verification or password reset | Fake accounts, locked-out users | Add email flow |
| No account lockout beyond the rate limit | Slow guessing from many addresses | Add per-account lockout or CAPTCHA |
| Last-room race is guarded by a recount, not a transaction | Over-booking in a very rare case | Atomic reservation |
| No audit log of admin actions | Hard to trace changes | Add one: admins can now cancel, refund and change user roles |
| Rate limiter and caches are per process | Limits multiply with several copies | Shared store (Redis) |
| Payment | Demo by default. Razorpay built in, untested against the live gateway | Test with TEST keys, then go live |
| Contact form has no CAPTCHA | A determined bot behind many addresses could fill the inbox | Add a CAPTCHA. Booking emails exist (optional SMTP) but a new message does not email the owner |

## 6. Rules for contributors

1. Never commit or paste `server/.env` or any key.
2. New route that changes data or shows personal data: add `protect`. Admin only: add `adminOnly`.
3. Never trust the browser for prices, roles or user ids. Use `req.user`.
4. Validate types and ranges of everything from `req.body`, `req.query`, `req.params`.
5. Do not loosen helmet, CORS, rate limits or env checks to make a bug go away.
6. Do not log sensitive data.
7. Add a test for anything security or money related ([TESTING.md](TESTING.md)).
8. Add dependencies carefully, then run `npm audit --omit=dev`.

## 7. Production checklist

- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` is fresh, 32+ random characters, set once
- [ ] `MONGO_URI` points to a database with a strong password and a restricted network (Atlas IP list)
- [ ] All API keys were created fresh for production (do not reuse development keys that were ever shared)
- [ ] `server/.env` is not in git and not in a public folder or backup
- [ ] HTTPS is on
- [ ] `CLIENT_URL` is set if the site is hosted separately
- [ ] `GET /api/health` returns 200
- [ ] Rate limits are active (production default)
- [ ] `npm audit --omit=dev` shows no high or critical issues
- [ ] `npm test` passes
- [ ] Admin accounts created with `make-admin`, and only for the right people
- [ ] Database backups are on
- [ ] If taking real money: a real gateway with webhooks (section 3.8)

## 8. Quick self-test (manual)

| Try | Expected |
|---|---|
| Open `/admin` as a normal user | Sent away. `GET /api/admin/stats` returns 403 |
| `POST /api/upload/image` without a token | 401 |
| `GET /api/bookings/my` without a token | 401 |
| Send `{"email": {"$gt": ""}}` to login | Rejected, no login |
| Change a price in the booking request | Ignored. Server total is used |
| Open another user's booking id | Not found or not allowed |
| Register with `abc` as password | Rejected with a clear message |
| `POST /api/contact` with `"email": {"$gt": ""}` | 400, nothing stored |
| `POST /api/contact` with the hidden `website` field filled | Looks successful, nothing stored |
| `GET /api/admin/messages` without a token, or as a normal user | 401, 403 |
| Start the server with a short `JWT_SECRET` in production | Refuses to start |
