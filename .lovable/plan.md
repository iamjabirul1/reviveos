
# Campaigns: fix send + clickable detail view

## Part 1 — Fix "Send doesn't deliver"

The `send-messages` function only sends messages where `approval_status = 'approved'` AND `sent_at IS NULL`. After investigating, the most common reasons sends silently return `{sent: 0}`:

1. New campaigns generate messages as `pending` — nothing gets sent until they're approved in the Approvals queue. Today the UI gives no indication of this.
2. Seeded demo messages already have `sent_at` filled, so there's nothing left to send.
3. Non-founder workspaces with no Resend integration silently fail per-message.

### Fixes

- In `Campaigns.tsx` `sendCampaign`, before invoking the function, query counts of approved-unsent vs pending messages for the campaign. If 0 approved-unsent: show a clear toast ("Nothing to send — N messages still pending approval") with an "Open Approvals" action that deep-links to `/app/approvals?campaign=<id>`.
- Surface per-message errors returned by `send-messages` (`failed`, `errors[]`) in a toast and log to `activity_logs` (already done server-side; just display them).
- Add an "Approve all & send" convenience button on the campaign detail page (Part 2) that bulk-updates pending → approved for that campaign, then calls `send-messages`.
- In `send-messages`, when `emailCreds`/`smsCreds` resolve to `null`, return a structured `{sent:0, failed:N, reason:"no_credentials", provider:"resend"}` so the UI can prompt the user to configure integrations.

No schema changes.

## Part 2 — Clickable Campaign Detail page

### Routing
- New route in `App.tsx`: `campaigns/:id` → `<CampaignDetail />`
- `Campaigns.tsx`: wrap each campaign `Card` in a `Link to={`/app/campaigns/${c.id}`}`. Keep status action buttons working via `e.stopPropagation()`.

### New file: `src/pages/app/CampaignDetail.tsx`

Sections, top to bottom:

1. **Header bar**
   - Back link, campaign name, status badge, playbook chip, created-at, "Send approved now" + "Approve all & send" + Pause/Resume buttons.

2. **Progress funnel (stat cards)**
   Computed from `messages` + `bookings` + `deal_outcomes` joined on `campaign_id`:
   - Leads targeted (`lead_count`)
   - Drafts generated (count messages)
   - Approved (approval_status='approved')
   - Sent (sent_at not null)
   - Opened (opened_at not null)
   - Replied (replied_at not null)
   - Booked (count bookings)
   - Won revenue (sum deal_outcomes.revenue_amount where outcome='won')
   Render as a horizontal funnel with Progress bars relative to leads targeted.

3. **Messages table** — one row per message, joined to lead + lead.enrichment_json
   Columns: Lead (name + company), Channel, Subject preview, Status badges (pending/approved/rejected, sent, opened, replied), AI confidence score, Actions (Approve / Edit / Reject / Suppress).
   - Row click opens an expanded drawer (`Sheet`) with three tabs:
     - **Message** — full subject + body, channel, scheduled/sent timestamps, tracking events.
     - **Why this works (AI rationale)** — `messages.ai_rationale` rendered as prose, plus the playbook tone/CTA used and any matching `workspace_ai_insights` rows (top tone/CTA win-rates) so the user sees *why* this approach was chosen for this lead.
     - **Lead context** — pulled from `leads.enrichment_json`:
       - CRM signals: `source`, `stage`, `status`, `lead_value`, `last_contacted_at`, `last_activity_at`, `no_show_flag`, `closed_lost_reason`
       - Company / News & events: anything under `enrichment_json.company`, `enrichment_json.news[]`, `enrichment_json.events[]`, `enrichment_json.signals[]` (rendered as a list with title/date/url; gracefully hide empty groups)
       - Revival score + bucket + best_channel + best_angle + suggested_cta
   - Inline Edit uses a `Dialog` with subject/body fields → updates `messages` row, sets `approval_status='approved'`, sets `approved_by=user.id`.
   - Approve/Reject/Suppress reuse the same mutations as the existing Approvals page (`src/pages/app/Approvals.tsx`).

4. **Activity log** (collapsed) — tail of `activity_logs` filtered to `payload_json->>'campaign_id' = :id`.

### Data fetching
- Single page-level fetch using parallel `Promise.all` for: campaign, playbook, messages+leads, bookings, deal_outcomes, workspace_ai_insights, activity_logs.
- Re-fetch after each mutation (or use optimistic updates).

### Reuse
- Stat card primitive from `Dashboard.tsx` (extract if needed).
- Approval action handlers extracted from `Approvals.tsx` into `src/lib/approvalActions.ts` so both pages share them.

## Out of scope
- No DB schema changes.
- No new edge functions (only a small shape change to `send-messages` response).
- No changes to AI generation prompts.

## Files touched
- `src/App.tsx` — add `campaigns/:id` route
- `src/pages/app/Campaigns.tsx` — link cards, smarter `sendCampaign` toast
- `src/pages/app/CampaignDetail.tsx` — **new**
- `src/pages/app/Approvals.tsx` — extract shared handlers; accept `?campaign=` query filter
- `src/lib/approvalActions.ts` — **new**
- `supabase/functions/send-messages/index.ts` — return structured no-credential reason
