# ════════════════════════════════════════════════════════════
#  OrderPulse — Railway-compatible Dockerfile
#  Build context is the REPO ROOT.
#  Go source lives in orderpulse-deploy/ subdirectory.
# ════════════════════════════════════════════════════════════

# ── Stage 1: Build ───────────────────────────────────────────
FROM golang:1.22-alpine AS builder

RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /build

# Cache go modules separately — only re-downloads when go.mod/go.sum change.
# Source is in orderpulse-deploy/ relative to repo root (the build context).
COPY orderpulse-deploy/go.mod  ./
RUN go mod download

# Copy the full Go source
COPY orderpulse-deploy/ .

# Compile a fully static binary. CGO_ENABLED=0 ensures no libc dependency.
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build \
    -ldflags="-w -s -extldflags '-static'" \
    -trimpath \
    -o /orderpulse \
    ./cmd/api

# ── Stage 2: Runtime ─────────────────────────────────────────
# alpine instead of scratch so Railway health checks + logging work cleanly.
# Final image is ~15MB.
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=builder /orderpulse /app/orderpulse

# Railway injects PORT env var at runtime — our app reads it via config.go
ENV PORT=8080
ENV ENV=production

EXPOSE 8080

ENTRYPOINT ["/app/orderpulse"]
