/**
 * OrderPulse — WhatsApp Embedded Signup (Frontend)
 *
 * This is the ONLY frontend code needed to connect a client's WhatsApp.
 * Everything else (token exchange, WABA discovery, webhook subscription,
 * database storage, test message, activation) is handled by the backend.
 *
 * ── Setup (one-time, in Meta App Dashboard) ──────────────────────────────────
 *
 *  1. Meta App Dashboard → WhatsApp → Embedded Signup
 *  2. Add your frontend domain to "Allowed Domains"
 *  3. Create a signup "Configuration" → note the config_id
 *  4. App Settings → Basic → note App ID (goes into FB.init below)
 *
 * ── Add the Facebook JS SDK to index.html ────────────────────────────────────
 *
 *  <script>
 *    window.fbAsyncInit = function() {
 *      FB.init({
 *        appId: 'YOUR_META_APP_ID',   // Same as META_APP_ID in backend .env
 *        autoLogAppEvents: true,
 *        xfbml: true,
 *        version: 'v19.0'
 *      });
 *    };
 *  </script>
 *  <script async defer crossorigin="anonymous"
 *    src="https://connect.facebook.net/en_US/sdk.js"></script>
 */

/**
 * launchEmbeddedSignup
 *
 * Opens the Meta Embedded Signup popup. When the user approves,
 * the code is immediately sent to the backend for automated processing.
 *
 * @param {string}   jwtToken   - JWT from the signup step (Authorization header)
 * @param {string}   configId   - Meta Embedded Signup configuration ID
 * @param {string}   apiBase    - Backend API base URL (e.g. "https://api.yourdomain.com")
 * @param {function} onSuccess  - Called with { whatsapp_number, business_name, waba_id }
 * @param {function} onError    - Called with error message string
 */
export function launchEmbeddedSignup(jwtToken, configId, apiBase, onSuccess, onError) {
  if (!window.FB) {
    onError("Facebook SDK not loaded. Please refresh the page and try again.");
    return;
  }

  window.FB.login(
    async (response) => {
      // User cancelled or closed the popup
      if (!response || response.status !== "connected" || !response.authResponse) {
        onError("WhatsApp login was cancelled. Please try again.");
        return;
      }

      // Meta returns a short-lived `code` (not accessToken) when using Embedded Signup.
      // IMPORTANT: Send this to the backend IMMEDIATELY — it expires in minutes.
      const code = response.authResponse.code;
      if (!code) {
        onError("No authorisation code received from Meta. Please try again.");
        return;
      }

      try {
        // POST code to backend — backend runs the full automated pipeline
        const res = await fetch(`${apiBase}/api/onboarding/whatsapp/callback`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${jwtToken}`,
          },
          body: JSON.stringify({ code }),
        });

        const data = await res.json();

        if (!res.ok) {
          // data.error contains a user-friendly message from the backend
          onError(data.error || "WhatsApp connection failed. Please try again.");
          return;
        }

        // onboarding_status === "active" means fully connected
        onSuccess({
          whatsapp_number: data.whatsapp_number,
          business_name:   data.business_name,
          waba_id:         data.waba_id,
          message:         data.message,
        });

      } catch (networkErr) {
        onError("Network error. Please check your connection and try again.");
      }
    },
    {
      config_id: configId,
      response_type: "code",            // MUST be "code" for server-side exchange
      override_default_response_type: true,
      extras: {
        setup: {},
        featurize: {
          messaging_product: "whatsapp",
        },
      },
    }
  );
}

// ─── React component example ──────────────────────────────────────────────────
/*
import React, { useState } from "react";
import { launchEmbeddedSignup } from "./embeddedSignup";

const META_CONFIG_ID = process.env.REACT_APP_META_CONFIG_ID;
const API_BASE = process.env.REACT_APP_API_BASE || "";

export function ConnectWhatsApp({ jwtToken, onConnected }) {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  const handleConnect = () => {
    setStatus("connecting");
    setError(null);

    launchEmbeddedSignup(
      jwtToken,
      META_CONFIG_ID,
      API_BASE,
      (result) => {
        setStatus("success");
        onConnected(result);
      },
      (errMsg) => {
        setStatus("error");
        setError(errMsg);
      }
    );
  };

  return (
    <div className="connect-whatsapp">
      {status === "idle" && (
        <button onClick={handleConnect} className="btn-connect">
          <WhatsAppIcon /> Connect WhatsApp
        </button>
      )}

      {status === "connecting" && (
        <div className="connecting">
          <Spinner />
          <p>Connecting your WhatsApp Business Account...</p>
          <small>This takes about 5 seconds</small>
        </div>
      )}

      {status === "success" && (
        <div className="success">
          <CheckIcon />
          <p>WhatsApp connected! Redirecting to dashboard...</p>
        </div>
      )}

      {status === "error" && (
        <div className="error">
          <p className="error-msg">{error}</p>
          <button onClick={handleConnect}>Try Again</button>
        </div>
      )}
    </div>
  );
}
*/

// ─── What the backend does with the code ─────────────────────────────────────
/*
POST /api/onboarding/whatsapp/callback  { "code": "AQD...xyz" }

Backend pipeline (fully automated, ~3-5 seconds):

  Step 1 token_exchange
    → Exchange code for short-lived user access token (Meta OAuth)

  Step 2 token_extend
    → Exchange short-lived → 60-day long-lived token
    → Fallback to short-lived if this fails (logged as warning)

  Step 3 waba_discovery
    → GET /me/businesses?fields=id,name
    → Find all WhatsApp Business Accounts the user granted access to
    → Use the first one (or let user choose for multi-WABA businesses)

  Step 4 phone_fetch
    → GET /{waba_id}/phone_numbers?fields=id,display_phone_number,status
    → Get all registered phone numbers on this WABA
    → Select preferred number (from request) or first available

  Step 5 webhook_subscribe   ← THE CRITICAL STEP
    → POST /{waba_id}/subscribed_apps
    → Makes Meta route ALL messages for this WABA to our shared
      https://yourdomain.com/webhook/whatsapp endpoint
    → NO manual Meta dashboard action needed per client — ever

  Step 6 db_save
    → UPDATE tenants SET waba_id, whatsapp_number, wa_phone_id,
                         wa_access_token, onboarding_status = 'active'
    → Tenant is now live

  Bonus test_message (async, non-fatal)
    → Sends "You're connected!" to the business number to confirm
      end-to-end message delivery works

Response: { onboarding_status: "active", whatsapp_number: "+91...", waba_id: "..." }

─── Webhook routing after activation ────────────────────────────────────────

Customer messages Client A's number (+91-XXXXXXX):
  Meta → POST /webhook/whatsapp
    payload.metadata.display_phone_number = "+91XXXXXXX"
    backend: SELECT id FROM tenants WHERE whatsapp_number = '+91XXXXXXX' AND onboarding_status = 'active'
    → Found tenant A → store message under tenant_id_A
    → Client B never sees it

Customer messages Client B's number (+91-YYYYYYY):
  Meta → same /webhook/whatsapp
    → Found tenant B → store under tenant_id_B
    → Client A never sees it
*/
