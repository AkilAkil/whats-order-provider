// OrderPulse API server.
// Entry point: loads config, connects DB, runs migrations, starts HTTP server.
package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"orderpulse/internal/config"
	"orderpulse/internal/db"
	"orderpulse/internal/handlers"
	"orderpulse/internal/middleware"
	"orderpulse/internal/whatsapp"
)

func main() {
	// ── Structured logging ─────────────────────────────────────────────────────
	// JSON in production for log aggregation tools (Datadog, CloudWatch, etc.)
	// Text in development for readability
	cfg := config.Load()
	if cfg.IsProd() {
		slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
			Level: slog.LevelInfo,
		})))
	}

	// ── Database ───────────────────────────────────────────────────────────────
	pool, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		slog.Error("database connection failed", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	// Run migrations at startup — idempotent, safe to run on every deploy
	ctx := context.Background()
	if err := db.RunMigrations(ctx, pool); err != nil {
		slog.Error("migrations failed", "err", err)
		os.Exit(1)
	}

	// ── Handlers ───────────────────────────────────────────────────────────────
	authHandler       := handlers.NewAuthHandler(pool, cfg.JWTSecret, cfg.JWTExpiryHours)
	onboardingHandler := handlers.NewOnboardingHandler(pool, cfg.JWTSecret, cfg.JWTExpiryHours, cfg.MetaAppID, cfg.MetaAppSecret)
	inboxHandler      := handlers.NewInboxHandler(pool)
	orderHandler      := handlers.NewOrderHandler(pool)
	statsHandler      := handlers.NewStatsHandler(pool)
	webhookHandler    := whatsapp.NewWebhookHandler(pool, cfg.WAWebhookVerifyToken, cfg.LLMAPIKey)

	// ── Router ─────────────────────────────────────────────────────────────────
	r := chi.NewRouter()

	// ── Global middleware ──────────────────────────────────────────────────────
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(middleware.RequestLogger)
	r.Use(chimw.Recoverer)
	r.Use(chimw.Timeout(30 * time.Second))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.AllowedOrigins(),
		AllowedMethods:   []string{"GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type", "X-Request-ID"},
		ExposedHeaders:   []string{"Link", "X-Request-ID"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// ── Health ─────────────────────────────────────────────────────────────────
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		// Also ping the DB so load balancers get a real health signal
		if err := pool.Ping(r.Context()); err != nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			w.Write([]byte(`{"status":"unhealthy","db":"unreachable"}`))
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	// ── WhatsApp Webhook (public — called by Meta's servers, not the frontend) ──
	//
	// ONE URL serves ALL tenants. Routing is done inside the handler by matching
	// the destination phone number to tenants.whatsapp_number.
	//
	// Set this URL ONCE in Meta App Dashboard:
	//   WhatsApp → Configuration → Webhook → Callback URL
	//
	// New clients get their WABA auto-subscribed during onboarding — no manual
	// Meta dashboard action required per client, ever.
	r.Get("/webhook/whatsapp", webhookHandler.Verify)
	r.Post("/webhook/whatsapp", webhookHandler.Receive)

	// ── Public Auth ────────────────────────────────────────────────────────────
	r.Post("/api/auth/login", authHandler.Login)

	// ── Onboarding (public signup + JWT-gated WABA connection) ────────────────
	//
	// Public:
	//   POST /api/onboarding/signup      → minimal form, returns JWT immediately
	//
	// JWT-gated (must have token from signup, works before onboarding_status = active):
	//   POST /api/onboarding/whatsapp/callback  { code }  → full automated WABA setup
	//   GET  /api/onboarding/status             → current onboarding state + audit trail
	//   DELETE /api/onboarding/whatsapp         → disconnect + unsubscribe webhook
	r.Post("/api/onboarding/signup", onboardingHandler.Signup)

	r.Group(func(r chi.Router) {
		r.Use(middleware.Authenticate(cfg.JWTSecret))
		r.Post("/api/onboarding/whatsapp/callback", onboardingHandler.WACallback)
		r.Get("/api/onboarding/status", onboardingHandler.GetStatus)
		r.Delete("/api/onboarding/whatsapp", onboardingHandler.Disconnect)
	})

	// ── Dashboard API (JWT + onboarding_status = active) ──────────────────────
	//
	// All routes below:
	//  1. Require a valid JWT (Authenticate middleware)
	//  2. Require the tenant's WhatsApp to be connected (RequireOnboardingComplete)
	//  3. Are automatically scoped to the tenant from the JWT — never from params
	r.Route("/api", func(r chi.Router) {
		r.Use(middleware.Authenticate(cfg.JWTSecret))
		r.Use(middleware.RequireOnboardingComplete(pool))

		// ── Stats ─────────────────────────────────────────────────────────────
		r.Get("/stats", statsHandler.Get)

		// ── Inbox ─────────────────────────────────────────────────────────────
		r.Get("/inbox", inboxHandler.ListThreads)
		r.Get("/inbox/{contactId}/messages", inboxHandler.GetMessages)
		r.Post("/inbox/{contactId}/reply", inboxHandler.Reply)
		r.Patch("/inbox/{contactId}/tag", inboxHandler.TagChat)

		// ── Orders ────────────────────────────────────────────────────────────
		r.Get("/orders", orderHandler.List)
		r.Post("/orders", orderHandler.Create)
		r.Get("/orders/{id}", orderHandler.Get)
		r.Patch("/orders/{id}/status", orderHandler.UpdateStatus)
		r.Post("/orders/{id}/cancel", orderHandler.Cancel)
		r.Post("/orders/{id}/upi-link", orderHandler.SendUPILink)
		r.Patch("/orders/{id}/payment", orderHandler.ConfirmPayment)
	})

	// ── HTTP Server ─────────────────────────────────────────────────────────────
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start in goroutine so shutdown signal handling works below
	go func() {
		slog.Info("OrderPulse API starting", "port", cfg.Port, "env", cfg.Env)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "err", err)
			os.Exit(1)
		}
	}()

	// ── Graceful Shutdown ──────────────────────────────────────────────────────
	// Wait for SIGINT or SIGTERM (sent by Docker/Kubernetes on deploy/restart)
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit

	slog.Info("shutdown signal received — draining connections", "signal", sig.String())
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("forced shutdown", "err", err)
		os.Exit(1)
	}
	slog.Info("server stopped cleanly")
}
