# ════════════════════════════════════════════════════════════
#  OrderPulse — Railway Dockerfile
#  Build context = repo root. Go source is in orderpulse-deploy/
# ════════════════════════════════════════════════════════════

FROM golang:1.22-alpine AS builder

RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /build

ENV GONOSUMDB=*
ENV GOPROXY=https://proxy.golang.org,direct

# Copy go.mod only — go.sum is regenerated fresh
COPY orderpulse-deploy/go.mod ./

# Tidy resolves deps + writes go.sum in one step
RUN go mod tidy

# Copy full source AFTER tidy so the generated go.sum is preserved
COPY orderpulse-deploy/ .

# Build — verbose flag so Railway shows the actual compiler error if it fails
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -v \
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
