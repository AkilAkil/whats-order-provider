// Package models defines all domain types shared across the application.
// These structs map directly to database rows and are used as API response bodies.
package models

import (
	"time"

	"github.com/google/uuid"
)

// ─── TENANT ───────────────────────────────────────────────────────────────────

// OnboardingStatus tracks where a tenant is in the WhatsApp connection flow.
type OnboardingStatus string

const (
	OnboardingPending            OnboardingStatus = "pending"             // Account created, WA not connected
	OnboardingTokenExchanged     OnboardingStatus = "token_exchanged"     // Got Meta access token
	OnboardingPhoneRegistered    OnboardingStatus = "phone_registered"    // Phone number identified
	OnboardingWebhookSubscribed  OnboardingStatus = "webhook_subscribed"  // Subscribed to WABA events
	OnboardingActive             OnboardingStatus = "active"              // Fully operational
	OnboardingFailed             OnboardingStatus = "failed"              // Error — can retry
)

// Tenant represents one business (client) using OrderPulse.
// Each tenant has their own WhatsApp Business Account (WABA) connected via
// Meta Embedded Signup. All their data is row-isolated by tenant_id.
type Tenant struct {
	ID               uuid.UUID        `json:"id"`
	BusinessName     string           `json:"business_name"`
	WhatsappNumber   string           `json:"whatsapp_number"`   // e.g. +919876543210
	WaPhoneID        string           `json:"-"`                 // Meta phone_number_id — never sent to frontend
	WaAccessToken    string           `json:"-"`                 // Meta access token — never sent to frontend
	WabaID           *string          `json:"waba_id,omitempty"` // Meta WABA ID
	Plan             string           `json:"plan"`
	OnboardingStatus OnboardingStatus `json:"onboarding_status"`
	OnboardingError  *string          `json:"onboarding_error,omitempty"`
	IsActive         bool             `json:"is_active"`
	ActivatedAt      *time.Time       `json:"activated_at,omitempty"`
	CreatedAt        time.Time        `json:"created_at"`
	UpdatedAt        time.Time        `json:"updated_at"`
}

// ─── USER ─────────────────────────────────────────────────────────────────────

// User is a dashboard user belonging to one tenant.
// Role is "owner" (full access) or "staff" (limited access).
type User struct {
	ID        uuid.UUID `json:"id"`
	TenantID  uuid.UUID `json:"tenant_id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	Role      string    `json:"role"` // owner | staff
	CreatedAt time.Time `json:"created_at"`
}

// ─── ONBOARDING EVENTS ────────────────────────────────────────────────────────

// OnboardingEvent is one step in the WABA onboarding audit trail.
// Every pipeline step (success or failure) is recorded here.
type OnboardingEvent struct {
	ID        uuid.UUID `json:"id"`
	TenantID  uuid.UUID `json:"tenant_id"`
	Step      string    `json:"step"`
	Status    string    `json:"status"` // success | failed
	Detail    *string   `json:"detail,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

// ─── CONTACT ──────────────────────────────────────────────────────────────────

// Contact is a WhatsApp customer who has messaged this business.
// UNIQUE per (tenant_id, wa_number) — same phone can exist across tenants.
type Contact struct {
	ID         uuid.UUID  `json:"id"`
	TenantID   uuid.UUID  `json:"tenant_id"`
	WaNumber   string     `json:"wa_number"`
	Name       *string    `json:"name"`
	OrderCount int        `json:"order_count"`
	LastSeen   *time.Time `json:"last_seen"`
	CreatedAt  time.Time  `json:"created_at"`
}

// ─── MESSAGE ──────────────────────────────────────────────────────────────────

type Direction string
type MessageType string

const (
	DirInbound  Direction   = "inbound"
	DirOutbound Direction   = "outbound"
	TypeText    MessageType = "text"
	TypeImage   MessageType = "image"
	TypeAudio   MessageType = "audio"
	TypeDoc     MessageType = "document"
	TypeTmpl    MessageType = "template"
)

// Message is one WhatsApp message exchanged between the business and a customer.
// Inbound = customer sent it. Outbound = business sent it via the dashboard.
// wa_msg_id carries Meta's message ID and has a UNIQUE constraint to ensure
// webhook retries never store duplicates (idempotency).
type Message struct {
	ID        uuid.UUID   `json:"id"`
	TenantID  uuid.UUID   `json:"tenant_id"`
	ContactID uuid.UUID   `json:"contact_id"`
	WaMsgID   *string     `json:"wa_msg_id,omitempty"`
	Direction Direction   `json:"direction"`
	Type      MessageType `json:"type"`
	Body      *string     `json:"body"`
	MediaURL  *string     `json:"media_url,omitempty"`
	IsTagged       bool        `json:"is_tagged"`
	ExtractedOrder *string     `json:"extracted_order,omitempty"` // JSON blob of parsed order items
	CreatedAt      time.Time   `json:"created_at"`
}

// ChatThread is the inbox view: contact + last message + unread count.
type ChatThread struct {
	Contact     Contact `json:"contact"`
	LastMessage Message `json:"last_message"`
	UnreadCount int     `json:"unread_count"`
}

// ─── ORDER ────────────────────────────────────────────────────────────────────

type OrderStatus string
type PaymentStatus string
type PaymentMethod string

const (
	StatusNew        OrderStatus = "new"
	StatusConfirmed  OrderStatus = "confirmed"
	StatusPacked     OrderStatus = "packed"
	StatusDispatched OrderStatus = "dispatched"
	StatusDelivered  OrderStatus = "delivered"
	StatusCancelled  OrderStatus = "cancelled"

	PayPending PaymentStatus = "pending"
	PayPaid    PaymentStatus = "paid"
	PayFailed  PaymentStatus = "failed"

	MethodUPI  PaymentMethod = "upi"
	MethodCOD  PaymentMethod = "cod"
	MethodBank PaymentMethod = "bank"
)

// StatusFlow defines the allowed linear progression of order statuses.
// Orders can only advance forward, never skip steps, and cancelled is terminal.
var StatusFlow = []OrderStatus{
	StatusNew,
	StatusConfirmed,
	StatusPacked,
	StatusDispatched,
	StatusDelivered,
}

// NextStatus returns the next valid status after current, and whether one exists.
func NextStatus(current OrderStatus) (OrderStatus, bool) {
	for i, s := range StatusFlow {
		if s == current && i < len(StatusFlow)-1 {
			return StatusFlow[i+1], true
		}
	}
	return "", false
}

// CanCancel returns true if the order is in a cancellable state.
func CanCancel(current OrderStatus) bool {
	return current == StatusNew || current == StatusConfirmed
}

// Order represents one customer order created from a WhatsApp conversation.
type Order struct {
	ID            uuid.UUID      `json:"id"`
	TenantID      uuid.UUID      `json:"tenant_id"`
	ContactID     uuid.UUID      `json:"contact_id"`
	OrderNumber   string         `json:"order_number"`
	Status        OrderStatus    `json:"status"`
	PaymentStatus PaymentStatus  `json:"payment_status"`
	PaymentMethod *PaymentMethod `json:"payment_method,omitempty"`
	TotalAmount   float64        `json:"total_amount"`
	Notes         *string        `json:"notes,omitempty"`
	SourceMsgID   *uuid.UUID     `json:"source_msg_id,omitempty"`
	Items         []OrderItem    `json:"items"`
	Contact       *Contact       `json:"contact,omitempty"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
}

// OrderItem is one line item within an order.
type OrderItem struct {
	ID        uuid.UUID `json:"id"`
	OrderID   uuid.UUID `json:"order_id"`
	Name      string    `json:"name"`
	Qty       int       `json:"qty"`
	UnitPrice float64   `json:"unit_price"`
	Subtotal  float64   `json:"subtotal"` // computed: qty * unit_price
}

// ─── TRANSACTION ──────────────────────────────────────────────────────────────

// Transaction records a payment against an order.
type Transaction struct {
	ID             uuid.UUID      `json:"id"`
	TenantID       uuid.UUID      `json:"tenant_id"`
	OrderID        uuid.UUID      `json:"order_id"`
	Amount         float64        `json:"amount"`
	Method         PaymentMethod  `json:"method"`
	TransactionRef *string        `json:"transaction_ref,omitempty"`
	ScreenshotURL  *string        `json:"screenshot_url,omitempty"`
	IsVerified     bool           `json:"is_verified"`
	CreatedAt      time.Time      `json:"created_at"`
}

// ─── API TYPES ────────────────────────────────────────────────────────────────

// DashboardStats is returned by GET /api/stats.
type TopItem struct {
	Name       string  `json:"name"`
	TotalQty   float64 `json:"total_qty"`
	OrderCount int     `json:"order_count"`
}

type DashboardStats struct {
	TotalOrders    int     `json:"total_orders"`
	NewOrders      int     `json:"new_orders"`
	PendingPayment int     `json:"pending_payment"`
	TodayRevenue   float64 `json:"today_revenue"`
	TotalRevenue   float64   `json:"total_revenue"`
	TopItems       []TopItem `json:"top_items"`
}

// ErrorResponse is the standard error envelope for all 4xx / 5xx responses.
type ErrorResponse struct {
	Error string `json:"error"`
	Code  string `json:"code,omitempty"` // Machine-readable error code for frontend routing
}
