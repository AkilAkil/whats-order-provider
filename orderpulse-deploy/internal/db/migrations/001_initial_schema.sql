-- ============================================================
-- OrderPulse — Migration 001: Initial Schema
-- Idempotent: safe to re-run (uses IF NOT EXISTS throughout)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── TENANTS ──────────────────────────────────────────────────────────────────
-- One row per business (client) using OrderPulse.
-- whatsapp_number is the routing key: incoming webhook messages are matched
-- to a tenant by their destination phone number.
CREATE TABLE IF NOT EXISTS tenants (
    id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name     TEXT          NOT NULL,
    -- WhatsApp Cloud API credentials — populated by onboarding pipeline
    whatsapp_number   TEXT          NOT NULL DEFAULT '',  -- E.164 e.g. +919876543210
    wa_phone_id       TEXT          NOT NULL DEFAULT '',  -- Meta phone_number_id
    wa_access_token   TEXT          NOT NULL DEFAULT '',  -- Long-lived user token
    -- WABA onboarding
    waba_id           TEXT,                               -- Meta WABA ID
    fb_user_token     TEXT,                               -- Stored for token refresh
    onboarding_status TEXT          NOT NULL DEFAULT 'pending'
                        CHECK (onboarding_status IN (
                            'pending','token_exchanged','phone_registered',
                            'webhook_subscribed','active','failed'
                        )),
    onboarding_error  TEXT,                               -- Last error if status = failed
    activated_at      TIMESTAMPTZ,
    -- General
    plan              TEXT          NOT NULL DEFAULT 'starter',
    is_active         BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Fast webhook routing: lookup tenant by incoming phone number
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_whatsapp_number
    ON tenants(whatsapp_number)
    WHERE whatsapp_number != '' AND onboarding_status = 'active';

CREATE INDEX IF NOT EXISTS idx_tenants_waba_id ON tenants(waba_id) WHERE waba_id IS NOT NULL;

-- ─── USERS ────────────────────────────────────────────────────────────────────
-- Dashboard users. Each user belongs to exactly one tenant.
CREATE TABLE IF NOT EXISTS users (
    id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email       TEXT          NOT NULL,
    password    TEXT          NOT NULL,    -- bcrypt hash, never stored in plaintext
    name        TEXT          NOT NULL,
    role        TEXT          NOT NULL DEFAULT 'owner'
                    CHECK (role IN ('owner', 'staff')),
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);

-- ─── ONBOARDING EVENTS ────────────────────────────────────────────────────────
-- Step-by-step audit log for the WABA onboarding pipeline.
-- Every step (success or failure) is recorded here.
-- Operators can query this table to diagnose failed onboardings.
CREATE TABLE IF NOT EXISTS onboarding_events (
    id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    step        TEXT          NOT NULL,    -- token_exchange | waba_discovery | phone_fetch | ...
    status      TEXT          NOT NULL CHECK (status IN ('success','failed')),
    detail      TEXT,                     -- JSON payload or error message
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_events_tenant ON onboarding_events(tenant_id, created_at DESC);

-- ─── CONTACTS ─────────────────────────────────────────────────────────────────
-- Customers who have messaged the business on WhatsApp.
-- UNIQUE (tenant_id, wa_number): same phone number can belong to different tenants.
CREATE TABLE IF NOT EXISTS contacts (
    id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    wa_number   TEXT          NOT NULL,    -- Normalised E.164
    name        TEXT,                      -- From WhatsApp profile; may be null
    order_count INT           NOT NULL DEFAULT 0,
    last_seen   TIMESTAMPTZ,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, wa_number)
);

CREATE INDEX IF NOT EXISTS idx_contacts_tenant   ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_lastseen ON contacts(tenant_id, last_seen DESC);

-- ─── MESSAGES ─────────────────────────────────────────────────────────────────
-- All WhatsApp messages, both inbound (from customer) and outbound (from dashboard).
-- wa_msg_id is Meta's own message ID, used for idempotency on webhook retries.
CREATE TABLE IF NOT EXISTS messages (
    id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id  UUID          NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    wa_msg_id   TEXT          UNIQUE,      -- Meta message ID; NULL for outbound
    direction   TEXT          NOT NULL CHECK (direction IN ('inbound','outbound')),
    type        TEXT          NOT NULL CHECK (type IN ('text','image','audio','document','template','sticker')),
    body        TEXT,
    media_url   TEXT,
    is_tagged   BOOLEAN       NOT NULL DEFAULT FALSE,  -- Flagged as order-related
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_tenant  ON messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_contact ON messages(contact_id, created_at DESC);

-- ─── ORDERS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id      UUID            NOT NULL REFERENCES contacts(id),
    order_number    TEXT            NOT NULL,
    status          TEXT            NOT NULL DEFAULT 'new'
                        CHECK (status IN ('new','confirmed','packed','dispatched','delivered','cancelled')),
    payment_status  TEXT            NOT NULL DEFAULT 'pending'
                        CHECK (payment_status IN ('pending','paid','failed')),
    payment_method  TEXT            CHECK (payment_method IN ('upi','cod','bank')),
    total_amount    NUMERIC(12,2)   NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    notes           TEXT,
    source_msg_id   UUID            REFERENCES messages(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, order_number)
);

CREATE INDEX IF NOT EXISTS idx_orders_tenant        ON orders(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_contact       ON orders(contact_id);
CREATE INDEX IF NOT EXISTS idx_orders_status        ON orders(tenant_id, status) WHERE status != 'cancelled';
CREATE INDEX IF NOT EXISTS idx_orders_payment       ON orders(tenant_id, payment_status) WHERE payment_status = 'pending';

-- ─── ORDER ITEMS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
    id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id    UUID            NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    name        TEXT            NOT NULL,
    qty         INT             NOT NULL DEFAULT 1 CHECK (qty > 0),
    unit_price  NUMERIC(12,2)   NOT NULL DEFAULT 0 CHECK (unit_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- ─── TRANSACTIONS ─────────────────────────────────────────────────────────────
-- Payment records. Multiple transactions can exist per order (partial payments,
-- refunds — though refunds are not yet implemented).
CREATE TABLE IF NOT EXISTS transactions (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id        UUID            NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount          NUMERIC(12,2)   NOT NULL CHECK (amount >= 0),
    method          TEXT            NOT NULL CHECK (method IN ('upi','cod','bank')),
    transaction_ref TEXT,           -- UPI transaction ID or bank reference
    screenshot_url  TEXT,           -- URL of payment screenshot in S3/R2
    is_verified     BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_order  ON transactions(order_id);

-- ─── TRIGGERS ────────────────────────────────────────────────────────────────
-- Auto-update updated_at on tenants and orders.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_tenants_updated_at') THEN
        CREATE TRIGGER trg_tenants_updated_at
            BEFORE UPDATE ON tenants
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_orders_updated_at') THEN
        CREATE TRIGGER trg_orders_updated_at
            BEFORE UPDATE ON orders
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END; $$;
