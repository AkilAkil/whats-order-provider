# WhatsApp Message Templates

These templates must be approved in **Meta Business Manager** before they can be used.

## Where to Register

Meta Business Manager → WhatsApp Manager → Message Templates → Create Template

**Category**: `TRANSACTIONAL`  
**Language**: `English (en)`

---

## Required Templates

### 1. `order_confirmed`

> Your order *{{1}}* is confirmed! 🎉 We'll update you as it's prepared.

| Field | Value |
|-------|-------|
| Name | `order_confirmed` |
| Category | Transactional |
| Body | `Your order *{{1}}* is confirmed! 🎉 We'll update you as it's prepared.` |
| Variable 1 | Order number (e.g. ORD-20240228-001) |

---

### 2. `order_packed`

> Good news! Your order *{{1}}* is packed and ready 📦

| Field | Value |
|-------|-------|
| Name | `order_packed` |
| Body | `Good news! Your order *{{1}}* is packed and ready 📦` |

---

### 3. `order_dispatched`

> Your order *{{1}}* is on the way 🚚 You'll receive it soon!

| Field | Value |
|-------|-------|
| Name | `order_dispatched` |
| Body | `Your order *{{1}}* is on the way 🚚 You'll receive it soon!` |

---

### 4. `order_delivered`

> Your order *{{1}}* has been delivered ✅ Thank you for your order!

| Field | Value |
|-------|-------|
| Name | `order_delivered` |
| Body | `Your order *{{1}}* has been delivered ✅ Thank you for your order!` |

---

### 5. `order_cancelled`

> Your order *{{1}}* has been cancelled. Please contact us if you have questions.

| Field | Value |
|-------|-------|
| Name | `order_cancelled` |
| Body | `Your order *{{1}}* has been cancelled. Please contact us if you have questions.` |

---

## Approval Timeline

Meta typically approves templates within **5 minutes to 24 hours**.

Templates in `APPROVED` status can be used immediately in production.  
Templates in `PENDING` or `REJECTED` status will cause the status notification to fail silently
(the order status is still updated in the DB — only the customer notification is skipped).

## Customising Templates

Update the `orderStatusTemplates` map in `internal/whatsapp/meta_api.go` if you rename or
change the template structure. The variable order must match — `{{1}}` = order number.
