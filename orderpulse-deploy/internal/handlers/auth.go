package handlers

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
	"orderpulse/internal/auth"
	"orderpulse/internal/models"
)

// AuthHandler handles user authentication.
type AuthHandler struct {
	db          *pgxpool.Pool
	jwtSecret   string
	jwtExpHours int
}

// NewAuthHandler returns a new AuthHandler.
func NewAuthHandler(db *pgxpool.Pool, jwtSecret string, jwtExpHours int) *AuthHandler {
	return &AuthHandler{db: db, jwtSecret: jwtSecret, jwtExpHours: jwtExpHours}
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginResponse struct {
	Token            string            `json:"token"`
	User             models.User       `json:"user"`
	Tenant           models.Tenant     `json:"tenant"`
	OnboardingStatus string            `json:"onboarding_status"`
}

// Login authenticates a user and returns a JWT that embeds tenant_id.
// The frontend stores this JWT and sends it as Bearer on every subsequent request.
// Returns the same "invalid credentials" error for both wrong email and wrong
// password to prevent user enumeration attacks.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "email and password are required", "validation_error")
		return
	}

	var user models.User
	var tenant models.Tenant
	var hashedPassword string

	err := h.db.QueryRow(r.Context(), `
		SELECT
			u.id, u.tenant_id, u.email, u.password, u.name, u.role, u.created_at,
			t.id, t.business_name, t.whatsapp_number, t.plan,
			t.onboarding_status, t.is_active, t.created_at, t.updated_at
		FROM users u
		JOIN tenants t ON t.id = u.tenant_id
		WHERE u.email = $1
	`, req.Email).Scan(
		&user.ID, &user.TenantID, &user.Email, &hashedPassword,
		&user.Name, &user.Role, &user.CreatedAt,
		&tenant.ID, &tenant.BusinessName, &tenant.WhatsappNumber,
		&tenant.Plan, &tenant.OnboardingStatus, &tenant.IsActive,
		&tenant.CreatedAt, &tenant.UpdatedAt,
	)
	if err != nil {
		// Same error message regardless of whether email exists — prevents enumeration
		writeError(w, http.StatusUnauthorized, "invalid credentials", "auth_failed")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(req.Password)); err != nil {
		writeError(w, http.StatusUnauthorized, "invalid credentials", "auth_failed")
		return
	}

	token, err := auth.GenerateToken(
		user.ID, user.TenantID, user.Email, user.Role,
		h.jwtSecret, h.jwtExpHours,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate token", "server_error")
		return
	}

	writeJSON(w, http.StatusOK, loginResponse{
		Token:            token,
		User:             user,
		Tenant:           tenant,
		OnboardingStatus: string(tenant.OnboardingStatus),
	})
}
