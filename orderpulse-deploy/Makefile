# ══════════════════════════════════════════════════════════════
#  OrderPulse — Makefile
#  Run `make help` to see all available commands
# ══════════════════════════════════════════════════════════════

.PHONY: help run build test lint tidy \
        docker-up docker-down docker-build docker-logs \
        migrate seed tunnel

BINARY_NAME := orderpulse
BUILD_DIR   := ./bin
MAIN_PKG    := ./cmd/api

# ── Help ───────────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "  OrderPulse — available commands"
	@echo ""
	@echo "  Development"
	@echo "    make run          Start API server locally (needs .env + Postgres)"
	@echo "    make build        Compile binary to ./bin/orderpulse"
	@echo "    make test         Run all tests"
	@echo "    make lint         Run golangci-lint"
	@echo "    make tidy         Tidy go modules"
	@echo ""
	@echo "  Docker"
	@echo "    make docker-up    Start Postgres + API with Docker Compose"
	@echo "    make docker-down  Stop all Docker Compose services"
	@echo "    make docker-build Rebuild the API Docker image"
	@echo "    make docker-logs  Tail API container logs"
	@echo ""
	@echo "  Database"
	@echo "    make migrate      Apply SQL migrations against DATABASE_URL"
	@echo "    make seed         Insert a dev tenant + user for local testing"
	@echo ""
	@echo "  Webhook"
	@echo "    make tunnel       Expose local port 8080 to internet via ngrok"
	@echo "                      (needed to register the webhook URL with Meta)"
	@echo ""

# ── Development ────────────────────────────────────────────────────────────────
run:
	@go run $(MAIN_PKG)

build:
	@mkdir -p $(BUILD_DIR)
	CGO_ENABLED=0 go build -ldflags="-w -s" -trimpath -o $(BUILD_DIR)/$(BINARY_NAME) $(MAIN_PKG)
	@echo "✓ built $(BUILD_DIR)/$(BINARY_NAME)"

test:
	@go test ./... -v -race -count=1

lint:
	@golangci-lint run ./...

tidy:
	@go mod tidy
	@echo "✓ go modules tidied"

# ── Docker ─────────────────────────────────────────────────────────────────────
docker-up:
	docker-compose up --build

docker-up-detach:
	docker-compose up --build -d

docker-down:
	docker-compose down

docker-build:
	docker build -t orderpulse:latest .

docker-logs:
	docker-compose logs -f api

# ── Database ───────────────────────────────────────────────────────────────────
# Migrations are embedded in the binary and run automatically on startup.
# Use this target only if you want to run them manually against a raw DB.
migrate:
	@set -a && source .env && set +a && \
	psql "$$DATABASE_URL" -f internal/db/migrations/001_initial_schema.sql && \
	echo "✓ migrations applied"

# Inserts a development tenant + owner user.
# Password: "password" (bcrypt hash of this string).
# Use only in development. Never run against production.
seed:
	@set -a && source .env && set +a && \
	psql "$$DATABASE_URL" <<-'SQL'
		INSERT INTO tenants (
			business_name, whatsapp_number, wa_phone_id, wa_access_token,
			onboarding_status, is_active, activated_at
		) VALUES (
			'Priya Kitchen', '+919876543210', 'TEST_PHONE_ID', 'TEST_TOKEN',
			'active', TRUE, NOW()
		) ON CONFLICT DO NOTHING
		RETURNING id;

		-- Password: "password" (bcrypt, cost 10)
		INSERT INTO users (tenant_id, email, password, name, role)
		SELECT id, 'admin@dev.local',
			'$$2a$$10$$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
			'Dev Admin', 'owner'
		FROM tenants WHERE business_name = 'Priya Kitchen'
		ON CONFLICT DO NOTHING;
	SQL
	@echo "✓ seed data inserted (email: admin@dev.local / password: password)"

# ── Webhook tunnel ─────────────────────────────────────────────────────────────
# Expose localhost:8080 to the internet so Meta can deliver webhook events.
# Requires ngrok installed: https://ngrok.com/download
# After running, use the printed HTTPS URL as your Meta webhook callback URL.
tunnel:
	@which ngrok > /dev/null || (echo "ngrok not found. Install from https://ngrok.com" && exit 1)
	ngrok http 8080
