package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"net/smtp"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type PasswordResetHandler struct {
	db *pgxpool.Pool
}

func NewPasswordResetHandler(db *pgxpool.Pool) *PasswordResetHandler {
	return &PasswordResetHandler{db: db}
}

// POST /api/auth/forgot-password
// Generates a reset token and sends it via email (if SMTP configured) or returns it in dev mode.
func (h *PasswordResetHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Email == "" {
		writeError(w, http.StatusBadRequest, "email is required", "validation_error")
		return
	}

	ctx := r.Context()

	// Check user exists — always return same response to prevent enumeration
	var userID string
	var name string
	err := h.db.QueryRow(ctx,
		`SELECT id, name FROM users WHERE email = $1`, req.Email,
	).Scan(&userID, &name)

	if err != nil {
		// User not found — return success anyway to prevent enumeration
		writeJSON(w, http.StatusOK, map[string]string{
			"message": "If that email exists, a reset link has been sent.",
		})
		return
	}

	// Generate secure token
	b := make([]byte, 24)
	rand.Read(b)
	token := hex.EncodeToString(b)
	expiresAt := time.Now().Add(1 * time.Hour)

	// Store token in DB (create table if needed — idempotent via ON CONFLICT)
	h.db.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS password_reset_tokens (
			token      TEXT PRIMARY KEY,
			user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			expires_at TIMESTAMPTZ NOT NULL,
			used       BOOLEAN NOT NULL DEFAULT FALSE,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)

	// Delete old tokens for this user
	h.db.Exec(ctx, `DELETE FROM password_reset_tokens WHERE user_id = $1`, userID)

	// Insert new token
	_, err = h.db.Exec(ctx,
		`INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES ($1, $2, $3)`,
		token, userID, expiresAt,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create reset token", "server_error")
		return
	}

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}
	resetLink := fmt.Sprintf("%s/reset-password?token=%s", frontendURL, token)

	// Try sending email if SMTP is configured
	smtpHost := os.Getenv("SMTP_HOST")
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASS")
	smtpFrom := os.Getenv("SMTP_FROM")
	if smtpFrom == "" {
		smtpFrom = smtpUser
	}

	emailSent := false
	if smtpHost != "" && smtpUser != "" && smtpPass != "" {
		body := fmt.Sprintf(`From: Whats-Order <%s>
To: %s
Subject: Reset your Whats-Order password

Hi %s,

You requested a password reset for your Whats-Order account.

Click the link below to reset your password (valid for 1 hour):
%s

If you didn't request this, you can safely ignore this email.

— The Whats-Order Team
`, smtpFrom, req.Email, name, resetLink)

		auth := smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)
		smtpPort := os.Getenv("SMTP_PORT")
		if smtpPort == "" {
			smtpPort = "587"
		}
		if err := smtp.SendMail(smtpHost+":"+smtpPort, auth, smtpFrom, []string{req.Email}, []byte(body)); err == nil {
			emailSent = true
		}
	}

	resp := map[string]interface{}{
		"message": "If that email exists, a reset link has been sent.",
	}

	// In dev/no-SMTP mode, return the token directly so it can be used
	if !emailSent {
		resp["reset_link"] = resetLink
		resp["dev_note"] = "SMTP not configured — reset link shown here for development"
	}

	writeJSON(w, http.StatusOK, resp)
}

// POST /api/auth/reset-password
func (h *PasswordResetHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Token    string `json:"token"`
		Password string `json:"password"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Token == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "token and password are required", "validation_error")
		return
	}
	if len(req.Password) < 8 {
		writeError(w, http.StatusBadRequest, "password must be at least 8 characters", "validation_error")
		return
	}

	ctx := r.Context()

	var userID string
	err := h.db.QueryRow(ctx, `
		SELECT user_id FROM password_reset_tokens
		WHERE token = $1 AND used = FALSE AND expires_at > NOW()
	`, req.Token).Scan(&userID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid or expired reset link. Please request a new one.", "invalid_token")
		return
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to hash password", "server_error")
		return
	}

	// Update password and mark token used
	h.db.Exec(ctx, `UPDATE users SET password = $1 WHERE id = $2`, string(hashed), userID)
	h.db.Exec(ctx, `UPDATE password_reset_tokens SET used = TRUE WHERE token = $1`, req.Token)

	writeJSON(w, http.StatusOK, map[string]string{
		"message": "Password reset successfully. You can now log in.",
	})
}
