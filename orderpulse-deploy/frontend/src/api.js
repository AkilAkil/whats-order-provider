// api.js — all calls to the OrderPulse Go backend
// The Vite dev proxy forwards /api/* → http://localhost:8080

const BASE = '/api'

function getToken() {
  return localStorage.getItem('op_token')
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`,
  }
}

async function request(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw { status: res.status, ...data }
  return data
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function login(email, password) {
  const res = await fetch(BASE + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw data
  localStorage.setItem('op_token', data.token)
  return data
}

export function logout() {
  localStorage.removeItem('op_token')
}

export function isLoggedIn() {
  return !!getToken()
}

// ── Onboarding ────────────────────────────────────────────────────────────────
export async function signup(businessName, ownerName, email, password) {
  const res = await fetch(BASE + '/onboarding/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ business_name: businessName, owner_name: ownerName, email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw data
  localStorage.setItem('op_token', data.token)
  return data
}

export async function connectWABA(code) {
  return request('POST', '/onboarding/whatsapp/callback', { code })
}

export async function getOnboardingStatus() {
  return request('GET', '/onboarding/status')
}

export async function disconnectWABA() {
  return request('DELETE', '/onboarding/whatsapp')
}

// ── Stats ─────────────────────────────────────────────────────────────────────
export async function getStats() {
  return request('GET', '/stats')
}

// ── Inbox ─────────────────────────────────────────────────────────────────────
export async function getInbox() {
  return request('GET', '/inbox')
}

export async function getMessages(contactId) {
  return request('GET', `/inbox/${contactId}/messages`)
}

export async function sendReply(contactId, body) {
  return request('POST', `/inbox/${contactId}/reply`, { body })
}

// ── Orders ────────────────────────────────────────────────────────────────────
export async function getOrders(status, paymentStatus) {
  let q = []
  if (status) q.push(`status=${status}`)
  if (paymentStatus) q.push(`payment_status=${paymentStatus}`)
  return request('GET', `/orders${q.length ? '?' + q.join('&') : ''}`)
}

export async function getOrder(id) {
  return request('GET', `/orders/${id}`)
}

export async function createOrder(contactId, items, notes, sourceMsgId) {
  return request('POST', '/orders', {
    contact_id: contactId,
    items: items.map(i => ({ name: i.name, qty: i.qty, unit_price: i.price })),
    notes: notes || '',
    source_msg_id: sourceMsgId || undefined,
  })
}

export async function updateOrderStatus(id, status) {
  return request('PATCH', `/orders/${id}/status`, { status })
}

export async function cancelOrder(id, reason) {
  return request('POST', `/orders/${id}/cancel`, { reason: reason || '' })
}

export async function sendUPILink(id, upiVpa) {
  return request('POST', `/orders/${id}/upi-link`, { upi_vpa: upiVpa })
}

export async function confirmPayment(id, amount, method, ref, screenshotUrl) {
  return request('PATCH', `/orders/${id}/payment`, {
    amount,
    method,
    transaction_ref: ref || '',
    screenshot_url: screenshotUrl || '',
  })
}
