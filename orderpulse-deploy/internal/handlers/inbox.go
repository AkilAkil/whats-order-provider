package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"orderpulse/internal/middleware"
	"orderpulse/internal/models"
	"orderpulse/internal/whatsapp"
)

// InboxHandler manages the chat inbox — threads, message history, and replies.
type InboxHandler struct {
	db *pgxpool.Pool
}

func NewInboxHandler(db *pgxpool.Pool) *InboxHandler {
	return &InboxHandler{db: db}
}

// ─── GET /api/inbox ───────────────────────────────────────────────────────────
// Returns all chat threads ordered by most recent message.
// Each thread shows: contact info, last message, and unread count.
// Unread = inbound messages since the last outbound message to that contact.
func (h *InboxHandler) ListThreads(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromCtx(r.Context())

	rows, err := h.db.Query(r.Context(), `
		SELECT
			c.id, c.wa_number, c.name, c.order_count, c.last_seen, c.created_at,
			m.id, m.direction, m.type, m.body, m.media_url, m.is_tagged, m.created_at,
			(
				SELECT COUNT(*) FROM messages m2
				WHERE m2.contact_id = c.id
				  AND m2.direction  = 'inbound'
				  AND m2.created_at > COALESCE(
					(SELECT MAX(m3.created_at) FROM messages m3
					 WHERE m3.contact_id = c.id AND m3.direction = 'outbound'),
					'1970-01-01'::timestamptz)
			) AS unread_count
		FROM contacts c
		JOIN LATERAL (
			SELECT * FROM messages WHERE contact_id = c.id
			ORDER BY created_at DESC LIMIT 1
		) m ON TRUE
		WHERE c.tenant_id = $1
		ORDER BY m.created_at DESC
	`, tenantID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch inbox", "server_error")
		return
	}
	defer rows.Close()

	threads := make([]models.ChatThread, 0)
	for rows.Next() {
		var t models.ChatThread
		err := rows.Scan(
			&t.Contact.ID, &t.Contact.WaNumber, &t.Contact.Name,
			&t.Contact.OrderCount, &t.Contact.LastSeen, &t.Contact.CreatedAt,
			&t.LastMessage.ID, &t.LastMessage.Direction, &t.LastMessage.Type,
			&t.LastMessage.Body, &t.LastMessage.MediaURL, &t.LastMessage.IsTagged,
			&t.LastMessage.CreatedAt, &t.UnreadCount,
		)
		if err != nil {
			continue
		}
		threads = append(threads, t)
	}
	writeJSON(w, http.StatusOK, threads)
}

// ─── GET /api/inbox/{contactId}/messages ─────────────────────────────────────
func (h *InboxHandler) GetMessages(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromCtx(r.Context())
	contactID := chi.URLParam(r, "contactId")

	rows, err := h.db.Query(r.Context(), `
		SELECT id, direction, type, body, media_url, is_tagged, extracted_order::text, created_at
		FROM messages
		WHERE tenant_id = $1 AND contact_id = $2::uuid
		ORDER BY created_at ASC
	`, tenantID, contactID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch messages", "server_error")
		return
	}
	defer rows.Close()

	msgs := make([]models.Message, 0)
	for rows.Next() {
		var m models.Message
		rows.Scan(&m.ID, &m.Direction, &m.Type, &m.Body, &m.MediaURL, &m.IsTagged, &m.ExtractedOrder, &m.CreatedAt)
		msgs = append(msgs, m)
	}
	writeJSON(w, http.StatusOK, msgs)
}

// ─── POST /api/inbox/{contactId}/reply ───────────────────────────────────────
// Sends a text reply to the customer via WhatsApp and stores it in the DB.
// Only works within 24hrs of customer's last message.
// Outside that window, use status update templates (sent automatically on status change).
func (h *InboxHandler) Reply(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromCtx(r.Context())
	contactID := chi.URLParam(r, "contactId")

	var req struct {
		Body string `json:"body"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Body == "" {
		writeError(w, http.StatusBadRequest, "body is required", "validation_error")
		return
	}

	var customerNumber, waPhoneID, waToken string
	err := h.db.QueryRow(r.Context(), `
		SELECT c.wa_number, t.wa_phone_id, t.wa_access_token
		FROM contacts c
		JOIN tenants t ON t.id = c.tenant_id
		WHERE c.id = $1::uuid AND c.tenant_id = $2
	`, contactID, tenantID).Scan(&customerNumber, &waPhoneID, &waToken)
	if err != nil {
		writeError(w, http.StatusNotFound, "contact not found", "not_found")
		return
	}

	if err := whatsapp.SendTextMessage(waPhoneID, waToken, customerNumber, req.Body); err != nil {
		writeError(w, http.StatusBadGateway, "failed to send message: "+err.Error(), "whatsapp_error")
		return
	}

	// Store outbound message for conversation history
	h.db.Exec(r.Context(), `
		INSERT INTO messages (tenant_id, contact_id, direction, type, body)
		VALUES ($1, $2::uuid, 'outbound', 'text', $3)
	`, tenantID, contactID, req.Body)

	writeJSON(w, http.StatusOK, map[string]string{"status": "sent"})
}

// ─── PATCH /api/inbox/{contactId}/tag ────────────────────────────────────────
// Tags all recent inbound messages from a contact as order-related.
// Used when the business owner marks a conversation as an order conversation.
func (h *InboxHandler) TagChat(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromCtx(r.Context())
	contactID := chi.URLParam(r, "contactId")

	tag, _ := h.db.Exec(r.Context(), `
		UPDATE messages SET is_tagged = TRUE
		WHERE tenant_id = $1 AND contact_id = $2::uuid AND direction = 'inbound'
	`, tenantID, contactID)
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":         "tagged",
		"messages_tagged": tag.RowsAffected(),
	})
}
