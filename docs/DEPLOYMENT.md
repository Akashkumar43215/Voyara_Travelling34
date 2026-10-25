# Deploying VOYARA

VOYARA runs as **one Node process** that serves both the API (`/api`) and the built website (`client/dist`). You need three things: a MongoDB database, a Node host, and a few settings.

Related: [ARCHITECTURE.md](../ARCHITECTURE.md) (section 7) · [SECURITY.md](../SECURITY.md) · [README.md](../README.md)

---

## 1. Before you start

| Need | Where to get it |
|---|---|
| MongoDB | [MongoDB Atlas](https://www.mongodb.com/atlas) free cluster. Create a database user, and allow your host's IP (or `0.0.0.0/0` for a demo) under Network Access |
| Node host | Render, Railway, Fly.io, or any VPS with Node 18+ |
| Map data (recommended) | Free key from [Geoapify](https://www.geoapify.com) |
| Images (recommended) | [Cloudinary](https://cloudinary.com) and [Pexels](https://www.pexels.com/api) keys |
| Emails (optional) | Any SMTP service (Brevo, SendGrid, Mailgun, Gmail app password) |
| AI answers (optional) | Anthropic API key from [console.anthropic.com](https://console.anthropic.com) |

## 2. Settings (environment variables)

Set these on the host. **Never commit them.** Names and notes are in `server/.env.example`.

| Setting | Required | Notes |
|---|---|---|
| `NODE_ENV` | yes | `production` |
| `MONGO_URI` | yes | The Atlas connection string, ending in `/voyara_db` |
| `JWT_SECRET` | yes | 32+ random characters: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `CLIENT_URL` | only if the site is on another host | Leave out when this server also serves the website |
| `GEOAPIFY_API_KEY`, `CLOUDINARY_*`, `PEXELS_API_KEY` | recommended | Without them, search and photos degrade |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | optional | Booking emails stay off without `SMTP_HOST` and `MAIL_FROM` |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | optional | Turn on real payments. With keys the demo payment is switched off. Production refuses to start with keys but no webhook secret. Use `rzp_test_` keys first |
| `ANTHROPIC_API_KEY` | optional | Without it the assistant stays rule based. `ANTHROPIC_MODEL` overrides the model |

The server refuses to start in production with a missing `MONGO_URI` or `JWT_SECRET`, or a weak secret.

## 3. Render (one web service)

A ready blueprint is in [render.yaml](../render.yaml).

1. Push the project to GitHub (without `server/.env`).
2. On Render: **New > Blueprint**, pick the repo.
3. Fill the secrets it asks for (`MONGO_URI`, keys). `JWT_SECRET` is generated for you.
4. Deploy. Build runs `npm run install:all && npm run build`, start runs `npm start`.
5. Open `https://<your-service>.onrender.com/api/health`. It must answer `200` with the database `connected`.

Railway and others: same two commands. Build `npm run install:all && npm run build`, start `npm start`.

## 3b. Vercel for the website, Render for the API

Use this when you want the website on Vercel. The API stays on Render (section 3). [client/vercel.json](../client/vercel.json) is already in the repo.

1. Deploy the API on Render first and note its address, for example `https://voyara.onrender.com`.
2. On Vercel: **Add New > Project**, pick the repo, set **Root Directory** to `client`. Vercel detects Vite.
3. Add the environment variable `VITE_API_URL` = `https://voyara.onrender.com/api` (it is baked in at build time, so redeploy after changing it).
4. Deploy. Note the Vercel address, for example `https://voyara.vercel.app`.
5. Back on Render, set `CLIENT_URL` = the Vercel address (no trailing slash) and redeploy, so CORS and the security headers allow it. Add a custom domain here too if you use one.
6. If you use Razorpay, the webhook URL stays on Render: `https://voyara.onrender.com/api/payments/razorpay/webhook`.

Simplest option: skip Vercel and use Render alone (section 3). One address, no CORS setup.

## 4. First admin

Register on the live site, then promote the account from your own computer (with `MONGO_URI` pointing at the live database):

```
npm run make-admin -- you@example.com
```

After that, admins can promote or demote others from **Admin > Travelers**.

## 5. Checklist before sharing the link

- [ ] `/api/health` is `200` and the database is `connected`
- [ ] `JWT_SECRET` is random and long, and is **not** the value from your laptop
- [ ] `server/.env` was never committed. Rotate any key that was ever pasted into a chat or a commit
- [ ] Atlas network access is limited as far as your host allows
- [ ] Contact details in `client/src/config/site.js` are replaced (they are placeholders)
- [ ] Payment: either it is still the **demo**, or Razorpay is on. If on: you tested with TEST keys, the webhook URL `https://<your-site>/api/payments/razorpay/webhook` is set in the Razorpay dashboard (events `payment.captured`, `order.paid`), and you made one test payment and one test refund
- [ ] Try the full flow once: search, book, pay (demo), cancel, and the admin pages
- [ ] Rate limits are always on in production. Check that a normal user is not blocked

## 6. Updating

Push to the branch. The host rebuilds. Hashed files in `/assets` are cached for a year, and `index.html` is never cached, so visitors get the new version on their next load.

## 7. Known limits

- Rate limiter and place cache live in memory: run **one** instance, or move them to Redis first.
- Free Render services sleep when idle, so the first request can take about a minute.
- Emails are sent inside the request (not queued). A slow mail server never blocks the booking, but a failed email is only logged.
