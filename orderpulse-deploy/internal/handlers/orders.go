package handlers

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"time"
	"encoding/json"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"orderpulse/internal/middleware"
	"orderpulse/internal/models"
	"orderpulse/internal/whatsapp"
)

// OrderHandler manages the full order lifecycle.
type OrderHandler struct {
	db *pgxpool.Pool
}

func NewOrderHandler(db *pgxpool.Pool) *OrderHandler {
	return &OrderHandler{db: db}
}

// ─── GET /api/orders ─────────────────────────────────────────────────────────
// Lists orders for the tenant. Supports filtering by ?status= and ?payment_status=
func (h *OrderHandler) List(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromCtx(r.Context())
	statusFilter := r.URL.Query().Get("status")
	payFilter := r.URL.Query().Get("payment_status")

	query := `
		SELECT
			o.id, o.tenant_id, o.contact_id, o.order_number,
			o.status, o.payment_status, o.payment_method,
			o.total_amount, o.notes, o.source_msg_id,
			o.created_at, o.updated_at,
			c.wa_number, c.name
		FROM orders o
		JOIN contacts c ON c.id = o.contact_id
		WHERE o.tenant_id = $1
	`
	args := []interface{}{tenantID}
	idx := 2

	if statusFilter != "" {
		query += fmt.Sprintf(" AND o.status = $%d", idx)
		args = append(args, statusFilter)
		idx++
	}
	if payFilter != "" {
		query += fmt.Sprintf(" AND o.payment_status = $%d", idx)
		args = append(args, payFilter)
	}
	query += " ORDER BY o.created_at DESC"

	rows, err := h.db.Query(r.Context(), query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch orders", "server_error")
		return
	}
	defer rows.Close()

	orders := make([]models.Order, 0)
	for rows.Next() {
		var o models.Order
		var contact models.Contact
		rows.Scan(
			&o.ID, &o.TenantID, &o.ContactID, &o.OrderNumber,
			&o.Status, &o.PaymentStatus, &o.PaymentMethod,
			&o.TotalAmount, &o.Notes, &o.SourceMsgID,
			&o.CreatedAt, &o.UpdatedAt,
			&contact.WaNumber, &contact.Name,
		)
		contact.ID = o.ContactID
		o.Contact = &contact
		o.Items = h.fetchItems(r.Context(), o.ID)
		orders = append(orders, o)
	}
	writeJSON(w, http.StatusOK, orders)
}

// ─── GET /api/orders/{id} ────────────────────────────────────────────────────
func (h *OrderHandler) Get(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromCtx(r.Context())
	orderID := chi.URLParam(r, "id")

	var o models.Order
	var contact models.Contact
	err := h.db.QueryRow(r.Context(), `
		SELECT
			o.id, o.tenant_id, o.contact_id, o.order_number,
			o.status, o.payment_status, o.payment_method,
			o.total_amount, o.notes, o.source_msg_id,
			o.created_at, o.updated_at,
			c.wa_number, c.name, c.order_count, c.last_seen
		FROM orders o
		JOIN contacts c ON c.id = o.contact_id
		WHERE o.id = $1::uuid AND o.tenant_id = $2
	`, orderID, tenantID).Scan(
		&o.ID, &o.TenantID, &o.ContactID, &o.OrderNumber,
		&o.Status, &o.PaymentStatus, &o.PaymentMethod,
		&o.TotalAmount, &o.Notes, &o.SourceMsgID,
		&o.CreatedAt, &o.UpdatedAt,
		&contact.WaNumber, &contact.Name, &contact.OrderCount, &contact.LastSeen,
	)
	if err != nil {
		writeError(w, http.StatusNotFound, "order not found", "not_found")
		return
	}
	contact.ID = o.ContactID
	o.Contact = &contact
	o.Items = h.fetchItems(r.Context(), o.ID)
	writeJSON(w, http.StatusOK, o)
}

// ─── POST /api/orders ────────────────────────────────────────────────────────
// Creates an order from a chat conversation or manually.
// Generates a human-readable order number (ORD-YYYYMMDD-NNN).

type createOrderReq struct {
	ContactID   uuid.UUID          `json:"contact_id"`
	Items       []models.OrderItem `json:"items"`
	Notes       string             `json:"notes"`
	SourceMsgID *uuid.UUID         `json:"source_msg_id,omitempty"`
}

func (h *OrderHandler) Create(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromCtx(r.Context())

	var req createOrderReq
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.ContactID == uuid.Nil {
		writeError(w, http.StatusBadRequest, "contact_id is required", "validation_error")
		return
	}
	if len(req.Items) == 0 {
		writeError(w, http.StatusBadRequest, "at least one item is required", "validation_error")
		return
	}

	ctx := r.Context()

	// ── Plan limit check ──────────────────────────────────────────────────────
	// Free plan: 50 orders/month. Pro plan: unlimited.
	var plan string
	var monthlyCount int
	h.db.QueryRow(ctx, `
		SELECT t.plan, COUNT(o.id)
		FROM tenants t
		LEFT JOIN orders o ON o.tenant_id = t.id
			AND DATE_TRUNC('month', o.created_at) = DATE_TRUNC('month', NOW())
			AND o.status != 'cancelled'
		WHERE t.id = $1
		GROUP BY t.plan
	`, tenantID).Scan(&plan, &monthlyCount)

	if plan == "free" && monthlyCount >= 50 {
		writeError(w, http.StatusPaymentRequired,
			"You've reached the 50 orders/month limit on the free plan. Upgrade to Pro (₹299 for 3 months) for unlimited orders.",
			"plan_limit_exceeded")
		return
	}

	tx, err := h.db.Begin(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db error", "server_error")
		return
	}
	defer tx.Rollback(ctx)

	// Generate order number: ORD-YYYYMMDD-NNN (sequential per tenant per day)
	var seqNum int
	tx.QueryRow(ctx, `
		SELECT COUNT(*) + 1 FROM orders
		WHERE tenant_id = $1 AND DATE(created_at AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE
	`, tenantID).Scan(&seqNum)
	orderNumber := fmt.Sprintf("ORD-%s-%03d", time.Now().Format("20060102"), seqNum)

	// Calculate total from items
	var total float64
	for _, item := range req.Items {
		if item.Qty <= 0 || item.UnitPrice < 0 {
			writeError(w, http.StatusBadRequest, "item qty must be > 0 and unit_price must be >= 0", "validation_error")
			return
		}
		total += float64(item.Qty) * item.UnitPrice
	}

	var orderID uuid.UUID
	if err := tx.QueryRow(ctx, `
		INSERT INTO orders (tenant_id, contact_id, order_number, total_amount, notes, source_msg_id)
		VALUES ($1, $2, $3, $4, NULLIF($5,''), $6)
		RETURNING id
	`, tenantID, req.ContactID, orderNumber, total, req.Notes, req.SourceMsgID).Scan(&orderID); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create order", "server_error")
		return
	}

	for _, item := range req.Items {
		if _, err := tx.Exec(ctx, `
			INSERT INTO order_items (order_id, name, qty, unit_price)
			VALUES ($1, $2, $3, $4)
		`, orderID, item.Name, item.Qty, item.UnitPrice); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to insert items", "server_error")
			return
		}
	}

	// Increment contact's order count
	tx.Exec(ctx, `UPDATE contacts SET order_count = order_count + 1 WHERE id = $1`, req.ContactID)

	// Tag source message as converted to an order
	if req.SourceMsgID != nil {
		tx.Exec(ctx, `UPDATE messages SET is_tagged = TRUE WHERE id = $1`, req.SourceMsgID)
	}

	if err := tx.Commit(ctx); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to commit", "server_error")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"id":           orderID,
		"order_number": orderNumber,
		"total_amount": total,
	})
}

// ─── PATCH /api/orders/{id}/status ───────────────────────────────────────────
// Advances the order status to the next step in the flow.
// Automatically sends the appropriate WhatsApp template notification to the customer.
// Status must be the immediate next step — skipping is not allowed.

func (h *OrderHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromCtx(r.Context())
	orderID := chi.URLParam(r, "id")

	var req struct {
		Status string `json:"status"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Status == "" {
		writeError(w, http.StatusBadRequest, "status is required", "validation_error")
		return
	}

	// Load current order details + WA credentials in one query
	var currentStatus models.OrderStatus
	var orderNumber, customerNumber, waPhoneID, waToken, contactID string
	err := h.db.QueryRow(r.Context(), `
		SELECT o.status, o.order_number, c.wa_number, t.wa_phone_id, t.wa_access_token, c.id::text
		FROM orders o
		JOIN contacts c ON c.id = o.contact_id
		JOIN tenants t ON t.id = o.tenant_id
		WHERE o.id = $1::uuid AND o.tenant_id = $2
	`, orderID, tenantID).Scan(
		&currentStatus, &orderNumber, &customerNumber, &waPhoneID, &waToken, &contactID,
	)
	if err != nil {
		writeError(w, http.StatusNotFound, "order not found", "not_found")
		return
	}

	newStatus := models.OrderStatus(req.Status)

	// Handle cancellation separately — allowed only from new or confirmed
	if newStatus == models.StatusCancelled {
		if !models.CanCancel(currentStatus) {
			writeError(w, http.StatusBadRequest,
				fmt.Sprintf("cannot cancel an order in '%s' state", currentStatus),
				"invalid_status_transition")
			return
		}
	} else {
		// Validate linear progression
		expected, ok := models.NextStatus(currentStatus)
		if !ok || expected != newStatus {
			writeError(w, http.StatusBadRequest,
				fmt.Sprintf("invalid status transition: %s → %s (expected: %s)",
					currentStatus, newStatus, expected),
				"invalid_status_transition")
			return
		}
	}

	if _, err := h.db.Exec(r.Context(), `
		UPDATE orders SET status = $1, updated_at = NOW()
		WHERE id = $2::uuid AND tenant_id = $3
	`, newStatus, orderID, tenantID); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update status", "server_error")
		return
	}

	// Notify customer on WhatsApp — async, non-blocking
	go func() {
		items := h.fetchItems(context.Background(), uuid.MustParse(orderID))
		msg := orderStatusMessage(string(newStatus), orderNumber, items)
		if msg == "" {
			return
		}
		if err := whatsapp.SendTextMessage(waPhoneID, waToken, customerNumber, msg); err != nil {
			slog.Error("failed to send status notification",
				"order", orderNumber, "status", newStatus, "err", err)
			return
		}
		slog.Info("status notification sent", "order", orderNumber, "status", newStatus)
		// Save to messages table so it appears in chat history
		h.db.Exec(context.Background(), `
			INSERT INTO messages (tenant_id, contact_id, direction, type, body)
			VALUES ($1, $2::uuid, 'outbound', 'text', $3)
		`, tenantID, contactID, msg)
	}()

	writeJSON(w, http.StatusOK, map[string]string{
		"status":  string(newStatus),
		"message": "status updated — customer notified on WhatsApp",
	})
}

// ─── POST /api/orders/{id}/cancel ────────────────────────────────────────────
func (h *OrderHandler) Cancel(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromCtx(r.Context())
	orderID := chi.URLParam(r, "id")

	var req struct {
		Reason string `json:"reason"`
	}
	decodeJSON(w, r, &req)

	var currentStatus models.OrderStatus
	var orderNumber, customerNumber, waPhoneID, waToken, contactID2 string
	err := h.db.QueryRow(r.Context(), `
		SELECT o.status, o.order_number, c.wa_number, t.wa_phone_id, t.wa_access_token, c.id::text
		FROM orders o
		JOIN contacts c ON c.id = o.contact_id
		JOIN tenants t ON t.id = o.tenant_id
		WHERE o.id = $1::uuid AND o.tenant_id = $2
	`, orderID, tenantID).Scan(&currentStatus, &orderNumber, &customerNumber, &waPhoneID, &waToken, &contactID2)
	if err != nil {
		writeError(w, http.StatusNotFound, "order not found", "not_found")
		return
	}

	if !models.CanCancel(currentStatus) {
		writeError(w, http.StatusBadRequest,
			fmt.Sprintf("cannot cancel an order in '%s' state — only new and confirmed orders can be cancelled", currentStatus),
			"invalid_status_transition")
		return
	}

	h.db.Exec(r.Context(), `
		UPDATE orders SET status = 'cancelled', notes = CONCAT(COALESCE(notes,''), $1), updated_at = NOW()
		WHERE id = $2::uuid AND tenant_id = $3
	`, "\nCancellation reason: "+req.Reason, orderID, tenantID)

	// Notify customer with plain text + save to chat
	go func() {
		items := h.fetchItems(context.Background(), uuid.MustParse(orderID))
		msg := orderStatusMessage("cancelled", orderNumber, items)
		if req.Reason != "" {
			msg += "\n\nReason: " + req.Reason
		}
		if err := whatsapp.SendTextMessage(waPhoneID, waToken, customerNumber, msg); err != nil {
			slog.Error("failed to send cancel notification", "order", orderNumber, "err", err)
			return
		}
		h.db.Exec(context.Background(), `
			INSERT INTO messages (tenant_id, contact_id, direction, type, body)
			VALUES ($1, $2::uuid, 'outbound', 'text', $3)
		`, tenantID, contactID2, msg)
	}()

	writeJSON(w, http.StatusOK, map[string]string{
		"status":  "cancelled",
		"message": "order cancelled — customer notified",
	})
}

// ─── POST /api/orders/{id}/upi-link ──────────────────────────────────────────
// Generates a UPI deep link and sends it to the customer via WhatsApp.

func (h *OrderHandler) SendUPILink(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromCtx(r.Context())
	orderID := chi.URLParam(r, "id")

	var req struct {
		UPIVPA string `json:"upi_vpa"` // e.g. priya@okicici
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.UPIVPA == "" {
		writeError(w, http.StatusBadRequest, "upi_vpa is required", "validation_error")
		return
	}

	var amount float64
	var orderNumber, customerNumber, businessName, waPhoneID, waToken string
	err := h.db.QueryRow(r.Context(), `
		SELECT o.total_amount, o.order_number, c.wa_number,
		       t.business_name, t.wa_phone_id, t.wa_access_token
		FROM orders o
		JOIN contacts c ON c.id = o.contact_id
		JOIN tenants t ON t.id = o.tenant_id
		WHERE o.id = $1::uuid AND o.tenant_id = $2
	`, orderID, tenantID).Scan(&amount, &orderNumber, &customerNumber, &businessName, &waPhoneID, &waToken)
	if err != nil {
		writeError(w, http.StatusNotFound, "order not found", "not_found")
		return
	}

	// UPI deep link compatible with GPay, PhonePe, Paytm, BHIM
	upiLink := fmt.Sprintf(
		"upi://pay?pa=%s&pn=%s&am=%.2f&tn=%s&cu=INR",
		req.UPIVPA, businessName, amount, orderNumber,
	)

	msgBody := fmt.Sprintf(
		"💳 *Payment Request — %s*\n\nAmount: ₹%.2f\n\nTap to pay 👇\n%s\n\n"+
			"_After payment, please send a screenshot and we will confirm your order._",
		orderNumber, amount, upiLink,
	)

	go func() {
		if err := whatsapp.SendTextMessage(waPhoneID, waToken, customerNumber, msgBody); err != nil {
			slog.Error("failed to send UPI link", "order", orderNumber, "err", err)
		}
	}()

	writeJSON(w, http.StatusOK, map[string]string{
		"upi_link": upiLink,
		"message":  "payment link sent to customer",
	})
}

// ─── PATCH /api/orders/{id}/payment ──────────────────────────────────────────
// Confirms payment and records the transaction.

type confirmPaymentReq struct {
	Amount         float64 `json:"amount"`
	Method         string  `json:"method"`          // upi | cod | bank
	TransactionRef string  `json:"transaction_ref"` // UPI ref / bank ref
	ScreenshotURL  string  `json:"screenshot_url"`  // URL of uploaded screenshot
}

func (h *OrderHandler) ConfirmPayment(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromCtx(r.Context())
	orderID := chi.URLParam(r, "id")

	var req confirmPaymentReq
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Method == "" {
		writeError(w, http.StatusBadRequest, "method is required (upi | cod | bank)", "validation_error")
		return
	}
	if req.Method != "upi" && req.Method != "cod" && req.Method != "bank" {
		writeError(w, http.StatusBadRequest, "method must be one of: upi, cod, bank", "validation_error")
		return
	}

	ctx := r.Context()

	// ── Plan limit check ──────────────────────────────────────────────────────
	// Free plan: 50 orders/month. Pro plan: unlimited.
	var plan string
	var monthlyCount int
	h.db.QueryRow(ctx, `
		SELECT t.plan, COUNT(o.id)
		FROM tenants t
		LEFT JOIN orders o ON o.tenant_id = t.id
			AND DATE_TRUNC('month', o.created_at) = DATE_TRUNC('month', NOW())
			AND o.status != 'cancelled'
		WHERE t.id = $1
		GROUP BY t.plan
	`, tenantID).Scan(&plan, &monthlyCount)

	if plan == "free" && monthlyCount >= 50 {
		writeError(w, http.StatusPaymentRequired,
			"You've reached the 50 orders/month limit on the free plan. Upgrade to Pro (₹299 for 3 months) for unlimited orders.",
			"plan_limit_exceeded")
		return
	}

	tx, err := h.db.Begin(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db error", "server_error")
		return
	}
	defer tx.Rollback(ctx)

	result, err := tx.Exec(ctx, `
		UPDATE orders SET payment_status = 'paid', payment_method = $1, updated_at = NOW()
		WHERE id = $2::uuid AND tenant_id = $3 AND payment_status = 'pending'
	`, req.Method, orderID, tenantID)
	if err != nil || result.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "order not found or payment already confirmed", "not_found")
		return
	}

	tx.Exec(ctx, `
		INSERT INTO transactions (tenant_id, order_id, amount, method, transaction_ref, screenshot_url, is_verified)
		VALUES ($1, $2::uuid, $3, $4, NULLIF($5,''), NULLIF($6,''), TRUE)
	`, tenantID, orderID, req.Amount, req.Method, req.TransactionRef, req.ScreenshotURL)

	if err := tx.Commit(ctx); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to commit", "server_error")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"payment_status": "paid"})
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

func (h *OrderHandler) fetchItems(ctx context.Context, orderID uuid.UUID) []models.OrderItem {
	rows, err := h.db.Query(ctx, `
		SELECT id, order_id, name, qty, unit_price, (qty * unit_price) AS subtotal
		FROM order_items WHERE order_id = $1 ORDER BY id
	`, orderID)
	if err != nil {
		return nil
	}
	defer rows.Close()
	items := make([]models.OrderItem, 0)
	for rows.Next() {
		var item models.OrderItem
		rows.Scan(&item.ID, &item.OrderID, &item.Name, &item.Qty, &item.UnitPrice, &item.Subtotal)
		items = append(items, item)
	}
	return items
}

// ─── PATCH /api/orders/{id}/items ─────────────────────────────────────────────
func (h *OrderHandler) UpdateItems(w http.ResponseWriter, r *http.Request) {
	tenantID := middleware.TenantIDFromCtx(r.Context())
	orderID := chi.URLParam(r, "id")
	var req struct {
		Items []struct {
			Name  string  `json:"name"`
			Qty   float64 `json:"qty"`
			Unit  string  `json:"unit"`
			Price float64 `json:"price"`
		} `json:"items"`
		Notes string `json:"notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body", "bad_request")
		return
	}
	ctx := r.Context()
	tx, err := h.db.Begin(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "tx failed", "server_error")
		return
	}
	defer tx.Rollback(ctx)
	// Recalculate total
	var total float64
	for _, it := range req.Items {
		total += it.Qty * it.Price
	}
	// Delete old items and update order
	tx.Exec(ctx, `DELETE FROM order_items WHERE order_id = $1`, orderID)
	tx.Exec(ctx, `UPDATE orders SET total_amount=$1, notes=$2, updated_at=NOW() WHERE id=$3::uuid AND tenant_id=$4`,
		total, req.Notes, orderID, tenantID)
	for _, it := range req.Items {
		tx.Exec(ctx, `INSERT INTO order_items (order_id, name, qty, unit_price) VALUES ($1::uuid,$2,$3,$4)`,
			orderID, it.Name, it.Qty, it.Price)
	}
	tx.Commit(ctx)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

// ─── ORDER STATUS MESSAGES ────────────────────────────────────────────────────
// Plain text WhatsApp messages sent to customers on each status change.
// These work immediately without Meta template approval.

func orderStatusMessage(status, orderNumber string, items []models.OrderItem) string {
	// Build item summary block
	itemLines := ""
	var total float64
	for _, it := range items {
		lineTotal := float64(it.Qty) * it.UnitPrice
		total += lineTotal
		itemLines += fmt.Sprintf("\n  • %s × %d — ₹%.0f", it.Name, it.Qty, lineTotal)
	}
	itemBlock := ""
	if len(items) > 0 {
		itemBlock = "\n\n📋 *Your order:*" + itemLines + fmt.Sprintf("\n  ─────────────\n  *Total: ₹%.0f*", total)
	}

	switch status {
	case "confirmed":
		return "✅ *Order Confirmed!*\n\nHi! Your order *#" + orderNumber + "* has been confirmed and is being prepared." + itemBlock + "\n\nWe'll update you as it progresses. Thank you! 🙏"
	case "packed":
		return "📦 *Order Packed!*\n\nYour order *#" + orderNumber + "* is packed and ready for pickup." + itemBlock + "\n\nWe'll notify you once it's on the way!"
	case "dispatched":
		return "🚚 *Order Dispatched!*\n\nYour order *#" + orderNumber + "* is on its way to you!" + itemBlock + "\n\nPlease be available to receive your order."
	case "delivered":
		return "🎉 *Order Delivered!*\n\nYour order *#" + orderNumber + "* has been delivered successfully." + itemBlock + "\n\nThank you for choosing us. Feel free to message us anytime 😊"
	case "cancelled":
		return "❌ *Order Cancelled*\n\nYour order *#" + orderNumber + "* has been cancelled." + itemBlock
	default:
		return ""
	}
}
