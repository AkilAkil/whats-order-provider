// Package config loads and validates all runtime configuration from environment variables.
package config

import (
	"log/slog"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port        string
	Env         string
	FrontendURL string

	DatabaseURL string

	JWTSecret      string
	JWTExpiryHours int

	// Meta / WhatsApp — required for WABA features but not for the server to boot.
	// Warn on missing rather than crashing so Railway health checks can pass first.
	MetaAppID            string
	MetaAppSecret        string
	MetaConfigID         string // Embedded Signup configuration ID
	WAWebhookVerifyToken string

	// LLM for order extraction (optional)
	LLMAPIKey string

	// Storage (optional)
	StorageBucket    string
	StorageRegion    string
	StorageAccessKey string
	StorageSecretKey string
	StorageEndpoint  string
}

func Load() *Config {
	// Load .env if present (local dev). On Railway, vars come from the dashboard.
	if err := godotenv.Load(); err != nil {
		slog.Info("no .env file — reading from environment")
	}

	cfg := &Config{
		// Railway injects PORT — default 8080 as fallback
		Port:        getEnv("PORT", "8080"),
		Env:         getEnv("ENV", "production"),
		FrontendURL: getEnv("FRONTEND_URL", "*"),

		DatabaseURL: mustGetEnv("DATABASE_URL"),

		JWTSecret:      mustGetEnv("JWT_SECRET"),
		JWTExpiryHours: intEnv("JWT_EXPIRY_HOURS", 72),

		// These are needed for WhatsApp features but not to start the HTTP server.
		// Log a warning so it's visible in Railway logs, but don't crash.
		MetaAppID:            getEnv("META_APP_ID", ""),
		MetaConfigID:         getEnv("META_CONFIG_ID", ""),
		MetaAppSecret:        getEnv("META_APP_SECRET", ""),
		WAWebhookVerifyToken: getEnv("WA_WEBHOOK_VERIFY_TOKEN", "changeme"),

		LLMAPIKey: getEnv("LLM_API_KEY", ""),

		StorageBucket:    getEnv("STORAGE_BUCKET", ""),
		StorageRegion:    getEnv("STORAGE_REGION", "ap-south-1"),
		StorageAccessKey: getEnv("STORAGE_ACCESS_KEY", ""),
		StorageSecretKey: getEnv("STORAGE_SECRET_KEY", ""),
		StorageEndpoint:  getEnv("STORAGE_ENDPOINT", ""),
	}

	cfg.validate()
	return cfg
}

func (c *Config) IsProd() bool {
	return strings.EqualFold(c.Env, "production")
}

func (c *Config) AllowedOrigins() []string {
	if c.FrontendURL == "*" {
		return []string{"*"}
	}
	if c.IsProd() {
		return []string{c.FrontendURL}
	}
	return []string{c.FrontendURL, "http://localhost:3000", "http://localhost:5173"}
}

func (c *Config) validate() {
	if len(c.JWTSecret) < 32 {
		slog.Error("JWT_SECRET must be at least 32 characters — generate with: openssl rand -hex 32")
		os.Exit(1)
	}

	// Warn about missing Meta config — WABA features won't work but server starts fine
	if c.MetaAppID == "" {
		slog.Warn("META_APP_ID not set — WhatsApp Embedded Signup will not work")
	}
	if c.MetaAppSecret == "" {
		slog.Warn("META_APP_SECRET not set — WhatsApp token exchange will not work")
	}
	if c.WAWebhookVerifyToken == "changeme" {
		slog.Warn("WA_WEBHOOK_VERIFY_TOKEN is using default — set a real value in Railway dashboard")
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
