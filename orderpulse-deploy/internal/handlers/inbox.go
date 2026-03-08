package handlers

import (
	"io"
	"net/http"
	"strings"

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
					c.last_read_at,
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
	if err := rows.Err(); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to read inbox", "server_error")
		return
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
		if err := rows.Scan(&m.ID, &m.Direction, &m.Type, &m.Body, &m.MediaURL, &m.IsTagged, &m.ExtractedOrder, &m.CreatedAt); err != nil {
			continue
		}
		msgs = append(msgs, m)
	}
	if err := rows.Err(); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to read messages", "server_error")
		return
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


// ─── POST /api/inbox/read-all ────────────────────────────────────────────────
// Marks ALL contacts for this tenant as read (sets last_read_at = NOW()).
// Called whenever the user opens the inbox tab.
func (h *InboxHandler) MarkAllRead(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromCtx(r.Context())
	h.db.Exec(r.Context(), `
		UPDATE contacts SET last_read_at = NOW()
		WHERE tenant_id = $1
	`, tenantID)
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// ─── POST /api/inbox/{contactId}/read ────────────────────────────────────────
// Marks all messages in a thread as read by updating last_read_at on the contact.
func (h *InboxHandler) MarkRead(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromCtx(r.Context())
	contactID := chi.URLParam(r, "contactId")

	h.db.Exec(r.Context(), `
		UPDATE contacts SET last_read_at = NOW()
		WHERE id = $1::uuid AND tenant_id = $2
	`, contactID, tenantID)

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
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

// ─── GET /api/media/{mediaId} ────────────────────────────────────────────────
// Proxies a Meta media download. Meta's direct URLs expire in ~5 minutes and
// require authentication — so we proxy through our backend per-tenant.
// The frontend never contacts Meta directly for media.
func (h *InboxHandler) ProxyMedia(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromCtx(r.Context())
	mediaID   := chi.URLParam(r, "mediaId")
	if mediaID == "" {
		writeError(w, http.StatusBadRequest, "missing mediaId", "bad_request")
		return
	}

	// Fetch tenant's access token
	var waToken string
	err := h.db.QueryRow(r.Context(), `
		SELECT wa_access_token FROM tenants WHERE id = $1
	`, tenantID).Scan(&waToken)
	if err != nil || waToken == "" {
		writeError(w, http.StatusUnauthorized, "tenant token not found", "no_token")
		return
	}

	// Step 1: Get the temporary download URL from Meta
	info, err := whatsapp.GetMediaURL(mediaID, waToken)
	if err != nil {
		writeError(w, http.StatusBadGateway, "failed to get media URL: "+err.Error(), "meta_error")
		return
	}

	// Step 2: Download the actual bytes
	data, contentType, err := whatsapp.DownloadMedia(info.URL, waToken)
	if err != nil {
		writeError(w, http.StatusBadGateway, "failed to download media: "+err.Error(), "meta_error")
		return
	}

	// Stream back to frontend with proper content type
	if contentType == "" {
		contentType = info.MimeType
	}
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "private, max-age=3600") // cache 1 hour in browser
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

// ─── POST /api/inbox/{contactId}/send-media ──────────────────────────────────
// Sends a media message (image, document, audio) to a contact.
// Accepts multipart/form-data with: file (binary), type (image|document|audio), caption (optional)
func (h *InboxHandler) SendMedia(w http.ResponseWriter, r *http.Request) {
	tenantID  := middleware.TenantIDFromCtx(r.Context())
	contactID := chi.URLParam(r, "contactId")

	// Max 16MB for media — ParseMultipartForm writes overflow to /tmp
	if err := r.ParseMultipartForm(16 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "failed to parse form", "bad_request")
		return
	}
	// Always clean up temp files written to disk by ParseMultipartForm
	defer r.MultipartForm.RemoveAll()

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "missing file", "bad_request")
		return
	}
	defer file.Close()

	caption     := r.FormValue("caption")
	msgType     := r.FormValue("type") // image | document | audio
	if msgType == "" { msgType = "image" }

	// Read file bytes
	fileData, err := io.ReadAll(file)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to read file", "read_error")
		return
	}

	// Detect MIME type from header or filename
	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" || mimeType == "application/octet-stream" {
		mimeType = detectMimeType(header.Filename)
	}

	// Fetch tenant credentials
	var waPhoneID, waToken, customerNumber string
	err = h.db.QueryRow(r.Context(), `
		SELECT t.wa_phone_id, t.wa_access_token, c.wa_number
		FROM tenants t
		JOIN contacts c ON c.id = $2::uuid AND c.tenant_id = t.id
		WHERE t.id = $1
	`, tenantID, contactID).Scan(&waPhoneID, &waToken, &customerNumber)
	if err != nil {
		writeError(w, http.StatusNotFound, "contact not found", "not_found")
		return
	}

	// Upload to Meta first to get a media ID
	uploadedID, err := whatsapp.UploadMedia(waPhoneID, waToken, mimeType, header.Filename, fileData)
	if err != nil {
		writeError(w, http.StatusBadGateway, "failed to upload to Meta: "+err.Error(), "meta_error")
		return
	}

	// Send via Cloud API
	switch msgType {
	case "image":
		err = whatsapp.SendImageMessage(waPhoneID, waToken, customerNumber, uploadedID, caption)
	case "audio":
		err = whatsapp.SendAudioMessage(waPhoneID, waToken, customerNumber, uploadedID)
	default: // document
		err = whatsapp.SendDocumentMessage(waPhoneID, waToken, customerNumber, uploadedID, header.Filename, caption)
	}
	if err != nil {
		writeError(w, http.StatusBadGateway, "failed to send: "+err.Error(), "meta_error")
		return
	}

	// Store in messages table
	body := caption
	if body == "" && msgType != "image" {
		body = header.Filename
	}
	h.db.Exec(r.Context(), `
		INSERT INTO messages (tenant_id, contact_id, direction, type, body, media_url)
		VALUES ($1, $2::uuid, 'outbound', $3, $4, $5)
	`, tenantID, contactID, msgType, body, uploadedID)

	writeJSON(w, http.StatusOK, map[string]string{"status": "sent", "media_id": uploadedID})
}

// detectMimeType returns a reasonable MIME type based on file extension.
func detectMimeType(filename string) string {
	lower := strings.ToLower(filename)
	switch {
	case strings.HasSuffix(lower, ".jpg") || strings.HasSuffix(lower, ".jpeg"):
		return "image/jpeg"
	case strings.HasSuffix(lower, ".png"):
		return "image/png"
	case strings.HasSuffix(lower, ".webp"):
		return "image/webp"
	case strings.HasSuffix(lower, ".pdf"):
		return "application/pdf"
	case strings.HasSuffix(lower, ".mp3"):
		return "audio/mpeg"
	case strings.HasSuffix(lower, ".ogg"):
		return "audio/ogg"
	case strings.HasSuffix(lower, ".m4a"):
		return "audio/mp4"
	case strings.HasSuffix(lower, ".mp4"):
		return "video/mp4"
	case strings.HasSuffix(lower, ".xlsx"):
		return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	case strings.HasSuffix(lower, ".docx"):
		return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	default:
		return "application/octet-stream"
	}
}
