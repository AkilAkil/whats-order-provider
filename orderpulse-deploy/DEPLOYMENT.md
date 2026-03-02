# OrderPulse — Complete Deployment Guide

Everything you need to go from zero to testing real WhatsApp messages.

---

## Part 1 — Local Setup (15 minutes)

### Prerequisites

| Tool | Minimum | Install |
|------|---------|---------|
| Docker | Any | https://docs.docker.com/get-docker/ |
| Go | 1.22+ | https://go.dev/dl/ |
| Node.js | 18+ | https://nodejs.org |
| ngrok | Any | https://ngrok.com/download |

### Step 1 — Clone and setup

```bash
# Download the project
git clone https://github.com/yourname/orderpulse.git
cd orderpulse

# Or if you downloaded the zip, extract and:
cd orderpulse

# Run the setup script (does everything: Postgres, build, install)
chmod +x setup.sh && ./setup.sh
```

### Step 2 — Start the app

```bash
# Terminal 1: Backend (Go API)
./start-backend.sh

# Terminal 2: Frontend (React)
./start-frontend.sh
```

Open http://localhost:3000

### Step 3 — Create a test account

```bash
# Run once after backend has started (applies migrations first)
./seed.sh

# Login credentials:
# Email:    demo@orderpulse.local
# Password: password
```

This creates a pre-activated tenant so you can explore the dashboard immediately
without needing to complete the WhatsApp WABA connection first.

---

## Part 2 — Real WhatsApp Testing (30 minutes)

You need a Meta Developer account to receive and send real WhatsApp messages.
**Meta offers free test phone numbers — you do NOT need a real business number to get started.**

### Step A — Create a Meta Developer App

1. Go to https://developers.facebook.com
2. Click **My Apps → Create App**
3. Select **Business** type
4. Give it a name (e.g. "OrderPulse Dev")
5. Click **Add Product** → find **WhatsApp** → click **Set Up**

You'll land on the WhatsApp Getting Started page. This is your test environment.

### Step B — Get your App credentials

1. **App Settings → Basic** → copy:
   - **App ID** → paste into `.env` as `META_APP_ID`
   - **App Secret** → paste into `.env` as `META_APP_SECRET`

```bash
# .env
META_APP_ID=1234567890
META_APP_SECRET=abcdef1234567890abcdef
```

### Step C — Get your test phone numbers

On the WhatsApp Getting Started page:
- **From number**: Meta gives you a free test number (looks like +1 555 000 xxxx)
- **To number**: Add your own phone number as a recipient (up to 5 numbers, free)

Copy the **Phone Number ID** shown — you'll need it.

> ⚠️ **For real WABA (not test numbers):**  
> The Embedded Signup flow in the app handles this automatically for your clients.  
> For YOUR business testing, you can also set up a WABA through Meta Business Manager and link a real number.

### Step D — Expose your local backend to the internet

Meta's servers need to reach your local machine to deliver webhook events.
ngrok creates a secure tunnel in seconds:

```bash
# In a new terminal
ngrok http 8080

# Output will show:
# Forwarding  https://abc123.ngrok-free.app → http://localhost:8080
```

Copy the `https://abc123.ngrok-free.app` URL.

> **ngrok free tier limitation**: URL changes every restart.  
> For persistent URLs, use ngrok's paid plan or alternatives: LocalTunnel, Cloudflare Tunnel (free).

### Step E — Register the webhook with Meta

1. Meta App Dashboard → **WhatsApp → Configuration → Webhook**
2. Click **Edit**:
   - **Callback URL**: `https://abc123.ngrok-free.app/webhook/whatsapp`
   - **Verify Token**: any string you choose, e.g. `mysecrettoken123`
3. Click **Verify and Save** — Meta will call your endpoint to verify it

Update your `.env`:
```bash
WA_WEBHOOK_VERIFY_TOKEN=mysecrettoken123
```

4. Under **Webhook fields**, click **Subscribe** next to **messages**

### Step F — Seed real WABA credentials

For test number testing (before Embedded Signup), manually set your WABA details:

```bash
# Run this after ./seed.sh
PGPASSWORD=secret psql -h localhost -U orderpulse -d orderpulse << 'SQL'
UPDATE tenants SET
  waba_id = 'YOUR_WABA_ID',           -- from Meta Dashboard → WhatsApp → Getting Started
  wa_phone_id = 'YOUR_PHONE_NUMBER_ID', -- shown on Getting Started page
  wa_access_token = 'YOUR_ACCESS_TOKEN', -- Temporary access token from Getting Started page
  whatsapp_number = '+15550001234'    -- The test from number shown in Meta Dashboard
WHERE business_name = 'Demo Kitchen';
SQL
```

Where to find these values in Meta Dashboard:
- **WABA ID**: WhatsApp → Getting Started → you'll see it listed
- **Phone Number ID**: Right below the from-number on Getting Started
- **Temporary Access Token**: Green "Generate access token" button — valid 24 hours for testing

### Step G — Send a test message

In Meta Dashboard → WhatsApp → Getting Started:
1. Select your number as recipient
2. Click **Send Message**
3. You should see it appear in OrderPulse's Inbox at http://localhost:3000

### Step H — Set up Embedded Signup (for client WABA connections)

This is the flow where your clients click "Connect WhatsApp" and it auto-configures everything.

1. Meta App Dashboard → **WhatsApp → Embedded Signup**
2. Turn on **Embedded Signup**
3. Click **Create configuration** → fill in basic details
4. Under **Allowed Domains**, add `http://localhost:3000`
5. Copy the **Configuration ID** → paste into `frontend/.env.local`:

```bash
# frontend/.env.local
VITE_META_APP_ID=1234567890
VITE_META_CONFIG_ID=your_config_id_here
```

Now the "Connect WhatsApp" button in the app will open the real Meta popup!

---

## Part 3 — Diagnosing Issues

### Webhook not receiving messages

```bash
# Check the ngrok inspector (shows all requests Meta sent)
http://localhost:4040

# Check backend logs for webhook events
./start-backend.sh 2>&1 | grep -i webhook

# Test webhook manually
curl -X GET "http://localhost:8080/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test"
# Should return: test
```

### WABA connection fails

```bash
# Check onboarding_events table
PGPASSWORD=secret psql -h localhost -U orderpulse -d orderpulse \
  -c "SELECT step, status, detail, created_at FROM onboarding_events ORDER BY created_at DESC LIMIT 20;"

# Common issues:
# token_exchange failed  → Code expired (>5 mins) or wrong APP_ID/APP_SECRET
# waba_discovery failed  → User didn't select a WABA in the popup
# webhook_subscribe failed → Token doesn't have whatsapp_business_management permission
```

### Frontend can't reach backend

```bash
# Check if backend is running
curl http://localhost:8080/health
# Should return: {"status":"ok"}

# Check Vite proxy config in frontend/vite.config.js
# /api → http://localhost:8080 should be there
```

### Database issues

```bash
# Check if Postgres is running
docker ps | grep orderpulse-postgres

# Connect and inspect
PGPASSWORD=secret psql -h localhost -U orderpulse -d orderpulse

# Check tables were created
\dt

# Check tenants
SELECT id, business_name, onboarding_status, whatsapp_number FROM tenants;

# Check users
SELECT id, email, tenant_id FROM users;
```

---

## Part 4 — Production Deployment

### Option A — Railway (easiest, 5 minutes)

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

Add environment variables in Railway dashboard. It auto-detects the Dockerfile.

### Option B — Render

1. Connect your GitHub repo
2. New Web Service → select repo
3. Runtime: Docker
4. Add all env vars from `.env.example`
5. Add a PostgreSQL database from the Render dashboard
6. Set `DATABASE_URL` to the Render PostgreSQL connection string

### Option C — VPS (Ubuntu/Debian)

```bash
# On your server
sudo apt update && sudo apt install -y docker.io docker-compose-plugin git

git clone https://github.com/yourname/orderpulse.git
cd orderpulse

cp .env.example .env
# Edit .env with your production values

docker compose up -d

# Check logs
docker compose logs -f api
```

### Frontend for production

```bash
cd frontend
npm run build
# Serves dist/ folder via any static host (Vercel, Netlify, Nginx, etc.)
```

Or add a Nginx container to docker-compose.yml to serve the built frontend.

---

## Quick Reference

```bash
# First time
./setup.sh               # Install everything
./start-backend.sh       # Start API (port 8080)
./seed.sh                # Create test account

# Daily dev
./start-all.sh           # Start everything at once

# Test credentials (after seed.sh)
# http://localhost:3000
# Email:    demo@orderpulse.local
# Password: password

# Test webhook locally
ngrok http 8080          # Get public URL for Meta webhook

# Reset everything
docker rm -f orderpulse-postgres
./setup.sh               # Re-run setup
```
