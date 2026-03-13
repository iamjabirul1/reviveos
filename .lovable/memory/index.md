# ReviveOS — Project Memory

## Stack
- Frontend: React + Vite + Tailwind + shadcn/ui
- Backend: Lovable Cloud (Supabase)
- AI: Cerebras API (llama-3.3-70b) for message generation
- Email: Resend API for delivery
- Auth: Supabase Auth (email/password, no auto-confirm)

## Architecture
- Workspace-scoped RLS via `is_workspace_member()` security definer function
- Deterministic scoring in `src/lib/scoring.ts` (client-side)
- handle_new_user trigger creates profile + workspace + admin role on signup

## Pricing Plans (Enterprise-level, updated March 2026)
- Starter: $299/mo ($239 annual) — 5,000 leads, 3 campaigns, 3 playbooks, email only
- Growth: $599/mo ($479 annual) — 25,000 leads, unlimited campaigns, 7 playbooks, email+SMS, CRM sync
- Scale: $1,200/mo ($960 annual) — Unlimited leads, 5 workspaces, unlimited playbooks, custom playbooks

## PayPal Integration
- Live PayPal subscription plans created (6 plans: 3 monthly + 3 annual)
- Edge functions: paypal-config, paypal-setup, paypal-webhook, paypal-create-subscription
- @paypal/react-paypal-js v8 for frontend buttons
- Secrets: PAYPAL_CLIENT_ID, PAYPAL_SECRET_KEY

## Feature Gating
- Plan limits defined in src/lib/planLimits.ts
- usePlanLimits hook in src/hooks/usePlanLimits.ts
- UpgradePrompt + LimitReached components in src/components/UpgradePrompt.tsx
- Gates applied: Leads, Import, Campaigns, Playbooks pages
- Workspace plan field determines limits (free/starter/growth/scale)

## Deliverability Firewall
- Edge function: verify-email (mock mode, ready for ZeroBounce/NeverBounce)
- Called during CSV import before scoring
- Invalid/spam_trap/abuse/disposable emails → score 0, suppress bucket
- scoreLead() accepts optional emailVerification param

## Approval Queue Hotkeys
- Enter → Approve + auto-advance
- E → Enter edit mode, focus body textarea
- Backspace → Reject
- S → Suppress lead
- Escape → Exit edit mode
- Hotkeys disabled when typing in inputs

## Edge Functions
- `generate-messages`: Cerebras AI message drafting
- `send-messages`: Resend email delivery for approved messages
- `crm-webhook`: Inbound webhook for HubSpot/GHL/Calendly events
- `verify-email`: Email deliverability firewall (mock/ZeroBounce)
- `paypal-config`: Returns PayPal client ID + plan IDs (public)
- `paypal-setup`: Creates PayPal products & plans (one-time, auth required)
- `paypal-webhook`: Handles subscription lifecycle events
- `paypal-create-subscription`: Saves subscription after PayPal approval

## Design System
- HSL tokens in index.css (light+dark)
- Primary: 220 70% 50% / Success: 142 71% 45% / Warning: 38 92% 50%
- Font: Inter system-ui stack

## Key Decisions
- No Twilio yet — only email sending via Resend
- Playbooks have multi-step sequence_json with delay_days
- Activity logs track imports, rescores, campaign sends, webhook events
- Dashboard uses count queries to avoid 1000-row limit
- PapaParse for CSV parsing
- User chose free Cerebras over Lovable AI Gateway
