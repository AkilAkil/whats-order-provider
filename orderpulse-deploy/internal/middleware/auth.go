// Package middleware provides HTTP middleware for the OrderPulse API.
package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"orderpulse/internal/auth"
)

type contextKey string

const (
	keyTenantID contextKey = "tenant_id"
	keyUserID   contextKey = "user_id"
	keyEmail    contextKey = "email"
	keyRole     contextKey = "role"
)

// Authenticate validates the Bearer JWT from the Authorization header and
// injects tenant_id, user_id, email, and role into the request context.
//
// ALL downstream handlers must call TenantIDFromCtx(ctx) to scope DB queries.
// The tenant scope ALWAYS comes from the verified token — never from request params.
func Authenticate(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if header == "" {
				writeErr(w, http.StatusUnauthorized, "missing authorization header", "auth_required")
				return
			}
			parts := strings.SplitN(header, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
				writeErr(w, http.StatusUnauthorized, "authorization header must be: Bearer <token>", "auth_invalid")
				return
			}
			claims, err := auth.ValidateToken(parts[1], jwtSecret)
			if err != nil {
				writeErr(w, http.StatusUnauthorized, "token is invalid or expired", "auth_expired")
				return
			}
			ctx := r.Context()
			ctx = context.WithValue(ctx, keyTenantID, claims.TenantID)
			ctx = context.WithValue(ctx, keyUserID, claims.UserID)
			ctx = context.WithValue(ctx, keyEmail, claims.Email)
			ctx = context.WithValue(ctx, keyRole, claims.Role)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireOnboardingComplete blocks access to dashboard routes if the tenant has
// not yet connected their WhatsApp Business Account.
func RequireOnboardingComplete(db *pgxpool.Pool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			tenantID := TenantIDFromCtx(r.Context())
			var status string
			err := db.QueryRow(r.Context(),
				`SELECT onboarding_status FROM tenants WHERE id = $1`, tenantID,
			).Scan(&status)
			if err != nil || status != "active" {
				if status == "" {
					status = "unknown"
				}
				writeErrWithField(w, http.StatusForbidden,
					"WhatsApp Business Account not connected — complete onboarding first",
					"waba_not_connected",
					"onboarding_status", status,
				)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// RequireRole restricts a route to users with a specific role.
func RequireRole(role string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if RoleFromCtx(r.Context()) != role {
				writeErr(w, http.StatusForbidden, "insufficient permissions", "forbidden")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// ─── CONTEXT ACCESSORS ────────────────────────────────────────────────────────

func TenantIDFromCtx(ctx context.Context) uuid.UUID {
	id, _ := ctx.Value(keyTenantID).(uuid.UUID)
	return id
}

func UserIDFromCtx(ctx context.Context) uuid.UUID {
	id, _ := ctx.Value(keyUserID).(uuid.UUID)
	return id
}

func RoleFromCtx(ctx context.Context) string {
	r, _ := ctx.Value(keyRole).(string)
	return r
}

// ─── INTERNAL ─────────────────────────────────────────────────────────────────

func writeErr(w http.ResponseWriter, status int, msg, code string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	w.Write([]byte(`{"error":"` + msg + `","code":"` + code + `"}`))
}

func writeErrWithField(w http.ResponseWriter, status int, msg, code, field, value string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	w.Write([]byte(`{"error":"` + msg + `","code":"` + code + `","` + field + `":"` + value + `"}`))
}
