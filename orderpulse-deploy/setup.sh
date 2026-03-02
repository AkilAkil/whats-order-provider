#!/usr/bin/env bash
# =============================================================================
#  OrderPulse — Local Setup Script
#  Run once: chmod +x setup.sh && ./setup.sh
# =============================================================================
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()  { echo -e "${GREEN}▶${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC}  $1"; }
err()  { echo -e "${RED}✗${NC}  $1"; exit 1; }
step() { echo -e "\n${BOLD}${CYAN}──── $1 ────${NC}"; }

echo ""
echo -e "${BOLD}📦 OrderPulse — Local Setup${NC}"
echo "Checking requirements and setting up your local environment."
echo ""

# =============================================================================
# 1. CHECK PREREQUISITES
# =============================================================================
step "Checking prerequisites"

check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    err "$1 is not installed. $2"
  fi
  log "$1 ✓"
}

check_cmd docker  "Install from https://docs.docker.com/get-docker/"
check_cmd node    "Install from https://nodejs.org (v18+)"
check_cmd npm     "Comes with Node.js"
check_cmd go      "Install from https://go.dev/dl/ (v1.22+)"

# Check Go version
GO_VER=$(go version | grep -oE 'go[0-9]+\.[0-9]+' | head -1 | tr -d 'go')
GO_MAJOR=$(echo $GO_VER | cut -d. -f1)
GO_MINOR=$(echo $GO_VER | cut -d. -f2)
if [ "$GO_MAJOR" -lt 1 ] || { [ "$GO_MAJOR" -eq 1 ] && [ "$GO_MINOR" -lt 22 ]; }; then
  err "Go 1.22+ required (you have go$GO_VER)"
fi
log "Go $GO_VER ✓"

# Check Node version
NODE_VER=$(node --version | tr -d 'v' | cut -d. -f1)
if [ "$NODE_VER" -lt 18 ]; then
  err "Node.js 18+ required (you have v$NODE_VER)"
fi
log "Node.js v$NODE_VER ✓"

# =============================================================================
# 2. SET UP .ENV FILES
# =============================================================================
step "Setting up environment files"

if [ ! -f ".env" ]; then
  cp .env.example .env
  warn ".env created from .env.example"
  warn "You MUST fill in META_APP_ID and META_APP_SECRET before the WABA flow works."
  warn "Edit .env now, then re-run this script. Or continue for local testing without WhatsApp."
else
  log ".env already exists"
fi

# Generate JWT secret if not set
if grep -q "CHANGE_ME" .env 2>/dev/null; then
  JWT=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | base64 | head -c 64)
  sed -i.bak "s/CHANGE_ME_openssl_rand_hex_32_output_here/$JWT/" .env && rm -f .env.bak
  log "JWT_SECRET auto-generated ✓"
fi

if [ ! -f "frontend/.env.local" ]; then
  cp frontend/.env.example frontend/.env.local
  warn "frontend/.env.local created — fill in VITE_META_APP_ID"
fi

# =============================================================================
# 3. START POSTGRES
# =============================================================================
step "Starting PostgreSQL"

if docker ps | grep -q "orderpulse-postgres"; then
  log "PostgreSQL already running"
else
  docker run -d \
    --name orderpulse-postgres \
    --restart unless-stopped \
    -e POSTGRES_USER=orderpulse \
    -e POSTGRES_PASSWORD=secret \
    -e POSTGRES_DB=orderpulse \
    -p 5432:5432 \
    postgres:16-alpine \
    > /dev/null

  log "PostgreSQL container started"
  echo -n "   Waiting for Postgres to be ready..."
  for i in $(seq 1 30); do
    if docker exec orderpulse-postgres pg_isready -U orderpulse -q 2>/dev/null; then
      echo " ready ✓"
      break
    fi
    echo -n "."
    sleep 1
  done
fi

# =============================================================================
# 4. BUILD + RUN THE GO BACKEND
# =============================================================================
step "Building Go backend"

# Download dependencies
log "Downloading Go modules..."
go mod download

log "Building binary..."
go build -o ./bin/orderpulse ./cmd/api/
log "Backend built ✓"

# Create seed data (dev user + tenant)
log "Seeding development data..."
PGPASSWORD=secret psql -h localhost -U orderpulse -d orderpulse -q -c "
  -- Wait for migrations to run first; they happen on first API start
  SELECT 1;
" 2>/dev/null || true

# =============================================================================
# 5. INSTALL FRONTEND DEPENDENCIES
# =============================================================================
step "Installing frontend dependencies"

cd frontend
npm install --silent
cd ..
log "Frontend dependencies installed ✓"

# =============================================================================
# 6. CREATE START SCRIPTS
# =============================================================================
step "Creating start scripts"

cat > start-backend.sh << 'SCRIPT'
#!/usr/bin/env bash
set -a; source .env; set +a
export DATABASE_URL="postgres://orderpulse:secret@localhost:5432/orderpulse?sslmode=disable"
echo "🚀 Starting OrderPulse backend on :8080"
./bin/orderpulse
SCRIPT
chmod +x start-backend.sh

cat > start-frontend.sh << 'SCRIPT'
#!/usr/bin/env bash
echo "🌐 Starting frontend on http://localhost:3000"
cd frontend && npm run dev
SCRIPT
chmod +x start-frontend.sh

cat > start-all.sh << 'SCRIPT'
#!/usr/bin/env bash
# Starts both backend and frontend in parallel
echo "📦 Starting OrderPulse..."

# Check Postgres is up
if ! docker ps | grep -q orderpulse-postgres; then
  echo "Starting PostgreSQL..."
  docker start orderpulse-postgres
  sleep 2
fi

# Kill any existing processes on our ports
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Start backend in background
./start-backend.sh &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

sleep 2

# Start frontend
./start-frontend.sh &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

echo ""
echo "✅ OrderPulse is running!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8080"
echo "   Health:   http://localhost:8080/health"
echo ""
echo "Press Ctrl+C to stop everything."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" EXIT
wait
SCRIPT
chmod +x start-all.sh

cat > seed.sh << 'SCRIPT'
#!/usr/bin/env bash
# Creates a test tenant and owner user (password: "password")
# Use this after the backend has run once (to apply migrations)
set -e
echo "Seeding development data..."
PGPASSWORD=secret psql -h localhost -U orderpulse -d orderpulse << 'SQL'
INSERT INTO tenants (
  business_name, whatsapp_number, wa_phone_id, wa_access_token,
  onboarding_status, is_active, activated_at
) VALUES (
  'Demo Kitchen', '+910000000000', 'TEST_PHONE_ID', 'TEST_TOKEN',
  'active', TRUE, NOW()
) ON CONFLICT DO NOTHING;

-- Password: "password" (bcrypt hash)
INSERT INTO users (tenant_id, email, password, name, role)
SELECT id,
  'demo@orderpulse.local',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  'Demo Owner', 'owner'
FROM tenants WHERE business_name = 'Demo Kitchen'
ON CONFLICT DO NOTHING;

SELECT 'Seed complete!' as status;
SELECT 'Email: demo@orderpulse.local' as login;
SELECT 'Password: password' as pass;
SQL
SCRIPT
chmod +x seed.sh

# =============================================================================
# 7. DONE
# =============================================================================
echo ""
echo -e "${BOLD}${GREEN}✅ Setup complete!${NC}"
echo ""
echo -e "${BOLD}To start:${NC}"
echo "   ./start-all.sh          Start backend + frontend together"
echo "   ./start-backend.sh      Start backend only (port 8080)"
echo "   ./start-frontend.sh     Start frontend only (port 3000)"
echo ""
echo -e "${BOLD}To create test data:${NC}"
echo "   1. Start the backend first  → ./start-backend.sh"
echo "   2. Run seed                 → ./seed.sh"
echo "   3. Login at http://localhost:3000"
echo "      Email:    demo@orderpulse.local"
echo "      Password: password"
echo ""
echo -e "${BOLD}To test actual WhatsApp:${NC}"
echo "   See DEPLOYMENT.md for ngrok + Meta setup instructions"
echo ""
