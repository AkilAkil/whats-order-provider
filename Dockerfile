# ════════════════════════════════════════════════════════════
#  OrderPulse — Railway Dockerfile
#  Build context = repo root. Go source is in orderpulse-deploy/
#
#  go.sum is generated inside the builder — you don't need to
#  commit it to the repo (it's always regenerated fresh).
# ════════════════════════════════════════════════════════════

FROM golang:1.22-alpine AS builder

RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /build

# Skip checksum DB — lets go resolve modules without a pre-existing go.sum
ENV GONOSUMDB=*
ENV GOPROXY=https://proxy.golang.org,direct

# Copy only go.mod first (no go.sum needed — we generate it here)
COPY orderpulse-deploy/go.mod ./

# Download deps AND generate a fresh go.sum in one step
RUN go mod tidy

# Copy the full source
COPY orderpulse-deploy/ .

# Build static binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build \
    -ldflags="-w -s -extldflags '-static'" \
    -trimpath \
    -o /orderpulse \
    ./cmd/api

# ── Runtime ──────────────────────────────────────────────────
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app
COPY --from=builder /orderpulse /app/orderpulse

ENV PORT=8080
ENV ENV=production
EXPOSE 8080

ENTRYPOINT ["/app/orderpulse"]
