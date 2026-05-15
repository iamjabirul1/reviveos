
# Plan — Failed-delivery resend, richer Approvals, campaign drill-in, and roadmap lead magnet

## 1. Resend failed deliveries

Today `send-messages` only picks up rows where `approval_status='approved' AND sent_at IS NULL`. Failed sends never set `sent_at`, so they're already "retryable" — but there is no UI surface to (a) see which leads failed, (b) retry only those, or (c) carry the failure reason.

### DB (migration)
- Add to `messages`: `send_error text`, `send_attempts int default 0`, `last_attempt_at timestamptz`. No status enum changes.

### Edge function `send-messages`
- On failure: write `send_error`, increment `send_attempts`, set `last_attempt_at` (do NOT set `sent_at`).
- On success: clear `send_error`, still set `sent_at`/`delivered_at`.
- Accept optional `message_ids: string[]` in the body. When present, restrict the query to `id IN (...)` AND `sent_at IS NULL` AND `approval_status='approved'` (ignore the campaign-wide filter). Used by the Resend action.
- Keep the existing `reason: "no_credentials"` shape.

### UI — `CampaignDetail.tsx`
- New funnel stat: **Failed** (count of approved messages with `send_attempts > 0 AND sent_at IS NULL`).
- Table:
  - New per-row badge `Failed` (red) when `send_attempts > 0 && !sent_at`, with tooltip showing `send_error`.
  - Per-row action `Retry` (only when failed) → invokes `send-messages` with `{ message_ids: [m.id] }`.
- Header bar: new button **Retry failed (N)** — disabled when N=0, invokes `send-messages` with all failed `message_ids`.
- Drawer "Message" tab: when failed, render an alert block with the error string and a Retry button.

## 2. Approvals — show which lead/campaign

`Approvals.tsx` already pulls lead first/last/email/company/score, but doesn't show the campaign or the richer "why this lead" context. Add:

- Fetch `campaign:campaigns(id, name, playbook_type)` and full enrichment + revival fields on the message join.
- Header of the current card: campaign name (linked to `/app/campaigns/:id`), playbook type chip, and the lead's revival bucket + score chip.
- New collapsible **Lead context** panel below the AI rationale, reusing the same `LeadContext` block from `CampaignDetail.tsx` (extract it to `src/components/LeadContextPanel.tsx`). Shows CRM signals + company + news/events from `enrichment_json`.
- Keep hotkeys; the panel is collapsed by default so the queue stays fast.

## 3. Campaigns clickability / details

The route, navigation, and detail page already exist (`/app/campaigns/:id` → `CampaignDetail.tsx`). The bug report says "still not clickable / no details inside" — the most likely causes are: (a) cards crashing before render due to a draft campaign with 0 messages, or (b) status action buttons swallowing the click. Fixes:

- Wrap each `Card` body click in a real `<Link>` (cleaner than `onClick + navigate`) so middle-click/cmd-click work and the affordance is unambiguous. Keep the action-button row in a `<div onClick={e => e.stopPropagation()}>`.
- Add a visible "View details →" affordance in the card footer.
- In `CampaignDetail.tsx`, render a friendlier empty state when `messages.length === 0` (today's "No messages generated" stays, but add a **Generate messages now** button that invokes `generate-messages` for the campaign's filter).
- Ensure `fetchAll` doesn't throw if `playbook_id` is null (currently it `.single()`s only when set — already safe; just confirm).

## 4. Roadmap lead-magnet (public funnel → emailed report)

Public questionnaire that produces a personalized web report. Each submission becomes a real lead in the founder's workspace, the AI generates the roadmap, and the link is emailed via Lovable Emails.

### Routing
- `/roadmap` — public landing + intake (no auth).
- `/roadmap/:slug` — public report page (read-only, accessed via tokenized URL).

### DB (migration)
New tables:
- `lead_magnets` — id, workspace_id, name, slug, headline, subhead, questions_json (array of `{id, label, type: text|textarea|select|number|email, options?, required}`), report_prompt, is_active. RLS: workspace members manage; **anon SELECT allowed** when `is_active = true` (needed for the public form).
- `lead_magnet_submissions` — id, workspace_id, magnet_id, lead_id, answers_json, report_html, report_summary, share_slug (unique, random 16 chars), email, name, status (`pending|generating|ready|failed`), created_at. RLS: workspace members SELECT/UPDATE; **anon INSERT allowed** (form post) and **anon SELECT allowed by share_slug** (report viewing). Inserts validated via trigger to require email + magnet_id.

### Edge function (new) `generate-roadmap`
- `verify_jwt = false` (public form posts here).
- Input: `{ magnet_id, answers, name, email, phone? }`. Validate with Zod.
- Steps:
  1. Insert/lookup `leads` row in the magnet's workspace (source=`lead_magnet`).
  2. Insert `lead_magnet_submissions` row, generate `share_slug`.
  3. Call Lovable AI Gateway (`google/gemini-2.5-pro`) with `report_prompt` + answers → returns markdown report + 1-line summary.
  4. Save HTML (markdown→HTML) + summary, set status `ready`.
  5. Invoke `send-transactional-email` with template `roadmap-ready` and `templateData: { name, reportUrl }`.
- Returns `{ share_slug }` so the public page can redirect.

### Email infra
- This requires Lovable Emails. If the project has no email domain yet, the response will surface the email-setup action. Then call `setup_email_infra` + `scaffold_transactional_email`, register a `roadmap-ready` template (subject "Your custom roadmap is ready"), and deploy.

### Public UI
- `src/pages/Roadmap.tsx` — multi-step questionnaire (one question per step, progress bar), final step asks name + email, then POSTs to `generate-roadmap`, shows a "Building your roadmap…" state, then redirects to `/roadmap/:slug`.
- `src/pages/RoadmapReport.tsx` — fetches submission by `share_slug` (anon SELECT), renders branded report (sections from markdown), CTA buttons (book call / contact) configurable per magnet.
- Both are added to `App.tsx` outside the `ProtectedRoute`.

### Founder UI
- `src/pages/app/LeadMagnetsPage.tsx` (sidebar entry "Lead Magnets"):
  - Create/edit magnets (name, slug, headline, questions builder, report system prompt, CTA).
  - Submissions table per magnet (lead, email, status, link to public report, "Resend email" action).
- AppSidebar gets the new nav item.

### Out of scope (v1)
- PDF export (web-only as requested).
- A/B variants of the magnet.
- Embeddable widget version.

## Files touched

Backend:
- `supabase/functions/send-messages/index.ts` — error capture, `message_ids` filter.
- `supabase/functions/generate-roadmap/index.ts` — **new**.
- `supabase/functions/_shared/transactional-email-templates/roadmap-ready.tsx` — **new** (after scaffold).
- Migrations: `messages.send_error/send_attempts/last_attempt_at`; `lead_magnets`, `lead_magnet_submissions` tables + RLS.

Frontend:
- `src/App.tsx` — `/roadmap`, `/roadmap/:slug`, `/app/lead-magnets`.
- `src/components/AppSidebar.tsx` — Lead Magnets entry.
- `src/components/LeadContextPanel.tsx` — **new** (extracted from CampaignDetail).
- `src/pages/app/CampaignDetail.tsx` — failed badge, retry buttons, generate-empty CTA, use shared panel.
- `src/pages/app/Campaigns.tsx` — Link-wrapped cards, "View details" affordance.
- `src/pages/app/Approvals.tsx` — campaign chip, lead context panel.
- `src/pages/app/LeadMagnetsPage.tsx` — **new**.
- `src/pages/Roadmap.tsx`, `src/pages/RoadmapReport.tsx` — **new**.
