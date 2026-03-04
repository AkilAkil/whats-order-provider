# ════════════════════════════════════════════════════════════
#  Stage 1 — Build React frontend
# ════════════════════════════════════════════════════════════
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Install deps (cached layer)
COPY orderpulse-deploy/frontend/package*.json ./
RUN npm install --silent

# Copy source and build
COPY orderpulse-deploy/frontend/ .
RUN npm run build
# Output: /app/dist/

# ════════════════════════════════════════════════════════════
#  Stage 2 — Build Go binary (with frontend embedded)
# ════════════════════════════════════════════════════════════
FROM golang:1.22-alpine AS backend-builder

RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /build

ENV GONOSUMDB=*
ENV GOFLAGS=-mod=mod
ENV GOPROXY=https://proxy.golang.org,direct

COPY orderpulse-deploy/go.mod ./
COPY orderpulse-deploy/ .

# Copy the built frontend into cmd/api/frontend/ so //go:embed picks it up
COPY --from=frontend-builder /app/dist/ ./cmd/api/frontend/

# Compile — the embed directive includes the entire frontend/dist
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build \
    -ldflags="-w -s -extldflags '-static'" \
    -trimpath \
    -o /orderpulse \
    ./cmd/api

# ════════════════════════════════════════════════════════════
#  Stage 3 — Runtime
# ════════════════════════════════════════════════════════════
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app
COPY --from=backend-builder /orderpulse /app/orderpulse

ENV PORT=8080
ENV ENV=production
EXPOSE 8080

ENTRYPOINT ["/app/orderpulse"]
