// Package whatsapp wraps all Meta WhatsApp Cloud API and Graph API calls.
// It is the only package that makes outbound HTTP requests to Meta's servers.
package whatsapp

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

const graphBase = "https://graph.facebook.com/v19.0"

// metaHTTP is a shared HTTP client for all outbound Meta API calls.
// Configured with a conservative timeout to avoid goroutine leaks.
var metaHTTP = &http.Client{Timeout: 15 * time.Second}

// ─── TOKEN EXCHANGE ───────────────────────────────────────────────────────────

// TokenResponse is returned by Meta's OAuth token endpoints.
type TokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"` // 0 for long-lived tokens
}

// ExchangeCodeForToken exchanges the short-lived code returned by Meta's
// Embedded Signup JS popup for a short-lived user access token.
// This MUST happen server-side — never expose app_secret to the frontend.
//
// The code is single-use and expires within minutes of being issued.
func ExchangeCodeForToken(appID, appSecret, code, redirectURI string) (*TokenResponse, error) {
	params := url.Values{
		"client_id":     {appID},
		"client_secret": {appSecret},
		"code":          {code},
	}
	if redirectURI != "" {
		params.Set("redirect_uri", redirectURI)
	}

	body, err := metaGet(graphBase + "/oauth/access_token?" + params.Encode())
	if err != nil {
		return nil, fmt.Errorf("code exchange: %w", err)
	}
	var t TokenResponse
	if err := json.Unmarshal(body, &t); err != nil {
		return nil, fmt.Errorf("parse token response: %w", err)
	}
	return &t, nil
}

// ExchangeForLongLivedToken upgrades a short-lived (~1hr) user token to a
// long-lived (~60 day) token. Should be called immediately after ExchangeCodeForToken.
// Schedule a proactive refresh job before the 60 days elapse.
// For never-expiring tokens, provision a System User instead (see README).
func ExchangeForLongLivedToken(shortToken, appID, appSecret string) (*TokenResponse, error) {
	params := url.Values{
		"grant_type":        {"fb_exchange_token"},
		"client_id":         {appID},
		"client_secret":     {appSecret},
		"fb_exchange_token": {shortToken},
	}

	body, err := metaGet(graphBase + "/oauth/access_token?" + params.Encode())
	if err != nil {
		return nil, fmt.Errorf("long-lived token exchange: %w", err)
	}
	var t TokenResponse
	if err := json.Unmarshal(body, &t); err != nil {
		return nil, fmt.Errorf("parse long-lived token: %w", err)
	}
	return &t, nil
}

// ─── WABA DISCOVERY ───────────────────────────────────────────────────────────

// WABAInfo holds the details of one WhatsApp Business Account.
type WABAInfo struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// GetUserWABAs returns all WhatsApp Business Accounts the user granted access to
// via Embedded Signup. Uses debug_token to extract WABA IDs from granular_scopes —
// this is the correct approach for Embedded Signup (no business_management needed).
func GetUserWABAs(userToken, appID, appSecret string) ([]WABAInfo, error) {
	// App access token = appID|appSecret (used as Authorization for debug_token)
	appToken := appID + "|" + appSecret
	body, err := metaGet(fmt.Sprintf(
		"%s/debug_token?input_token=%s&access_token=%s",
		graphBase, userToken, appToken,
	))
	if err != nil {
		return nil, fmt.Errorf("fetch WABAs: %w", err)
	}
	var resp struct {
		Data struct {
			GranularScopes []struct {
				Scope     string   `json:"scope"`
				TargetIDs []string `json:"target_ids"`
			} `json:"granular_scopes"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("parse debug_token: %w", err)
	}
	// Extract WABA IDs from whatsapp_business_management scope
	seen := map[string]bool{}
	var wabas []WABAInfo
	for _, s := range resp.Data.GranularScopes {
		if s.Scope == "whatsapp_business_management" {
			for _, id := range s.TargetIDs {
				if !seen[id] {
					seen[id] = true
					wabas = append(wabas, WABAInfo{ID: id, Name: id})
				}
			}
		}
	}
	if len(wabas) == 0 {
		// Log all scopes found to help diagnose
		var scopeNames []string
		for _, s := range resp.Data.GranularScopes {
			scopeNames = append(scopeNames, s.Scope)
		}
		return nil, fmt.Errorf("no WABA IDs found in token scopes. Scopes present: %v", scopeNames)
	}
	return wabas, nil
}

// ─── PHONE NUMBER DISCOVERY ───────────────────────────────────────────────────

// PhoneNumberInfo represents one registered WhatsApp phone number.
type PhoneNumberInfo struct {
	ID                 string `json:"id"`
	DisplayPhoneNumber string `json:"display_phone_number"`
	VerifiedName       string `json:"verified_name"`
	QualityRating      string `json:"quality_rating"`
	Status             string `json:"status"` // CONNECTED | FLAGGED | RESTRICTED | ...
}

// GetWABAPhoneNumbers returns all phone numbers registered under a given WABA.
// The returned ID (phone_number_id) is used for all outbound Cloud API messages.
func GetWABAPhoneNumbers(wabaID, accessToken string) ([]PhoneNumberInfo, error) {
	body, err := metaGet(fmt.Sprintf(
		"%s/%s/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,status&access_token=%s",
		graphBase, wabaID, accessToken,
	))
	if err != nil {
		return nil, fmt.Errorf("fetch phone numbers: %w", err)
	}
	var resp struct {
		Data []PhoneNumberInfo `json:"data"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("parse phone numbers: %w", err)
	}
	return resp.Data, nil
}

// ─── WEBHOOK SUBSCRIPTION ─────────────────────────────────────────────────────

// SubscribeAppToWABA subscribes your application to receive webhook events from
// the given WABA. This is the critical call that makes Meta route all incoming
// messages for this WABA to your single shared /webhook/whatsapp endpoint.
//
// Must be called once per new client during onboarding.
// After this call, Meta will POST to your webhook URL whenever any phone number
// under this WABA receives a message.
//
// No manual Meta dashboard action needed per client — this API call does it all.
func SubscribeAppToWABA(wabaID, accessToken string) error {
	req, err := http.NewRequest(http.MethodPost,
		fmt.Sprintf("%s/%s/subscribed_apps", graphBase, wabaID), nil)
	if err != nil {
		return fmt.Errorf("build subscribe request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := metaHTTP.Do(req)
	if err != nil {
		return fmt.Errorf("subscribe request: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("subscribe failed (%d): %s", resp.StatusCode, body)
	}

	var result map[string]interface{}
	json.Unmarshal(body, &result)
	if success, _ := result["success"].(bool); !success {
		return fmt.Errorf("subscribe returned non-success: %s", body)
	}
	return nil
}

// UnsubscribeAppFromWABA removes the webhook subscription for a WABA.
// Called when a tenant disconnects their WhatsApp from the dashboard.
func UnsubscribeAppFromWABA(wabaID, accessToken string) error {
	req, err := http.NewRequest(http.MethodDelete,
		fmt.Sprintf("%s/%s/subscribed_apps", graphBase, wabaID), nil)
	if err != nil {
		return fmt.Errorf("build unsubscribe request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := metaHTTP.Do(req)
	if err != nil {
		return fmt.Errorf("unsubscribe request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("unsubscribe failed (%d): %s", resp.StatusCode, b)
	}
	return nil
}

// ─── SEND MESSAGES ───────────────────────────────────────────────────────────

// SendTextMessage sends a free-text reply to a customer via the Cloud API.
// Only valid within 24 hours of the customer's last message (Meta's messaging window).
// Outside 24 hours, use SendTemplateMessage instead.
func SendTextMessage(phoneNumberID, accessToken, toNumber, body string) error {
	return sendMessage(phoneNumberID, accessToken, map[string]interface{}{
		"messaging_product": "whatsapp",
		"recipient_type":    "individual",
		"to":                toNumber,
		"type":              "text",
		"text":              map[string]interface{}{"preview_url": false, "body": body},
	})
}

// TemplateComponent defines the variable components in a message template.
type TemplateComponent struct {
	Type       string              `json:"type"`
	Parameters []TemplateParameter `json:"parameters"`
}

// TemplateParameter is one variable substitution in a template body.
type TemplateParameter struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

// SendTemplateMessage sends a pre-approved Meta message template.
// Required for ALL business-initiated messages and messages outside the 24hr window.
//
// Templates must be created and approved in Meta Business Manager before use.
// See docs/whatsapp-templates.md for the required template definitions.
func SendTemplateMessage(phoneNumberID, accessToken, toNumber, templateName, langCode string, components []TemplateComponent) error {
	return sendMessage(phoneNumberID, accessToken, map[string]interface{}{
		"messaging_product": "whatsapp",
		"recipient_type":    "individual",
		"to":                toNumber,
		"type":              "template",
		"template": map[string]interface{}{
			"name":       templateName,
			"language":   map[string]string{"code": langCode},
			"components": components,
		},
	})
}

// ─── STATUS NOTIFICATION TEMPLATES ───────────────────────────────────────────

// OrderStatusNotification sends the appropriate pre-approved template for the
// given order status. Returns false if no template is registered for that status
// (e.g. "new" — no notification needed at order creation).
//
// Template names must match what's registered in Meta Business Manager.
// See docs/whatsapp-templates.md for the full template list.
func OrderStatusNotification(phoneNumberID, accessToken, toNumber string, status, orderNumber string) (bool, error) {
	templateName, ok := orderStatusTemplates[status]
	if !ok {
		return false, nil
	}

	err := SendTemplateMessage(
		phoneNumberID, accessToken, toNumber,
		templateName, "en",
		[]TemplateComponent{{
			Type:       "body",
			Parameters: []TemplateParameter{{Type: "text", Text: orderNumber}},
		}},
	)
	return true, err
}

// orderStatusTemplates maps each order status to the registered Meta template name.
// These names must exactly match the templates approved in Meta Business Manager.
var orderStatusTemplates = map[string]string{
	"confirmed":  "order_confirmed",
	"packed":     "order_packed",
	"dispatched": "order_dispatched",
	"delivered":  "order_delivered",
	"cancelled":  "order_cancelled",
}

// SendTestMessage fires a one-time confirmation to the business owner's number
// to prove end-to-end connectivity after successful onboarding.
func SendTestMessage(phoneNumberID, accessToken, toNumber, businessName string) error {
	msg := fmt.Sprintf(
		"✅ *%s* is now connected to OrderPulse!\n\nYou can start managing WhatsApp orders from your dashboard.",
		businessName,
	)
	return SendTextMessage(phoneNumberID, accessToken, toNumber, msg)
}

// ─── INTERNAL ────────────────────────────────────────────────────────────────

func sendMessage(phoneNumberID, accessToken string, payload interface{}) error {
	b, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal payload: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost,
		fmt.Sprintf("%s/%s/messages", graphBase, phoneNumberID),
		bytes.NewReader(b),
	)
	if err != nil {
		return fmt.Errorf("build send request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := metaHTTP.Do(req)
	if err != nil {
		return fmt.Errorf("send request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		// Parse Meta error for better diagnostics
		var metaErr struct {
			Error struct {
				Message string `json:"message"`
				Code    int    `json:"code"`
			} `json:"error"`
		}
		json.Unmarshal(body, &metaErr)
		if metaErr.Error.Message != "" {
			return fmt.Errorf("meta API error %d (code %d): %s",
				resp.StatusCode, metaErr.Error.Code, metaErr.Error.Message)
		}
		return fmt.Errorf("meta API error %d: %s", resp.StatusCode, body)
	}
	return nil
}

func metaGet(url string) ([]byte, error) {
	resp, err := metaHTTP.Get(url)
	if err != nil {
		return nil, fmt.Errorf("GET %s: %w", url, err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GET %s failed (%d): %s", url, resp.StatusCode, body)
	}
	return body, nil
}
