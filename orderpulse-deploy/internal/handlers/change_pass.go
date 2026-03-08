package handlers

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
	"orderpulse/internal/middleware"
)

type ChangePasswordHandler struct{ db *pgxpool.Pool }

func NewChangePasswordHandler(db *pgxpool.Pool) *ChangePasswordHandler {
	return &ChangePasswordHandler{db: db}
}

func (h *ChangePasswordHandler) Change(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromCtx(r.Context())
	var req struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body", "bad_request")
		return
	}
	if len(req.NewPassword) < 8 {
		writeError(w, http.StatusBadRequest, "new password must be at least 8 characters", "too_short")
		return
	}
	var userID, hash string
	err := h.db.QueryRow(r.Context(),
		`SELECT u.id, u.password FROM users u WHERE u.tenant_id = $1 LIMIT 1`,
		tenantID).Scan(&userID, &hash)
	if err != nil {
		writeError(w, http.StatusNotFound, "user not found", "not_found")
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.CurrentPassword)) != nil {
		writeError(w, http.StatusUnauthorized, "current password is incorrect", "wrong_password")
		return
	}
	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), 12)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to hash password", "server_error")
		return
	}
	if _, err := h.db.Exec(r.Context(),
		`UPDATE users SET password = $1 WHERE id = $2`, string(newHash), userID); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update password", "server_error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
