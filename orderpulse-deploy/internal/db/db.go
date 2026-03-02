// Package db manages the PostgreSQL connection pool and runs database migrations.
package db

import (
	"context"
	"embed"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

// init ensures the embed directive is satisfied at compile time.
// The embed path is relative to this file's package directory.

// Connect creates and validates a pgxpool connection pool using the provided
// DATABASE_URL. Tuned for a typical SaaS workload: 20 max conns, 2 min idle.
// Returns an error if the initial ping fails so callers can exit early.
func Connect(databaseURL string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse db config: %w", err)
	}

	// Pool tuning — adjust MaxConns based on your Postgres plan's connection limit.
	cfg.MaxConns = 20
	cfg.MinConns = 2
	cfg.MaxConnLifetime = 1 * time.Hour
	cfg.MaxConnIdleTime = 30 * time.Minute
	cfg.HealthCheckPeriod = 1 * time.Minute
	cfg.ConnConfig.ConnectTimeout = 10 * time.Second

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("create pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping db: %w", err)
	}

	slog.Info("database connected", "maxConns", cfg.MaxConns)
	return pool, nil
}

// RunMigrations executes all SQL migration files embedded in the binary in
// lexicographic order (001_..., 002_..., etc.). It is idempotent — each
// migration uses IF NOT EXISTS / DO NOTHING guards so re-running is safe.
//
// In production this runs at startup before the HTTP server begins accepting
// requests, guaranteeing the schema is always up to date on deploy.
func RunMigrations(ctx context.Context, pool *pgxpool.Pool) error {
	entries, err := migrationsFS.ReadDir("migrations")
	if err != nil {
		return fmt.Errorf("read migrations dir: %w", err)
	}

	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".sql") {
			continue
		}

		content, err := migrationsFS.ReadFile("migrations/" + e.Name())
		if err != nil {
			return fmt.Errorf("read migration %s: %w", e.Name(), err)
		}

		if _, err := pool.Exec(ctx, string(content)); err != nil {
			return fmt.Errorf("execute migration %s: %w", e.Name(), err)
		}

		slog.Info("migration applied", "file", e.Name())
	}

	return nil
}
