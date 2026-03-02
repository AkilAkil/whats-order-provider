// Package config loads and validates all runtime configuration from environment variables.
// The application calls config.Load() once at startup. Any missing mandatory variable
// causes an immediate fatal log so misconfigured deployments fail fast.
package config

import (
	"log/slog"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

// Config is the single source of truth for all runtime configuration.
// It is populated once at startup from environment variables and then
// passed (by pointer) into every subsystem that needs it.
type Config struct {
	// ── Server ──────────────────────────────────────────────────────────────
	Port        string
	Env         string // "development" | "production"
	FrontendURL string // Used in CORS AllowedOrigins

	// ── Database ────────────────────────────────────────────────────────────
	DatabaseURL string

	// ── Auth ────────────────────────────────────────────────────────────────
	JWTSecret      string
	JWTExpiryHours int

	// ── Meta / WhatsApp ─────────────────────────────────────────────────────
	// MetaAppID and MetaAppSecret belong to YOUR application registered at
	// developers.facebook.com. Every client connects their own WhatsApp
	// Business Account (WABA) to your app via Embedded Signup.
	// These never change per-client; per-client tokens live in the tenants table.
	MetaAppID     string
	MetaAppSecret string

	// WAWebhookVerifyToken is the shared secret you set in the Meta App Dashboard
	// under WhatsApp → Configuration → Webhook → Verify Token.
	// It is set ONCE for your app and never changes between tenants.
	WAWebhookVerifyToken string

	// ── Storage (S3-compatible) ──────────────────────────────────────────────
	StorageBucket    string
	StorageRegion    string
	StorageAccessKey string
	StorageSecretKey string
	StorageEndpoint  string // empty = AWS; set for Cloudflare R2, MinIO, etc.
}

// Load reads .env (if present) then environment variables, validates all mandatory
// fields, and returns a populated *Config. Exits the process on any missing mandatory
// value so deployments fail fast rather than running in a broken state.
func Load() *Config {
	if err := godotenv.Load(); err != nil {
		slog.Info("no .env file found — reading from environment", "err", err)
	}

	expiryHours := intEnv("JWT_EXPIRY_HOURS", 72)

	cfg := &Config{
		Port:        getEnv("PORT", "8080"),
		Env:         getEnv("ENV", "development"),
		FrontendURL: getEnv("FRONTEND_URL", "http://localhost:3000"),

		DatabaseURL: mustGetEnv("DATABASE_URL"),

		JWTSecret:      mustGetEnv("JWT_SECRET"),
		JWTExpiryHours: expiryHours,

		MetaAppID:            mustGetEnv("META_APP_ID"),
		MetaAppSecret:        mustGetEnv("META_APP_SECRET"),
		WAWebhookVerifyToken: mustGetEnv("WA_WEBHOOK_VERIFY_TOKEN"),

		StorageBucket:    getEnv("STORAGE_BUCKET", ""),
		StorageRegion:    getEnv("STORAGE_REGION", "ap-south-1"),
		StorageAccessKey: getEnv("STORAGE_ACCESS_KEY", ""),
		StorageSecretKey: getEnv("STORAGE_SECRET_KEY", ""),
		StorageEndpoint:  getEnv("STORAGE_ENDPOINT", ""),
	}

	cfg.validate()
	return cfg
}

// IsProd returns true when running in production mode.
func (c *Config) IsProd() bool {
	return strings.EqualFold(c.Env, "production")
}

// AllowedOrigins returns the CORS allowed origins based on environment.
func (c *Config) AllowedOrigins() []string {
	if c.IsProd() {
		return []string{c.FrontendURL}
	}
	return []string{c.FrontendURL, "http://localhost:3000", "http://localhost:5173"}
}

// validate performs semantic validation beyond "is it set".
func (c *Config) validate() {
	if len(c.JWTSecret) < 32 {
		slog.Error("JWT_SECRET must be at least 32 characters — generate with: openssl rand -hex 32")
		os.Exit(1)
	}
	if c.IsProd() && c.FrontendURL == "http://localhost:3000" {
		slog.Warn("FRONTEND_URL is still localhost in production — CORS will block your frontend")
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func mustGetEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		slog.Error("required environment variable is not set", "key", key)
		os.Exit(1)
	}
	return v
}

func intEnv(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}
