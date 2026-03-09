# Edge Functions Reference

Complete documentation of all Supabase Edge Functions in this project.

## Overview

Edge functions handle server-side logic that can't run in the browser:
- AI operations requiring API keys
- Email/SMS sending
- Webhook processing
- Scheduled jobs

## Deployment

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy generate-messages

# View logs
supabase functions logs generate-messages
```

---

## Function Reference

### generate-messages

**Purpose**: Generate AI-powered outreach messages for leads.

**Endpoint**: `POST /functions/v1/generate-messages`

**Auth**: Required (Bearer token)

**Request**:
```json
{
  "campaign_id": "uuid",
  "workspace_id": "uuid",
  "lead_ids": ["uuid1", "uuid2"],
  "playbook_id": "uuid"
}
```

**Response**:
```json
{
  "generated": 5,
  "failed": 0,
  "messages": [...]
}
```

**Secrets Required**: `LOVABLE_API_KEY`

---

### send-messages

**Purpose**: Send approved messages via email or SMS.

**Endpoint**: `POST /functions/v1/send-messages`

**Auth**: Required

**Request**:
```json
{
  "campaign_id": "uuid",
  "workspace_id": "uuid"
}
```

**Logic**:
1. Fetches all approved, unsent messages for the campaign
2. Resolves credentials from `workspace_integrations` (or global env for founder)
3. Sends via Resend (email) or Twilio (SMS/WhatsApp)
4. Updates `sent_at` and `delivered_at` timestamps
5. Logs activity

**Secrets Required**: 
- `RESEND_API_KEY` (email)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` (SMS)

---

### enrich-leads

**Purpose**: Enrich lead data with AI-powered insights.

**Endpoint**: `POST /functions/v1/enrich-leads`

**Auth**: Required

**Request**:
```json
{
  "workspace_id": "uuid",
  "lead_ids": ["uuid1", "uuid2"]
}
```

**Enrichment Data**:
- Revival score (0-100)
- Revival bucket (revive_now, review_first, nurture_later, suppress)
- Best channel recommendation
- Best messaging angle
- Suggested CTA
- Risk flags

**Secrets Required**: `LOVABLE_API_KEY`

---

### email-tracking

**Purpose**: Track email opens and clicks via pixel/redirect.

**Endpoint**: `GET /functions/v1/email-tracking`

**Auth**: None (public)

**Query Params**:
- `mid`: Message ID
- `action`: `open` or `click`
- `url`: (for clicks) Original URL to redirect to

**Logic**:
- Open: Returns 1x1 transparent GIF, updates `opened_at`
- Click: Updates `clicked_at`, redirects to original URL

---

### reply-webhook

**Purpose**: Handle inbound email replies.

**Endpoint**: `POST /functions/v1/reply-webhook`

**Auth**: None (webhook signature validation)

**Payload**: Depends on email provider (Resend, SendGrid, etc.)

**Updates**: Sets `replied_at` on matching message

---

### crm-webhook

**Purpose**: Receive updates from external CRMs.

**Endpoint**: `POST /functions/v1/crm-webhook`

**Auth**: None (signature validation recommended)

**Supported Events**:
- Lead created/updated
- Deal stage changed
- Contact opted out

---

### crm-outbound-sync

**Purpose**: Push lead/message updates to external CRMs.

**Endpoint**: `POST /functions/v1/crm-outbound-sync`

**Auth**: Required

**Request**:
```json
{
  "workspace_id": "uuid",
  "event_type": "lead_updated",
  "payload": {...}
}
```

---

### map-csv-fields

**Purpose**: AI-powered CSV column mapping for lead imports.

**Endpoint**: `POST /functions/v1/map-csv-fields`

**Auth**: Required

**Request**:
```json
{
  "headers": ["Name", "Email Address", "Phone #"],
  "sample_rows": [["John", "john@example.com", "555-1234"]]
}
```

**Response**:
```json
{
  "mappings": {
    "Name": "first_name",
    "Email Address": "email",
    "Phone #": "phone"
  }
}
```

---

### write-with-ai

**Purpose**: General AI writing assistant.

**Endpoint**: `POST /functions/v1/write-with-ai`

**Auth**: Required

**Request**:
```json
{
  "prompt": "Write a follow-up email...",
  "workspace_id": "uuid",
  "context": {...}
}
```

---

### sequence-scheduler

**Purpose**: Process scheduled sequence steps.

**Endpoint**: `POST /functions/v1/sequence-scheduler`

**Auth**: Service role (called by cron)

**Logic**:
1. Finds messages due to be sent based on playbook sequence
2. Generates messages for next step
3. Auto-approves or queues for review based on settings

---

### paypal-setup

**Purpose**: Initialize PayPal products and plans.

**Endpoint**: `POST /functions/v1/paypal-setup`

**Auth**: Admin only

---

### paypal-webhook

**Purpose**: Handle PayPal subscription events.

**Endpoint**: `POST /functions/v1/paypal-webhook`

**Auth**: None (PayPal signature validation)

**Events Handled**:
- `BILLING.SUBSCRIPTION.ACTIVATED`
- `BILLING.SUBSCRIPTION.CANCELLED`
- `BILLING.SUBSCRIPTION.SUSPENDED`
- `PAYMENT.SALE.COMPLETED`

---

### paypal-create-subscription

**Purpose**: Record new subscription after PayPal approval.

**Endpoint**: `POST /functions/v1/paypal-create-subscription`

**Auth**: Required

**Request**:
```json
{
  "paypal_subscription_id": "I-ABC123",
  "plan_name": "growth",
  "workspace_id": "uuid",
  "amount": 49,
  "billing_cycle": "monthly"
}
```

---

### paypal-config

**Purpose**: Get PayPal client ID and plan details.

**Endpoint**: `GET /functions/v1/paypal-config`

**Auth**: None (public info only)

**Response**:
```json
{
  "clientId": "AaBb...",
  "plans": [...]
}
```

---

### admin-ai-usage

**Purpose**: Admin dashboard for AI usage across workspaces.

**Endpoint**: `POST /functions/v1/admin-ai-usage`

**Auth**: Admin role required

---

### admin-suspend-workspace

**Purpose**: Suspend/unsuspend workspace AI access.

**Endpoint**: `POST /functions/v1/admin-suspend-workspace`

**Auth**: Admin role required

**Request**:
```json
{
  "workspace_id": "uuid",
  "suspend": true,
  "reason": "Policy violation"
}
```

---

### weekly-limit-check

**Purpose**: Send weekly usage notifications.

**Endpoint**: `POST /functions/v1/weekly-limit-check`

**Auth**: Service role (cron)

**Actions**:
- Checks workspaces approaching plan limits
- Sends notification emails
- Logs warnings

---

### send-notification-email

**Purpose**: Send system notification emails.

**Endpoint**: `POST /functions/v1/send-notification-email`

**Auth**: Service role

**Request**:
```json
{
  "to": "user@example.com",
  "template": "limit_warning",
  "data": {...}
}
```

---

### test-integration

**Purpose**: Test workspace integration credentials.

**Endpoint**: `POST /functions/v1/test-integration`

**Auth**: Required

**Request**:
```json
{
  "workspace_id": "uuid",
  "provider": "resend",
  "credentials": {...}
}
```

---

## Configuration

All functions share `supabase/config.toml`:

```toml
[functions.generate-messages]
verify_jwt = false  # JWT validated in code

[functions.email-tracking]
verify_jwt = false  # Public endpoint
```

## Error Handling

All functions return consistent error format:

```json
{
  "error": "Error message here"
}
```

HTTP Status Codes:
- `200`: Success
- `400`: Bad request (missing params)
- `401`: Unauthorized
- `403`: Forbidden (wrong workspace, etc.)
- `500`: Internal error

## Rate Limiting

AI functions check limits via `check_ai_rate_limit()` database function:

```typescript
const { data } = await supabase.rpc('check_ai_rate_limit', {
  _workspace_id: workspaceId,
  _function_name: 'generate-messages'
});

if (!data.allowed) {
  return new Response(JSON.stringify({ error: data.reason }), { status: 429 });
}
```
