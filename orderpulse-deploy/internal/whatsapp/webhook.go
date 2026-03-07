package whatsapp

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

// ─── META WEBHOOK PAYLOAD STRUCTS ────────────────────────────────────────────
// These map exactly to Meta's WhatsApp Cloud API webhook payload format.
// Reference: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples

type WebhookPayload struct {
	Object string  `json:"object"`
	Entry  []Entry `json:"entry"`
}

type Entry struct {
	ID      string   `json:"id"`
	Changes []Change `json:"changes"`
}

type Change struct {
	Field string      `json:"field"`
	Value ChangeValue `json:"value"`
}

type ChangeValue struct {
	MessagingProduct string      `json:"messaging_product"`
	Metadata         Metadata    `json:"metadata"`
	Contacts         []WAContact `json:"contacts"`
	Messages         []WAMessage `json:"messages"`
	Statuses         []WAStatus  `json:"statuses"`
}

type Metadata struct {
	DisplayPhoneNumber string `json:"display_phone_number"` // Business number — used for tenant routing
	PhoneNumberID      string `json:"phone_number_id"`
}

type WAContact struct {
	WaID    string    `json:"wa_id"`
	Profile WAProfile `json:"profile"`
}

type WAProfile struct {
	Name string `json:"name"`
}

type WAMessage struct {
	ID        string    `json:"id"`
	From      string    `json:"from"` // Customer's phone number
	Timestamp string    `json:"timestamp"`
	Type      string    `json:"type"` // text | image | audio | document | sticker | ...
	Text      *WAText   `json:"text,omitempty"`
	Image     *WAMedia  `json:"image,omitempty"`
	Audio     *WAMedia  `json:"audio,omitempty"`
	Document  *WAMedia  `json:"document,omitempty"`
	Sticker   *WAMedia  `json:"sticker,omitempty"`
	Reaction  *WAReaction `json:"reaction,omitempty"`
}

type WAText struct {
	Body string `json:"body"`
}

type WAMedia struct {
	ID       string `json:"id"`
	MimeType string `json:"mime_type"`
	Caption  string `json:"caption,omitempty"`
	Filename string `json:"filename,omitempty"`
}

type WAReaction struct {
	MessageID string `json:"message_id"`
	Emoji     string `json:"emoji"`
}

// WAStatus is a delivery/read receipt for an outbound message.
// We receive these but currently only log them.
type WAStatus struct {
	ID          string `json:"id"`
	Status      string `json:"status"` // sent | delivered | read | failed
	Timestamp   string `json:"timestamp"`
	RecipientID string `json:"recipient_id"`
}

// ─── WEBHOOK HANDLER ─────────────────────────────────────────────────────────

// WebhookHandler receives and processes all incoming WhatsApp webhook events.
// ONE instance handles ALL tenants — routing is done by matching the destination
// phone number (payload.metadata.display_phone_number) to tenants.whatsapp_number.
type WebhookHandler struct {
	db          *pgxpool.Pool
	verifyToken string
	llmAPIKey   string // read from LLM_API_KEY env; empty = regex-only mode
	llmModel    string
}

// NewWebhookHandler returns a new WebhookHandler.
// LLM_API_KEY is read from environment so main.go signature stays unchanged.
func NewWebhookHandler(db *pgxpool.Pool, verifyToken string) *WebhookHandler {
	return &WebhookHandler{
		db:          db,
		verifyToken: verifyToken,
		llmAPIKey:   os.Getenv("LLM_API_KEY"),
	}
}

// Verify handles GET /webhook/whatsapp.
// Meta calls this once when you register the webhook URL in the Meta App Dashboard.
// Must respond with hub.challenge if the verify token matches, else 403.
func (h *WebhookHandler) Verify(w http.ResponseWriter, r *http.Request) {
	mode      := r.URL.Query().Get("hub.mode")
	token     := r.URL.Query().Get("hub.verify_token")
	challenge := r.URL.Query().Get("hub.challenge")

	if mode == "subscribe" && token == h.verifyToken {
		slog.Info("webhook verified by Meta")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(challenge))
		return
	}

	slog.Warn("webhook verification failed", "mode", mode, "expected_token_match", token == h.verifyToken)
	w.WriteHeader(http.StatusForbidden)
}

// Receive handles POST /webhook/whatsapp.
// Meta POSTs every incoming message and delivery receipt here.
//
// Processing rules:
//   - Always respond 200 immediately (Meta retries on non-200 or timeout)
//   - Process synchronously for MVP; move to a queue for high volume
//   - Idempotent: wa_msg_id UNIQUE constraint prevents duplicate storage on retry
func (h *WebhookHandler) Receive(w http.ResponseWriter, r *http.Request) {
	// Acknowledge immediately — Meta will retry if we don't respond within 20s
	w.WriteHeader(http.StatusOK)

	var payload WebhookPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		slog.Error("webhook decode failed", "err", err)
		return
	}

	if payload.Object != "whatsapp_business_account" {
		return
	}

	ctx := context.Background()
	for _, entry := range payload.Entry {
		for _, change := range entry.Changes {
			if change.Field != "messages" {
				continue
			}
			if err := h.processChange(ctx, change.Value); err != nil {
				slog.Error("webhook processing error", "err", err)
			}
		}
	}
}

// processChange handles one change block from the webhook payload.
func (h *WebhookHandler) processChange(ctx context.Context, val ChangeValue) error {
	// Route to tenant using the destination (business) phone number
	tenantID, waPhoneID, err := h.lookupTenant(ctx, val.Metadata.DisplayPhoneNumber)
	if err != nil {
		// No tenant matched — could be a test message or misconfigured number
		slog.Warn("webhook: no tenant for number",
			"display_number", val.Metadata.DisplayPhoneNumber)
		return nil
	}

	// Handle delivery/read receipts — useful for future "message delivered" UI indicators
	for _, status := range val.Statuses {
		slog.Info("message status update",
			"wa_msg_id", status.ID,
			"status", status.Status,
			"tenant", tenantID,
		)
		// TODO: update messages.delivery_status in DB if tracking delivery
		_ = status
	}

	// Build name map from contacts block included in the webhook payload
	nameByNumber := make(map[string]string, len(val.Contacts))
	for _, c := range val.Contacts {
		nameByNumber[c.WaID] = c.Profile.Name
	}

	// Process each incoming message
	for _, msg := range val.Messages {
		if err := h.storeMessage(ctx, tenantID, waPhoneID, msg, nameByNumber); err != nil {
			slog.Error("failed to store message",
				"wa_msg_id", msg.ID, "from", msg.From, "err", err)
		}
	}
	return nil
}

// lookupTenant finds the tenant_id and wa_phone_id for a given business phone number.
// The number is normalised (ensure + prefix, strip spaces) before comparison.
func (h *WebhookHandler) lookupTenant(ctx context.Context, displayNumber string) (string, string, error) {
	normalised := normaliseNumber(displayNumber)
	var tenantID, waPhoneID string
	err := h.db.QueryRow(ctx,
		`SELECT id::text, wa_phone_id FROM tenants WHERE whatsapp_number = $1 AND onboarding_status = 'active'`,
		normalised,
	).Scan(&tenantID, &waPhoneID)
	if err != nil {
		return "", "", fmt.Errorf("tenant lookup for %s: %w", normalised, err)
	}
	return tenantID, waPhoneID, nil
}

// storeMessage upserts the sending contact and stores the incoming message.
// The wa_msg_id UNIQUE constraint ensures this is idempotent — safe to call
// multiple times for the same message (Meta retries webhooks on failure).
func (h *WebhookHandler) storeMessage(
	ctx context.Context,
	tenantID, waPhoneID string,
	msg WAMessage,
	nameByNumber map[string]string,
) error {
	// Upsert contact — update name and last_seen if they already exist
	contactName := nameByNumber[msg.From]
	var contactID string
	err := h.db.QueryRow(ctx, `
		INSERT INTO contacts (tenant_id, wa_number, name, last_seen)
		VALUES ($1::uuid, $2, NULLIF($3,''), NOW())
		ON CONFLICT (tenant_id, wa_number)
		DO UPDATE SET
			last_seen = EXCLUDED.last_seen,
			name      = COALESCE(EXCLUDED.name, contacts.name)
		RETURNING id::text
	`, tenantID, normaliseNumber(msg.From), contactName).Scan(&contactID)
	if err != nil {
		return fmt.Errorf("upsert contact: %w", err)
	}

	// Extract body and media information per message type
	msgType, body, mediaURL := extractContent(msg)

	// ── TWO-STAGE ORDER EXTRACTION ───────────────────────────────────────────
	// Stage 1: Regex patterns  (instant, free — handles ~70% of messages)
	// Stage 2: LLM fallback    (only when regex fails AND intent = new_order)
	//
	// Result stored as JSON in messages.extracted_order so the dashboard
	// can pre-fill the Create Order modal automatically.
	extraction := ExtractOrder(body, h.llmAPIKey, h.llmModel)
	var extractedJSON *string
	if len(extraction.Items) > 0 {
		b, _ := json.Marshal(extraction)
		s := string(b)
		extractedJSON = &s
	}

	intent := extraction.Intent

	// Insert message — ON CONFLICT DO NOTHING ensures idempotency
	_, err = h.db.Exec(ctx, `
		INSERT INTO messages (tenant_id, contact_id, wa_msg_id, direction, type, body, media_url, extracted_order)
		VALUES ($1::uuid, $2::uuid, $3, 'inbound', $4, $5, $6, $7)
		ON CONFLICT (wa_msg_id) DO NOTHING
	`, tenantID, contactID, msg.ID, msgType, body, mediaURL, extractedJSON)
	if err != nil {
		return fmt.Errorf("insert message: %w", err)
	}

	slog.Info("message stored",
		"type", msgType,
		"from", msg.From,
		"intent", intent,
		"items_extracted", len(extraction.Items),
		"extraction_source", extraction.Source,
		"tenant", tenantID,
	)
	return nil
}

// extractContent determines message type and extracts body/media from a WAMessage.
// media_url stores the raw Meta media ID — the frontend fetches it via /api/media/:id
// which proxies through our backend (Meta URLs expire in ~5 minutes).
func extractContent(msg WAMessage) (msgType, body, mediaURL string) {
	msgType = msg.Type

	switch msg.Type {
	case "text":
		if msg.Text != nil {
			body = msg.Text.Body
		}
	case "image":
		if msg.Image != nil {
			body = msg.Image.Caption  // may be empty — caption is optional
			mediaURL = msg.Image.ID   // raw Meta media ID; proxy via /api/media/:id
		}
	case "audio", "voice":
		if msg.Audio != nil {
			mediaURL = msg.Audio.ID
		}
		body = "" // no text for audio
	case "document":
		if msg.Document != nil {
			body = msg.Document.Caption
			// Store as "mediaID|filename" so frontend can display the filename
			if msg.Document.Filename != "" {
				mediaURL = msg.Document.ID + "|" + msg.Document.Filename
			} else {
				mediaURL = msg.Document.ID
			}
		}
	case "sticker":
		if msg.Sticker != nil {
			mediaURL = msg.Sticker.ID
		}
		body = "🩹" // sticker placeholder
	case "reaction":
		if msg.Reaction != nil {
			body = fmt.Sprintf("%s", msg.Reaction.Emoji)
		}
	default:
		body = fmt.Sprintf("[%s]", msg.Type)
	}

	return msgType, body, mediaURL
}

// ClassifyIntent is a lightweight keyword classifier for order intent detection.
// Replace this with a GPT-4o call for production-level accuracy and multi-language support.
// Current accuracy: ~70% for simple order phrases in English.
func ClassifyIntent(body string) string {
	if body == "" {
		return "general"
	}
	lower := strings.ToLower(body)

	repeatPhrases := []string{"repeat", "same as last", "same order", "previous order", "as before"}
	for _, p := range repeatPhrases {
		if strings.Contains(lower, p) {
			return "repeat_order"
		}
	}

	orderPhrases := []string{
		"order", "want", "need", "give me", "send me", "i want", "i need",
		"pack", "book", "pieces", "pcs", " kg", " gm", " litre", "liters",
		"dozen", "box", "packet", "bottle",
	}
	for _, p := range orderPhrases {
		if strings.Contains(lower, p) {
			return "new_order"
		}
	}

	paymentPhrases := []string{"paid", "payment", "transferred", "upi", "gpay", "phonepe", "paytm", "neft"}
	for _, p := range paymentPhrases {
		if strings.Contains(lower, p) {
			return "payment_update"
		}
	}

	return "general"
}

// normaliseNumber ensures a consistent phone number format: + followed by digits only.
// Input examples that all normalise to +919876543210:
//   "919876543210", "+91 98765 43210", "+919876543210"
func normaliseNumber(n string) string {
	n = strings.TrimSpace(n)
	n = strings.ReplaceAll(n, " ", "")
	n = strings.ReplaceAll(n, "-", "")
	if !strings.HasPrefix(n, "+") {
		n = "+" + n
	}
	return n
}
