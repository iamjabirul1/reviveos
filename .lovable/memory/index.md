# Memory: index.md
Updated: now

# ReviveOS — Project Memory

## Stack
- Frontend: React + Vite + Tailwind + shadcn/ui
- Backend: Lovable Cloud (Supabase)
- AI: Lovable AI Gateway (gemini-3-flash-preview) for message generation
- Email: Resend API for delivery
- Auth: Supabase Auth (email/password, no auto-confirm)

## Architecture
- Workspace-scoped RLS via `is_workspace_member()` security definer function
- Deterministic scoring in `src/lib/scoring.ts` (client-side)
- handle_new_user trigger creates profile + workspace + admin role on signup

## Pricing Plans (PRD-based)
- Starter: $39/mo ($31 annual) — 1,000 leads, 3 campaigns, 3 playbooks, email only
- Growth: $79/mo ($63 annual) — 10,000 leads, unlimited campaigns, 7 playbooks, email+SMS
- Scale: $99/mo ($79 annual) — 25,000 leads, unlimited, 3 workspaces, custom playbooks

## Moat Features
### 1. Revenue Attribution Engine (built)
- deal_outcomes table tracks lead→revenue attribution
- RevenuePage with ROI dashboard, payback calculator
- Manual deal recording with campaign/playbook linking

### 2. AI Learning Loop (built)
- message_outcomes table tracks win/loss per message
- workspace_ai_insights table stores learned patterns (tone, CTA, angle win rates)
- generate-messages enhanced with historical performance context in prompts
- A/B testing: enable_ab_testing flag generates variant A + B
- AI confidence score based on historical win rate + data volume
- process-message-feedback edge function updates insights on outcome
- Approvals page has "Record Feedback" tab for sent messages
- AIInsightsPage at /app/ai-insights shows performance charts

## Edge Functions
- `generate-messages`: AI message drafting with learning loop
- `process-message-feedback`: Records outcomes & updates workspace insights
- `send-messages`: Resend email delivery
- `write-with-ai`: General AI writing assistant
- `enrich-leads`: AI lead enrichment
- `sequence-scheduler`: Multi-step playbook sequences

## Design System
- HSL tokens in index.css (light+dark)
- Primary: 220 70% 50% / Success: 142 71% 45% / Warning: 38 92% 50%
- Font: Inter system-ui stack
