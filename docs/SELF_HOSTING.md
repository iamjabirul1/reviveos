# Self-Hosting Guide

This guide covers deploying ReviveOS outside of Lovable while maintaining all features.

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│  Supabase Cloud  │────▶│  Edge Functions │
│ (Vercel/Netlify)│     │   (Database)     │     │   (Deno Deploy) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Prerequisites

- Node.js 18+ and npm
- Supabase CLI (`npm install -g supabase`)
- A Supabase account (free tier works)
- Vercel/Netlify account (for frontend hosting)

---

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down:
   - **Project URL**: `https://[PROJECT_ID].supabase.co`
   - **Anon Key**: Found in Settings → API
   - **Service Role Key**: Found in Settings → API (keep secret!)

---

## Step 2: Set Up Database Schema

### Option A: Using Supabase CLI (Recommended)

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_ID

# Push all migrations
supabase db push
```

### Option B: Manual SQL Execution

Run the SQL files in `supabase/migrations/` in order via the Supabase SQL Editor.

### Core Tables Created

| Table | Purpose |
|-------|---------|
| `workspaces` | Multi-tenant workspace isolation |
| `leads` | Lead/contact data with scoring |
| `campaigns` | Outreach campaign management |
| `messages` | Email/SMS message queue |
| `playbooks` | AI prompt templates |
| `subscriptions` | PayPal subscription tracking |
| `workspace_integrations` | Per-workspace API credentials |

---

## Step 3: Deploy Edge Functions

Edge functions handle AI generation, email sending, webhooks, etc.

### Using Supabase CLI

```bash
# Deploy all functions
supabase functions deploy

# Or deploy individually
supabase functions deploy generate-messages
supabase functions deploy send-messages
supabase functions deploy enrich-leads
# ... etc
```

### Required Secrets

Set these in Supabase Dashboard → Edge Functions → Secrets:

```bash
# Required for all installations
SUPABASE_URL=https://[PROJECT_ID].supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI (using Lovable AI - get key from lovable.dev)
LOVABLE_API_KEY=your-lovable-api-key

# Email sending
RESEND_API_KEY=your-resend-api-key

# SMS/WhatsApp (optional)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

# Payments (optional)
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_SECRET_KEY=your-paypal-secret
```

---

## Step 4: Configure Authentication

### Email Templates

1. Go to Supabase Dashboard → Authentication → Email Templates
2. Customize confirmation, reset password, and magic link emails

### Auth Settings

1. Go to Authentication → URL Configuration
2. Set **Site URL** to your production domain (e.g., `https://app.yourdomain.com`)
3. Add redirect URLs for login callbacks

### Social Auth (Optional)

Enable Google, GitHub, etc. in Authentication → Providers.

---

## Step 5: Deploy Frontend

### Vercel Deployment

1. Push code to GitHub
2. Import project in [vercel.com](https://vercel.com)
3. Set environment variables:

```env
VITE_SUPABASE_URL=https://[PROJECT_ID].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=[PROJECT_ID]
```

4. Deploy settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Netlify Deployment

1. Push code to GitHub
2. Import in [netlify.com](https://netlify.com)
3. Set environment variables (same as Vercel)
4. Build settings:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`

### SPA Routing

For both platforms, add a redirect rule for SPA routing:

**Vercel** (`vercel.json`):
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

**Netlify** (`public/_redirects`):
```
/*    /index.html   200
```

---

## Step 6: Configure Webhooks

### Email Tracking

Set up a webhook URL for email opens/clicks:
```
https://[PROJECT_ID].supabase.co/functions/v1/email-tracking
```

### Reply Detection

For inbound email replies (requires email provider setup):
```
https://[PROJECT_ID].supabase.co/functions/v1/reply-webhook
```

### PayPal Webhooks

1. Go to PayPal Developer Dashboard
2. Add webhook URL:
```
https://[PROJECT_ID].supabase.co/functions/v1/paypal-webhook
```

### CRM Webhooks (Inbound)

For receiving updates from external CRMs:
```
https://[PROJECT_ID].supabase.co/functions/v1/crm-webhook
```

---

## Step 7: Set Up Scheduled Jobs

Some features require periodic execution:

### Using Supabase pg_cron

Enable pg_cron extension, then:

```sql
-- Weekly limit check (runs every Monday at 9 AM UTC)
SELECT cron.schedule(
  'weekly-limit-check',
  '0 9 * * 1',
  $$SELECT net.http_post(
    url := 'https://[PROJECT_ID].supabase.co/functions/v1/weekly-limit-check',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  )$$
);

-- Sequence scheduler (runs every hour)
SELECT cron.schedule(
  'sequence-scheduler',
  '0 * * * *',
  $$SELECT net.http_post(
    url := 'https://[PROJECT_ID].supabase.co/functions/v1/sequence-scheduler',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  )$$
);
```

### Alternative: External Cron Service

Use services like [cron-job.org](https://cron-job.org) to call edge functions on schedule.

---

## Feature Checklist

| Feature | Requirements |
|---------|--------------|
| ✅ User Authentication | Supabase Auth |
| ✅ Multi-tenant Workspaces | Database + RLS |
| ✅ Lead Management | Database |
| ✅ AI Message Generation | LOVABLE_API_KEY |
| ✅ Email Sending | RESEND_API_KEY |
| ✅ SMS/WhatsApp | TWILIO_* keys |
| ✅ Email Tracking | email-tracking function |
| ✅ PayPal Subscriptions | PAYPAL_* keys + webhooks |
| ✅ CRM Sync | crm-webhook + crm-outbound-sync |
| ✅ Analytics | Built-in (no extra setup) |

---

## Troubleshooting

### CORS Errors

Ensure your frontend domain is in Supabase's allowed origins:
Dashboard → API → CORS Allowed Origins

### Auth Redirect Issues

Check Site URL and Redirect URLs in Authentication settings match your domain.

### Edge Function Failures

Check logs in Dashboard → Edge Functions → Logs

### RLS Policy Errors

Ensure users have proper workspace membership. Check `workspace_members` table.

---

## Security Considerations

1. **Never expose** `SUPABASE_SERVICE_ROLE_KEY` in frontend code
2. All sensitive operations go through edge functions
3. RLS policies enforce workspace isolation
4. User roles are stored in `user_roles` table (not in profiles)
5. Integration credentials are encrypted in `workspace_integrations`

---

## Updating

When pulling updates from the repo:

```bash
# Pull latest code
git pull origin main

# Push any new migrations
supabase db push

# Deploy updated functions
supabase functions deploy

# Rebuild and deploy frontend
npm run build
# Then deploy to Vercel/Netlify
```
