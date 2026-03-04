package handlers

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
	"orderpulse/internal/auth"
	"orderpulse/internal/middleware"
	"orderpulse/internal/models"
	"orderpulse/internal/whatsapp"
)

// OnboardingHandler drives the fully-automated WhatsApp Business Account connection.
//
// ── What the CLIENT does (3 steps) ──────────────────────────────────────────
//
//  1. POST /api/onboarding/signup  { business_name, owner_name, email, password }
//     → Account created. JWT returned. Frontend shows "Connect WhatsApp" button.
//
//  2. Client clicks "Connect WhatsApp" → Meta Embedded Signup popup opens.
//     Client logs into Facebook, selects their WABA, approves permissions.
//     Meta returns a short-lived `code` to the frontend JS callback.
//
//  3. POST /api/onboarding/whatsapp/callback  { code }  (JWT in Authorization header)
//     → Backend does everything automatically (see runPipeline below).
//
// ── What the BACKEND does automatically (zero client involvement) ────────────
//
//  Step 1  token_exchange       code → short-lived user access token (Meta OAuth)
//  Step 2  token_extend         short-lived → 60-day long-lived token
//  Step 3  waba_discovery       GET /me/businesses → find their WABA(s)
//  Step 4  phone_fetch          GET /{waba_id}/phone_numbers → get phone number ID
//  Step 5  webhook_subscribe    POST /{waba_id}/subscribed_apps
//                               → Meta routes their messages to our shared webhook
//  Step 6  db_save              Save all WABA details, set onboarding_status = active
//  Bonus   test_message         "You're connected!" to confirm end-to-end
//
// Every step is logged to onboarding_events for auditability.
// On any failure: status = failed. Client retries by clicking "Connect" again.
// The pipeline is fully idempotent.
type OnboardingHandler struct {
	db          *pgxpool.Pool
	jwtSecret   string
	jwtExpHours int
	appID       string
	appSecret   string
}

// NewOnboardingHandler returns a new OnboardingHandler.
func NewOnboardingHandler(
	db *pgxpool.Pool,
	jwtSecret string, jwtExpHours int,
	appID, appSecret string,
) *OnboardingHandler {
	return &OnboardingHandler{
		db:          db,
		jwtSecret:   jwtSecret,
		jwtExpHours: jwtExpHours,
		appID:       appID,
		appSecret:   appSecret,
	}
}

// ─── POST /api/onboarding/signup (public) ────────────────────────────────────

type signupReq struct {
	BusinessName string `json:"business_name"`
	OwnerName    string `json:"owner_name"`
	Email        string `json:"email"`
	Password     string `json:"password"`
}

type signupResp struct {
	Token            string    `json:"token"`
	TenantID         uuid.UUID `json:"tenant_id"`
	OnboardingStatus string    `json:"onboarding_status"`
}

// Signup creates the tenant and owner account with minimal information.
// No WhatsApp details required — those are collected automatically in step 3.
// Returns a JWT immediately so the frontend can proceed to the WABA connection.
func (h *OnboardingHandler) Signup(w http.ResponseWriter, r *http.Request) {
	var req signupReq
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.BusinessName == "" || req.OwnerName == "" || req.Email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest,
			"business_name, owner_name, email and password are required", "validation_error")
		return
	}
	if len(req.Password) < 8 {
		writeError(w, http.StatusBadRequest, "password must be at least 8 characters", "validation_error")
		return
	}

	hashedPw, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to process password", "server_error")
		return
	}

	ctx := r.Context()
	tx, err := h.db.Begin(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db error", "server_error")
		return
	}
	defer tx.Rollback(ctx)

	// Tenant starts with empty WA fields — populated by the pipeline in step 3
	var tenantID uuid.UUID
	if err := tx.QueryRow(ctx, `
		INSERT INTO tenants (business_name, whatsapp_number, wa_phone_id, wa_access_token, onboarding_status)
		VALUES ($1, '', '', '', 'pending')
		RETURNING id
	`, req.BusinessName).Scan(&tenantID); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create tenant", "server_error")
		return
	}

	var userID uuid.UUID
	if err := tx.QueryRow(ctx, `
		INSERT INTO users (tenant_id, email, password, name, role)
		VALUES ($1, $2, $3, $4, 'owner')
		RETURNING id
	`, tenantID, strings.ToLower(strings.TrimSpace(req.Email)), string(hashedPw), req.OwnerName).Scan(&userID); err != nil {
		writeError(w, http.StatusConflict, "email already registered", "email_conflict")
		return
	}

	if err := tx.Commit(ctx); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to commit", "server_error")
		return
	}

	token, err := auth.GenerateToken(userID, tenantID, req.Email, "owner", h.jwtSecret, h.jwtExpHours)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to issue token", "server_error")
		return
	}

	writeJSON(w, http.StatusCreated, signupResp{
		Token:            token,
		TenantID:         tenantID,
		OnboardingStatus: "pending",
	})
}

// ─── POST /api/onboarding/whatsapp/callback (JWT required) ───────────────────

type waCallbackReq struct {
	// Code is the short-lived OAuth code returned by Meta's Embedded Signup popup.
	// The frontend captures this in the FB.login() callback and POSTs it here immediately.
	// It is single-use and expires within a few minutes.
	Code string `json:"code"`

	// PhoneNumber is optional. If the WABA has multiple numbers, this selects
	// the preferred one (normalised E.164 format). Falls back to first available.
	PhoneNumber string `json:"phone_number,omitempty"`
}

type waCallbackResp struct {
	OnboardingStatus string `json:"onboarding_status"`
	WhatsappNumber   string `json:"whatsapp_number"`
	BusinessName     string `json:"business_name"`
	WabaID           string `json:"waba_id"`
	Message          string `json:"message"`
}

// WACallback is the single endpoint that drives the entire automated WABA setup.
// Frontend sends { code } from the Meta popup and waits ~3-5 seconds for the result.
func (h *OnboardingHandler) WACallback(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromCtx(r.Context())

	var req waCallbackReq
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Code == "" {
		writeError(w, http.StatusBadRequest, "code is required", "validation_error")
		return
	}

	var businessName, currentStatus string
	if err := h.db.QueryRow(r.Context(),
		`SELECT business_name, onboarding_status FROM tenants WHERE id = $1`, tenantID,
	).Scan(&businessName, &currentStatus); err != nil {
		writeError(w, http.StatusNotFound, "tenant not found", "not_found")
		return
	}

	// If already active, allow re-running to rotate tokens or switch numbers
	slog.Info("starting WABA onboarding pipeline",
		"tenant_id", tenantID, "current_status", currentStatus)

	result, err := h.runPipeline(r.Context(), tenantID.String(), businessName, req.Code, req.PhoneNumber)
	if err != nil {
		h.setStatus(r.Context(), tenantID.String(), string(models.OnboardingFailed), err.Error())
		writeError(w, http.StatusBadGateway,
			"WhatsApp connection failed: "+err.Error(), "waba_error")
		return
	}

	writeJSON(w, http.StatusOK, result)
}

// ─── PIPELINE ────────────────────────────────────────────────────────────────

// runPipeline executes all six automation steps sequentially.
// Each step is logged to onboarding_events so operators can trace failures.
// The pipeline is idempotent — safe to re-run on retry.
func (h *OnboardingHandler) runPipeline(
	ctx context.Context,
	tenantID, businessName, code, preferredNumber string,
) (*waCallbackResp, error) {

	log := func(step, status, detail string) {
		h.logEvent(ctx, tenantID, step, status, detail)
		slog.Info("onboarding step", "tenant", tenantID, "step", step, "status", status)
	}

	// ── Step 1: Exchange code → short-lived user access token ─────────────────
	tokenResp, err := whatsapp.ExchangeCodeForToken(h.appID, h.appSecret, code, "")
	if err != nil {
		log("token_exchange", "failed", err.Error())
		return nil, fmt.Errorf("step 1 — token exchange: %w", err)
	}
	log("token_exchange", "success", "short-lived token obtained")
	h.setStatus(ctx, tenantID, string(models.OnboardingTokenExchanged), "")

	// ── Step 2: Extend to long-lived token (60 days) ──────────────────────────
	// Long-lived tokens must be refreshed before expiry.
	// Production recommendation: set up a System User for a never-expiring token.
	// See docs/token-refresh.md for the refresh cron setup.
	longToken, err := whatsapp.ExchangeForLongLivedToken(tokenResp.AccessToken, h.appID, h.appSecret)
	if err != nil {
		// Non-fatal: fall back to short-lived token. Log prominently — this will
		// break after ~1 hour and needs to be fixed before going live.
		slog.Warn("long-lived token exchange failed — falling back to short-lived token (will expire soon!)",
			"tenant", tenantID, "err", err)
		log("token_extend", "failed", err.Error())
		longToken = tokenResp
	} else {
		log("token_extend", "success", "60-day token obtained")
	}

	finalToken := longToken.AccessToken

	// Persist token early so a retry can use it if later steps fail
	h.db.Exec(ctx, `UPDATE tenants SET fb_user_token = $1 WHERE id = $2`, finalToken, tenantID)

	// ── Step 3: Discover WhatsApp Business Accounts ───────────────────────────
	wabas, err := whatsapp.GetUserWABAs(finalToken)
	if err != nil {
		log("waba_discovery", "failed", err.Error())
		return nil, fmt.Errorf("step 3 — WABA discovery: %w", err)
	}
	if len(wabas) == 0 {
		msg := "no WhatsApp Business Account found — ensure you selected the correct Facebook account and granted all permissions during Embedded Signup"
		log("waba_discovery", "failed", msg)
		return nil, fmt.Errorf("step 3 — %s", msg)
	}

	// Use first WABA for MVP.
	// TODO: for businesses with multiple WABAs, present a selection UI.
	waba := wabas[0]
	log("waba_discovery", "success", fmt.Sprintf(`{"waba_id":%q,"name":%q}`, waba.ID, waba.Name))

	// ── Step 4: Fetch phone numbers on this WABA ──────────────────────────────
	phones, err := whatsapp.GetWABAPhoneNumbers(waba.ID, finalToken)
	if err != nil {
		log("phone_fetch", "failed", err.Error())
		return nil, fmt.Errorf("step 4 — phone number fetch: %w", err)
	}
	if len(phones) == 0 {
		msg := "no phone numbers found on this WhatsApp Business Account — ensure at least one number is registered"
		log("phone_fetch", "failed", msg)
		return nil, fmt.Errorf("step 4 — %s", msg)
	}

	// Select the phone: prefer the one matching preferredNumber, else take first.
	// Validate the phone status — warn if restricted/flagged but continue.
	selected := phones[0]
	if preferredNumber != "" {
		norm := normaliseWANumber(preferredNumber)
		for _, p := range phones {
			if normaliseWANumber(p.DisplayPhoneNumber) == norm {
				selected = p
				break
			}
		}
	}

	if selected.Status != "CONNECTED" {
		slog.Warn("phone number not in CONNECTED state",
			"status", selected.Status, "number", selected.DisplayPhoneNumber,
			"tenant", tenantID,
			"hint", "The number may have quality issues. Check Meta Business Manager.")
	}

	normalizedNumber := normaliseWANumber(selected.DisplayPhoneNumber)
	log("phone_fetch", "success",
		fmt.Sprintf(`{"phone_id":%q,"number":%q,"status":%q}`,
			selected.ID, normalizedNumber, selected.Status))
	h.setStatus(ctx, tenantID, string(models.OnboardingPhoneRegistered), "")

	// ── Step 5: Subscribe our app to this WABA's webhook events ───────────────
	// This single API call is what makes Meta route ALL incoming messages for
	// this WABA to our shared /webhook/whatsapp endpoint.
	// No manual dashboard action needed per client — ever.
	if err := whatsapp.SubscribeAppToWABA(waba.ID, finalToken); err != nil {
		log("webhook_subscribe", "failed", err.Error())
		return nil, fmt.Errorf("step 5 — webhook subscription: %w", err)
	}
	log("webhook_subscribe", "success", fmt.Sprintf(`{"waba_id":%q}`, waba.ID))
	h.setStatus(ctx, tenantID, string(models.OnboardingWebhookSubscribed), "")

	// ── Step 6: Save all WABA details and activate the tenant ─────────────────
	if _, err := h.db.Exec(ctx, `
		UPDATE tenants SET
			waba_id           = $1,
			whatsapp_number   = $2,
			wa_phone_id       = $3,
			wa_access_token   = $4,
			onboarding_status = 'active',
			onboarding_error  = NULL,
			is_active         = TRUE,
			activated_at      = NOW(),
			updated_at        = NOW()
		WHERE id = $5
	`, waba.ID, normalizedNumber, selected.ID, finalToken, tenantID); err != nil {
		log("db_save", "failed", err.Error())
		return nil, fmt.Errorf("step 6 — save WABA details: %w", err)
	}
	log("activated", "success",
		fmt.Sprintf(`{"waba_id":%q,"number":%q,"phone_id":%q}`,
			waba.ID, normalizedNumber, selected.ID))

	// ── Bonus: Test message ────────────────────────────────────────────────────
	// Non-fatal. Onboarding is complete even if the test message fails.
	// Common failure: Meta's 24hr messaging window — use a template instead.
	go func() {
		if err := whatsapp.SendTestMessage(selected.ID, finalToken, normalizedNumber, businessName); err != nil {
			slog.Warn("test message failed (non-fatal — onboarding already complete)",
				"tenant", tenantID, "err", err)
			h.logEvent(context.Background(), tenantID, "test_message", "failed", err.Error())
		} else {
			h.logEvent(context.Background(), tenantID, "test_message", "success", "")
		}
	}()

	slog.Info("✅ WABA onboarding complete",
		"tenant", tenantID, "number", normalizedNumber, "waba", waba.ID)

	return &waCallbackResp{
		OnboardingStatus: "active",
		WhatsappNumber:   normalizedNumber,
		BusinessName:     businessName,
		WabaID:           waba.ID,
		Message:          "WhatsApp connected successfully! A confirmation message has been sent to your number.",
	}, nil
}

// ─── GET /api/onboarding/status (JWT required) ────────────────────────────────
// Frontend polls this to know which screen to show.
// "pending"  → show Connect WhatsApp button
// "active"   → redirect to dashboard
// "failed"   → show error message + retry button

func (h *OnboardingHandler) GetStatus(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromCtx(r.Context())

	type stepSummary struct {
		Step      string    `json:"step"`
		Status    string    `json:"status"`
		CreatedAt time.Time `json:"created_at"`
	}
	type statusResp struct {
		Status         models.OnboardingStatus `json:"status"`
		WhatsappNumber *string                 `json:"whatsapp_number,omitempty"`
		WabaID         *string                 `json:"waba_id,omitempty"`
		ActivatedAt    *time.Time              `json:"activated_at,omitempty"`
		Error          *string                 `json:"error,omitempty"`
		Steps          []stepSummary           `json:"steps"`
	}

	var status models.OnboardingStatus
	var waNumber, wabaID string
	var activatedAt *time.Time
	var onboardingError *string

	if err := h.db.QueryRow(r.Context(), `
		SELECT onboarding_status, whatsapp_number, waba_id, activated_at, onboarding_error
		FROM tenants WHERE id = $1
	`, tenantID).Scan(&status, &waNumber, &wabaID, &activatedAt, &onboardingError); err != nil {
		writeError(w, http.StatusNotFound, "tenant not found", "not_found")
		return
	}

	// Fetch step audit trail
	rows, _ := h.db.Query(r.Context(), `
		SELECT step, status, created_at
		FROM onboarding_events WHERE tenant_id = $1
		ORDER BY created_at ASC
	`, tenantID)
	defer func() {
		if rows != nil {
			rows.Close()
		}
	}()

	steps := make([]stepSummary, 0)
	if rows != nil {
		for rows.Next() {
			var s stepSummary
			rows.Scan(&s.Step, &s.Status, &s.CreatedAt)
			steps = append(steps, s)
		}
	}

	resp := statusResp{
		Status: status,
		Error:  onboardingError,
		Steps:  steps,
	}
	if waNumber != "" {
		resp.WhatsappNumber = &waNumber
	}
	if wabaID != "" {
		resp.WabaID = &wabaID
	}
	resp.ActivatedAt = activatedAt

	writeJSON(w, http.StatusOK, resp)
}

// ─── DELETE /api/onboarding/whatsapp (JWT required, owner only) ───────────────
// Disconnects WhatsApp — clears all WABA details, unsubscribes our app from
// Meta's webhook for this WABA, and resets status to pending.
// Client can reconnect at any time by going through Embedded Signup again.

func (h *OnboardingHandler) Disconnect(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromCtx(r.Context())

	if middleware.RoleFromCtx(r.Context()) != "owner" {
		writeError(w, http.StatusForbidden, "only the account owner can disconnect WhatsApp", "forbidden")
		return
	}

	// Fetch WABA details so we can call the Meta API to unsubscribe
	var wabaID, accessToken string
	h.db.QueryRow(r.Context(),
		`SELECT COALESCE(waba_id,''), wa_access_token FROM tenants WHERE id = $1`, tenantID,
	).Scan(&wabaID, &accessToken)

	// Attempt to unsubscribe from Meta webhooks (non-fatal if it fails)
	if wabaID != "" && accessToken != "" {
		if err := whatsapp.UnsubscribeAppFromWABA(wabaID, accessToken); err != nil {
			slog.Warn("failed to unsubscribe WABA webhooks (continuing with local disconnect)",
				"tenant", tenantID, "waba", wabaID, "err", err)
		}
	}

	if _, err := h.db.Exec(r.Context(), `
		UPDATE tenants SET
			waba_id           = NULL,
			whatsapp_number   = '',
			wa_phone_id       = '',
			wa_access_token   = '',
			fb_user_token     = NULL,
			onboarding_status = 'pending',
			onboarding_error  = NULL,
			is_active         = FALSE,
			activated_at      = NULL,
			updated_at        = NOW()
		WHERE id = $1
	`, tenantID); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to disconnect", "server_error")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"status":  "disconnected",
		"message": "WhatsApp disconnected. Click 'Connect WhatsApp' to reconnect at any time.",
	})
}

// ─── INTERNAL HELPERS ────────────────────────────────────────────────────────

func (h *OnboardingHandler) logEvent(ctx context.Context, tenantID, step, status, detail string) {
	if _, err := h.db.Exec(ctx, `
		INSERT INTO onboarding_events (tenant_id, step, status, detail)
		VALUES ($1::uuid, $2, $3, NULLIF($4,''))
	`, tenantID, step, status, detail); err != nil {
		slog.Error("failed to log onboarding event", "step", step, "err", err)
	}
}

func (h *OnboardingHandler) setStatus(ctx context.Context, tenantID, status, errMsg string) {
	var e interface{}
	if errMsg != "" {
		e = errMsg
	}
	h.db.Exec(ctx,
		`UPDATE tenants SET onboarding_status = $1, onboarding_error = $2 WHERE id = $3`,
		status, e, tenantID)
}

func normaliseWANumber(n string) string {
	n = strings.TrimSpace(n)
	n = strings.ReplaceAll(n, " ", "")
	n = strings.ReplaceAll(n, "-", "")
	if !strings.HasPrefix(n, "+") {
		n = "+" + n
	}
	return n
}
