

# Self-Serve Revenue Discovery Engine

## Overview

A new public-facing interactive experience at `/discover` that acts as an automated sales demo. Prospects input their pipeline data (napkin math OR CSV drop), instantly see their recoverable revenue visualized, interact with an AI advisor that drafts personalized win-back messages using their brand context, and hit a paywall that drives them to checkout -- all without a sales call.

## Architecture

```text
/discover (public route, no auth required)
  ├── Phase 1: Intake Wizard (Typeform-style steps)
  │   ├── Path A: Napkin Math (slider + inputs + dropdown)
  │   └── Path B: CSV Drop (max 25 leads, uses map-csv-fields)
  ├── Phase 2: Instant Dashboard (computed client-side)
  │   ├── Total Dormant Pipeline ($)
  │   ├── Recoverable Revenue (15% baseline)
  │   └── Bucket Pie Chart (Recharts)
  ├── Phase 3: AI Advisor Chat (streaming)
  │   └── Edge function: discover-ai-chat
  └── Phase 4: Paywall + Checkout
      ├── Blurred leads / locked campaign
      └── PayPal subscribe button inline
```

## Detailed Plan

### 1. New Page: `src/pages/Discover.tsx`

The main orchestrator component. Manages state machine: `intake` -> `dashboard` -> (chat runs alongside). No auth required.

**State shape:**
- `intakePath`: `'napkin' | 'csv'`
- `deadLeadCount`, `avgDealSize`, `coldReason`, `websiteUrl` (napkin inputs)
- `csvLeads[]` (parsed from CSV, max 25)
- `scoredLeads[]` (after running `scoreLead()` client-side)
- `phase`: `'intake' | 'results'`

### 2. Intake Components

**`src/components/discover/IntakeWizard.tsx`** -- Typeform-style full-screen steps with smooth transitions (framer-motion). Two paths:

- **Path A (Napkin Math):** 4 steps, each filling the viewport.
  - Step 1: Slider (100-10,000+) for dead lead count
  - Step 2: Currency input for avg deal size
  - Step 3: Dropdown for cold reason (Timing, Ghosted, Budget, Competitor)
  - Step 4: URL input for website

- **Path B (CSV Drop):** Drag-and-drop zone (max 25 rows). PapaParse on client. Run `scoreLead()` from `src/lib/scoring.ts` on each row client-side for instant results. No auth needed, no DB writes.

### 3. Results Dashboard Components

**`src/components/discover/RevenueDashboard.tsx`**

- **Total Dormant Pipeline**: `leadCount * avgDealSize` (napkin) or sum of `lead_value` (CSV)
- **Recoverable Revenue**: Pipeline * 0.15 with animated counter
- **Bucket Breakdown Pie Chart**: Uses existing `ChartContainer` from `src/components/ui/chart.tsx` with Recharts `PieChart`. Buckets: Revive Now (green), Review First (amber), Nurture Later (blue), Suppress (gray). For napkin math, use statistical distribution based on cold reason. For CSV, use actual `scoreLead()` results.
- **Per-lead table** (CSV path only): Shows first_name, company, score, bucket. First lead fully visible; rest blurred with CSS `blur(4px)` overlay.

### 4. AI Advisor Chat

**New edge function: `supabase/functions/discover-ai-chat/index.ts`**

- NO auth required (`verify_jwt = false`)
- Rate limited by IP (simple in-memory map, 20 messages per session)
- Uses Lovable AI Gateway (`google/gemini-3-flash-preview`)
- Massive system prompt containing:
  - The user's intake data (lead count, deal size, cold reason)
  - Website URL context (passed from frontend; the AI is instructed to reference their business)
  - ReviveOS scoring rules from `scoring.ts` (hardcoded into prompt)
  - Strict guardrails: only use user-provided numbers, no invented features, push toward $299 Starter or $599 Growth checkout
- Streams responses via SSE back to the frontend

**`src/components/discover/AIAdvisorChat.tsx`**

- Chat panel alongside the dashboard (side-by-side on desktop, tabbed on mobile)
- AI sends proactive first message on mount: "I just analyzed your $X dormant pipeline..."
- Generates ONE fully visible sample email based on their data
- Uses `react-markdown` for rendering
- Streaming token-by-token display using the SSE pattern from the codebase

### 5. Paywall & Conversion

**`src/components/discover/PaywallOverlay.tsx`**

- After showing 1 sample email, blur the rest
- Display ROI math: "Your recoverable revenue is $X. Growth Plan costs $599/mo. Break-even at 0.15% recovery rate."
- Inline PayPal subscribe button (reuse `PayPalPricingProvider` + `PayPalSubscribeButton` from existing `PayPalPricing.tsx`)
- "Unlock My Pipeline" CTA
- If user is not logged in, clicking checkout redirects to `/signup?redirect=/discover&plan=growth`

### 6. Route Registration

Add to `App.tsx`:
```
<Route path="/discover" element={<Discover />} />
```

Add "See Your Pipeline" CTA to the Landing page hero section linking to `/discover`.

### 7. Config Updates

Add to `supabase/config.toml`:
```toml
[functions.discover-ai-chat]
verify_jwt = false
```

### 8. Files to Create/Edit

| Action | File |
|--------|------|
| Create | `src/pages/Discover.tsx` |
| Create | `src/components/discover/IntakeWizard.tsx` |
| Create | `src/components/discover/RevenueDashboard.tsx` |
| Create | `src/components/discover/AIAdvisorChat.tsx` |
| Create | `src/components/discover/PaywallOverlay.tsx` |
| Create | `supabase/functions/discover-ai-chat/index.ts` |
| Edit | `src/App.tsx` (add route) |
| Edit | `src/pages/Landing.tsx` (add CTA to hero) |
| Edit | `supabase/config.toml` (add function config) |

### 9. Implementation Sequence

Given the size, I recommend building this in 3 passes:

1. **Pass 1**: Intake wizard + results dashboard (napkin math path) + route. Fully functional without AI.
2. **Pass 2**: AI advisor chat edge function + streaming chat UI + proactive message + sample email generation.
3. **Pass 3**: CSV drop path + paywall overlay + PayPal integration + landing page CTA.

This keeps each pass reviewable and testable.

### Technical Notes

- No database tables needed -- this is entirely stateless for anonymous visitors
- Scoring uses existing `scoreLead()` client-side, no backend calls for the core math
- The AI chat is the only backend component (edge function)
- PayPal integration reuses existing `PayPalPricingProvider` infrastructure
- Recharts pie chart uses existing `chart.tsx` primitives

