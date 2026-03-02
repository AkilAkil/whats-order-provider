# OrderPulse — Backend API

WhatsApp Order Management SaaS. Multi-tenant Go + PostgreSQL backend.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        ONE APPLICATION                           │
│                                                                  │
│  Client A (Priya Kitchen)      Client B (Rohan Bakery)           │
│  ┌────────────────────────┐    ┌────────────────────────┐        │
│  │ WABA: 101...           │    │ WABA: 202...           │        │
│  │ Phone: +91 98765 43210 │    │ Phone: +91 91234 56789 │        │
│  └──────────┬─────────────┘    └──────────┬─────────────┘        │
│             │                             │                       │
│             └──── SubscribeAppToWABA() ───┘                       │
│                           │                                       │
│                           ▼                                       │
│       POST https://yourdomain.com/webhook/whatsapp               │
│                           │                                       │
│           ┌───────────────┴───────────────┐                      │
│           ▼                               ▼                      │
│   display_phone_number              display_phone_number         │
│   = +91 98765 43210                 = +91 91234 56789            │
│           │                               │                      │
│    SELECT tenant_id FROM              SELECT tenant_id FROM      │
│    tenants WHERE                      tenants WHERE              │
│    whatsapp_number = ...              whatsapp_number = ...      │
│           │                               │                      │
│    → tenant_id_A                    → tenant_id_B               │
│    → store under A                  → store under B             │
│      (B never sees it)                (A never sees it)         │
└──────────────────────────────────────────────────────────────────┘
```

---

## Client Onboarding Flow

### What the client does — 3 actions only

```
Step 1  Fill form      business name, email, password
                       → POST /api/onboarding/signup
                       → Account created. JWT returned.

Step 2  Click button   "Connect WhatsApp" button on the next screen
                       → Meta Embedded Signup popup opens (FB.login)

Step 3  In popup       Log in with Facebook account
                       Select their WhatsApp Business Account
                       Approve permissions
                       → Popup closes automatically
```

### What the backend does — fully automated

```
Step 1  token_exchange         code → short-lived user access token
Step 2  token_extend           short-lived → 60-day long-lived token
Step 3  waba_discovery         GET /me/businesses → find their WABA
Step 4  phone_fetch            GET /{waba_id}/phone_numbers → get number ID
Step 5  webhook_subscribe      POST /{waba_id}/subscribed_apps
                               Meta now routes their messages to our shared webhook
Step 6  db_save                Save all WABA details, onboarding_status = 'active'
Bonus   test_message           "You're connected!" sent to their number
```

All steps logged to `onboarding_events` table. On any failure: `status = failed`.
Client retries by clicking "Connect WhatsApp" again. Fully idempotent.

---

## Project Structure

```
orderpulse/
├── cmd/
│   └── api/
│       └── main.go                    Router, server, graceful shutdown
│
├── internal/
│   ├── auth/
│   │   └── jwt.go                     Token generate + validate (HS256)
│   ├── config/
│   │   └── config.go                  Env loader with validation
│   ├── db/
│   │   ├── db.go                      pgxpool connection + migration runner
│   │   └── migrations/
│   │       └── 001_initial_schema.sql Full schema (embedded in binary)
│   ├── handlers/
│   │   ├── respond.go                 writeJSON / writeError / decodeJSON
│   │   ├── auth.go                    POST /api/auth/login
│   │   ├── onboarding.go              Signup + full automated WABA pipeline
│   │   ├── inbox.go                   Chat threads, messages, reply, tag
│   │   ├── orders.go                  Full order lifecycle
│   │   └── stats.go                   Dashboard summary stats
│   ├── middleware/
│   │   ├── auth.go                    JWT validation + context helpers
│   │   │                              RequireOnboardingComplete guard
│   │   └── logger.go                  Structured request logging
│   ├── models/
│   │   └── models.go                  All domain types + business logic helpers
│   └── whatsapp/
│       ├── meta_api.go                All Meta Graph API calls
│       └── webhook.go                 Receive + route incoming messages
│
├── docs/
│   ├── embedded-signup.js             Frontend JS for the Connect WA button
│   └── whatsapp-templates.md          Template registration guide
│
├── .env.example
├── .gitignore
├── docker-compose.yml
├── docker-compose.prod.yml
├── Dockerfile
├── go.mod
├── Makefile
└── README.md
```

---

## Quick Start

### Prerequisites
- Go 1.22+
- Docker & Docker Compose
- ngrok (for local webhook testing)
- Meta Developer App (see One-Time Setup below)

### Run locally

```bash
git clone https://github.com/yourname/orderpulse.git
cd orderpulse

cp .env.example .env
# Edit .env — fill in JWT_SECRET, META_APP_ID, META_APP_SECRET, WA_WEBHOOK_VERIFY_TOKEN

make docker-up           # Start Postgres + API (migrations run automatically)
make tunnel              # Expose localhost:8080 to internet via ngrok
```

Use the ngrok HTTPS URL as your Meta webhook callback:
```
https://abc123.ngrok.io/webhook/whatsapp
```

---

## One-Time Meta App Setup

Do this **once** for your application. All clients share the same app.

1. **Create app**: https://developers.facebook.com → Create App → Business type
2. **Add WhatsApp product** to the app
3. **Webhook** (WhatsApp → Configuration):
   - Callback URL: `https://yourdomain.com/webhook/whatsapp`
   - Verify Token: matches `WA_WEBHOOK_VERIFY_TOKEN` in your `.env`
   - Subscribe to field: `messages`
4. **Embedded Signup** (WhatsApp → Embedded Signup):
   - Add your frontend domain to "Allowed Domains"
   - Create a signup Configuration → copy the `config_id` for your frontend
5. **App credentials** (App Settings → Basic):
   - Copy `App ID` → `META_APP_ID` in `.env`
   - Copy `App Secret` → `META_APP_SECRET` in `.env`

After this, every new client who completes Embedded Signup gets their WABA automatically
subscribed to your webhook. No Meta dashboard action needed per client — ever.

---

## API Reference

### Public (no auth)

| Method | Path | Description |
|--------|------|-------------|
| GET  | `/health` | Health check (pings DB) |
| GET  | `/webhook/whatsapp` | Meta webhook verification (set once) |
| POST | `/webhook/whatsapp` | Receive all incoming WA messages (all clients) |
| POST | `/api/auth/login` | Login → JWT |
| POST | `/api/onboarding/signup` | Create account (minimal form, no WA details) |

### Onboarding (JWT required, works before WABA connected)

| Method | Path | Description |
|--------|------|-------------|
| POST   | `/api/onboarding/whatsapp/callback` | `{ code }` → full automated WABA setup |
| GET    | `/api/onboarding/status` | Status + audit trail |
| DELETE | `/api/onboarding/whatsapp` | Disconnect + unsubscribe Meta webhook |

### Dashboard (JWT + `onboarding_status = active`)

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/stats` | Dashboard summary |
| GET    | `/api/inbox` | Chat thread list with unread counts |
| GET    | `/api/inbox/{contactId}/messages` | Full message history |
| POST   | `/api/inbox/{contactId}/reply` | Send WhatsApp text reply |
| PATCH  | `/api/inbox/{contactId}/tag` | Tag messages as order-related |
| GET    | `/api/orders` | List orders (supports `?status=` and `?payment_status=`) |
| POST   | `/api/orders` | Create order |
| GET    | `/api/orders/{id}` | Single order with items |
| PATCH  | `/api/orders/{id}/status` | Advance status → auto-notify customer on WA |
| POST   | `/api/orders/{id}/cancel` | Cancel order (new/confirmed only) |
| POST   | `/api/orders/{id}/upi-link` | Generate + send UPI payment link |
| PATCH  | `/api/orders/{id}/payment` | Confirm payment + record transaction |

### Error format

All errors return:
```json
{ "error": "human-readable message", "code": "machine_readable_code" }
```

Frontend routing on error codes:
- `auth_required` / `auth_expired` → redirect to login
- `waba_not_connected` → redirect to onboarding
- `waba_error` → show retry button on onboarding screen

---

## Token Strategy

| Token Type | Expiry | Used For |
|------------|--------|----------|
| Short-lived user token | ~1 hour | Intermediate step only — immediately exchanged |
| Long-lived user token | 60 days | Stored in DB, used for API calls |
| System User token | Never | **Recommended for production** — see below |

### System User (production recommendation)

For never-expiring tokens, set up a System User in Meta Business Manager:
1. Meta Business Manager → Settings → System Users → Create System User
2. Assign the System User to your app with `whatsapp_business_messaging` permission
3. Generate a token → use it as the initial `wa_access_token` for each tenant
4. Update `internal/whatsapp/meta_api.go` to call the System User token endpoint

Until you do this, set up a weekly cron to call `ExchangeForLongLivedToken()` before expiry.

---

## Deployment

### Environment variables for production

```bash
ENV=production
DATABASE_URL=postgres://...?sslmode=require
JWT_SECRET=$(openssl rand -hex 32)
FRONTEND_URL=https://app.yourdomain.com
META_APP_ID=...
META_APP_SECRET=...
WA_WEBHOOK_VERIFY_TOKEN=...
```

### Platforms

| Platform | Notes |
|----------|-------|
| Railway | `railway up` — auto-detects Dockerfile |
| Render | Connect repo, set env vars, deploy |
| Fly.io | `fly launch` — uses Dockerfile |
| AWS ECS | Use `docker-compose.prod.yml` as task definition base |
| VPS | `docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d` |

---

## Production Checklist

- [ ] `openssl rand -hex 32` for `JWT_SECRET`
- [ ] Encrypt `wa_access_token` at rest (use pgcrypto or app-level AES-256)
- [ ] Set `FRONTEND_URL` to actual domain (fixes CORS in production)
- [ ] PostgreSQL with `sslmode=require`
- [ ] Set up System User for never-expiring tokens
- [ ] Register WhatsApp message templates in Meta Business Manager (see `docs/whatsapp-templates.md`)
- [ ] Configure S3/R2 for media storage
- [ ] Set up token refresh cron (until System User is configured)
- [ ] Monitoring: health check on `/health` from your load balancer
- [ ] Alerting: webhook failure rate (query `onboarding_events` where `status = 'failed'`)
