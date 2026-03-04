FROM golang:1.22-alpine AS builder

RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /build

# GONOSUMDB=* — skip checksum verification
# GOFLAGS=-mod=mod — let go build resolve and download missing modules on the fly
# No go mod tidy needed — go build handles everything with these flags
ENV GONOSUMDB=*
ENV GOFLAGS=-mod=mod
ENV GOPROXY=https://proxy.golang.org,direct

COPY orderpulse-deploy/go.mod ./
COPY orderpulse-deploy/ .

# go build with -mod=mod downloads all deps automatically — no separate tidy step
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -v \
    -ldflags="-w -s -extldflags '-static'" \
    -trimpath \
    -o /orderpulse \
    ./cmd/api

FROM alpine:3.19
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=builder /orderpulse /app/orderpulse
ENV PORT=8080
ENV ENV=production
EXPOSE 8080
ENTRYPOINT ["/app/orderpulse"]
