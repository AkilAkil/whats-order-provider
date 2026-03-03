# ════════════════════════════════════════════════════════════
#  Stage 1 — Build
#  Compiles a fully static binary with no external dependencies
# ════════════════════════════════════════════════════════════
FROM golang:1.21 AS builder

# Install git (needed for go mod download in some modules)
RUN apk add --no-cache git ca-certificates tzdata
RUN cd orderpulse-deploy
# Cache dependency layer separately — only re-downloads when go.mod changes
RUN go mod tidy
WORKDIR /build
RUN pwd
RUN ls
COPY go.mod ./
RUN go mod download

# Copy source and compile
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build \
    -ldflags="-w -s -extldflags '-static'" \
    -trimpath \
    -o /orderpulse \
    ./cmd/api

# ════════════════════════════════════════════════════════════
#  Stage 2 — Runtime
#  Scratch = zero OS, minimal attack surface, ~10MB final image
# ════════════════════════════════════════════════════════════
FROM scratch

# TLS certificates — required for outbound HTTPS to Meta Graph API
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt

# Timezone data — required for time zone aware queries (Asia/Kolkata in stats handler)
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# The compiled binary (includes embedded SQL migrations)
COPY --from=builder /orderpulse /orderpulse

# Run as non-root (uid 65534 = nobody)
USER 65534

EXPOSE 8080

ENTRYPOINT ["/orderpulse"]
