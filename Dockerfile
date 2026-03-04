# ════════════════════════════════════════════════════════════
#  Stage 1 — Build React frontend
# ════════════════════════════════════════════════════════════
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Read from Railway environment variables (set in Variables tab, not Build Args)
ARG VITE_META_APP_ID
ARG VITE_META_CONFIG_ID
ENV VITE_META_APP_ID=$VITE_META_APP_ID
ENV VITE_META_CONFIG_ID=$VITE_META_CONFIG_ID

COPY orderpulse-deploy/frontend/package.json ./
RUN npm install --silent

COPY orderpulse-deploy/frontend/ .
RUN npm run build

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

COPY --from=frontend-builder /app/dist/ ./cmd/api/frontend/

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
