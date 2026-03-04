// OrderPulse API server — serves both the REST API and the React frontend.
package main

import (
	"context"
	"embed"
	"io/fs"
	"log/slog"
	"net/http"
	"os"
	"fmt"
	"os/signal"
	"strings"
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

// frontend embeds the Vite build output.
// The Dockerfile copies the built dist/ into cmd/api/frontend/ before compiling.
//
//go:embed frontend
var frontendFS embed.FS

func main() {
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
	webhookHandler    := whatsapp.NewWebhookHandler(pool, cfg.WAWebhookVerifyToken)

	// ── Router ─────────────────────────────────────────────────────────────────
	r := chi.NewRouter()

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
		if err := pool.Ping(r.Context()); err != nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			w.Write([]byte(`{"status":"unhealthy","db":"unreachable"}`))
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	// ── Public config — frontend fetches this on mount to get Meta App ID/Config ID
	// No VITE_ build args needed — values come from Railway Variables at runtime
	r.Get("/api/config", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"meta_app_id":%q,"meta_config_id":%q}`,
			cfg.MetaAppID, cfg.MetaConfigID)
	})

	// ── WhatsApp Webhook ───────────────────────────────────────────────────────
	r.Get("/webhook/whatsapp", webhookHandler.Verify)
	r.Post("/webhook/whatsapp", webhookHandler.Receive)

	// ── Public Auth ────────────────────────────────────────────────────────────
	r.Post("/api/auth/login", authHandler.Login)

	// ── Onboarding ─────────────────────────────────────────────────────────────
	r.Post("/api/onboarding/signup", onboardingHandler.Signup)
	r.Group(func(r chi.Router) {
		r.Use(middleware.Authenticate(cfg.JWTSecret))
		r.Post("/api/onboarding/whatsapp/callback", onboardingHandler.WACallback)
		r.Get("/api/onboarding/status", onboardingHandler.GetStatus)
		r.Delete("/api/onboarding/whatsapp", onboardingHandler.Disconnect)
	})

	// ── Dashboard API ──────────────────────────────────────────────────────────
	r.Route("/api", func(r chi.Router) {
		r.Use(middleware.Authenticate(cfg.JWTSecret))
		r.Use(middleware.RequireOnboardingComplete(pool))

		r.Get("/stats", statsHandler.Get)

		r.Get("/inbox", inboxHandler.ListThreads)
		r.Get("/inbox/{contactId}/messages", inboxHandler.GetMessages)
		r.Post("/inbox/{contactId}/reply", inboxHandler.Reply)
		r.Patch("/inbox/{contactId}/tag", inboxHandler.TagChat)

		r.Get("/orders", orderHandler.List)
		r.Post("/orders", orderHandler.Create)
		r.Get("/orders/{id}", orderHandler.Get)
		r.Patch("/orders/{id}/status", orderHandler.UpdateStatus)
		r.Post("/orders/{id}/cancel", orderHandler.Cancel)
		r.Post("/orders/{id}/upi-link", orderHandler.SendUPILink)
		r.Patch("/orders/{id}/payment", orderHandler.ConfirmPayment)
	})

	// ── React SPA (catch-all — must be LAST) ──────────────────────────────────
	// Serves the Vite build. All non-API routes return index.html so React
	// Router handles client-side navigation.
	staticFiles, err := fs.Sub(frontendFS, "frontend")
	if err != nil {
		slog.Error("failed to sub frontend FS", "err", err)
		os.Exit(1)
	}
	fileServer := http.FileServer(http.FS(staticFiles))

	r.Get("/*", func(w http.ResponseWriter, r *http.Request) {
		// If the file exists in dist (JS, CSS, assets), serve it directly.
		// Otherwise serve index.html so React Router takes over.
		path := strings.TrimPrefix(r.URL.Path, "/")
		if _, err := staticFiles.Open(path); err == nil && path != "" {
			fileServer.ServeHTTP(w, r)
			return
		}
		// SPA fallback — serve index.html for all unknown paths
		index, err := frontendFS.ReadFile("frontend/index.html")
		if err != nil {
			http.Error(w, "frontend not found", http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write(index)
	})

	// ── HTTP Server ─────────────────────────────────────────────────────────────
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		slog.Info("OrderPulse starting", "port", cfg.Port, "env", cfg.Env)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "err", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	srv.Shutdown(shutdownCtx)
	slog.Info("server stopped cleanly")
}
